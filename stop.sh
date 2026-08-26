#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$ROOT/.env"

if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BACKEND_PORT="${BACKEND_PORT:-8101}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

echo ""
echo "  Stopping BodyLog..."

stopped_any=false
for port in "$BACKEND_PORT" "$FRONTEND_PORT"; do
  pids=$(lsof -ti ":$port" 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "  ✓ Killing process(es) on port $port: $pids"
    kill $pids 2>/dev/null || true
    stopped_any=true
  fi
done

if [ "$stopped_any" = false ]; then
  echo "  ◎ Nothing was running on port $BACKEND_PORT or $FRONTEND_PORT."
else
  echo "  Stopped. Goodbye!"
fi
echo ""
