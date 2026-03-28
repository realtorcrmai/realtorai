# VOICE_AGENT Playbook

> Task type: `VOICE_AGENT:tool_dev`, `VOICE_AGENT:provider_switch`, `VOICE_AGENT:system_prompt`, `VOICE_AGENT:eval`

---

## Phase 1 — Identify Scope

- Backend: `voice_agent/server/` (Python 3.12+, aiohttp)
- Frontend: `src/components/voice-agent/` (TypeScript/React)
- Run with: `/opt/homebrew/bin/python3.14 voice_agent/server/main.py` (requires Python 3.12+)

## Phase 2 — Provider Awareness

- 4 LLM providers: Ollama, OpenAI, Anthropic, Groq
- Different tool-calling formats and token limits per provider
- Config: `voice_agent/server/config.py` + `.env`
- Fallback chain: `LLM_FALLBACK_CHAIN=anthropic,openai,ollama`
- Anthropic prompt caching enabled (`cache_control: ephemeral`) — saves ~90% on turns 2+

## Phase 3 — Tool Development (new voice commands)

1. Create API endpoint: `src/app/api/voice-agent/<resource>/route.ts`
2. Add tool schema to: `voice_agent/server/tools/realtor_tools.py` (REALTOR_TOOLS list)
3. Add handler in: `handle_realtor_tool()` function
4. 56 tools across 21 API routes
5. **Dynamic tool selection**: routed by message keywords (`SessionState.get_tools()` in `main.py`)
   - Core set (12 tools) always included
   - Additional tools activated by keyword matching
   - Session focus also activates relevant tools
   - Cuts tool tokens from ~8K to ~2.5K per turn

## Phase 4 — System Prompts

- `voice_agent/server/system_prompts.py` — 4 modes: realtor, client, generic, help
- Voice-optimized: 10 strict rules (no markdown, concise, natural speech, contractions)
- BC real estate knowledge embedded (forms, FINTRAC, terms, workflow phases)
- Form-fill mode for structured data extraction (JSON at end of response)

## Phase 5 — Key Features to Preserve

- Edge TTS endpoint (`/api/tts`) with LRU cache (100 entries) + 13 pre-rendered phrases
- Session focus tracking (`SessionState.focus`)
- Context summarization — compresses old turns after 20 messages, keeps last 12 verbatim
- `_clean_for_voice()` — strips markdown from responses before TTS
- Empty response retry + fallback messages

## Phase 6 — Testing

```bash
# Create session
curl -X POST localhost:8768/api/session/create -H "Content-Type: application/json" -H "Authorization: Bearer va-bridge-secret-key-2026" -d '{"mode":"realtor"}'
# Send chat
curl -X POST localhost:8768/api/chat -H "Content-Type: application/json" -H "Authorization: Bearer va-bridge-secret-key-2026" -d '{"session_id":"ID","message":"How many active listings?"}'
# Test TTS
curl -o /tmp/test.mp3 -X POST localhost:8768/api/tts -H "Content-Type: application/json" -H "Authorization: Bearer va-bridge-secret-key-2026" -d '{"text":"Hello testing"}'
```

## Phase 7 — Verify Fallback Chain

- Test with each provider active
- Verify tool-calling works with selected provider
- Check timeout handling for slow providers (Ollama can take 30s+)
- Verify prompt caching: second turn should show `cache_read_input_tokens` > 0
