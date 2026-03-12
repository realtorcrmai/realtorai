#!/bin/bash
PORT=8767
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
cd "$(dirname "$0")" || exit 1

echo ""
echo "  🏡  ListingFlow — BC Real Estate AI Agent"
echo "  ──────────────────────────────────────────"

# ── Find Python 3 ─────────────────────────────────────────────────────────────
PYTHON=""
for p in /usr/bin/python3 /usr/local/bin/python3 /opt/homebrew/bin/python3 $(which python3 2>/dev/null); do
  if "$p" -c "import sys; sys.exit(0 if sys.version_info >= (3,8) else 1)" 2>/dev/null; then
    PYTHON="$p"; break
  fi
done
if [ -z "$PYTHON" ]; then
  echo "  ❌  Python 3.8+ not found. Install from python.org or: brew install python3"
  read -n1 -r -p "  Press any key to close…"; exit 1
fi

# ── Check reportlab ────────────────────────────────────────────────────────────
if ! "$PYTHON" -c "import reportlab" 2>/dev/null; then
  echo "  ⏳  Installing reportlab (one-time setup)…"
  "$PYTHON" -m pip install reportlab --quiet --user 2>&1 | grep -v "already satisfied" | head -5
  if ! "$PYTHON" -c "import reportlab" 2>/dev/null; then
    echo "  ❌  Could not install reportlab. Try: pip3 install reportlab"
    read -n1 -r -p "  Press any key to close…"; exit 1
  fi
  echo "  ✔   reportlab installed"
fi

# ── Kill any old server on port ────────────────────────────────────────────────
lsof -ti tcp:$PORT 2>/dev/null | xargs kill -9 2>/dev/null; sleep 0.3

# ── Start ListingFlow API server ───────────────────────────────────────────────
"$PYTHON" server.py &
SERVER_PID=$!

echo "  ✔   Python : $PYTHON"
echo "  ✔   Server : http://127.0.0.1:$PORT  (PDF generation enabled)"

# ── Wait for server to be ready ────────────────────────────────────────────────
for i in $(seq 1 30); do
  sleep 0.25
  /usr/bin/curl -sf --max-time 1 "http://127.0.0.1:$PORT/api/health" -o /dev/null 2>/dev/null && break
done

# ── Open browser ───────────────────────────────────────────────────────────────
URL="http://127.0.0.1:$PORT"
if [ -f "$CHROME" ]; then
  "$CHROME" --app="$URL" --window-size=1680,980 --window-position=30,30 \
            --no-first-run --no-default-browser-check > /dev/null 2>&1 &
  echo "  ✔   Browser: Chrome (app mode)"
else
  open "$URL"
  echo "  ✔   Browser: default browser"
fi

echo ""
echo "  ✅  ListingFlow is running."
echo "  📄  PDF forms: all 12 BC standard forms available (DORTS, MLC, PDS, FINTRAC…)"
echo "  ⚡  API server: http://127.0.0.1:$PORT/api/form"
echo ""
echo "  Keep this window open while using ListingFlow."
echo "  Press Ctrl+C to stop."
echo ""

trap "echo ''; echo '  Stopping ListingFlow…'; kill $SERVER_PID 2>/dev/null; exit 0" INT TERM EXIT
wait $SERVER_PID
