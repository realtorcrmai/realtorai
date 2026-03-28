# INTEGRATION Playbook

> Task type: `INTEGRATION:api_connect`, `INTEGRATION:webhook`, `INTEGRATION:auth`, `INTEGRATION:data_sync`

---

## Phase 1 — API Research

Read API docs. Endpoints needed. Sandbox available? Existing similar integration?

**Third-party risk check (new services only):**
1. SOC 2 or equivalent security certification?
2. Does service process PII? → Section 14.2 rules apply
3. Data processing agreement covering Canadian data residency (PIPEDA)?
4. Pin API versions — never track `latest`
5. If service goes down, what breaks? Document fallback.

## Phase 2 — Data Contracts

Request/response schemas. Field mapping.
- Twilio: use `lib/twilio.ts` formatter for phones
- Kling AI: async task_id → poll via `/api/kling/status`
- Resend: verify svix webhook headers against `RESEND_WEBHOOK_SECRET`

## Phase 3 — Error/Retry

Timeout values, exponential backoff, rate limiting (429), idempotency

## Phase 4 — Security

- Keys in `.env.local` → encrypt with `vault.sh` → NEVER commit
- Validate webhook signatures
- **CASL**: verify consent before outbound messages
- Vault workflow: `decrypt → edit → encrypt → commit .env.vault → tell team`

## Phase 5 — Integration Tests

Against sandbox/mock
