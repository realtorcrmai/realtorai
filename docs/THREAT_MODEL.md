<!-- docs-audit: created 2026-04-21 -->
# Threat Model — Realtors360 (STRIDE)

**Scope:** Security threat analysis for the Realtors360 CRM stack as of 2026-04-21.
**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege).
**Architecture:** Next.js 16 App Router (Vercel) → Supabase PostgreSQL (RLS) → Twilio / Anthropic / Resend (third-party APIs).

---

## Attack Surface Diagram

```
Internet
  │
  ├─ Browser (Realtor)
  │     └─ HTTPS → Vercel Edge (Next.js)
  │                   ├─ NextAuth JWT (auth.ts) — demo creds + Google OAuth
  │                   ├─ Server Actions (src/actions/) → Supabase (RLS)
  │                   ├─ API Routes (src/app/api/) → Supabase (RLS) + 3rd parties
  │                   │     ├─ /api/auth/[...nextauth]  ← NextAuth handler
  │                   │     ├─ /api/contacts, /listings, /showings ← CRUD
  │                   │     ├─ /api/cron/* ← Bearer CRON_SECRET required
  │                   │     └─ /api/webhooks/twilio ← Twilio signature required
  │                   └─ Outbound
  │                         ├─ Supabase (service role key — bypasses RLS)
  │                         ├─ Anthropic Claude API (PII in prompts)
  │                         ├─ Twilio (SMS/WhatsApp — phone numbers)
  │                         └─ Resend (email — contact PII)
  │
  └─ Twilio Webhook
        └─ POST /api/webhooks/twilio ← inbound SMS (YES/NO confirmation)
```

---

## S — Spoofing

### S-1: Demo Credential Exposure
**Threat:** `DEMO_EMAIL` / `DEMO_PASSWORD` env vars allow anyone with these credentials to log in as the demo user. If credentials leak (e.g., in a public PR or a Vercel preview URL), an attacker can access demo data.
**Current mitigation:** Credentials stored in `.env.local` (not committed). Demo user has a dedicated `realtor_id` with only sample data.
**Residual risk:** Medium. Vercel preview URLs are public by default; demo credentials could be in a shared Slack message.
**Recommended fix:** Add IP allowlist or magic-link only for demo access on preview deploys. Rotate demo password monthly.

### S-2: NextAuth JWT Tampering
**Threat:** JWT sessions signed with `NEXTAUTH_SECRET`. If the secret is weak or leaked, an attacker forges a JWT with any `realtor_id`.
**Current mitigation:** NextAuth v5 uses HS256 by default; secret sourced from env var.
**Residual risk:** Low if secret is strong (32+ chars random). Verify in Vercel dashboard — if secret is short or dictionary-based, rotate it.
**Recommended fix:** Enforce `NEXTAUTH_SECRET` minimum 32-char validation at startup (add to health-check.sh).

### S-3: Google OAuth Account Takeover
**Threat:** If a realtor's Google account is compromised, attacker can log into Realtors360 with full access.
**Current mitigation:** Standard Google OAuth flow; no additional MFA enforced at CRM layer.
**Residual risk:** Medium — outside our control. Document in user-facing security guide.

---

## T — Tampering

### T-1: Cross-Tenant Data Write (Primary Risk)
**Threat:** A malicious or buggy server action submits a mutation with a different `realtor_id`, writing data into another tenant's account.
**Current mitigation:** `getAuthenticatedTenantClient()` auto-injects `.eq("realtor_id", userId)`. Supabase RLS `INSERT WITH CHECK (realtor_id = auth.uid())` enforces at DB layer.
**Residual risk:** Low for app-layer actions. **High risk zone:** any code path that uses `createAdminClient()` without explicit `realtor_id` filtering (admin client bypasses RLS).
**Recommended fix:** Audit every call site of `createAdminClient()` quarterly. Enforce a lint rule: `createAdminClient` import forbidden in `src/actions/` and `src/app/api/` (only allowed in `src/lib/` admin utilities and cron routes).

