# Golden Task Set — Agent Evaluation

> 5 representative tasks covering different task types and tiers.
> Score 0-3 per task. Gate: ≥12/15 to enable new agent behaviors.

---

## Task 1: Add a new field to contacts (CODING:feature, Small)

**Input:** "Add a lead_source field to the contacts table and expose it in the contact form"

**Expected output:**
- Migration file: `supabase/migrations/0XX_add_lead_source.sql` with `realtor_id` awareness
- Type update: `src/types/database.ts` includes `lead_source`
- Form update: `src/components/contacts/ContactForm.tsx` includes `lead_source` select
- `tsc --noEmit` passes
- Feature branch → PR → CI green

**Eval criteria:**
- [ ] Correct task type (CODING:feature, Small)
- [ ] Classification block before any code changes
- [ ] Scope analysis lists all 3 files
- [ ] RLS preserved on contacts table
- [ ] `realtor_id` not broken by migration
- [ ] Compliance log entry

**Score:** 0 = Wrong type or skipped playbook | 1 = Correct classification, wrong implementation | 2 = Working code but missed phases | 3 = Full playbook compliance + correct output

---

## Task 2: Fix a showing notification bug (CODING:bugfix, Small)

**Input:** "Showing SMS not sending when buyer agent phone already has +1 prefix"

**Expected output:**
- Fix in `src/lib/twilio.ts` (phone formatter handles +1 idempotently)
- No other files changed
- Regression test added

**Eval criteria:**
- [ ] Correct type (CODING:bugfix)
- [ ] Minimal change (1-2 files only)
- [ ] Regression test written
- [ ] No scope creep (didn't refactor surrounding code)

---

## Task 3: Gap analysis of a feature (GAP_ANALYSIS, Medium)

**Input:** "Analyze the calendar feature — what's implemented vs what's missing"

**Expected output:**
- File saved at `docs/gap-analysis/calendar/v1_YYYY-MM-DD.md`
- 7-pass process followed
- Evidence from actual code (file:line references)
- Industry frameworks applied (SWOT/COBIT minimum)

**Eval criteria:**
- [ ] Correct type (GAP_ANALYSIS)
- [ ] HC-13 followed (read actual source, not just file names)
- [ ] 7-pass log in document header
- [ ] Evidence column with file:line references
- [ ] Framework analysis (not just bullet points)
- [ ] Did NOT trust previous reports

---

## Task 4: Design spec for new feature (DESIGN_SPEC, Medium)

**Input:** "Design an offer management system for tracking purchase offers on listings"

**Expected output:**
- Feature evaluation (Section 1.2) completed
- Competitor comparison (Follow Up Boss, kvCORE)
- Architecture doc with data model, API surface, components
- Architectural Principles (1.2.1) checked

**Eval criteria:**
- [ ] Correct type (DESIGN_SPEC)
- [ ] Phase 0 (Feature Justification) completed
- [ ] Phase 4 references Architectural Principles
- [ ] Multi-tenancy considered (`realtor_id` in schema)
- [ ] 7-pass followed if document drives implementation

---

## Task 5: Security audit (SECURITY_AUDIT, Medium)

**Input:** "Audit RLS policies on the contacts and listings tables"

**Expected output:**
- RLS policies verified against `realtor_id = auth.uid()::uuid` standard
- Any gaps documented with migration fix
- Webhook signature verification checked

**Eval criteria:**
- [ ] Correct type (SECURITY_AUDIT)
- [ ] All 6 phases from Section 4.14 followed
- [ ] Used `auth.uid()` not `auth.role()` as standard
- [ ] Actual SQL queries run to verify (not just read migration file)
