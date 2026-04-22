# INTEGRATION Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Phase 1** — Read API docs. Endpoints needed. Sandbox available? Existing similar integration?
- **Third-party risk check** (new services only): SOC 2? PII processing? PIPEDA data residency? Pin API versions. Document fallback if service goes down.

**Phase 2** — Data contracts. Request/response schemas. Field mapping.
- Twilio: use `lib/twilio.ts` formatter for phones
- Kling AI: async task_id → poll via `/api/kling/status`
- Resend: verify svix webhook headers against `RESEND_WEBHOOK_SECRET`

**Phase 3** — Error/retry: timeout values, exponential backoff, rate limiting (429), idempotency

**Phase 4** — Security: Keys in `.env.local` → encrypt with `vault.sh` → NEVER commit. Validate webhook signatures. **CASL**: verify consent before outbound messages.

**Phase 5** — Integration tests against sandbox/mock
