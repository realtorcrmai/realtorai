#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Ask Realtor Assistant — macOS voice integration
#  Usage:
#    ./ask-realtor.sh                  # dictate via mic
#    ./ask-realtor.sh "your question"  # pass text directly
# ═══════════════════════════════════════════════════════════════

API_URL="${REALTOR_API_URL:-http://127.0.0.1:8768}"
API_KEY="va-bridge-secret-key-2026"
SESSION_FILE="/tmp/realtor-assistant-session"

# Restore session for multi-turn conversations
SESSION_ID=""
if [ -f "$SESSION_FILE" ]; then
  SESSION_ID=$(cat "$SESSION_FILE")
fi

# Get the question — from arg or dictation
if [ -n "$1" ]; then
  QUESTION="$*"
else
  # Use macOS dictation via AppleScript
  QUESTION=$(osascript -e '
    tell application "System Events"
      display dialog "Ask your Realtor Assistant:" default answer "" buttons {"Cancel", "Ask"} default button "Ask" with title "Realtor Assistant" with icon note
      return text returned of result
    end tell
  ' 2>/dev/null)

  if [ -z "$QUESTION" ]; then
    echo "No question provided."
    exit 1
  fi
fi

echo "🎙  You: $QUESTION"
echo "⏳ Thinking..."

# Build JSON payload
if [ -n "$SESSION_ID" ]; then
  PAYLOAD=$(printf '{"message": %s, "session_id": %s, "source": "mac"}' \
    "$(echo "$QUESTION" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')" \
    "$(echo "$SESSION_ID" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')")
else
  PAYLOAD=$(printf '{"message": %s, "source": "mac"}' \
    "$(echo "$QUESTION" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read().strip()))')")
fi

# Call the API
RESPONSE=$(curl -s --max-time 30 "$API_URL/api/quick" \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $API_KEY" \
  -d "$PAYLOAD" 2>/dev/null)

# Parse response
ANSWER=$(echo "$RESPONSE" | python3 -c "import sys,json; data=json.load(sys.stdin); print(data.get('response', data.get('error', 'No response')))" 2>/dev/null)
NEW_SID=$(echo "$RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin).get('session_id', ''))" 2>/dev/null)
TOOLS=$(echo "$RESPONSE" | python3 -c "import sys,json; t=json.load(sys.stdin).get('tools_used',[]); print(', '.join(t) if t else 'none')" 2>/dev/null)

# Save session for follow-up
if [ -n "$NEW_SID" ]; then
  echo "$NEW_SID" > "$SESSION_FILE"
fi

echo "🤖 Assistant: $ANSWER"
echo "   [tools: $TOOLS]"

# Speak the response using macOS TTS
say -v Samantha "$ANSWER" &
