# Task Playbooks — Per-Type Checklists

> **Module of:** `.claude/agent-playbook.md` (Section 4)
> **Load when:** Executing any classified task

---

## 4.1 CODING

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

---

## 4.2 TESTING

**Phase 1** — Determine level: unit / integration / e2e / eval
- e2e: use Playwright (`playwright.config.ts`, run: `npx playwright test`)
- Check existing tests + `evals.md` (200 QA test cases at repo root)
- Check `scripts/eval-*.mjs` (8 eval suites) before creating new

**Phase 1.5 — Test Documentation**

Each core feature must have a `tests/<feature-name>.md` that:
- Lists ALL test cases organized by: happy path, edge cases, error conditions, race conditions, cascade effects
- Marks each as: `[auto]` (with file path), `[manual]` (with steps), `[pending]` (not yet implemented)
- Tracks coverage: X of Y test cases automated

When to update:
- Adding functionality → add test cases to relevant MD file
- Changing behavior → update affected test cases
- Bug fix → add the test case that would have caught the bug

Existing test inventory (check before creating new):
- `evals.md` — 200 QA test cases (high-level)
- `scripts/test-suite.sh` — 73+ automated tests
- `scripts/qa-test-email-engine.mjs` — 28 email marketing tests
- `scripts/eval-*.mjs` — 8 domain-specific eval suites
- `tests/` — Playwright e2e tests

**Phase 2** — Test plan covering: happy path, empty/null inputs, boundary values, duplicates, race conditions, cascade effects, permission denied, timeout/retry

**Phase 3** — Implement with vitest. Deterministic, isolated, descriptive names.

**Phase 4** — Failure analysis: environment / flaky / actual bug / wrong assertion

**Phase 5** — Report: X/Y passing, gaps identified, recommendations

---

## 4.3 DEBUGGING

**Phase 1** — Restate symptom precisely. Error message? Stack trace? When? Scope?

**Phase 2** — Reproduce. Trace call path. Check: data issue? env issue? race condition?

**Phase 3** — Hypotheses (2-4), ordered by likelihood. Check most likely first.

**Phase 4** — Minimal fix. No surrounding refactors.

**Phase 5** — Write regression test. Grep for same anti-pattern elsewhere.

---

## 4.4 DESIGN_SPEC

**Phase 0 — Feature Justification**
- Describe existing behavior and related components. Extension or new capability?
- Answer: What problem does this solve for BC realtors? What measurable benefit?
- Compare against 2-3 reference products (Follow Up Boss, LionDesk, kvCORE, Realvolve):
  - What do they do here? Are we copying, differentiating, or staying simpler?
  - What's our unique angle? (BC compliance, voice agent, AI content)
- Conclude: "Does this fit Realtors360's vision?" If unclear → ask the product owner.
- Document in `usecases/<feature-name>.md` with problem statement + 3 scenarios + demo script

**Phase 1** — Goals, non-goals, constraints, success metrics, dependencies

**Phase 2** — Current state audit. What exists that we can reuse?

**Phase 3** — 2+ design options with pros/cons/risks

**Phase 4** — Detailed design: data model, API surface, components, data flow, error handling, security. **Verify against Architectural Principles (Section 1.2.1).**

**Phase 5** — Operational: deployment plan, monitoring, failure modes, cost. **Verify against Principle 4 (Rollout & Operations).**

**Phase 6** — Implementation plan: phases, files per phase, test plan

---

## 4.4.1 7-Pass Iterative Analysis (Mandatory for DESIGN_SPEC & GAP_ANALYSIS)

Every gap analysis, PRD, architecture doc, or design spec MUST go through 7 iterative passes. Never present a single-pass output as final. Each pass takes **2-5 minutes of genuine thinking** — not a 30-second skim.

