#!/bin/bash
# ─────────────────────────────────────────────────────────────────────
#  RealtorAI BC — Unified Launcher
#  Starts both the Next.js CRM app and the Python BC Forms server
# ─────────────────────────────────────────────────────────────────────

cd "$(dirname "$0")"
SCRIPT_DIR="$(pwd)"
FORMS_DIR="$SCRIPT_DIR/../"   # CoWork root (where server.py lives)
PORT_NEXT=3000
PORT_FORMS=8767

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  🏠  RealtorAI BC  —  Unified CRM + Forms Platform"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── 1. Check Node.js ───────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  echo "❌  Node.js not found. Install from https://nodejs.org"
  read -p "Press Enter to exit…"; exit 1
fi
NODE_VER=$(node --version)
echo "✅  Node.js $NODE_VER"

# ── 2. Check Python ────────────────────────────────────────────────
if ! command -v python3 &>/dev/null; then
  echo "❌  Python 3 not found."
  read -p "Press Enter to exit…"; exit 1
fi
echo "✅  Python $(python3 --version)"

# ── 3. Install Node dependencies if needed ─────────────────────────
if [ ! -d "node_modules" ]; then
  echo ""
  echo "📦  Installing Node dependencies (first run — may take a minute)…"
  npm install --legacy-peer-deps
  echo "✅  Node modules installed"
fi

# ── 4. Check reportlab for forms ──────────────────────────────────
if ! python3 -c "import reportlab" 2>/dev/null; then
  echo "📦  Installing reportlab…"
  pip3 install reportlab --break-system-packages -q
fi

# ── 5. Start Python BC Forms Server ───────────────────────────────
echo ""
echo "🐍  Starting BC Forms server on port $PORT_FORMS…"
cd "$FORMS_DIR"
python3 server.py &
FORMS_PID=$!

# Wait for forms server to be ready
for i in $(seq 1 10); do
  if curl -s "http://127.0.0.1:$PORT_FORMS/api/health" > /dev/null 2>&1; then
    echo "✅  BC Forms server ready → http://127.0.0.1:$PORT_FORMS"
    break
  fi
  sleep 0.5
done

# ── 6. Start Next.js CRM App ──────────────────────────────────────
echo ""
echo "⚡  Starting RealtorAI CRM (Next.js)…"
cd "$SCRIPT_DIR"
FORM_SERVER_URL="http://127.0.0.1:$PORT_FORMS" npm run dev &
NEXT_PID=$!

# Wait for Next.js
echo "⏳  Waiting for Next.js to compile…"
sleep 6
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  ✅  All services running!"
echo ""
echo "  🌐  CRM App  →  http://localhost:$PORT_NEXT"
echo "  📋  BC Forms →  http://localhost:$PORT_NEXT/forms"
echo "  🗂  Workflow  →  http://localhost:$PORT_NEXT/workflow"
echo "  📤  Import   →  http://localhost:$PORT_NEXT/import"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Press Ctrl+C to stop all services."
echo ""

# Open browser
open "http://localhost:$PORT_NEXT" 2>/dev/null || true

# ── Cleanup on exit ───────────────────────────────────────────────
cleanup() {
  echo ""
  echo "🛑  Shutting down…"
  kill $NEXT_PID 2>/dev/null
  kill $FORMS_PID 2>/dev/null
  echo "Goodbye! 👋"
  exit 0
}
trap cleanup SIGINT SIGTERM

wait
