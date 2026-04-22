# SECURITY_AUDIT Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Phase 1 — RLS**: Every table must have RLS enabled + tenant policy.

**Phase 2 — Webhooks**: Verify Resend svix headers, Twilio `validateRequest()`.

**Phase 3 — Secrets**: `grep -r "sk-" src/` = ZERO matches. `.env.local` in `.gitignore`.

**Phase 4 — FINTRAC**: `seller_identities` fields non-nullable.

**Phase 5 — CASL/TCPA**: Consent check before send, expiry cron, unsubscribe works without auth.

**Phase 6 — Input sanitization**: Zod on all POST/PATCH. No raw SQL. No `dangerouslySetInnerHTML` without sanitization.