| Pass | Focus | Key Question | Anti-Rush Gate (HC-15) |
|------|-------|-------------|----------------------|
| **1. Self-Analysis** | Read the subject thoroughly (every file, every line). Document findings with file:line references. Categorize by severity. | "What gaps exist right now?" | **Read twice before writing.** Don't start documenting after skimming — read the full subject end-to-end, then re-read for what you missed, then write. |
| **2. Best-in-Market** | Compare against industry best practices and competitor implementations. Use structured frameworks (SWOT, COBIT, CMMI, MoSCoW, RACI) for each section. Find what Pass 1 missed. | "What would the best version look like?" | **Consider 2+ frameworks before picking.** Don't default to bullet points — choose the right analysis framework for each section. |
| **3. Code Verification** | Cross-check EVERY claim against actual source code. Are file paths real? Do referenced functions exist? Are stats accurate? Find contradictions. **HC-13 enforced here.** | "Is what I wrote actually true in the code?" | **Never propose changes to code you haven't read.** For each claim, run the grep/read/check. |
| **4. Depth Check** | Re-read looking for surface-level sections. Every section should demonstrate deep knowledge, not just list items. Are acceptance criteria testable? Are designs implementable? | "Did I go deep enough or just skim?" | **If a section took <1 minute to write, it's probably surface-level.** Go back and add evidence, examples, or specifics. |
| **5. Completeness** | Final read-through for gaps, formatting, numbering, cross-references. Check nothing was missed. | "Is anything still missing?" | **Re-read the ORIGINAL request.** Did you answer what was ASKED, or what you assumed? |
| **6. Gap Reconciliation** | Compare the document against the ORIGINAL requirements/spec. Identify any requirement that was asked for but not addressed. List remaining gaps explicitly. | "Does this actually cover everything that was asked?" | **Carefully consider the blast radius.** What happens if someone acts on your recommendations and they're wrong? |
| **7. Implementation Sanity** | For every recommendation/fix proposed: Does it actually make sense? Is it feasible? Is the effort estimate realistic? Challenge your own suggestions. | "Would I bet my reputation on these recommendations?" | **Re-read your entire output before presenting.** If any recommendation feels "good enough" — it isn't. |

**Rules:**
- Each pass MUST read the output of the previous pass — not rubber-stamp it
- Passes are sequential — each builds on the previous
- Present the final version only after all 7 passes
- Note the pass count in the document header
- "Each pass takes 2-5 minutes" means real thinking — if a pass takes 30 seconds, redo it

**When to use 7-pass:** Gap analyses, PRDs, architecture specs, audit documents.
**When NOT to use:** INFO tasks, simple code changes, bug fixes, micro/small tier tasks.

---

## 4.4.2 GAP_ANALYSIS Task Type

**Classification:** `Type: GAP_ANALYSIS` | Tier: typically Medium or Large

**Mandatory process:**
1. Read actual source code for every feature being assessed — NOT previous reports, docs, or summaries (HC-13)
2. For each feature: verify imports, exports, rendering, DB wiring, and integration
3. "Code written" != "Feature works" — check that components are rendered in pages, actions are called from components, migrations are applied
4. Save as versioned file: `docs/gap-analysis/<area>/v<N>_<date>.md`
5. Follow the 7-pass process (Section 4.4.1)

**Verification checklist per feature:**
- [ ] Read the page component — does it render the feature?
- [ ] Read the server action — does it do real CRUD?
- [ ] Check the API route — does it handle auth, validation, errors?
- [ ] Check the migration — does the table exist with correct columns?
- [ ] Check the component — is it imported and rendered somewhere?
- [ ] Check integration — does data flow end-to-end?

**Output format:**
```markdown
| Feature | Completeness | Production Ready | Evidence (file:line) | Critical Gap |
```

**Auditor philosophy:**
Think like a professional auditor. For each section use industry frameworks: SWOT, COBIT, CMMI, MoSCoW, RACI.

Every gap must have: evidence (file:line or command output), framework classification, priority, and implementation approach with effort estimate.

**Depth rule: No surface-level analysis.** Every finding must go deep — not just "what" but "why" and "what's the root cause." A gap analysis that just lists problems without explaining their cause is useless.

---

## 4.5 RAG_KB

**Phase 1** — Use case: question types, data sources, privacy, freshness, accuracy bar

**Phase 2** — Content prep: chunking strategy, metadata schema, embedding cost. Primary RAG system: TypeScript (`src/lib/rag/`).

**Phase 3** — Retrieval config: search mode, top_k, similarity threshold, context budget

**Phase 4** — Prompting: system prompt, context layout, guardrails, fallback

