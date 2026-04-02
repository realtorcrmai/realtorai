---
paths:
  - "voice_agent/**"
  - "src/components/voice-agent/**"
---

# Domain Rules: Voice Agent

- Backend: `voice_agent/server/` (Python 3.12+, aiohttp)
- Frontend: `src/components/voice-agent/`
- 4 LLM providers (Anthropic, OpenAI, Groq, Ollama). Fallback chain in config.
- 56 tools, 21 API routes. Dynamic tool selection by keyword.
- Preserve: Edge TTS caching, session focus tracking, context summarization, `_clean_for_voice()`
- **Multi-tenant:** Always use `getAuthenticatedTenantClient()` — never raw admin client (HC-12)
