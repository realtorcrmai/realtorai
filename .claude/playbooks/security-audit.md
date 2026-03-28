# SECURITY_AUDIT Playbook

> Task type: `SECURITY_AUDIT:rls`, `SECURITY_AUDIT:webhooks`, `SECURITY_AUDIT:secrets`, `SECURITY_AUDIT:compliance`

---

## Phase 1 — RLS

- Every table: `ALTER TABLE x ENABLE ROW LEVEL SECURITY`
- Policy: `CREATE POLICY x ON table FOR ALL USING (auth.role() = 'authenticated')`
- Check: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN (SELECT tablename FROM pg_policies)`

## Phase 2 — Webhooks

- Resend: verify `svix-id`, `svix-timestamp`, `svix-signature` against `RESEND_WEBHOOK_SECRET`
- Twilio: `twilio.validateRequest()` with `TWILIO_AUTH_TOKEN`
- Check all routes in `src/app/api/webhooks/`

## Phase 3 — Secrets

- `grep -r "sk-" src/` — should find ZERO matches
- Verify `.env.local` in `.gitignore`
- `./scripts/vault.sh status` — all keys masked, vault encrypted

## Phase 4 — FINTRAC Compliance

- `seller_identities` fields non-nullable: `full_name`, `dob`, `citizenship`, `id_type`, `id_number`, `id_expiry`
- Verify identity collection in Phase 1 workflow

## Phase 5 — CASL/TCPA

- Outbound messages must check `consent_status` before sending
- `/api/cron/consent-expiry` processes expiring consents
- Unsubscribe endpoint must work without auth

## Phase 6 — Input Sanitization

- Zod on all POST/PATCH endpoints
- No raw SQL (use Supabase client parameterized queries)
- No `dangerouslySetInnerHTML` without sanitization
