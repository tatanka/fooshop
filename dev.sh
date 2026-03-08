#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
CONF="$ROOT/infra.conf"

# ── Colors ──────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

log()  { echo -e "${CYAN}▸${RESET} $1"; }
ok()   { echo -e "${GREEN}✓${RESET} $1"; }
fail() { echo -e "${RED}✗${RESET} $1"; exit 1; }
dim()  { echo -e "${DIM}  $1${RESET}"; }

# ── Load config ─────────────────────────────────────────
if [[ ! -f "$CONF" ]]; then
  fail "Missing $CONF — copy from infra.conf.example"
fi

set -a
source "$CONF"
set +a

POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-fooshop}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-fooshop}"
POSTGRES_DB="${POSTGRES_DB:-fooshop}"
APP_PORT="${APP_PORT:-3000}"

echo ""
echo -e "${BOLD}  fooshop dev${RESET}"
echo -e "${DIM}  ─────────────────────────────${RESET}"
dim "postgres  → localhost:$POSTGRES_PORT"
dim "app       → localhost:$APP_PORT"
echo ""

# ── Check dependencies ──────────────────────────────────
command -v docker >/dev/null 2>&1   || fail "docker not found"
command -v pnpm >/dev/null 2>&1     || fail "pnpm not found"

# ── Start infra ─────────────────────────────────────────
log "Starting infrastructure..."
docker compose --env-file "$CONF" up -d --wait 2>&1 | grep -v "^$" || true
ok "PostgreSQL ready on :$POSTGRES_PORT"

# ── Sync DATABASE_URL in .env ───────────────────────────
DB_URL="postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}"
ENV_FILE="$ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  cp "$ROOT/.env.example" "$ENV_FILE"
  log "Created .env from .env.example"
fi

# Update DATABASE_URL to match current infra.conf
if grep -q "^DATABASE_URL=" "$ENV_FILE"; then
  sed -i '' "s|^DATABASE_URL=.*|DATABASE_URL=$DB_URL|" "$ENV_FILE"
else
  echo "DATABASE_URL=$DB_URL" >> "$ENV_FILE"
fi

# Update NEXT_PUBLIC_APP_URL to match current port
if grep -q "^NEXT_PUBLIC_APP_URL=" "$ENV_FILE"; then
  sed -i '' "s|^NEXT_PUBLIC_APP_URL=.*|NEXT_PUBLIC_APP_URL=http://localhost:$APP_PORT|" "$ENV_FILE"
else
  echo "NEXT_PUBLIC_APP_URL=http://localhost:$APP_PORT" >> "$ENV_FILE"
fi

ok ".env synced with infra.conf"

# ── Push schema ─────────────────────────────────────────
log "Pushing DB schema..."
pnpm drizzle-kit push 2>&1 | tail -1
ok "Schema up to date"

# ── Start app ───────────────────────────────────────────
log "Starting Next.js on :$APP_PORT..."
echo ""
exec pnpm next dev --port "$APP_PORT"