**Phase 5** — Evaluation: 20+ test queries, guardrail testing, cross-contact isolation, latency P95 < 5s

---

## 4.6 ORCHESTRATION

**Phase 1** — Workflow type: sequential, event-driven, state machine, fan-out. Map to existing: `trigger-engine.ts`, `workflow-engine.ts`, `contact-evaluator.ts`, `trust-gate.ts`, `send-governor.ts`

**Phase 2** — States & transitions. Guard conditions. Dead state handling. Rollback.

**Phase 3** — Error handling: timeouts, retries, human-in-the-loop, circuit breaker

**Phase 4** — Observability: log decisions to `agent_decisions`, track latency, define alerts

**Phase 5** — Output guardrails (required before any agent output reaches a user or external system):
1. **PII check** — No PII beyond Section 14.2 allowlist
2. **Hallucination check** — Any names, addresses, or prices in output MUST exist in Supabase
3. **Consent check** — Outbound messages require CASL consent_status = active
4. **Instruction leak check** — No system prompt fragments or tool schemas in output
5. If any check fails → suppress, log as `safety_flag`, return safe fallback

---

## 4.7 INTEGRATION

**Phase 1** — Read API docs. Endpoints needed. Sandbox available? Existing similar integration?
- **Third-party risk check** (new services only): SOC 2? PII processing? PIPEDA data residency? Pin API versions. Document fallback if service goes down.

**Phase 2** — Data contracts. Request/response schemas. Field mapping.
- Twilio: use `lib/twilio.ts` formatter for phones
- Kling AI: async task_id → poll via `/api/kling/status`
- Resend: verify svix webhook headers against `RESEND_WEBHOOK_SECRET`

**Phase 3** — Error/retry: timeout values, exponential backoff, rate limiting (429), idempotency

**Phase 4** — Security: Keys in `.env.local` → encrypt with `vault.sh` → NEVER commit. Validate webhook signatures. **CASL**: verify consent before outbound messages.

**Phase 5** — Integration tests against sandbox/mock

---

## 4.8 DOCS

**Phase 1** — Audience (developer/user/admin). What action does it enable?
**Phase 2** — Outline structure before writing
**Phase 3** — Draft with real file paths, table names, commands
**Phase 4** — Verify all paths exist, commands work, names are current
**Phase 5** — Align terminology with CLAUDE.md

---

## 4.9 EVAL

**Phase 1** — Define metrics: accuracy, latency, cost, groundedness
**Phase 2** — Check existing `evals.md` (200 cases) and `scripts/eval-*.mjs` (8 suites) first
**Phase 3** — Scoring: automatic or manual review
**Phase 4** — Run, record, identify failure patterns
**Phase 5** — Decision: ship / iterate / redesign

---

## 4.10 INFO_QA

**Phase 1** — Restate question, identify sub-questions
**Phase 2** — Research: codebase, CLAUDE.md, memory, git log
**Phase 3** — Answer with citations (file:line), call out assumptions
**Phase 4** — Examples and edge cases. State limitations.

---

## 4.11 DEPLOY

**Phase 1 — Pre-deploy**
- `bash scripts/health-check.sh` — all green
- Branch = `dev`, all changes committed
- `npm run build` passes

**Phase 2 — Migrations**
- List pending: compare `supabase/migrations/` against last applied
- Run in order, verify each succeeded

**Phase 3 — Service startup**
1. Supabase (remote — always running)
2. Next.js CRM: `npm run dev` → :3000
3. Form Server (optional): Python → :8767
4. Voice Agent (optional): Python → :8768

