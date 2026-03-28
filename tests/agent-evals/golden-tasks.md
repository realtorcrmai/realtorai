# Golden Task Set — Agent Evaluation

> 10 representative tasks scored 0-3 each. Gate: ≥ 25/30 to enable new agent behaviors.
> Run weekly or before any change to playbook, system prompts, or tool schemas.

---

## Scoring Rubric

| Score | Meaning |
|-------|---------|
| 0 | Wrong task type or skipped playbook entirely |
| 1 | Correct classification but incorrect implementation |
| 2 | Correct implementation but missed phases (docs, tests, compliance, design) |
| 3 | Full playbook compliance + correct output + all phases completed |

**Trajectory bonus/penalty:** If agent completes correctly but uses >2x the optimal tool calls, deduct 0.5.

---

## Task 1: Add a field to contacts (CODING:feature — small)

**Input prompt:** "Add a lead_source field to the contacts table with values: referral, website, open_house, cold_call, social_media. Show it in the contact form and contact detail page."

**Expected output:**
- Migration file: `ALTER TABLE contacts ADD COLUMN lead_source TEXT CHECK (lead_source IN ('referral','website','open_house','cold_call','social_media'))`
- `src/types/database.ts` updated with lead_source field
- `src/components/contacts/ContactForm.tsx` updated with select dropdown
- Contact detail page shows lead_source
- RLS preserved (no new table, so existing policy covers it)
- `test-suite.sh` passes, `tsc --noEmit` passes

**Eval criteria:**
- [ ] Task type: CODING:feature (not CODING:refactor or DATA_MIGRATION)
- [ ] Scope analysis lists all 4 files + migration
- [ ] Migration is idempotent (IF NOT EXISTS or DO $$ block)
- [ ] CHECK constraint matches the 5 values exactly
- [ ] Uses `lf-select` class for dropdown (not inline styles)
- [ ] Compliance log entry present

**Optimal tool calls:** ~12 (read 4 files, write migration, edit 3 files, run tsc, run tests, commit)

---

## Task 2: Fix a showing notification bug (CODING:bugfix)

**Input prompt:** "Showing SMS notifications fail when the buyer agent phone already has +1 prefix. The Twilio formatter is doubling it to +1+1."

**Expected output:**
- Fix in `src/lib/twilio.ts` — strip existing +1 before adding it
- Regression test added to `tests/showings.md`
- No other files changed (minimal fix)

**Eval criteria:**
- [ ] Task type: CODING:bugfix (not CODING:feature)
- [ ] Only `twilio.ts` modified (maybe test file)
- [ ] Fix handles: already has +1, no prefix, has spaces, international format
- [ ] No surrounding refactors
- [ ] Regression test documents the exact bug scenario

**Optimal tool calls:** ~8 (read twilio.ts, read test file, edit twilio.ts, update test doc, run tests, commit)

---

## Task 3: Create a new API route (CODING:feature — medium)

**Input prompt:** "Add a GET /api/listings/stats endpoint that returns: total active listings, average list price, average days on market, listings by property type breakdown."

**Expected output:**
- New route at `src/app/api/listings/stats/route.ts`
- Supabase query aggregating from `listings` table
- Zod schema for response
- Returns JSON with the 4 metrics
- Auth required (session check)

**Eval criteria:**
- [ ] Task type: CODING:feature
- [ ] Route uses Supabase admin client (server-side)
- [ ] Response has Zod schema validation
- [ ] Handles empty listings table gracefully (returns zeros, not error)
- [ ] No N+1 queries (single aggregation query, not per-listing)
- [ ] `force-dynamic` not needed (API route, not page)

**Optimal tool calls:** ~10

---

## Task 4: Write a database migration (DATA_MIGRATION:schema)

**Input prompt:** "Add a listing_views table to track how many times each listing detail page is viewed. Fields: id, listing_id (FK), viewed_at, viewer_ip (nullable), source (web/api/voice)."

**Expected output:**
- Migration file with correct numbering (checked highest existing)
- Table with: id UUID PK, listing_id UUID FK to listings, viewed_at TIMESTAMPTZ DEFAULT now(), viewer_ip TEXT, source TEXT CHECK
- RLS policy
- Index on listing_id + viewed_at

**Eval criteria:**
- [ ] Task type: DATA_MIGRATION:schema
- [ ] Migration number doesn't collide with existing (checked `ls supabase/migrations/ | tail -5`)
- [ ] RLS enabled with policy
- [ ] FK constraint to listings table
- [ ] CHECK constraint on source field
- [ ] Idempotent (IF NOT EXISTS)
- [ ] Rollback SQL documented BEFORE execution

**Optimal tool calls:** ~8

---

## Task 5: Security audit of webhooks (SECURITY_AUDIT:webhooks)

**Input prompt:** "Audit all webhook endpoints in the codebase. Check signature verification, auth, and input validation."

**Expected output:**
- List of all routes in `src/app/api/webhooks/`
- For each: signature verification method, auth check, Zod validation presence
- Findings: any missing verification, any raw body parsing, any unvalidated fields
- Recommendations with specific file:line references

**Eval criteria:**
- [ ] Task type: SECURITY_AUDIT:webhooks
- [ ] Found all webhook routes (Resend, Twilio, any others)
- [ ] Checked Resend svix signature verification
- [ ] Checked Twilio request validation
- [ ] No code changes (audit only — INFO output)
- [ ] Specific findings with file:line citations

**Optimal tool calls:** ~10 (glob for webhook routes, read each, analyze)

---

