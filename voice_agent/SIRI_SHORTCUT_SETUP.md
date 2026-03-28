# Voice Agent — Siri & Google Assistant Setup

## How It Works

```
"Hey Siri, ask my realtor assistant how many active listings I have"
    → Siri dictates your voice → Shortcut sends to /api/quick → speaks response
```

## Prerequisites

1. **Voice agent running** on your machine (port 8768)
2. **Tunnel to expose localhost** (pick one):

```bash
# Option A: Cloudflare Tunnel (recommended — free, stable)
brew install cloudflared
cloudflared tunnel --url http://127.0.0.1:8768

# Option B: ngrok
ngrok http 8768
```

Copy the public URL (e.g., `https://abc123.trycloudflare.com`).

---

## Apple Siri Shortcut Setup

### Step 1: Create the Shortcut

1. Open **Shortcuts** app on iPhone/Mac
2. Tap **+** to create new shortcut
3. Name it: **"Ask Realtor Assistant"**

### Step 2: Add Actions

Add these actions in order:

1. **Dictate Text**
   - Language: English
   - Stop Listening: After Pause

2. **Get Contents of URL**
   - URL: `https://YOUR-TUNNEL-URL/api/quick`
   - Method: POST
   - Headers:
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer va-bridge-secret-key-2026`
   - Request Body: JSON
     - `message`: *Dictated Text*
     - `source`: `siri`

3. **Get Value from Dictionary**
   - Get: `response` from *Contents of URL*

4. **Speak Text**
   - Speak: *Dictionary Value*

### Step 3: Set Up Siri Trigger

1. Tap the shortcut name at top
2. **Add to Siri** → record phrase: "Ask my realtor assistant"
3. Now say: **"Hey Siri, ask my realtor assistant"**

### Alternative: Text Input Version

Replace step 1 with **Ask for Input** (text) for typing instead of voice.

---

## Google Assistant Setup (Android)

### Option A: Tasker + HTTP Request

1. Install **Tasker** from Play Store
2. Create a new Task:
   - Action: **HTTP Request**
     - Method: POST
     - URL: `https://YOUR-TUNNEL-URL/api/quick`
     - Headers: `Content-Type: application/json` and `Authorization: Bearer va-bridge-secret-key-2026`
     - Body: `{"message": "%avcomm", "source": "google"}`
   - Action: **Variable Set** → parse JSON response
   - Action: **Say** → speak the response
3. Create a **Tasker Shortcut** on home screen
4. Link to Google Assistant via **Routines**

### Option B: Google Home Routine

1. Open Google Home → **Routines**
2. Add starter: "Ask my realtor assistant"
3. Add action: **Custom action** → webhook to your tunnel URL

---

## API Reference

### POST /api/quick

One-shot endpoint — creates session, sends message, returns response.

```bash
curl -X POST https://YOUR-TUNNEL-URL/api/quick \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer va-bridge-secret-key-2026" \
  -d '{"message": "How many active listings do I have?", "source": "siri"}'
```

Response:
```json
{
  "ok": true,
  "response": "You've got 15 active listings...",
  "session_id": "abc123",
  "tools_used": ["search_properties"],
  "provider": "anthropic"
}
```

Pass `session_id` back in subsequent calls to maintain conversation context:
```bash
curl -X POST ... -d '{"message": "Tell me about the most expensive one", "session_id": "abc123"}'
```

---

## Testing

```bash
# Test locally before tunnel
curl -s http://127.0.0.1:8768/api/quick \
  -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer va-bridge-secret-key-2026" \
  -d '{"message": "What time is it?", "source": "test"}'
```
