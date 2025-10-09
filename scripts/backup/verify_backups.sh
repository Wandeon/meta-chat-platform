#!/usr/bin/env bash
set -euo pipefail

#
# verify_backups.sh
#
# This script validates PostgreSQL base backups created with pg_basebackup
# and Redis snapshot/AOF artifacts before they are promoted to the "ready"
# tier. It is safe to run in cron or CI pipelines.
#

BACKUP_ROOT=${BACKUP_ROOT:-/var/backups/meta-chat}
POSTGRES_BACKUP_DIR=${POSTGRES_BACKUP_DIR:-"$BACKUP_ROOT/postgres"}
REDIS_BACKUP_DIR=${REDIS_BACKUP_DIR:-"$BACKUP_ROOT/redis"}
RETENTION_DAYS=${RETENTION_DAYS:-30}
LOG_DIR=${LOG_DIR:-"$BACKUP_ROOT/logs"}
LOG_FILE="$LOG_DIR/verify-$(date +%Y%m%d).log"
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

mkdir -p "$LOG_DIR"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 is required to run backup verification." >&2
  exit 1
fi

declare -a FAILURES

log() {
  printf '%s %s\n' "$(date --iso-8601=seconds)" "$1" | tee -a "$LOG_FILE"
}

exit_with_status() {
  if [[ ${#FAILURES[@]} -eq 0 ]]; then
    log "All backup artifacts verified successfully."
    exit 0
  else
    log "Failures detected:${FAILURES[*]}"
    exit 1
  fi
}

find_latest() {
  local dir=$1
  if [[ ! -d $dir ]]; then
    return 1
  fi
  python3 - <<'PY' "$dir"
import os, sys
directory = sys.argv[1]
entries = []
with os.scandir(directory) as it:
    for entry in it:
        if entry.name.startswith('.'):
            continue
        entries.append(entry.path)
if not entries:
    sys.exit(1)
latest = max(entries, key=lambda p: os.path.getmtime(p))
print(latest)
PY
}

verify_postgres() {
  if [[ ! -d $POSTGRES_BACKUP_DIR ]]; then
    log "Skipping PostgreSQL verification: directory $POSTGRES_BACKUP_DIR missing."
    FAILURES+=(" postgres_dir_missing")
    return
  fi

  local artifact
  artifact=$(find_latest "$POSTGRES_BACKUP_DIR") || true
  if [[ -z $artifact ]]; then
    log "No PostgreSQL backups found in $POSTGRES_BACKUP_DIR."
    FAILURES+=(" postgres_missing")
    return
  fi

  log "Verifying PostgreSQL backup: $artifact"

  if command -v pg_verifybackup >/dev/null 2>&1; then
    if [[ -d $artifact ]]; then
      if pg_verifybackup "$artifact" >>"$LOG_FILE" 2>&1; then
        log "pg_verifybackup completed for directory $artifact."
      else
        log "pg_verifybackup reported errors for $artifact."
        FAILURES+=(" postgres_verify_failed")
      fi
    else
      local extract_dir="$TMPDIR/pg"
      mkdir -p "$extract_dir"
      if tar -xf "$artifact" -C "$extract_dir"; then
        if pg_verifybackup "$extract_dir" >>"$LOG_FILE" 2>&1; then
          log "pg_verifybackup completed for archive $artifact."
        else
          log "pg_verifybackup reported errors for archive $artifact."
          FAILURES+=(" postgres_verify_failed")
        fi
      else
        log "Failed to extract PostgreSQL archive $artifact."
        FAILURES+=(" postgres_extract_failed")
      fi
    fi
  else
    log "pg_verifybackup not available; performing manifest checksum validation."
    local manifest="$artifact/backup_manifest"
    if [[ -f $manifest ]]; then
      if sha256sum --check "$manifest" >>"$LOG_FILE" 2>&1; then
        log "Manifest checksum validation succeeded for $artifact."
      else
        log "Manifest checksum validation failed for $artifact."
        FAILURES+=(" postgres_manifest_failed")
      fi
    else
      log "No backup_manifest found in $artifact."
      FAILURES+=(" postgres_manifest_missing")
    fi
  fi
}

verify_redis() {
  if [[ ! -d $REDIS_BACKUP_DIR ]]; then
    log "Skipping Redis verification: directory $REDIS_BACKUP_DIR missing."
    FAILURES+=(" redis_dir_missing")
    return
  fi

  local artifact
  artifact=$(find_latest "$REDIS_BACKUP_DIR") || true
  if [[ -z $artifact ]]; then
    log "No Redis backups found in $REDIS_BACKUP_DIR."
    FAILURES+=(" redis_missing")
    return
  fi

  log "Verifying Redis backup: $artifact"

  local file_to_check="$artifact"
  if [[ -d $artifact ]]; then
    file_to_check=$(find "$artifact" -maxdepth 1 -type f \( -name '*.rdb' -o -name '*.aof' \) | sort | tail -n 1)
  fi

  if [[ -z $file_to_check ]]; then
    log "Could not locate Redis dump within $artifact."
    FAILURES+=(" redis_dump_missing")
    return
  fi

  if [[ $file_to_check == *.rdb ]]; then
    if command -v redis-check-rdb >/dev/null 2>&1; then
      if redis-check-rdb "$file_to_check" >>"$LOG_FILE" 2>&1; then
        log "redis-check-rdb passed for $file_to_check."
      else
        log "redis-check-rdb reported errors for $file_to_check."
        FAILURES+=(" redis_rdb_failed")
      fi
    else
      log "redis-check-rdb not available; skipping structural validation for $file_to_check."
    fi
  elif [[ $file_to_check == *.aof ]]; then
    if command -v redis-check-aof >/dev/null 2>&1; then
      if redis-check-aof --fix "$file_to_check" >>"$LOG_FILE" 2>&1; then
        log "redis-check-aof passed for $file_to_check."
      else
        log "redis-check-aof reported errors for $file_to_check."
        FAILURES+=(" redis_aof_failed")
      fi
    else
      log "redis-check-aof not available; skipping structural validation for $file_to_check."
    fi
  else
    log "Unsupported Redis backup format: $file_to_check"
    FAILURES+=(" redis_unknown_format")
  fi
}

cleanup_rotated_logs() {
  find "$LOG_DIR" -type f -name 'verify-*.log' -mtime +"$RETENTION_DAYS" -delete || true
}

verify_postgres
verify_redis
cleanup_rotated_logs
exit_with_status
