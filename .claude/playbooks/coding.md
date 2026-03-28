# CODING Playbook

> Task type: `CODING:feature`, `CODING:bugfix`, `CODING:refactor`, `CODING:script`

---

## Design-First Implementation Policy

**For any non-trivial functionality, implementation may begin ONLY after a Detailed Design Document exists.**

A bullet-point summary is NOT sufficient design. A "short plan" is NOT sufficient design.

### When bullets are sufficient (ALL must be true)

- Bug fix with no behavior change
- Refactor with no UI/API change
- Cosmetic change with no workflow impact
- Config change
- One-line text correction
- Internal-only maintenance

### When a Detailed Design Document is mandatory

- New pages or routes
- New modules or components with behavior
- Multi-step forms or wizards
- Admin tools or settings panels
- Help center features or onboarding flows
- AI interactions or content generation
- Search, filter, or sort experiences
- Role-based or permission-gated features
- Compliance-sensitive behavior (FINTRAC, CASL)
- Workflow automations or state machines
- Anything with state transitions, validations, or permissions
- **Any feature expected to exceed 100 lines of code**

### Required design location

Save as `docs/designs/<feature-name>.md` using the template at `.claude/templates/detailed-design.md`.

### No-shallow-output rule

The agent MUST NOT treat the following as complete design:
- Short bullet lists
- Generic "key features" summaries
- High-level user stories without flows
- Page names without screen content
- Component lists without behavior
- Tabs without detailed content contracts
- API notes without validation/error behavior
- "Add FAQ/help/search" without content depth rules

If the output is only bullet summaries → expand each item into detailed sections, examples, edge cases, and acceptance criteria BEFORE implementation.

### Placeholder prohibition (non-negotiable)

The agent MUST NOT produce placeholder content for production functionality:
- "Coming soon"
- "Content goes here"
- Empty cards with headings only
- Generic helper text
- Sample FAQ with no real product details
- Bare tour steps with no intent/outcome
- Stub sections that don't mention actual routes, fields, actions, or outcomes

If content depth is not available → STOP and mark the design incomplete. Do not create shells.

### If the request is underspecified

1. Detect missing detail
2. List design gaps explicitly
3. Expand into a full Detailed Design Document
4. Add states, validations, edge cases, and content expectations
5. Define acceptance criteria
6. Only then proceed to implementation planning

### Definition of detailed

> A document is considered detailed only if a reviewer can implement the full feature — including UI, behavior, validations, content, states, and tests — without making material assumptions.

---

## Sequential Expansion Protocol (for non-trivial CODING:feature)

**Why this exists:** Gates that say "check if design is complete" let the agent self-certify. Sequential expansion makes shallow output structurally impossible — each step's output is the required input for the next step. You cannot skip ahead because step N needs step N-1's concrete output.

**The agent MUST execute these steps in order, outputting each before proceeding to the next. No step may be skipped or combined.**

### Step 1 → Output: Problem & Scope Statement
Write and output:
- What problem does this solve? (2-3 sentences of real user pain, not abstract)
- Who uses this? (list specific roles and what each does differently)
- What's in scope? What's explicitly NOT in scope?
- What existing features does this interact with? (grep the codebase, list them)

**You must output this before proceeding to Step 2.**

### Step 2 → Output: User Journey Map (requires Step 1's roles)
For each role identified in Step 1, write:
- **Happy path**: numbered steps (user does X → system does Y → user sees Z)
- **Failure path**: what happens when the API fails, validation fails, permission denied
- **Abandon path**: what state is the system left in if user leaves mid-flow

Minimum 3 journeys. Each must reference specific routes, components, or API endpoints from the codebase.

**You must output all journeys before proceeding to Step 3.**

### Step 3 → Output: Screen-by-Screen Spec (requires Step 2's routes)
For every route/screen mentioned in Step 2's journeys:
- Layout (sections, cards, tabs, modals)
- Every button: what it does, where it navigates, what state it changes
- **Five mandatory states**: empty, loading, success, error, partial — each with specific UI behavior and copy
- Mobile behavior differences

If a screen has no empty state defined → the spec is incomplete. If a button has no error state → the spec is incomplete.

**You must output all screens before proceeding to Step 4.**

### Step 4 → Output: Data & Validation Contract (requires Step 3's fields)
For every field visible in Step 3's screens:
- DB table and column (existing or new)
- Type, nullable, default, constraints
- Validation rule (min/max, format, uniqueness, cross-field)
- Error message when validation fails (exact copy, not "show error")

For every API route referenced:
- Method, path, request schema, response schema
- What happens on 400, 401, 404, 500

