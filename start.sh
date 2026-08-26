#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT/backend"
FRONTEND_DIR="$ROOT/frontend"
LOG_DIR="$ROOT/logs"
ENV_FILE="$ROOT/.env"

# ── Load .env if it exists ─────────────────────────────────────────────────────
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

BACKEND_PORT="${BACKEND_PORT:-8101}"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"

# Get local IP for mobile access display
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")

clear
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║           B O D Y L O G  🏋️              ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Pre-flight checks ──────────────────────────────────────────────────────────
check_command() {
  if ! command -v "$1" &>/dev/null; then
    echo "  ✗ $1 not found. Please install it and try again."
    exit 1
  fi
}

check_command python3
check_command node
check_command npm

# ── Python virtual environment ─────────────────────────────────────────────────
VENV_DIR="$ROOT/.venv"
if [ ! -d "$VENV_DIR" ]; then
  echo "  ⚙  Creating Python virtual environment..."
  python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

# Install/update Python deps
pip install -q -r "$BACKEND_DIR/requirements.txt"

# ── Frontend dependencies ──────────────────────────────────────────────────────
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  echo "  ⚙  Installing frontend dependencies (first run)..."
  npm --prefix "$FRONTEND_DIR" install --silent
fi

# ── Start backend ──────────────────────────────────────────────────────────────
echo ""
echo "  Starting backend..."
(cd "$BACKEND_DIR" && uvicorn main:app \
  --host 0.0.0.0 \
  --port "$BACKEND_PORT" \
  --log-level warning \
  >> "$LOG_DIR/backend.log" 2>&1) &
BACKEND_PID=$!

# ── Start frontend ─────────────────────────────────────────────────────────────
echo "  Starting frontend..."
npm --prefix "$FRONTEND_DIR" run dev -- --port "$FRONTEND_PORT" \
  >> "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# ── Wait for backend to be ready ──────────────────────────────────────────────
MAX_WAIT=15
WAITED=0
printf "  Waiting for backend"
while ! curl -sf "http://localhost:$BACKEND_PORT/api/status" > /dev/null 2>&1; do
  sleep 1
  WAITED=$((WAITED + 1))
  printf "."
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo ""
    echo "  ✗ Backend did not start in time. Check logs/backend.log"
    exit 1
  fi
done
echo " ready"

# ── Status banner ──────────────────────────────────────────────────────────────
TELEGRAM_STATUS="disabled (add TELEGRAM_BOT_TOKEN to .env)"
if [ -n "${TELEGRAM_BOT_TOKEN:-}" ]; then
  TELEGRAM_STATUS="enabled ✓"
fi

echo ""
echo "  ┌──────────────────────────────────────────┐"
echo "  │  ✓ Backend running (PID $BACKEND_PID)         "
echo "  │  ✓ Frontend running (PID $FRONTEND_PID)       "
echo "  │  ✓ JSON database loaded                   "
echo "  │  ◎ Telegram: $TELEGRAM_STATUS"
echo "  │                                            │"
echo "  │  Dashboard (PC):                           │"
echo "  │    http://localhost:$FRONTEND_PORT             │"
echo "  │                                            │"
echo "  │  Dashboard (Mobile, same Wi-Fi):           │"
echo "  │    http://$LOCAL_IP:$FRONTEND_PORT              │"
echo "  │                                            │"
echo "  │  Backend API:                              │"
echo "  │    http://localhost:$BACKEND_PORT              │"
echo "  │                                            │"
echo "  │  Logs: ./logs/                             │"
echo "  └──────────────────────────────────────────┘"
echo ""
echo "  Press Ctrl+C to stop all services."
echo ""

# ── Cleanup on exit ────────────────────────────────────────────────────────────
cleanup() {
  echo ""
  echo "  Stopping BodyLog..."
  kill "$BACKEND_PID"  2>/dev/null || true
  kill "$FRONTEND_PID" 2>/dev/null || true
  # Kill any child processes
  pkill -P "$BACKEND_PID"  2>/dev/null || true
  pkill -P "$FRONTEND_PID" 2>/dev/null || true
  echo "  Stopped. Goodbye!"
}
trap cleanup INT TERM

wait "$BACKEND_PID" "$FRONTEND_PID"