### T-2: Twilio Webhook Replay / Forgery
**Threat:** An attacker crafts a fake Twilio webhook to `POST /api/webhooks/twilio` to confirm showings, send lockbox codes, or spam the system.
**Current mitigation:** Check `src/app/api/webhooks/twilio/route.ts` — Twilio signature validation should be present (`validateRequest` from `twilio` SDK).
**Residual risk:** If signature validation is missing or using the wrong URL, high risk.
**Recommended fix:** Verify `X-Twilio-Signature` header validation is implemented. Add integration test: unauthenticated POST to `/api/webhooks/twilio` returns 403.

### T-3: Migration File Tampering
**Threat:** A compromised developer machine or supply-chain attack modifies a migration `.sql` file before it's applied.
**Current mitigation:** Files committed to git; history is auditable.
**Residual risk:** Low. No automated migration runner — migrations are manually pasted into Supabase dashboard (an intentional human-gate).

---

## R — Repudiation

### R-1: No Immutable Audit Log
**Threat:** A realtor (or compromised agent) modifies or deletes data and denies doing so. `updated_at` timestamps can be faked if the user has direct DB access.
**Current mitigation:** `communications` table records all outbound messages (direction, channel, body, contact_id) — functions as a partial audit trail for messaging. `.claude/compliance-log.md` logs AI agent actions.
**Residual risk:** Medium. No write-protected audit table for user-facing CRUD (contact edits, listing updates, FINTRAC record changes).
**Recommended fix:** Add an `audit_log` table (entity_type, entity_id, action, old_value JSONB, new_value JSONB, performed_by, performed_at) with RLS set to INSERT-only (no UPDATE or DELETE). Trigger on `listings`, `contacts`, `seller_identities`.

### R-2: Agent Compliance Log Is Mutable
**Threat:** `.claude/compliance-log.md` is a plain file in the git repo. An AI agent could overwrite entries.
**Current mitigation:** Git history preserves the full log even if the file is modified.
**Residual risk:** Low. Accepted as a developer-process control, not a security control.

---

## I — Information Disclosure

### I-1: PII in Anthropic API Prompts (HC-11)
**Threat:** MLS remarks generation (`src/app/api/mls-remarks/`) and content generation (`src/actions/content.ts`) send listing address, seller details, and property info to Anthropic's Claude API. This is Canadian PII leaving Canada to a US-based processor.
**Current mitigation:** Anthropic's zero-data-retention policy on API requests (verify in API dashboard). No explicit data processing agreement (DPA) in place as of 2026-04-21.
**Residual risk:** Medium. Under PIPEDA, cross-border transfer to a third-party processor requires disclosure in privacy policy and reasonable protections.
**Recommended fix:** Add cross-border transfer disclosure to privacy policy. Execute Anthropic DPA. Document in `LEGAL_REVIEW_TRIGGERS.md` (trigger: any new PII field sent to AI).

### I-2: Supabase Anon Key Exposed Client-Side
**Threat:** `NEXT_PUBLIC_SUPABASE_ANON_KEY` is embedded in the browser bundle. An attacker can extract it and make direct API calls to Supabase.
**Current mitigation:** RLS policies enforce `auth.uid()` checks — anon key alone cannot read other tenants' data. Anonymous (unauthenticated) requests are blocked by RLS.
**Residual risk:** Low if RLS is correctly configured. High if any table has an overly permissive policy (`FOR ALL USING (true)`).
**Recommended fix:** Audit RLS policies annually. Run Supabase's policy linter. Ensure no table has a public SELECT policy unless intentional (e.g., public-facing listing search).

### I-3: `.env.local` Accidental Commit
**Threat:** Developer accidentally commits `.env.local` containing all API keys (Supabase service role key, Twilio auth token, Anthropic API key).
**Current mitigation:** `.env.local` is in `.gitignore`. `.env.vault` (encrypted) is the committed form.
**Residual risk:** Low with proper `.gitignore`. Medium if a developer uses a new tool that re-creates the file.
**Recommended fix:** Add a pre-commit hook that blocks commits containing strings matching `sk-ant-`, `supabase`, `twilio` in added files outside `.env.vault`. Already partially present in `.claude/hooks/`.

