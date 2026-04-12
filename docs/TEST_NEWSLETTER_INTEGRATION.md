<!-- docs-audit: realtors360-newsletter/**, scripts/qa-test-email* -->
# Newsletter Engine Integration Test Suite

**Last run:** 2026-04-11 | **Result:** 2000/2015 passed, 0 failures, 15 skipped
**Script:** `scripts/integration-test-newsletter.sh`
**Results:** `test-results/newsletter-integration-results.json`

## How to Run

```bash
# Full suite (2000 tests, ~60 seconds)
bash scripts/integration-test-newsletter.sh

# Requires .env.local with:
# NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET
# Dev server must be running on localhost:3000
```

## 20 Test Categories (100 tests each)

| # | Category | Tests | What It Covers |
|---|----------|-------|----------------|
| 1 | **Schema** | 100 | 19 tables exist, 82 columns verified, 4 constraint checks |
| 2 | **Templates** | 100 | 18 email types, status distribution, template registry, structure validation |
| 3 | **Contacts** | 100 | Types, email presence, CASL consent, unsubscribe, channels, intelligence, stages, households, relationships |
| 4 | **Compliance** | 150 | Unsubscribe endpoint, CASL 100%, sent emails have unsubscribe link, consent records, webhooks, quiet hours |
| 5 | **Frequency** | 100 | Realtor agent config, email event rules, send mode distribution, caps |
| 6 | **Validation** | 100 | Quality scores, AI context, no sent emails without HTML/subject, idempotency keys |
| 7 | **Generation** | 100 | AI-generated newsletter count, context objects |
| 8 | **Rendering** | 100 | HTML body presence, valid HTML structure, size limits |
| 9 | **Sending** | 100 | Resend message IDs, sent_at timestamps, failed count |
| 10 | **Webhooks** | 100 | Event type distribution (opened/clicked/bounced/delivered), webhook auth |
| 11 | **Journeys** | 100 | Journey count, types, phases, paused status |
| 12 | **Workflows** | 100 | Blueprints, steps, enrollments |
| 13 | **Crons** | 100 | 12 cron endpoints: no-auth rejected (401), wrong-auth rejected (401), valid-auth succeeds (200) |
| 14 | **Agent** | 100 | M5 tables: agent_runs, agent_decisions, agent_drafts, contact_trust_levels |
| 15 | **Greetings** | 100 | 11 occasions, greeting cron execution, contact dates |
| 16 | **Segments** | 100 | Contact segments table, rules, names |
| 17 | **Analytics** | 100 | Event totals, open/click/bounce rates |
| 18 | **Learning** | 100 | Weekly learning cron execution, intelligence updates |
| 19 | **Multi-tenancy** | 100 | realtor_id column on 9 tables, API auth enforcement on 6 routes |
| 20 | **Edge Cases** | 100 | Null contact_id, invalid UUID, empty subject, long subject, idempotency |

## Tables Tested (19)

**Core:** newsletters, newsletter_events, newsletter_templates, contact_journeys, message_templates, contact_segments, consent_records, realtor_agent_config, communications, contacts

**M2+ Engine:** email_events, email_event_rules, saved_searches, email_template_registry, market_stats_cache

**M5 Agent:** agent_runs, agent_decisions, agent_drafts, contact_trust_levels

## Cron Endpoints Tested (12)

All verified to reject unauthenticated requests (401):
- `/api/cron/process-workflows`
- `/api/cron/agent-evaluate`
- `/api/cron/agent-recommendations`
- `/api/cron/agent-scoring`
- `/api/cron/consent-expiry`
- `/api/cron/daily-digest`
- `/api/cron/greeting-automations`
- `/api/cron/social-publish`
- `/api/cron/voice-session-cleanup`
- `/api/cron/weekly-learning`
- `/api/newsletters/process`
- `/api/reminders/check`

## Compliance Checks

- CASL consent: 100% of contacts have `casl_consent_given=true`
- Sent emails contain "unsubscribe" link in HTML body
- Unsubscribe endpoint rejects missing/invalid IDs
- Consent expiry cron runs and returns expected structure
- Resend webhook rejects unsigned payloads
- Frequency caps defined: 3/wk buyers, 2/wk sellers
- Quiet hours: 8pm-7am
- Bounce suppression active

## Multi-tenancy Verification

9 tables verified to have `realtor_id` column:
newsletters, contact_journeys, email_events, email_event_rules, realtor_agent_config, agent_runs, agent_decisions, agent_drafts, contact_trust_levels

6 API routes verified to require authentication (return 401 without session):
/api/contacts, /api/listings, /api/tasks, /api/deals, /api/reports, /api/dashboard/stats

## Skipped Tests (15)

Tests skipped due to pending migrations or no data:
- `newsletters.idempotency_key` — column in pending migration
- `email_events.claimed_by` — column in pending migration
- Various email types with 0 newsletters in DB (not yet generated)

## How to Add Tests

1. Open `scripts/integration-test-newsletter.sh`
2. Find the category (e.g., `CAT="compliance"`)
3. Add assertions using the helpers:
   - `pass "description"` — mark test passed
   - `fail "name" "detail"` — mark test failed
   - `skip "name" "reason"` — mark test skipped
   - `api_get "table?query"` — GET from Supabase REST API
   - `api_count "table?query"` — GET count from content-range header
   - `api_post_status "table" '{"json":"body"}'` — POST and return HTTP status
   - `app_status "/path"` — GET app route status code
   - `table_exists "name"` — check if table exists
   - `col_exists "table" "column"` — check if column exists

## Related Test Scripts

| Script | Tests | Purpose |
|--------|-------|---------|
| `scripts/test-suite.sh` | 89 | Core CRM test suite (navigation, CRUD, auth, constraints) |
| `scripts/integration-test-newsletter.sh` | 2000 | Newsletter engine integration (this file) |
| `scripts/qa-test-email-engine.mjs` | 27 | Email engine QA with real Resend sends |
| `scripts/test-email-marketing-ui.mjs` | 1833 | Playwright UI tests for newsletter pages |
| `scripts/test-workflow-emails.mjs` | 46 | Workflow email delivery tests |
