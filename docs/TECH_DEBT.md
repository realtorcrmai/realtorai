# Realtors360 CRM — Tech Debt Registry

Last updated: 2026-03-26

---

## Critical (Security / Data Integrity)

### TD-001: RLS Policies Grant Anon Full Access
**Files:** `supabase/migrations/003_allow_anon_role.sql` + all subsequent migrations
**Impact:** Anyone with the public anon key (exposed in client JS) can read/write/delete ALL data in every table
**Fix:** Remove anon policies, implement user-scoped RLS with `auth.uid()` checks
**Effort:** Large (every table needs proper policies)

### TD-002: 10+ Unauthenticated API Routes with Write Access
**File:** `src/middleware.ts` lines 11-25
**Routes:** `/api/contacts/log-interaction`, `/api/contacts/context`, `/api/contacts/instructions`, `/api/contacts/watchlist`, `/api/contacts/journey`, `/api/newsletters/edit`, `/api/listings/blast`
**Impact:** Anyone can send bulk emails, modify contact data, write to activity logs without authentication
**Fix:** Add auth checks inside each route, or remove from middleware bypass list

### TD-003: Admin Client Silently Falls Back to Anon Key
**File:** `src/lib/supabase/admin.ts` lines 10-18
**Impact:** If `SUPABASE_SERVICE_ROLE_KEY` is missing, admin client uses anon key with no warning
**Fix:** Throw error if service role key is missing in production

---

## High Priority (Correctness / Features)

### TD-004: 100+ `as any` Type Assertions
**Files:** `src/actions/newsletters.ts` (~15), `src/actions/control-panel.ts` (~20), `src/app/(dashboard)/newsletters/page.tsx` (~25), `src/lib/ai-agent/*.ts` (~20), others
**Root Cause:** `src/types/database.ts` only covers ~10 core tables but 30+ tables exist in migrations
**Fix:** Generate types with `npx supabase gen types typescript` and replace `database.ts`
**Effort:** Medium (generation is automatic, but all `as any` casts need manual cleanup)

### TD-005: Duplicate Migration Numbers
**Files:** `050_add_property_type.sql` + `050_consent_compliance.sql`, `051_casl_tcpa_compliance.sql` + `051_realtor_agent_config.sql`, `052_contact_extras.sql` + `052_extended_listing_statuses.sql`, `053_add_email_pref_channel.sql` + `053_grant_table_access.sql`
**Impact:** Migration ordering is fragile/unpredictable
**Fix:** Renumber to unique sequential numbers

### TD-006: 3 Cron Endpoints Not Scheduled
**File:** `vercel.json`
**Missing:** `/api/cron/agent-evaluate`, `/api/cron/agent-recommendations`, `/api/cron/agent-scoring`
**Impact:** AI agent scoring, evaluation, and recommendations never run automatically
**Fix:** Add to vercel.json crons section

### TD-007: CASL Consent Expiry Cron is a No-Op
**File:** `src/app/api/cron/consent-expiry/route.ts` line 49
**Impact:** Detects expiring consents but never sends re-confirmation emails (TODO comment)
**Fix:** Implement email send for expiring consents
**Compliance Risk:** CASL violation if continuing to email contacts with expired consent

### TD-008: Hardcoded Localhost Fallbacks in Production Code
**Files:** `src/lib/email-builder.ts:57`, `src/lib/resend.ts:62`, `src/lib/features.ts:93`, `src/actions/content.ts:13`, `src/app/(dashboard)/page.tsx:284`
**Impact:** If `NEXT_PUBLIC_APP_URL` is unset, email links, unsubscribe URLs, and service calls use `localhost`
**Fix:** Fail loudly at startup if required env vars are missing

---

## Medium Priority (Code Quality / Performance)

### TD-009: Inconsistent Cron Auth Patterns
**Files:** Various `src/app/api/cron/*/route.ts`
**Issue:** Some crons skip auth if `CRON_SECRET` is unset (fail-open), others return 500 (fail-closed)
**Fix:** Standardize to fail-closed pattern across all cron routes

