#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
COMPOSE_FILE=${COMPOSE_FILE:-"$ROOT_DIR/docker/docker-compose.yml"}

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

printf '[%s] Running Prisma migrations...\n' "$(date --iso-8601=seconds)"
"${COMPOSE[@]}" -f "$COMPOSE_FILE" --profile ops run --rm migrator "$@"
