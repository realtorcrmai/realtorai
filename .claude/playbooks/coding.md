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

## Gate 1: Pre-Implementation (BLOCKING)

Implementation CANNOT start unless ALL are true:

- [ ] Detailed Design Document exists at `docs/designs/<feature-name>.md`
- [ ] All 10 sections are filled (no empty sections, no "TBD")
- [ ] User roles and permissions defined
- [ ] All screens/routes have state definitions (empty, loading, success, error)
- [ ] Validation rules defined per field
- [ ] Edge cases listed with expected behavior
- [ ] Content requirements written (not placeholders)
- [ ] Acceptance criteria present (GIVEN/WHEN/THEN format)
- [ ] Traceability table maps design → implementation → tests

If any item is missing → complete the design first. Do not start coding.

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

## Gate 2: Pre-Merge (BLOCKING)

Work CANNOT be marked complete unless ALL are true:

- [ ] All design sections are implemented (not just layout — behavior, states, content)
- [ ] No placeholder content remains in production code
- [ ] All required UI states present (empty, loading, success, error)
- [ ] Tests cover design scenarios (check traceability table)
- [ ] Content depth requirements met (no "Coming soon", no stub sections)
- [ ] Acceptance criteria from design document are verifiable
- [ ] Implementation matches design intent, not just structure