### TD-010: 10 Console.log Statements in Production Paths
**Files:** `src/lib/email/send.ts:104,122,125` (logs full email payloads), `src/lib/workflow-engine.ts:466`, `src/lib/rate-limit.ts:36`, `src/lib/forms/template-sync.ts:43,63,70,123`
**Fix:** Replace with structured logger or remove

### TD-011: Empty `next.config.ts`
**File:** `next.config.ts`
**Missing:** Security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options), image domain allowlist, output configuration
**Fix:** Add security headers and image domain config

### TD-012: All 34 Dashboard Pages Use `force-dynamic`
**Files:** Every `src/app/(dashboard)/*/page.tsx`
**Impact:** Zero static optimization or ISR — every page request hits the server
**Fix:** Evaluate which pages could use ISR (e.g., `/search`, `/content`, static guides)

### TD-013: next-auth v5 Beta in Production
**File:** `package.json` — `next-auth: ^5.0.0-beta.30`
**Impact:** Beta releases may have breaking changes between versions
**Fix:** Pin exact version or evaluate stable alternatives

### TD-014: Unused Dependencies
**File:** `package.json`
- `moment` (v2.30.1) — not imported anywhere, `date-fns` is used instead. Adds ~300KB
- `@netlify/plugin-nextjs` (v5.15.9) — deploying to Vercel, not Netlify
**Fix:** `npm uninstall moment @netlify/plugin-nextjs`

### TD-015: Stale Launch Config
**File:** `.claude/launch.json` line 9
**Issue:** ~~`cwd` referenced hardcoded local path~~ **FIXED** — now uses `"."` (relative to repo root)
**Fix:** ✅ Resolved

---

## Low Priority (Cleanup)

### TD-016: 8 TODO Comments Marking Incomplete Features
| File | Line | TODO |
|------|------|------|
| `src/lib/validators/index.ts` | 118 | Pass realtor ID for multi-tenant |
| `src/lib/text-pipeline.ts` | 195 | Verify addresses against listings table |
| `src/lib/validators/compliance-gate.ts` | 89 | Hard-block CASL contacts without consent |
| `src/lib/validators/compliance-gate.ts` | 147 | Use realtor's timezone instead of server |
| `src/lib/validators/compliance-gate.ts` | 161 | Check realtor_agent_config.sending_enabled |
| `src/lib/quality-pipeline.ts` | 274 | Correlate per-dimension scores with outcomes |
| `src/app/api/cron/consent-expiry/route.ts` | 49 | Send re-confirmation emails (see TD-007) |
| `src/actions/newsletters.ts` | 20 | Fetch branding from realtor profile |

### TD-017: Orphaned Components
**Files to verify:** `src/components/newsletters/RelationshipsTab.tsx`, `src/components/newsletters/JourneysTab.tsx`
**Issue:** No longer imported after tab consolidation, but still in codebase
**Fix:** Delete or archive

### TD-018: Demo Credentials Hardcoded
**File:** `src/lib/auth.ts` lines 13-14
**Issue:** Default `demo@realestatecrm.com` / `demo1234` if env vars unset
**Fix:** Require env vars in production, remove hardcoded fallbacks

### TD-019: Test Endpoint Ships in Production Build
**File:** `src/app/api/test/generate-newsletter/route.ts`
**Issue:** Checks `NODE_ENV` at runtime but route is still compiled and deployed
**Fix:** Move to separate test directory excluded from production build, or delete

---

## Metrics

| Metric | Value |
|--------|-------|
| Total files in `src/` | ~200+ |
| Migration files | 53 |
| API routes | 50+ |
| Dashboard pages | 34 |
| `as any` usage | 100+ |
| Test coverage | Script-based only (no unit tests) |
| Bundle size impact of dead deps | ~300KB (moment.js) |
