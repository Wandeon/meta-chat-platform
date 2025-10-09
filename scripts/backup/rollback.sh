#!/usr/bin/env bash
set -euo pipefail

#
# rollback.sh
#
# Restores the platform to a known-good state by rehydrating PostgreSQL and
# Redis from validated backups, restarting the HA stack with health-check
# gating, and publishing audit metadata. The script favors idempotency and can
# be executed in a runbook-style workflow.
#

BACKUP_ROOT=${BACKUP_ROOT:-/var/backups/meta-chat}
POSTGRES_BACKUP_DIR=${POSTGRES_BACKUP_DIR:-"$BACKUP_ROOT/postgres"}
REDIS_BACKUP_DIR=${REDIS_BACKUP_DIR:-"$BACKUP_ROOT/redis"}
PRIMARY_DATA_DIR=${PRIMARY_DATA_DIR:-/var/lib/meta-chat/postgres/primary}
STANDBY_DATA_DIR=${STANDBY_DATA_DIR:-/var/lib/meta-chat/postgres/standby}
REDIS_HOST=${REDIS_HOST:-redis-primary.gcloud.example.com}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_USERNAME=${REDIS_USERNAME:-default}
REDIS_PASSWORD=${REDIS_PASSWORD:-}
COMPOSE_FILE=${COMPOSE_FILE:-/home/deploy/meta-chat-platform/ops/docker-compose.ha.yml}
AUDIT_LOG=${AUDIT_LOG:-/var/log/meta-chat/rollback.log}

usage() {
  cat <<USAGE
Usage: $0 [--postgres <path>] [--redis <path>] [--dry-run]

Options:
  --postgres PATH   Explicit PostgreSQL backup directory or tarball.
  --redis PATH      Explicit Redis RDB/AOF snapshot to restore.
  --dry-run         Print actions without executing destructive steps.
  -h, --help        Show this help message.
USAGE
}

DRY_RUN=false
POSTGRES_SOURCE=""
REDIS_SOURCE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --postgres)
      POSTGRES_SOURCE=$2
      shift 2
      ;;
    --redis)
      REDIS_SOURCE=$2
      shift 2
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

for required in python3 docker rsync curl; do
  if ! command -v "$required" >/dev/null 2>&1; then
    echo "Required dependency '$required' is missing." >&2
    exit 1
  fi
done

log() {
  local message=$1
  mkdir -p "$(dirname "$AUDIT_LOG")"
  printf '%s %s\n' "$(date --iso-8601=seconds)" "$message" | tee -a "$AUDIT_LOG"
}

run_cmd() {
  if $DRY_RUN; then
    log "[dry-run] $*"
  else
    log "$*"
    "$@"
  fi
}

ensure_dir() {
  local dir=$1
  if $DRY_RUN; then
    log "[dry-run] mkdir -p $dir"
  else
    mkdir -p "$dir"
  fi
}

if [[ ! -f $COMPOSE_FILE ]]; then
  log "Compose file $COMPOSE_FILE not found."
  exit 1
fi

select_latest() {
  local dir=$1
  python3 - <<'PY' "$dir"
import os, sys
backup_dir = sys.argv[1]
if not os.path.isdir(backup_dir):
    sys.exit(1)
entries = [os.path.join(backup_dir, name) for name in os.listdir(backup_dir)]
entries = [p for p in entries if os.path.exists(p)]
if not entries:
    sys.exit(1)
print(max(entries, key=lambda p: os.path.getmtime(p)))
PY
}

resolve_postgres_backup() {
  if [[ -n $POSTGRES_SOURCE ]]; then
    echo "$POSTGRES_SOURCE"
    return
  fi
  select_latest "$POSTGRES_BACKUP_DIR"
}

resolve_redis_backup() {
  if [[ -n $REDIS_SOURCE ]]; then
    echo "$REDIS_SOURCE"
    return
  fi
  select_latest "$REDIS_BACKUP_DIR"
}

check_health() {
  local service=$1
  local url=$2
  local attempts=${3:-30}
  local delay=${4:-5}
  if $DRY_RUN; then
    log "[dry-run] Skipping health check for $service"
    return 0
  fi
  for ((i=1; i<=attempts; i++)); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      log "Health check for $service passed on attempt $i."
      return 0
    fi
    sleep "$delay"
  done
  log "Health check for $service failed after $attempts attempts."
  return 1
}

