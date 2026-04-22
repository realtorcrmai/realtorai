# VOICE_AGENT Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Phase 1 — Identify scope**
- Backend: `voice_agent/server/` (Python 3.12+, aiohttp)
- Frontend: `src/components/voice-agent/` (TypeScript/React)

**Phase 2 — Provider awareness**
- 4 LLM providers: Ollama, OpenAI, Anthropic, Groq
- Config: `voice_agent/server/config.py` + `.env`
- Fallback chain: `LLM_FALLBACK_CHAIN=anthropic,openai,ollama`
- Prompt caching enabled (`cache_control: ephemeral`)

**Phase 3 — Tool development** (for new voice commands)
1. Create API endpoint: `src/app/api/voice-agent/<resource>/route.ts`
2. Add tool schema to: `voice_agent/server/tools/realtor_tools.py`
3. Add handler in: `handle_realtor_tool()` function
4. 56 tools across 21 API routes
5. **Dynamic tool selection**: tools routed by message keywords (see `SessionState.get_tools()`)

**Phase 4 — System prompts**
- `voice_agent/server/system_prompts.py` — 4 modes: realtor, client, generic, help
- Voice-optimized: 10 strict rules (no markdown, concise, natural speech)
- BC real estate knowledge embedded

**Phase 5 — Key features to preserve**
- Edge TTS with LRU cache + 13 pre-rendered phrases, session focus tracking
- Context summarization (compresses after 20 msgs), `_clean_for_voice()` strips markdown

**Phase 6 — Testing**
```bash
curl -X POST localhost:8768/api/session/create -H "Content-Type: application/json" -H "Authorization: Bearer va-bridge-secret-key-2026" -d '{"mode":"realtor"}'
curl -X POST localhost:8768/api/chat -H "Content-Type: application/json" -H "Authorization: Bearer va-bridge-secret-key-2026" -d '{"session_id":"ID","message":"How many active listings?"}'
```

**Phase 7 — Verify fallback chain** — test each provider, verify tool-calling, check timeouts