**You must output all data contracts before proceeding to Step 5.**

### Step 5 → Output: Edge Cases & Content (requires Steps 3-4)
- Every edge case from the template (missing data, duplicates, network failure, partial completion, stale state, permission denial) — with expected behavior for THIS feature, not generic
- Every content slot from Step 3's screens — exact copy for headlines, descriptions, CTAs, error messages, empty states, tooltips
- **No placeholders.** If final copy isn't known, write realistic draft copy marked `[DRAFT]`

**You must output all edge cases and content before proceeding to Step 6.**

### Step 6 → Output: Acceptance Criteria & Traceability (requires Steps 1-5)
- One `GIVEN/WHEN/THEN` per journey from Step 2
- One `GIVEN/WHEN/THEN` per edge case from Step 5
- Traceability table: every design section → implementation file → test case

**You must output this, then save the full document to `docs/designs/<feature-name>.md`, before writing any implementation code.**

### Why this works without human verification

Each step requires concrete details from the previous step:
- Step 2 needs Step 1's roles (can't write journeys without knowing who the users are)
- Step 3 needs Step 2's routes (can't design screens without knowing the user flows)
- Step 4 needs Step 3's fields (can't write validation rules without knowing what's on screen)
- Step 5 needs Steps 3-4's specifics (can't write edge cases without knowing the data and UI)
- Step 6 needs all of the above (can't write acceptance criteria for undefined behavior)

An agent that tries to shortcut Step 3 by writing "add a settings page" will fail at Step 4 because there are no fields to write validation rules for. The chain self-enforces.

---

## Phase 0 — Feature Fit & Existing System Check *(CODING:feature only)*

- Search codebase for similar capabilities: grep repo, search docs, check existing components
- Summarize what already exists in 3-5 bullets
- If overlap found → plan to EXTEND the existing feature, not create a parallel one
- Answer: "Does this enhance an existing workflow or create a new one?"
- If creating something new → complete Section 1.2 (Feature Evaluation in core playbook) first
- Document justification in `usecases/<feature-name>.md`

## Phase 1 — Scope Analysis

- List files to CREATE and MODIFY
- List DB tables affected (schema change? new columns? new constraints?)
- List API routes affected
- List UI components that render affected data
- Check: does this overlap with existing features? (grep before coding)
- Check: new migration needed? → determine next number (`ls supabase/migrations/`)
- Check: new env vars needed? → list them
- Check: could this break existing tests?
- Check: another dev working on related files? (`git log --oneline -5`)
- **FINTRAC**: if touching `contacts`, `seller_identities`, or listing Phase 1 → verify FINTRAC fields remain non-nullable
- **RLS**: if adding new table → MUST include `ALTER TABLE x ENABLE ROW LEVEL SECURITY; CREATE POLICY...`
- **Realtime**: if table needs live UI → add to Supabase realtime publication (migration 042 pattern)
- **tsconfig**: if modifying → verify exclude contains `[app, app-backup, agent-pipeline, content-generator, listingflow-agent]`
- **Migrations**: files 050-053 have duplicates — always check highest number

## Phase 2 — Context Loading

- Read relevant existing files (only files from Phase 1)
- Read type definitions in `src/types/database.ts`
- Read relevant migration files if touching schema
- Summarize current behavior in 3-5 bullets BEFORE modifying

## Phase 3 — Design (replaces old "short plan")

- **For trivial/bugfix/refactor**: Write plan — entry points → data flow → changes → error handling
- **For feature (>100 lines expected)**: Verify Detailed Design Document exists and passes Gate 1. If not, create it FIRST using `.claude/templates/detailed-design.md`.
- If complex (5+ files or schema change) → present plan before coding
- Run `bash scripts/save-state.sh` before large changes

## Phase 4 — Implementation

*File Organization:*
- Server Actions for mutations → `src/actions/`
- API routes for GETs and webhooks → `src/app/api/`
- Zod v4 for all validation (use `.min(1)` not `.nonempty()`)
- JSONB columns for flexible structured data
- `@/` path alias maps to `src/`

*UI/Styling:*
- Use `lf-*` CSS classes: `lf-card`, `lf-btn`, `lf-badge`, `lf-input`, `lf-select`, `lf-textarea`
- No inline styles — use class names
- Emoji icons on pages, Lucide only inside reusable components
- `export const dynamic = 'force-dynamic'` on pages with live Supabase data
- `revalidatePath()` after every mutation

*Data Integrity:*
- Validate inputs at ALL boundaries (API, forms, webhooks, server actions)
- DB constraints: FK, NOT NULL, CHECK, UNIQUE — not just app validation
- Transactions for multi-table mutations
- Verify referenced records exist before linking (FK check)
- Rollback/cleanup on partial failures
- Parent status NEVER "complete" if any child subtask is incomplete
- **CASL**: before ANY outbound message (email/SMS/WhatsApp) → check consent_status
- **Twilio**: always use `lib/twilio.ts` formatter (adds +1, strips whitespace)
- **Kling AI**: async — use `useKlingTask` hook, store task_id in media_assets with `status: 'pending'`

*Security:*
- No SQL injection, XSS, exposed secrets
- Validate webhook signatures
- Never commit `.env.local`

## Phase 5 — Self-Check

- Re-read every modified file
- Check: unused vars, unhandled branches, type mismatches
- Check: missing error handling, edge cases (empty array, null, max length)
- If `next.config.ts` modified → verify `turbopack.root` preserved
- For new pages → verify `force-dynamic` present

*Targeted Regression Testing:*
- Identify impacted areas: same module, shared DB tables/columns, shared APIs or workflows
- From `tests/<feature>.md` and `evals.md`, pick all tests covering impacted areas
- Run: all tests for NEW functionality + all tests for IMPACTED existing functionality

| Change Type | What to Run |
|-------------|-------------|
| Minor isolated (copy, styling, non-critical UI) | Smoke tests + targeted unit tests for changed component |
| Shared flow touched (auth, RLS, email, RAG, workflows) | Full module tests + one e2e path through that flow |
| Schema change or DATA_MIGRATION | Full `test-suite.sh` + validate critical paths from `tests/<feature>.md` |
| DEPLOY or production release | Full `test-suite.sh` + `qa-test-email-engine.mjs` + relevant eval suite |

*Mandatory Testing Thresholds (BLOCKING):*

| Lines Changed | Minimum Testing Required | Compliance |
|--------------|-------------------------|------------|
| ≤20 lines | Smoke test + `tsc --noEmit` | Trivial fast path OK |
| 21–100 lines | Targeted tests for every changed function/component + `tsc --noEmit` | Must list tests in PR |
| 101–500 lines | Full touchpoint analysis + ALL impacted modules + `test-suite.sh` + `tsc --noEmit` | Document: files, modules, tests, results |
| 500+ lines | All above + e2e + manual UI walkthrough | Test Report in PR required |

*Touchpoint analysis (>100 lines):*
1. **Direct**: files you modified
2. **Data layer**: tables/columns → find ALL other code using same tables
3. **API layer**: routes → find ALL consumers
4. **UI layer**: components rendering changed data → verify display
5. **Workflow layer**: phase transitions before AND after
6. **Integration layer**: Twilio/Resend/Calendar/Kling still work

**"I tested it" without evidence = ❌. >100 lines with only typo testing = automatic ❌ + revert.**

## Phase 6 — Documentation

- Update `usecases/<feature>.md` if feature behavior changed
- Update `tests/<feature>.md` with new/modified test cases
- Mark test cases as `[auto]`, `[manual]`, or `[pending]`

## Phase 7 — Output

- Summarize changes, breaking changes, new env vars, new migrations
- Commit to feature branch, push

---

## Pre-Merge Self-Verification (automated — no human needed)

Before marking the task complete, the agent MUST run these checks itself. These are objective, not subjective — each produces a pass/fail.

```
VERIFY (run each, output result):

1. DESIGN-TO-CODE TRACE — For every row in the design doc's traceability table (Step 6):
   → Does the implementation file exist? (glob for it)
   → Does it contain the function/component named in the design? (grep for it)
   → If any row has no matching code → task is INCOMPLETE

2. PLACEHOLDER SCAN — Run: grep -r "Coming soon\|Content goes here\|TODO\|PLACEHOLDER\|Lorem ipsum" src/
   → 0 matches in files created/modified by this task = PASS
   → Any match = FAIL — fix before committing

3. STATE COMPLETENESS — For every screen in the design doc (Step 3):
   → grep the component file for: loading, error, empty (or equivalent state names)
   → If any screen is missing any of the 5 states → INCOMPLETE

4. ACCEPTANCE CRITERIA — For every GIVEN/WHEN/THEN in Step 6:
   → Can you point to a test case in tests/<feature>.md that covers it?
   → If any criterion has no test → write the test or mark [pending] with reason

5. CONTENT DEPTH — For every content slot in Step 5:
   → Does the implementation contain the actual copy (or [DRAFT] copy)?
   → grep for empty strings "", generic "Click here", "Untitled" in new components
   → Any generic placeholder = FAIL
```

**Output the verification results in the PR description. Any FAIL = fix before creating PR.**