extract_postgres_backup() {
  local source=$1
  local target=$2
  if $DRY_RUN; then
    log "[dry-run] Would sync $source to $target"
    return 0
  fi
  if [[ -d $source ]]; then
    run_cmd rsync -a --delete "$source/" "$target/"
  else
    local tmpdir
    tmpdir=$(mktemp -d)
    trap 'rm -rf "$tmpdir"' RETURN
    run_cmd tar -xf "$source" -C "$tmpdir"
    run_cmd rsync -a --delete "$tmpdir/" "$target/"
  fi
}

restore_postgres() {
  local backup
  backup=$(resolve_postgres_backup) || {
    log "Unable to resolve PostgreSQL backup source."
    return 1
  }
  log "Restoring PostgreSQL from $backup"

  if command -v pg_verifybackup >/dev/null 2>&1; then
    run_cmd pg_verifybackup "$backup"
  else
    log "pg_verifybackup not available; skipping pre-restore verification."
  fi

  run_cmd docker compose -f "$COMPOSE_FILE" stop api dashboard
  run_cmd docker compose -f "$COMPOSE_FILE" stop pgpool pg-primary pg-standby

  run_cmd rm -rf "$PRIMARY_DATA_DIR"
  ensure_dir "$PRIMARY_DATA_DIR"
  extract_postgres_backup "$backup" "$PRIMARY_DATA_DIR"
  run_cmd chown -R 1001:1001 "$PRIMARY_DATA_DIR"

  if [[ -d $STANDBY_DATA_DIR ]]; then
    run_cmd rm -rf "$STANDBY_DATA_DIR"
  fi
  ensure_dir "$STANDBY_DATA_DIR"
  run_cmd rsync -a --delete "$PRIMARY_DATA_DIR/" "$STANDBY_DATA_DIR/"
  run_cmd chown -R 1001:1001 "$STANDBY_DATA_DIR"

  run_cmd docker compose -f "$COMPOSE_FILE" up -d pg-primary
  run_cmd sleep 10
  run_cmd docker compose -f "$COMPOSE_FILE" up -d pg-standby pgpool
  run_cmd docker compose -f "$COMPOSE_FILE" up -d api dashboard

  check_health "pgpool" "http://127.0.0.1:9898/pools" 30 5
  check_health "api" "http://127.0.0.1:3000/api/health" 60 5
  check_health "dashboard" "http://127.0.0.1:3001/health" 60 5
}

restore_redis() {
  local backup
  backup=$(resolve_redis_backup) || {
    log "Unable to resolve Redis backup source."
    return 1
  }
  log "Restoring Redis from $backup"

  local artifact=$backup
  if [[ -d $backup ]]; then
    artifact=$(find "$backup" -maxdepth 1 -type f \( -name '*.rdb' -o -name '*.aof' \) | sort | tail -n 1)
  fi

  if [[ -z $artifact ]]; then
    log "Could not locate Redis artifact within $backup"
    return 1
  fi

  if command -v redis-cli >/dev/null 2>&1; then
    run_cmd redis-cli \
      -h "$REDIS_HOST" \
      -p "$REDIS_PORT" \
      -u "redis://$REDIS_USERNAME:$REDIS_PASSWORD@$REDIS_HOST:$REDIS_PORT" \
      --no-auth-warning \
      ping
    run_cmd redis-cli \
      -h "$REDIS_HOST" \
      -p "$REDIS_PORT" \
      -u "redis://$REDIS_USERNAME:$REDIS_PASSWORD@$REDIS_HOST:$REDIS_PORT" \
      --no-auth-warning \
      flushall
    if [[ $artifact == *.aof ]]; then
      if command -v redis-check-aof >/dev/null 2>&1; then
        run_cmd redis-check-aof --fix "$artifact"
      else
        log "redis-check-aof not available; skipping validation for $artifact"
      fi
      if $DRY_RUN; then
        log "[dry-run] Streaming AOF into Redis"
      else
        log "Streaming $artifact into Redis via redis-cli --pipe"
        cat "$artifact" | redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --pipe
      fi
    else
      if command -v redis-check-rdb >/dev/null 2>&1; then
        run_cmd redis-check-rdb "$artifact"
      else
        log "redis-check-rdb not available; skipping validation for $artifact"
      fi
      log "Upload the RDB file to the managed Redis service according to vendor procedure."
    fi
  else
    log "redis-cli not available; manual Redis restore required for $artifact"
  fi
}

main() {
  restore_postgres
  restore_redis
  log "Rollback workflow completed."
}

main "$@"