## Task 6: Explain the email marketing pipeline (INFO_QA:explain)

**Input prompt:** "How does an email go from AI generation to delivery in ListingFlow? Walk me through every step."

**Expected output:**
- Complete flow: trigger → text-pipeline → email-blocks → quality-pipeline → draft → approval → validated-send → Resend → webhook tracking
- File references for each step
- Mentions: send-governor frequency caps, CASL consent check, quality score threshold

**Eval criteria:**
- [ ] Task type: INFO_QA:explain
- [ ] No code changes (read-only)
- [ ] References actual file paths (not made up)
- [ ] Mentions CASL consent check in the flow
- [ ] Mentions quality score gate (block if <4, regenerate if <6)
- [ ] Accurate — verified against actual code, not just CLAUDE.md description

**Optimal tool calls:** ~8 (read key files in the email pipeline)

---

## Task 7: Debug a TypeScript build error (DEBUGGING:error)

**Input prompt:** "npm run build is failing with: Type error: Property 'newsletter_intelligence' does not exist on type 'Contact'. The error is in src/components/newsletters/OverviewTab.tsx line 142."

**Expected output:**
- Hypothesis: Contact type in database.ts missing newsletter_intelligence field
- Check database.ts → confirm field missing or mistyped
- Fix: add field to Contact type (or fix the component to use correct field name)
- Build passes after fix

**Eval criteria:**
- [ ] Task type: DEBUGGING:error
- [ ] Restated symptom precisely before investigating
- [ ] Formed hypothesis before reading code
- [ ] Read the error file first, then the type definition
- [ ] Minimal fix — only the type or the reference, not both
- [ ] Regression: verified build passes after fix

**Optimal tool calls:** ~6

---

## Task 8: Deploy the application locally (DEPLOY:local)

**Input prompt:** "Start all services for local development."

**Expected output:**
- Health check run first
- Next.js started on :3000
- Voice agent started on :8768 (if available)
- Form server status checked on :8767
- All services responding

**Eval criteria:**
- [ ] Task type: DEPLOY:local
- [ ] Ran health check first (not after)
- [ ] Started services in correct order
- [ ] Verified each service is responding (curl checks)
- [ ] Did not attempt to start services that aren't available

**Optimal tool calls:** ~6

---

## Task 9: Design a new feature (DESIGN_SPEC:feature)

**Input prompt:** "Design a contact export feature — ability to export contacts as CSV with filters."

**Expected output:**
- Detailed Design Document at `docs/designs/contact-export.md`
- All 10 sections filled (per template)
- User journeys: export all, export filtered, export empty result
- UI spec: export button location, filter UI, progress indicator, download trigger
- Data: which fields exported, format, encoding, max rows
- Edge cases: no contacts, 10K+ contacts, special characters in names

**Eval criteria:**
- [ ] Task type: DESIGN_SPEC:feature
- [ ] Feature justification completed (Section 1.2 questions answered)
- [ ] Use-case doc created at `usecases/contact-export.md`
- [ ] Design doc has all 10 sections (not bullets — detailed)
- [ ] No implementation code (design only)
- [ ] Acceptance criteria in GIVEN/WHEN/THEN format

**Optimal tool calls:** ~10 (research existing contacts code, read types, write docs)

---

## Task 10: Multi-step task (CODING:feature — requires sequential expansion)

**Input prompt:** "Add a 'Mark as Sold' button to the listing detail page. When clicked: update listing status to 'sold', record the sale date, send a 'Just Sold' email to all buyer contacts who viewed this listing, and advance the workflow to Phase 8."

**Expected output:**
- Sequential expansion protocol followed (6 steps output before coding)
- Design doc created (multi-step feature, >100 lines expected)
- Server action in `src/actions/listings.ts`
- UI button with confirmation modal
- Calls `sendNewsletter` for Just Sold email type
- Calls `advancePhase` for workflow
- CASL consent checked before each email
- Transaction wraps the multi-table mutation

**Eval criteria:**
- [ ] Task type: CODING:feature
- [ ] Sequential expansion: all 6 steps output in order before coding
- [ ] Design doc exists at `docs/designs/mark-as-sold.md`
- [ ] CASL consent checked per contact before email
- [ ] Transaction used (multi-table: listings + communications + workflow)
- [ ] Confirmation modal (not instant action — irreversible)
- [ ] Error handling: what if email fails? (partial failure handling)
- [ ] Tests documented
- [ ] Compliance log entry

**Optimal tool calls:** ~25 (design steps + implementation + tests)

---

## Running the Eval

```bash
# For each golden task:
# 1. Start a fresh Claude Code session
# 2. Paste the input prompt
# 3. Let the agent work
# 4. Score against the eval criteria above
# 5. Record: score (0-3), tool call count, time taken, notes

# Scoring sheet:
| Task | Score (0-3) | Tool Calls | Optimal | Trajectory (opt/actual) | Notes |
|------|-------------|------------|---------|------------------------|-------|
| 1    |             |            | 12      |                        |       |
| 2    |             |            | 8       |                        |       |
| 3    |             |            | 10      |                        |       |
| 4    |             |            | 8       |                        |       |
| 5    |             |            | 10      |                        |       |
| 6    |             |            | 8       |                        |       |
| 7    |             |            | 6       |                        |       |
| 8    |             |            | 6       |                        |       |
| 9    |             |            | 10      |                        |       |
| 10   |             |            | 25      |                        |       |
| TOTAL|      /30    |            |         |                        |       |
```

**Gate:** ≥ 25/30 to ship. < 20/30 → mandatory review.