---

## D — Denial of Service

### D-1: No Rate Limiting on API Routes
**Threat:** An attacker or runaway script floods `/api/contacts`, `/api/listings`, or `/api/mls-remarks` with requests, exhausting Vercel compute and Supabase connection pool.
**Current mitigation:** Vercel's free tier has function invocation limits (acts as a soft cap). Anthropic API calls are the only rate-limited external dependency.
**Residual risk:** Medium. No explicit rate limiting middleware in any API route.
**Recommended fix:** Add `next-rate-limit` or Vercel Edge middleware with per-IP rate limiting on AI routes (5 req/min) and CRUD routes (60 req/min). Priority: AI routes first (token cost amplifies DoS).

### D-2: Twilio SMS Flooding
**Threat:** Attacker triggers many showing status changes to flood a seller's phone with SMS messages.
**Current mitigation:** Showing status transitions are gated by authenticated server actions. Only the logged-in realtor can change status.
**Residual risk:** Low — requires compromised realtor session.

### D-3: Resend Email Quota Exhaustion
**Threat:** A bug in the newsletter journey engine sends duplicate emails to all contacts, exhausting the monthly Resend quota.
**Current mitigation:** `send-governor.ts` enforces frequency caps per contact. `newsletter_events` table logs every send.
**Residual risk:** Low with governor in place. Monitor Resend dashboard for anomalous send volume spikes.

---

## E — Elevation of Privilege

### E-1: Admin Client Used in User-Facing Code (TD-003)
**Threat:** If `createAdminClient()` is called in a server action instead of the tenant client, the user's request executes with service role permissions — bypassing RLS and potentially accessing all tenants' data.
**Current mitigation:** Code convention documented in CLAUDE.md. No automated enforcement.
**Residual risk:** High if violated — no automated guard catches this at runtime.
**Recommended fix:** ESLint rule: `no-restricted-imports` for `../lib/supabase/admin` in `src/actions/` and `src/app/api/` (excluding `/api/cron/` and `/api/admin/`).

### E-2: Unauthenticated API Routes (TD-002)
**Threat:** An API route handler that forgets to check `getServerSession()` exposes data to unauthenticated callers.
**Current mitigation:** Most routes check session. Cron routes require `Authorization: Bearer <CRON_SECRET>`.
**Residual risk:** Medium. Manual review required — no automated test that all non-cron routes reject unauthenticated requests.
**Recommended fix:** Add auth-check test to `scripts/test-suite.sh` for every `/api/` route that is not `/api/auth/` or `/api/webhooks/twilio`.

### E-3: `plan` Field Not Enforced Server-Side
**Threat:** Feature flags gated on `user.plan` (free/professional/team) are currently enforced only in the UI. A user could call a server action directly without the UI guard.
**Current mitigation:** `users.plan` stored in DB — server actions could check it. Not all do.
**Residual risk:** Low for current feature set. Will become high if monetisation gates are added.
**Recommended fix:** Add a `requirePlan(minPlan)` helper in `src/lib/auth.ts` and use it in server actions for gated features.

---

## Residual Risk Summary

| ID | Category | Risk | Priority |
|----|----------|------|----------|
| E-1 | EoP | High | P1 — ESLint rule |
| T-2 | Tampering | High (if missing) | P1 — verify Twilio sig validation |
| D-1 | DoS | Medium | P2 — rate limiting middleware |
| I-1 | Info Disclosure | Medium | P2 — Anthropic DPA + privacy policy |
| S-1 | Spoofing | Medium | P2 — demo credential rotation |
| R-1 | Repudiation | Medium | P3 — audit_log table |
| E-2 | EoP | Medium | P2 — auth test coverage |
| I-2 | Info Disclosure | Low | P3 — annual RLS audit |
| I-3 | Info Disclosure | Low | P3 — pre-commit hook |
