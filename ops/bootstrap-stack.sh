#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-"$ROOT_DIR/docker/docker-compose.yml"}
RUN_MIGRATIONS=true
SEED_EMAIL=""
SEED_NAME=""
SEED_ROLE="SUPER"
SEED_LABEL="bootstrap"
INCLUDE_DASHBOARD=true

usage() {
  cat <<USAGE
Usage: $0 [options]

Options:
  --compose-file PATH        Path to docker compose file (default: $COMPOSE_FILE)
  --skip-migrations          Do not run Prisma migrations during bootstrap
  --no-dashboard             Skip starting the dashboard container
  --seed-admin-email EMAIL   Email for the initial admin user
  --seed-admin-name NAME     Name for the initial admin user
  --seed-admin-role ROLE     Admin role (SUPER or STANDARD, default: SUPER)
  --seed-admin-label LABEL   Label for the seeded admin API key (default: bootstrap)
  -h, --help                 Show this help message
USAGE
}

while [[ $# -gt 0 ]]; do
  case $1 in
    --compose-file)
      COMPOSE_FILE=$2
      shift 2
      ;;
    --skip-migrations)
      RUN_MIGRATIONS=false
      shift
      ;;
    --no-dashboard)
      INCLUDE_DASHBOARD=false
      shift
      ;;
    --seed-admin-email)
      SEED_EMAIL=$2
      shift 2
      ;;
    --seed-admin-name)
      SEED_NAME=$2
      shift 2
      ;;
    --seed-admin-role)
      SEED_ROLE=$2
      shift 2
      ;;
    --seed-admin-label)
      SEED_LABEL=$2
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ ! -f $COMPOSE_FILE ]]; then
  echo "Compose file not found: $COMPOSE_FILE" >&2
  exit 1
fi

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE=(docker-compose)
else
  echo "docker compose is required but not installed." >&2
  exit 1
fi

log() {
  printf '\n[%s] %s\n' "$(date --iso-8601=seconds)" "$*"
}

log "Using compose file: $COMPOSE_FILE"

log "Building application images"
"${COMPOSE[@]}" -f "$COMPOSE_FILE" build api dashboard
"${COMPOSE[@]}" -f "$COMPOSE_FILE" --profile ops build migrator seed-admin

log "Starting data services (PostgreSQL, Redis, RabbitMQ)"
"${COMPOSE[@]}" -f "$COMPOSE_FILE" up -d postgres redis rabbitmq

if $RUN_MIGRATIONS; then
  log "Running Prisma migrations"
  "${COMPOSE[@]}" -f "$COMPOSE_FILE" --profile ops run --rm migrator
else
  log "Skipping Prisma migrations per flag"
fi

log "Starting API service"
"${COMPOSE[@]}" -f "$COMPOSE_FILE" up -d api

if $INCLUDE_DASHBOARD; then
  log "Starting dashboard service"
  "${COMPOSE[@]}" -f "$COMPOSE_FILE" up -d dashboard
else
  log "Dashboard start skipped"
fi

if [[ -n $SEED_EMAIL ]]; then
  log "Seeding initial admin credentials for $SEED_EMAIL"
  SEED_ARGS=("--email" "$SEED_EMAIL" "--role" "$SEED_ROLE" "--label" "$SEED_LABEL")
  if [[ -n $SEED_NAME ]]; then
    SEED_ARGS+=("--name" "$SEED_NAME")
  fi
  "${COMPOSE[@]}" -f "$COMPOSE_FILE" --profile ops run --rm seed-admin "${SEED_ARGS[@]}"
else
  log "Admin seeding skipped (no --seed-admin-email provided)"
fi

log "Stack bootstrap complete"
