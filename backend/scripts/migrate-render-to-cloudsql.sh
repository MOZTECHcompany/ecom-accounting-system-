#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  RENDER_DATABASE_URL='postgres://...' CLOUDSQL_DATABASE_URL='postgres://...' \
    ./backend/scripts/migrate-render-to-cloudsql.sh

Optional env:
  DUMP_FILE=render.backup   (default: ./render.backup)
  YES=1                     (skip confirmation prompt)

Notes:
- This script performs a full DB migration via pg_dump (custom) -> pg_restore.
- Keep app writes stopped during the dump/restore window.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

if [[ -z "${RENDER_DATABASE_URL:-}" || -z "${CLOUDSQL_DATABASE_URL:-}" ]]; then
  echo "ERROR: Please set RENDER_DATABASE_URL and CLOUDSQL_DATABASE_URL"
  echo
  usage
  exit 1
fi

for cmd in pg_dump pg_restore; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "ERROR: '$cmd' not found. On Alpine, run: apk add --no-cache postgresql-client"
    exit 1
  fi
done

DUMP_FILE="${DUMP_FILE:-./render.backup}"

cat <<EOF
About to migrate database:
  FROM (Render):   ${RENDER_DATABASE_URL%%\?*}
  TO   (Cloud SQL): ${CLOUDSQL_DATABASE_URL%%\?*}

Dump file:
  ${DUMP_FILE}

This will:
  1) pg_dump (custom format)
  2) pg_restore --clean --if-exists into destination

WARNING:
- Destination database will be modified (objects may be dropped/recreated).
- Ensure your app is STOPPED (no writes) during this process.
EOF

if [[ "${YES:-0}" != "1" ]]; then
  read -r -p "Type 'MIGRATE' to continue: " confirm
  if [[ "$confirm" != "MIGRATE" ]]; then
    echo "Aborted."
    exit 1
  fi
fi

echo "[1/2] Dumping from Render..."
pg_dump "$RENDER_DATABASE_URL" \
  --format=custom \
  --no-owner --no-privileges \
  -f "$DUMP_FILE"

echo "[2/2] Restoring into Cloud SQL (clean/if-exists)..."
pg_restore \
  --clean --if-exists \
  --no-owner --no-privileges \
  -d "$CLOUDSQL_DATABASE_URL" \
  "$DUMP_FILE"

echo "Done. Next steps:"
echo "- Point your backend DATABASE_URL to Cloud SQL"
echo "- Run: cd backend && npx prisma migrate deploy && npx prisma generate"
