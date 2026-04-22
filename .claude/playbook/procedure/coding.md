# CODING Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Phase 0 — Feature Fit & Existing System Check** *(CODING:feature only)*
- Search codebase for similar capabilities: grep repo, search docs, check existing components
- Summarize what already exists in 3-5 bullets
- If overlap found → plan to EXTEND the existing feature, not create a parallel one
- Answer: "Does this enhance an existing workflow or create a new one?"
- If creating something new → complete Section 1.2 (Feature Evaluation) first
- Document justification in `usecases/<feature-name>.md`

**Phase 1 — Scope Analysis**
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
- **tsconfig**: if modifying → verify exclude contains `[app, app-backup, agent-pipeline, content-generator, realtors360-agent]`
- **Migrations**: files 050-053 have duplicates — always check highest number

**Phase 2 — Context Loading**
- Read relevant existing files (only files from Phase 1)
- Read type definitions in `src/types/database.ts`
- Read relevant migration files if touching schema
- Summarize current behavior in 3-5 bullets BEFORE modifying

**Phase 3 — Plan**
- Write short plan: entry points → data flow → new types/functions → error handling
- If complex (5+ files or schema change) → present plan before coding
- Run `bash scripts/save-state.sh` before large changes

**Phase 4 — Implementation**

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

**Phase 5 — Self-Check**
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

**Mandatory Testing Thresholds (BLOCKING):**

| Lines Changed | Minimum Testing Required | Compliance |
|--------------|-------------------------|------------|
| ≤20 lines, single file | Smoke test + `tsc --noEmit` | Trivial fast path OK |
| 21–100 lines | Targeted tests for every changed function/component + `tsc --noEmit` | Must list tests run in PR |
| **101–500 lines** | **Full touchpoint analysis + targeted tests for ALL impacted modules + `test-suite.sh` + `tsc --noEmit`** | **Must document: (1) every file touched, (2) every module impacted, (3) tests run per module, (4) results** |
| **500+ lines** | **Everything above + end-to-end test for every user-facing flow affected + manual walkthrough of UI changes** | **PR MUST include a "Test Report" section with pass/fail per touchpoint. PR will be REJECTED without it.** |

**Touchpoint analysis (required for >100 lines):**

Before testing, map every touchpoint the change could affect:
1. **Direct**: files you modified
2. **Data layer**: tables/columns your code reads from or writes to → find ALL other code that uses those same tables
3. **API layer**: routes your code calls or exposes → find ALL consumers of those routes
4. **UI layer**: components that render data you changed → verify they still display correctly
5. **Workflow layer**: if your change is in a workflow phase → test phase transitions before AND after
6. **Integration layer**: if your change touches Twilio/Resend/Calendar/Kling → verify those integrations still work

**What "tested thoroughly" means (no ambiguity):**
- Every new function has been called at least once with valid input and verified output
- Every new API route has been hit with a request and returned expected response
- Every new UI component has been rendered in the browser and visually verified
- Every database query has been run and returned expected data
- Edge cases tested: empty inputs, null values, missing records, duplicate submissions
- Error paths tested: what happens when the API fails? When the DB is unreachable? When input is invalid?

**"I tested it" without evidence = FAIL.** The PR must show what was tested and what passed.

**Zero-tolerance rule: Any change >100 lines that only received typo/lint testing is an automatic FAIL in the compliance log AND the PR must be reverted or re-tested before merge.**

**Phase 6 — Documentation**
- Update `usecases/<feature>.md` if feature behavior changed
- Update `tests/<feature>.md` with new/modified test cases
- Mark test cases as `[auto]`, `[manual]`, or `[pending]`

**Phase 7 — Output**
- Summarize changes, breaking changes, new env vars, new migrations
- Commit to `dev`, push