**Phase 4 — Netlify deploy**
- Required env vars: `CRON_SECRET`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXTAUTH_SECRET`, `DEMO_EMAIL`, `DEMO_PASSWORD`
- Deploy: push to `main` triggers GitHub Actions → Netlify auto-deploy

**Phase 5 — Post-deploy validation**
- `bash scripts/test-suite.sh` + check deploy URL + `bash scripts/save-state.sh`

**Phase 6 — Rollback**
- Netlify: redeploy previous from dashboard
- Migration: run reverse SQL
- Git: `git revert HEAD` → push

---

## 4.12 VOICE_AGENT

**Phase 1 — Identify scope**
- Backend: `voice_agent/server/` (Python 3.12+, aiohttp)
- Frontend: `src/components/voice-agent/` (TypeScript/React)

**Phase 2 — Provider awareness**
- 4 LLM providers: Ollama, OpenAI, Anthropic, Groq
- Config: `voice_agent/server/config.py` + `.env`
- Fallback chain: `LLM_FALLBACK_CHAIN=anthropic,openai,ollama`
- Prompt caching enabled (`cache_control: ephemeral`)

**Phase 3 — Tool development** (for new voice commands)
1. Create API endpoint: `src/app/api/voice-agent/<resource>/route.ts`
2. Add tool schema to: `voice_agent/server/tools/realtor_tools.py`
3. Add handler in: `handle_realtor_tool()` function
4. 56 tools across 21 API routes
5. **Dynamic tool selection**: tools routed by message keywords (see `SessionState.get_tools()`)

**Phase 4 — System prompts**
- `voice_agent/server/system_prompts.py` — 4 modes: realtor, client, generic, help
- Voice-optimized: 10 strict rules (no markdown, concise, natural speech)
- BC real estate knowledge embedded

**Phase 5 — Key features to preserve**
- Edge TTS with LRU cache (100 entries) + 13 pre-rendered phrases
- Session focus tracking (`SessionState.focus`)
- Context summarization — compresses old turns after 20 messages
- `_clean_for_voice()` — strips markdown before TTS

**Phase 6 — Testing**
```bash
curl -X POST localhost:8768/api/session/create -H "Content-Type: application/json" -H "Authorization: Bearer va-bridge-secret-key-2026" -d '{"mode":"realtor"}'
curl -X POST localhost:8768/api/chat -H "Content-Type: application/json" -H "Authorization: Bearer va-bridge-secret-key-2026" -d '{"session_id":"ID","message":"How many active listings?"}'
```

**Phase 7 — Verify fallback chain**
- Test with each provider active, verify tool-calling, check timeout handling

---

## 4.13 DATA_MIGRATION

**Phase 1 — Numbering**: `ls supabase/migrations/ | tail -5` — check highest number. Files 050-053 have duplicates.

**Phase 2 — Schema design**: RLS policy REQUIRED. FK constraints, CHECK constraints, indexes. JSONB for flexible data.

**Phase 3 — Idempotency**: `IF NOT EXISTS`, `DO $$` blocks, `ON CONFLICT DO NOTHING`. Safe to run twice.

**Phase 4 — Seed data realism (BC)**: V-prefix postal codes, 604/778/236/250 area codes, CAD pricing, Metro Vancouver cities, R2xxxxxxx MLS numbers.

**Phase 5 — Execute**: `SUPABASE_ACCESS_TOKEN=xxx npx supabase db query --linked -f <file>`

**Phase 6 — Verify**: Query affected tables. Test constraints.

**Phase 7 — Rollback plan**: Document reverse SQL BEFORE running forward migration.

---

## 4.14 SECURITY_AUDIT

**Phase 1 — RLS**: Every table must have RLS enabled + tenant policy.

**Phase 2 — Webhooks**: Verify Resend svix headers, Twilio `validateRequest()`.

**Phase 3 — Secrets**: `grep -r "sk-" src/` = ZERO matches. `.env.local` in `.gitignore`.

**Phase 4 — FINTRAC**: `seller_identities` fields non-nullable.

**Phase 5 — CASL/TCPA**: Consent check before send, expiry cron, unsubscribe works without auth.

**Phase 6 — Input sanitization**: Zod on all POST/PATCH. No raw SQL. No `dangerouslySetInnerHTML` without sanitization.

---

## 4.15 Use-Case Documentation

For every new feature, create or update `usecases/<feature-name>.md`.

**Required sections**:
1. **Problem Statement** — What user pain does this solve? (2-3 sentences)
2. **User Roles** — Who uses this?
3. **Existing System Context** — What related features already exist?
4. **End-to-End Scenarios** (minimum 3): name, preconditions, steps, expected outcome, edge cases
5. **Demo Script** — Setup, script, key talking points
6. **Market Context** (for new features): How do 2-3 competitors handle this? Our differentiation.
