# Agent Playbook — ListingFlow CRM

> Task execution framework for AI development agents working on the ListingFlow real estate CRM.

---

## 1. Purpose

This playbook governs how **all developers (human and AI)** operate on the ListingFlow codebase. Every task follows: **Pre-Flight → Classify → Execute → Validate → Log**. No steps skipped. No exceptions. No bypass.

### 1.1 Team Policy — STRICT ENFORCEMENT

**ZERO-TOLERANCE POLICY: Every task, every developer, every time.**

There is NO scenario where the playbook can be skipped, partially followed, or bypassed:
- Not for "quick fixes"
- Not for "just a small change"
- Not for urgent requests
- Not for follow-up tasks in the same session
- Not because "I already know what to do"
- Not because the user said "just do it"

**If you cannot follow the playbook for a task, you do not do the task. Stop and explain why.**

**Enforcement:**
- Every task MUST produce a classification block (Section 3.1) before any code/file changes
- Every task MUST end with a compliance log entry (Section 11)
- A task without a classification block is an unauthorized change
- A task without a compliance log entry did not happen
- Work that skips the playbook WILL be reverted — it is not trusted
- No direct work on `main`. All changes go via `dev` and must pass `health-check.sh` + `test-suite.sh` before merge

**Code reviews MUST verify:**
- CODING: Was scope analysis done? Feature fit checked? FINTRAC/RLS/CASL verified?
- TESTING: Were test cases documented in `tests/<feature>.md`?
- DATA_MIGRATION: Was idempotency verified? Rollback plan written?
- SECURITY_AUDIT: Were RLS policies checked? Secrets scanned?

**PR requirements (mandatory — PR will be rejected without these):**
- Task type classification block in description
- Playbook phases completed (list them)
- Test results (pass/fail counts)
- Compliance log entry reference

**PR review checklist:**
- [ ] Pre-flight followed (branch=dev, health check passed)
- [ ] Classification block present with correct task type
- [ ] Scope analysis identifies all affected files/tables/APIs
- [ ] Use-case doc created/updated (`usecases/<feature>.md`) if feature change
- [ ] Test doc created/updated (`tests/<feature>.md`) if behavior change
- [ ] Post-task validation completed (tests pass, no TS errors)
- [ ] Compliance log entry appended to `.claude/compliance-log.md`

### 1.2 Feature Evaluation & Market Fit

Before building any **new feature**, answer:
- What problem does this solve for BC realtors using ListingFlow?
- What measurable benefit does it create? (time saved, better leads, fewer errors, compliance)
- Does a similar capability already exist in the codebase? (grep, search docs, check specs)
- How do 2-3 competitors handle this? (Follow Up Boss, LionDesk, kvCORE, Realvolve)
- Are we copying, differentiating, or deliberately staying simpler?
- Does this fit ListingFlow's vision as a BC realtor transaction CRM?
- If unclear → **pause and ask the product owner**.

### 1.3 Documentation Requirements

Every significant feature must have:
- **Use-case doc**: `usecases/<feature-name>.md` — problem, scenarios, demo script
- **Test doc**: `tests/<feature-name>.md` — all test cases (auto/manual/pending)

When modifying an existing feature → update its use-case and test docs.

### 1.4 Onboarding — New Developers

**First 15 minutes:**
1. Read `CONTRIBUTING.md` (git workflow, branch naming, PR process)
2. Read this section (1.1-1.3) — understand the zero-tolerance policy
3. Read Section 10 (Quick Reference Card) — print it, keep it visible
4. Run `bash scripts/health-check.sh` — verify your environment works

**First task:**
5. Pick a small task (typo fix, docs update)
6. Follow the Quick Reference Card step by step
7. Create a feature branch, PR, merge — feel the full flow

**First week:**
8. Read the full playbook (Sections 2-11)
9. Read `CLAUDE.md` for project architecture
10. Read the relevant `usecases/*.md` for features you'll work on

### 1.5 Human vs AI Developer Tracks

The same rules apply to both, but enforcement differs:

| | Human Developer | AI Developer (Claude, etc.) |
|---|---|---|
| **Classification block** | Optional in conversation, required in PR description | Required in conversation before any tool call |
| **Compliance log** | Auto-logged by CI (see below) | Must append manually to `.claude/compliance-log.md` |
| **Pre-flight** | CI runs health checks; local optional but recommended | Must run `health-check.sh` every session |
| **Scope analysis** | In PR description | In conversation before coding |
| **Feature branch** | Enforced by GitHub (branch protection) | Enforced by GitHub (branch protection) |
| **CI checks** | Enforced by GitHub (must pass to merge) | Enforced by GitHub (must pass to merge) |
| **Docs update** | Checked in PR review | Must do before marking task complete |

**Key insight:** Human developers are protected by CI gates (automated). AI developers are protected by classification blocks + compliance log (conversation-level). Both produce the same quality output.

---

## 2. Pre-Flight Protocol (Every Task, No Exceptions)

### 2.1 Environment
```bash
bash scripts/health-check.sh
```
Fix any ❌ before proceeding.

### 2.2 Git — Feature Branch Workflow

**Branch model (strict — no exceptions):**
```
feature branch → PR → dev (integration) → PR → main (production)
```

Both `dev` and `main` are **protected** — no direct pushes. All changes go through PRs.

**Branch naming convention:**
```
<developer>/<short-description>
```
Examples: `rahul/voice-agent-tts`, `claude/playbook-enforcement`, `alex/contact-export`

**Pre-flight git steps:**
1. `git checkout dev && git pull origin dev` — start from latest dev
2. `git checkout -b <developer>/<feature-name>` — create your feature branch
3. Check `git log --oneline -5 -- <affected-files>` — see if another dev touched these recently
4. If another dev is working on the same area → coordinate before starting

**When done:**
1. Commit to your feature branch
2. `git push origin <developer>/<feature-name>`
3. Create PR → `dev` with: classification block, files changed, test results
4. Merge your own PR (no approval needed — PR is for tracking/visibility)
5. Release: create PR `dev` → `main` (batched, requires 1 approval)

**Branch protection:**
- `dev`: PR required, **0 approvals** — merge your own PRs, but always via PR (no direct push)
- `main`: PR required, **1 approval** — production releases need review

**Rules:**
- NEVER push directly to `dev` or `main` — both are protected, use PRs
- NEVER work on someone else's feature branch without telling them
- If your branch is stale: `git rebase dev` (not merge) to keep history clean
- Delete feature branches after merge
- If two devs modify the same file → resolve conflict in the PR, not by force-pushing

### 2.3 Services (if task requires API/page loads)
| Service | Port | Check |
|---------|------|-------|
| CRM (Next.js) | 3000 | `curl -s localhost:3000` |
| Ollama | 11434 | `curl -s localhost:11434/api/tags` |
| Voice Agent | 8768 | `curl -s localhost:8768/api/health` |
| Form Server | 8767 | `curl -s localhost:8767/health` |

### 2.4 Memory
- Read `MEMORY.md` for behavioral rules
- Check for task-relevant memory entries

---

## 3. Task Classification

### 3.0 MANDATORY — Understand Before Executing

**No Read, Edit, Write, Bash, or Agent tool call is permitted until this section is complete.**

1. **Read the FULL prompt** — every sentence, not just the first request
2. **Decompose** into discrete steps — list them
3. **Map dependencies** — does step B need step A's output? Does file X require file Y first?
4. **Reorder** into correct execution sequence — users write in thought order, NOT dependency order
5. **Output the classification block** (Section 3.1) — this proves you completed steps 1-4
6. **Only then** proceed to execution

Example: User writes "update the frontend, then fix the backend API, then add the database column."
Correct execution order: database column → backend API → frontend. **Always reorder by dependency.**

If the correct order is unclear → ask ONE clarifying question. Do not guess.

**This step is NOT optional. It applies to:**
- Every new task
- Every follow-up task
- Every "small fix"
- Every task in a multi-task session
- Tasks where you "already know what to do"

### 3.1 Classification Output

Before execution, output:
```
Task Type: CODING:feature
Confidence: high/medium/low
Reasoning: [1-2 sentences]
Affected: [files, tables, APIs]
Execution Order: [if multi-step, list the reordered sequence]
```

### 3.2 Trivial Change Fast Path

For genuinely trivial changes, use the fast path instead of the full playbook:

**Qualifies as trivial (ALL must be true):**
- 3 or fewer lines changed
- Single file only
- No logic change (typo, comment, copy, formatting)
- No schema change, no new imports, no API change
- No test impact

**Fast path:**
```
Task Type: CODING:trivial
Affected: [single file]
```
→ Implement → PR → CI must pass → merge

**Skipped phases:** scope analysis, plan, self-check, docs update
**Still required:** classification block, feature branch, PR, CI pass, compliance log

If in doubt → it's not trivial. Use the full playbook.

### 14 Task Types

| Type | Subtypes | When |
|------|----------|------|
| CODING | feature, bugfix, refactor, script | Build or modify code |
| TESTING | unit, integration, e2e, eval | Write or run tests |
| DEBUGGING | error, performance, data_issue | Investigate failures |
| DESIGN_SPEC | architecture, feature, api, migration | Plan before building |
| RAG_KB | pipeline, tuning, evaluation, content | RAG system work |
| ORCHESTRATION | workflow, trigger, pipeline, agent | AI agent workflows |
| INTEGRATION | api_connect, webhook, auth, data_sync | Wire external services |
| DOCS | spec, guide, runbook, changelog | Documentation |
| EVAL | metrics, golden_set, ab_test, quality_gate | Quality evaluation |
| INFO_QA | explain, compare, recommend | Answer questions (no code) |
| **DEPLOY** | local, production, rollback, migration_only | Build & deploy |
| **VOICE_AGENT** | tool_dev, provider_switch, system_prompt, eval | Python voice agent |
| **DATA_MIGRATION** | schema, seed, bulk_fix, rollback | DB migrations & data |
| **SECURITY_AUDIT** | rls, webhooks, secrets, compliance | Security review |

If confidence is LOW → ask one clarifying question.

### 3.2 Multi-Task Handling

When a single prompt contains **multiple tasks** (e.g., "fix the contact bug, add export feature, and update the tests"):

**Step 1 — Decompose**: Break the prompt into a numbered task list. For each task:
- Task name (short, descriptive)
- Task type:subtype classification
- Affected files/tables
- Dependencies (does task B depend on task A completing first?)

**Step 2 — Order & Parallelize**:
- Independent tasks → launch parallel agents (one per task)
- Dependent tasks → execute sequentially (complete A before starting B)
- Each agent follows the FULL playbook for its task (Pre-Flight → Classify → Execute → Validate)

**Step 3 — Execute**: Deploy agents using model chaining:
- Haiku agents for INFO_QA, quick searches, classification
- Sonnet agents for CODING, TESTING, INTEGRATION, DATA_MIGRATION
- Opus agents for DESIGN_SPEC, SECURITY_AUDIT, complex DEBUGGING

**Step 4 — Verify Completion**: After all agents finish:
- [ ] Review each task's output — did it complete fully or partially?
- [ ] Run `bash scripts/test-suite.sh` — do all tests still pass?
- [ ] Run `npx tsc --noEmit` — any TypeScript errors introduced?
- [ ] Check for conflicts between parallel tasks (same file modified by two agents)
- [ ] If any task failed or was partial → report what's done vs what remains
- [ ] Commit all completed work with clear per-task descriptions

**Step 5 — Report**: Present a completion summary:
```
Multi-Task Summary:
  Task 1: [name] — ✅ Complete
  Task 2: [name] — ✅ Complete
  Task 3: [name] — ⚠️ Partial (reason)
  Task 4: [name] — ❌ Blocked (dependency)

Tests: 73/73 passing
TypeScript: 0 errors
Commit: abc1234 pushed to dev
```

**Rules**:
- Never skip the playbook for any individual task, even in a multi-task batch
- Never mark a task complete if its validation step failed
- If parallel agents modify the same file → resolve conflicts before committing
- If one task breaks another → fix the regression before reporting completion
- Maximum parallel agents: 5 (to avoid context/resource exhaustion)

---

## 4. Task Playbooks

### 4.1 CODING

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
- **tsconfig**: if modifying → verify exclude contains `[app, app-backup, agent-pipeline, content-generator, listingflow-agent]`
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

**Phase 6 — Documentation**
- Update `usecases/<feature>.md` if feature behavior changed
- Update `tests/<feature>.md` with new/modified test cases
- Mark test cases as `[auto]`, `[manual]`, or `[pending]`

**Phase 7 — Output**
- Summarize changes, breaking changes, new env vars, new migrations
- Commit to `dev`, push

### 4.2 TESTING

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

### 4.3 DEBUGGING

**Phase 1** — Restate symptom precisely. Error message? Stack trace? When? Scope?

**Phase 2** — Reproduce. Trace call path. Check: data issue? env issue? race condition?

**Phase 3** — Hypotheses (2-4), ordered by likelihood. Check most likely first.

**Phase 4** — Minimal fix. No surrounding refactors.

**Phase 5** — Write regression test. Grep for same anti-pattern elsewhere.

### 4.4 DESIGN_SPEC

**Phase 0 — Feature Justification**
- Describe existing behavior and related components. Extension or new capability?
- Answer: What problem does this solve for BC realtors? What measurable benefit?
- Compare against 2-3 reference products (Follow Up Boss, LionDesk, kvCORE, Realvolve):
  - What do they do here? Are we copying, differentiating, or staying simpler?
  - What's our unique angle? (BC compliance, voice agent, AI content)
- Conclude: "Does this fit ListingFlow's vision?" If unclear → ask the product owner.
- Document in `usecases/<feature-name>.md` with problem statement + 3 scenarios + demo script

**Phase 1** — Goals, non-goals, constraints, success metrics, dependencies

**Phase 2** — Current state audit. What exists that we can reuse?

**Phase 3** — 2+ design options with pros/cons/risks

**Phase 4** — Detailed design: data model, API surface, components, data flow, error handling, security

**Phase 5** — Operational: deployment plan, monitoring, failure modes, cost

**Phase 6** — Implementation plan: phases, files per phase, test plan

### 4.5 RAG_KB

**Phase 1** — Use case: question types, data sources, privacy, freshness, accuracy bar

**Phase 2** — Content prep: chunking strategy, metadata schema, embedding cost. Two RAG systems exist: TypeScript (`src/lib/rag/`) and Python (`listingflow-rag/`) — identify target

**Phase 3** — Retrieval config: search mode, top_k, similarity threshold, context budget

**Phase 4** — Prompting: system prompt, context layout, guardrails, fallback

**Phase 5** — Evaluation: 20+ test queries, guardrail testing, cross-contact isolation, latency P95 < 5s

### 4.6 ORCHESTRATION

**Phase 1** — Workflow type: sequential, event-driven, state machine, fan-out. Map to existing: `trigger-engine.ts`, `workflow-engine.ts`, `contact-evaluator.ts`, `trust-gate.ts`, `send-governor.ts`

**Phase 2** — States & transitions. Guard conditions. Dead state handling. Rollback.

**Phase 3** — Error handling: timeouts, retries, human-in-the-loop, circuit breaker

**Phase 4** — Observability: log decisions to `agent_decisions`, track latency, define alerts

### 4.7 INTEGRATION

**Phase 1** — Read API docs. Endpoints needed. Sandbox available? Existing similar integration?

**Phase 2** — Data contracts. Request/response schemas. Field mapping.
- Twilio: use `lib/twilio.ts` formatter for phones
- Kling AI: async task_id → poll via `/api/kling/status`
- Resend: verify svix webhook headers against `RESEND_WEBHOOK_SECRET`

**Phase 3** — Error/retry: timeout values, exponential backoff, rate limiting (429), idempotency

**Phase 4** — Security:
- Keys in `.env.local` → encrypt with `vault.sh` → NEVER commit
- Validate webhook signatures
- **CASL**: verify consent before outbound messages
- Vault workflow: `decrypt → edit → encrypt → commit .env.vault → tell team`

**Phase 5** — Integration tests against sandbox/mock

### 4.8 DOCS

**Phase 1** — Audience (developer/user/admin). What action does it enable?

**Phase 2** — Outline structure before writing

**Phase 3** — Draft with real file paths, table names, commands

**Phase 4** — Verify all paths exist, commands work, names are current

**Phase 5** — Align terminology with CLAUDE.md

### 4.9 EVAL

**Phase 1** — Define metrics: accuracy, latency, cost, groundedness

**Phase 2** — Check existing `evals.md` (200 cases) and `scripts/eval-*.mjs` (8 suites) first

**Phase 3** — Scoring: automatic or manual review

**Phase 4** — Run, record, identify failure patterns

**Phase 5** — Decision: ship / iterate / redesign

### 4.10 INFO_QA

**Phase 1** — Restate question, identify sub-questions

**Phase 2** — Research: codebase, CLAUDE.md, memory, git log

**Phase 3** — Answer with citations (file:line), call out assumptions

**Phase 4** — Examples and edge cases. State limitations.

### 4.11 DEPLOY

**Phase 1 — Pre-deploy**
- `bash scripts/health-check.sh` — all green
- Branch = `dev`, all changes committed
- `npm run build` passes

**Phase 2 — Migrations**
- List pending: compare `supabase/migrations/` against last applied
- Run in order: `SUPABASE_ACCESS_TOKEN=xxx npx supabase db query --linked -f <file>`
- Verify each succeeded

**Phase 3 — Service startup**
1. Supabase (remote — always running)
2. Next.js CRM: `npm run dev` → :3000
3. Form Server (optional): Python → :8767
4. Voice Agent (optional): `python3 voice_agent/server/main.py` → :8768
5. Ollama (if voice agent uses it): `ollama serve` → :11434

**Phase 4 — Netlify deploy**
- Env vars must be set in Netlify dashboard (not just `.env.local`)
- Required: `CRON_SECRET`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXTAUTH_SECRET`, `DEMO_EMAIL`, `DEMO_PASSWORD`
- Deploy: push to `main` triggers GitHub Actions → Netlify auto-deploy
- Or manual: `npx netlify deploy --prod --dir=.next`

**Phase 5 — Post-deploy validation**
- `bash scripts/test-suite.sh`
- Check Netlify deploy URL responds
- `bash scripts/save-state.sh`

**Phase 6 — Rollback**
- Netlify: redeploy previous deploy from dashboard
- Migration: run reverse SQL (must be prepared before running forward migration)
- Git: `git revert HEAD` → push

### 4.12 VOICE_AGENT

**Phase 1 — Identify scope**
- Backend: `voice_agent/server/` (Python 3.12+, aiohttp)
- Frontend: `src/components/voice-agent/` (TypeScript/React)
- Run with: `/opt/homebrew/bin/python3.14 voice_agent/server/main.py` (requires Python 3.12+ for edge-tts)

**Phase 2 — Provider awareness**
- 4 LLM providers: Ollama, OpenAI, Anthropic, Groq
- Different tool-calling formats and token limits per provider
- Config: `voice_agent/server/config.py` + `.env`
- Fallback chain: `LLM_FALLBACK_CHAIN=anthropic,openai,ollama`
- Anthropic prompt caching enabled (`cache_control: ephemeral` on system blocks) — saves ~90% on turns 2+

**Phase 3 — Tool development** (for new voice commands)
1. Create API endpoint: `src/app/api/voice-agent/<resource>/route.ts`
2. Add tool schema to: `voice_agent/server/tools/realtor_tools.py` (REALTOR_TOOLS list)
3. Add handler in: `handle_realtor_tool()` function
4. 56 tools across 21 API routes
5. **Dynamic tool selection**: tools are routed by message keywords (see `SessionState.get_tools()` in `main.py`)
   - Core set (12 tools) always included
   - Additional tools activated by keyword matching (e.g., "showing" → showing tools)
   - Session focus (current contact/listing) also activates relevant tools
   - This cuts tool tokens from ~8K to ~2.5K per turn

**Phase 4 — System prompts**
- `voice_agent/server/system_prompts.py` — 4 modes: realtor, client, generic, help
- Voice-optimized: 10 strict rules (no markdown, concise, natural speech, contractions)
- BC real estate knowledge embedded (forms, FINTRAC, terms, workflow phases)
- Form-fill mode for structured data extraction (JSON at end of response)

**Phase 5 — Key features to preserve**
- Edge TTS endpoint (`/api/tts`) with LRU cache (100 entries) + 13 pre-rendered phrases
- Session focus tracking (`SessionState.focus`) — tracks current contact/listing across turns
- Context summarization — compresses old turns after 20 messages, keeps last 12 verbatim
- `_clean_for_voice()` — strips markdown from responses before TTS
- Empty response retry + fallback messages

**Phase 6 — Testing**
```bash
# Create session
curl -X POST localhost:8768/api/session/create -H "Content-Type: application/json" -H "Authorization: Bearer va-bridge-secret-key-2026" -d '{"mode":"realtor"}'
# Send chat
curl -X POST localhost:8768/api/chat -H "Content-Type: application/json" -H "Authorization: Bearer va-bridge-secret-key-2026" -d '{"session_id":"ID","message":"How many active listings?"}'
# Test TTS
curl -o /tmp/test.mp3 -X POST localhost:8768/api/tts -H "Content-Type: application/json" -H "Authorization: Bearer va-bridge-secret-key-2026" -d '{"text":"Hello testing"}'
```

**Phase 7 — Verify fallback chain**
- Test with each provider active
- Verify tool-calling works with selected provider
- Check timeout handling for slow providers (Ollama can take 30s+)
- Verify prompt caching: second turn should show `cache_read_input_tokens` > 0

### 4.13 DATA_MIGRATION

**Phase 1 — Numbering**
- `ls supabase/migrations/ | tail -5` — check highest number
- ⚠️ Files 050-053 have duplicates — always verify uniqueness

**Phase 2 — Schema design**
- RLS policy REQUIRED for every new table
- FK constraints, CHECK constraints, indexes
- Use JSONB for flexible data, NOT NULL on required fields

**Phase 3 — Idempotency**
- `IF NOT EXISTS`, `DO $$` blocks, `ON CONFLICT DO NOTHING`
- Migration must be safe to run twice

**Phase 4 — Seed data realism (BC)**
- Postal codes: V-prefix (V6B 1A1, V5K 3E2)
- Phone area codes: 604, 778, 236, 250
- Prices: CAD $600K–$3M for detached, $400K–$1.2M for condos
- Cities: Metro Vancouver / Fraser Valley
- MLS numbers: R2xxxxxxx format

**Phase 5 — Execute**
```bash
SUPABASE_ACCESS_TOKEN=xxx npx supabase db query --linked -f supabase/migrations/<file>.sql
```

**Phase 6 — Verify**
- Query affected tables to confirm changes applied
- Test constraints are enforced (try invalid inserts)

**Phase 7 — Rollback plan**
- Document the reverse SQL BEFORE running forward migration
- For destructive migrations: export data first via Supabase SQL editor

### 4.14 SECURITY_AUDIT

**Phase 1 — RLS**
- Every table must have: `ALTER TABLE x ENABLE ROW LEVEL SECURITY`
- Policy: `CREATE POLICY x ON table FOR ALL USING (auth.role() = 'authenticated')`
- Check: `SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename NOT IN (SELECT tablename FROM pg_policies)`

**Phase 2 — Webhooks**
- Resend: verify `svix-id`, `svix-timestamp`, `svix-signature` against `RESEND_WEBHOOK_SECRET`
- Twilio: `twilio.validateRequest()` with `TWILIO_AUTH_TOKEN`
- Check all routes in `src/app/api/webhooks/`

**Phase 3 — Secrets**
- `grep -r "sk-" src/` — should find ZERO matches
- Verify `.env.local` in `.gitignore`
- `./scripts/vault.sh status` — all keys masked, vault encrypted

**Phase 4 — FINTRAC compliance**
- `seller_identities` fields must be non-nullable: `full_name`, `dob`, `citizenship`, `id_type`, `id_number`, `id_expiry`
- Verify identity collection in Phase 1 workflow

**Phase 5 — CASL/TCPA**
- Outbound messages must check `consent_status` before sending
- `/api/cron/consent-expiry` processes expiring consents
- Unsubscribe endpoint must work without auth

**Phase 6 — Input sanitization**
- Zod on all POST/PATCH endpoints
- No raw SQL (use Supabase client parameterized queries)
- No `dangerouslySetInnerHTML` without sanitization

### 4.15 Use-Case Documentation

For every new feature or major enhancement, create or update `usecases/<feature-name>.md`.

**Required sections**:

1. **Problem Statement** — What user pain does this solve? (2-3 sentences)
2. **User Roles** — Who uses this? (single realtor, team lead, admin, buyer client, seller client)
3. **Existing System Context** — What related features already exist? How does this fit?
4. **End-to-End Scenarios** (minimum 3):
   - Scenario name
   - Preconditions (user state, data state)
   - Steps (numbered: user does X → system does Y → user sees Z)
   - Expected outcome
   - Edge cases / error conditions
5. **Demo Script** — How to show this in a live demo:
   - Setup (sample data, services running)
   - Script (click X → say Y → show Z)
   - Key talking points
6. **Market Context** (for new features):
   - How do 2-3 competitors handle this?
   - Our differentiation

**Naming**: `usecases/` + kebab-case (e.g., `usecases/voice-agent-showing-management.md`)

---

## 5. Model Chaining

### 5.1 Model Selection

| Model | Use For | Cost (input/output per 1M tokens) |
|-------|---------|----------------------------------|
| **Haiku** | Classification, quick searches, file matching, schema lookups | $0.25 / $1.25 |
| **Sonnet** | Coding, testing, API dev, tool implementation, migrations | $3 / $15 |
| **Opus** | Architecture, design specs, complex debugging, playbook, gap analysis | $15 / $75 |

### 5.2 When to Override

- User explicitly requests a model → use it regardless of task type
- Task classified as trivial (Section 3.2) → Haiku or Sonnet, never Opus
- Budget-sensitive context → prefer Sonnet over Opus for coding tasks
- If rate-limited on one model → fall back to next tier (Opus → Sonnet → Haiku)

### 5.3 Parallel Agent Rules

- Launch parallel agents when tasks are independent (no shared files)
- Use `subagent_type=Explore` for codebase research
- Maximum 5 parallel agents (context/resource limit)
- Each parallel agent follows the FULL playbook for its task
- If two agents will touch the same file → run them sequentially, not in parallel

---

## 6. Post-Task Validation (Every Task, No Exceptions)

1. `bash scripts/test-suite.sh` — all tests pass
2. `npx tsc --noEmit` — no TypeScript errors in `src/`
3. `git status` — clean working tree
4. `git push origin <developer>/<feature-branch>` — push your feature branch (NOT dev or main)
5. `gh pr create --base dev` — create PR to dev with classification block + test results
6. Check GitHub Actions CI: `gh run view`
7. If new migration: verify it applied on remote DB
8. `bash scripts/save-state.sh` — snapshot saved
9. After PR approval + merge → delete feature branch: `git branch -d <branch>`

---

## 7. Production Incident Protocol

| Step | Action | Check |
|------|--------|-------|
| 1 | Netlify status | app.netlify.com/projects/realtorai-crm |
| 2 | Supabase status | supabase.com/dashboard |
| 3 | Cron jobs | `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/process-workflows` |
| 4 | Resend delivery | resend.com/dashboard |
| 5 | Rollback | Redeploy previous Netlify deploy from dashboard |
| 6 | DB restore | Supabase Dashboard → Database → Backups |

---

## 7.1 Dev Branch Broken — Emergency Protocol

When a PR to `dev` breaks the build and blocks other developers:

| Step | Action | Who |
|------|--------|-----|
| 1 | **Detect**: CI fails on dev, or developer reports `npm run build` failing after pull | Anyone |
| 2 | **Alert**: Post in team channel: "dev is broken — [describe error] — do NOT merge until fixed" | Whoever found it |
| 3 | **Identify**: `git log --oneline -5 dev` → find which merge commit broke it | Anyone |
| 4 | **Fix or revert** (within 30 min): | PR author |
| | Option A: Author pushes a fix PR immediately | |
| | Option B: If fix is complex → `git revert <merge-commit> --no-edit` on a branch, PR to dev | |
| 5 | **Verify**: CI passes on dev after fix/revert | Author |
| 6 | **All clear**: Post in team channel: "dev is green again" | Whoever fixed it |

**Rules:**
- The PR author is responsible for fixing their own breakage
- If author is unavailable, any team member can revert (don't wait)
- Never force-push dev to "fix" history — always use revert commits
- 30-minute SLA: if dev is broken for >30 min, revert first, fix later

---

## 7.2 Conflict Resolution Protocol

When two developers modify the same file:

**Prevention (before it happens):**
- Check `WIP.md` before starting work (see Section 12)
- `git log --oneline -5 -- <file>` — see who touched it recently
- If overlap → message the other developer BEFORE starting

**Resolution (when it happens):**
1. The **second PR** (created later) is responsible for resolving conflicts
2. `git checkout dev && git pull && git checkout <your-branch> && git rebase dev`
3. Resolve conflicts locally, test, push
4. If the conflict is in a shared file (e.g., `database.ts`, `globals.css`):
   - Both developers review the merged result together
   - Don't guess what the other developer intended
5. If you can't reach the other developer → resolve conservatively (keep both changes, don't delete theirs)

**Never:**
- Force-push over someone else's merged work
- Delete the other developer's changes to resolve a conflict
- Merge without testing after conflict resolution

---

## 8. Secret Rotation

1. Generate new key in provider dashboard (Anthropic, Resend, Twilio, Supabase)
2. `./scripts/vault.sh decrypt` → edit `.env.local` → `./scripts/vault.sh encrypt`
3. Update Netlify env vars (Settings → Environment Variables)
4. Update GitHub secrets: `gh secret set KEY_NAME --body "value"`
5. Redeploy
6. Revoke old key in provider dashboard

---

## 9. Infrastructure Map

| Component | Location | Purpose |
|-----------|----------|---------|
| CRM | `src/` | Next.js 16 App Router, Turbopack |
| Voice Agent | `voice_agent/server/` | Python aiohttp, 60 tools, 21 API routes |
| Form Server | external :8767 | Python BCREA form generation |
| Migrations | `supabase/migrations/` | 61 SQL files |
| Health Check | `scripts/health-check.sh` | Pre-session diagnostic |
| Test Suite | `scripts/test-suite.sh` | 73+ functional tests |
| Save State | `scripts/save-state.sh` | Snapshot before risky ops |
| Vault | `scripts/vault.sh` | Encrypt/decrypt secrets |
| CI/CD | `.github/workflows/deploy.yml` | Auto-deploy on push to main |
| Eval Scripts | `scripts/eval-*.mjs` | 8 eval suites |
| QA Cases | `evals.md` | 200 QA test cases |
| Playwright | `playwright.config.ts` + `tests/` | Browser e2e tests |
| RAG (TS) | `src/lib/rag/` | TypeScript RAG module |
| RAG (Python) | `listingflow-rag/` | Separate FastAPI service |
| Content Gen | `content-generator/` | Separate package (excluded from build) |
| Agent Pipeline | `agent-pipeline/` | Research/build pipeline (excluded) |

---

## 10. Quick Reference Card

```
STRICT POLICY: No step below can be skipped. No exceptions. No bypass.

PRE-FLIGHT (BLOCKING — nothing runs until green)
□ health-check.sh  □ check WIP.md for conflicts  □ feature branch from dev
□ pull latest  □ load memory  □ services up

UNDERSTAND FIRST (Section 3.0 — BLOCKING — no tool calls until done)
□ Read FULL prompt  □ Decompose steps  □ Map dependencies  □ Reorder correctly

CLASSIFY (BLOCKING — no code changes until block is outputted)
□ type:subtype  □ confidence  □ reasoning  □ affected files  □ execution order

CRM RULES (every CODING task)
□ FINTRAC fields non-nullable  □ CASL consent before outbound
□ RLS on new tables  □ lf-* design classes  □ Zod v4 validation
□ force-dynamic on live pages  □ Parent ≠ complete if child incomplete
□ Twilio formatter  □ tsconfig exclude array intact

FEATURE GATE (CODING:feature + DESIGN_SPEC)
□ Search for existing capability  □ Summarize what exists
□ What problem? What benefit?  □ Compare 2-3 competitors
□ Fits ListingFlow vision?  □ If unclear → ask product owner

DOCUMENTATION (every feature change)
□ usecases/<feature>.md created/updated  □ 3+ scenarios + demo script
□ tests/<feature>.md updated  □ Cases marked [auto]/[manual]/[pending]

REGRESSION (every code change)
□ Identify impacted areas  □ Pick relevant tests
□ Minor → smoke  □ Shared flow → module tests  □ Schema → full suite

EXECUTE
→ Follow per-type checklist phase by phase
→ Model chain: Haiku classify → Sonnet code → Opus architect

VALIDATE
□ test-suite.sh  □ tsc --noEmit  □ git push dev  □ check CI  □ save-state.sh

COMPLIANCE LOG (Section 11 — BLOCKING — task is NOT complete without this)
□ Append entry to .claude/compliance-log.md  □ ✅ or ❌  □ No log = unauthorized change

WIP BOARD (Section 12)
□ Add row to .claude/WIP.md BEFORE starting  □ Remove AFTER PR merged

TRIVIAL FAST PATH (Section 3.2 — only if ≤3 lines, 1 file, no logic change)
□ classify → implement → PR → CI pass → merge (skip scope/plan/docs)
```

---

## 11. Playbook Compliance Tracker — MANDATORY

**A task without a compliance log entry is an unauthorized change.** No exceptions.

### 11.1 When to Log

- After EVERY task — no matter how small
- Before reporting completion to the user
- If the task was abandoned mid-way — still log it with status "abandoned"
- If the user explicitly says "skip the playbook" — log it as ❌ with note "user override"

**A task is not complete until its compliance entry exists.**

### 11.2 How to Log

Append a row to `.claude/compliance-log.md`:

```markdown
| Date | Developer | Task Summary | Type | Playbook Followed | Phases Completed | Phases Skipped | Notes |
|------|-----------|-------------|------|-------------------|-----------------|----------------|-------|
| 2026-03-27 | claude | Voice agent TTS + prompt rewrite | VOICE_AGENT:system_prompt | ❌ NO | 2,3,4,5 | 0,1.2,6 | Jumped to coding without loading playbook |
```

### 11.3 Required Fields

- **Date**: ISO date (YYYY-MM-DD)
- **Developer**: who did the work (claude, rahul, or other dev name)
- **Task Summary**: 1-line description
- **Type**: classification from Section 3.1 (must match the block you outputted)
- **Playbook Followed**: ✅ YES (ALL phases for that task type completed) or ❌ NO (ANY phase skipped)
- **Phases Completed**: list of phase numbers/names actually followed
- **Phases Skipped**: list of phases missed + brief reason for each
- **Notes**: context, lessons learned, what broke

### 11.4 Strict Rules

1. **No log = unauthorized change** — work without a log entry is untrusted and subject to revert
2. **Every task, every developer, every time** — no exceptions for "small" tasks
3. **Append-only** — never edit, rewrite, or delete past entries (this is an audit trail)
4. **Honest logging** — ❌ is acceptable; missing entries are not
5. **3+ consecutive ❌ from any developer** → mandatory process review before next task
6. **No classification block in conversation = ❌** — the block proves you loaded the playbook
7. **Reflexion rule** — After any ❌ entry: write a 1-sentence lesson in the Notes column (e.g., "Lesson: always check migration numbering before creating file"). Before starting a task of the SAME type, scan the last 5 compliance entries for that type — if ❌ entries exist, read their lessons and explicitly state how you'll avoid the same mistake. This is lightweight self-improvement at zero cost.
7. **Weekly review** — scan log for patterns (which phases get skipped, which developers skip them)
8. **The log tracks ALL developers equally** — human and AI, same rules, same accountability

### 11.5 Log Rotation

The compliance log rotates monthly to stay readable:

- Active log: `.claude/compliance-log.md` (current month)
- Archive: `.claude/compliance-archive/YYYY-MM.md` (previous months)
- On the 1st of each month: move current log rows to archive, keep header in active log
- Archives are read-only — never modify

### 11.6 Velocity Metrics (from compliance log)

Weekly, extract these metrics from the log:

| Metric | How to Calculate | What It Reveals |
|--------|-----------------|-----------------|
| Tasks per developer per week | Count rows grouped by developer | Who's active, who's blocked |
| Compliance rate by developer | ✅ count / total count per developer | Who follows the playbook |
| Most common task type | Count by Type column | Where the team spends time |
| Most skipped phases | Frequency in "Phases Skipped" column | Process bottlenecks to fix |
| Average tasks per day | Total rows / days in period | Team velocity trend |

This can be a monthly review in the team meeting or an automated script.

---

## 12. Work-In-Progress Visibility

### 12.1 WIP Board

Before starting any task, announce what you're working on in `.claude/WIP.md`:

```markdown
# Work In Progress

| Developer | Branch | What | Started | Files Touched |
|-----------|--------|------|---------|---------------|
| rahul | rahul/voice-tts | Voice agent Edge TTS integration | 2026-03-27 | voice_agent/server/main.py, tts_providers.py |
| claude | claude/playbook-v4 | Playbook gap fixes | 2026-03-27 | .claude/agent-playbook.md |
```

### 12.2 Rules

- **Add your row BEFORE starting work** — this is how other devs know you're touching those files
- **Remove your row AFTER your PR is merged** — not before
- **Check WIP.md BEFORE starting** — if someone else is touching the same files, coordinate first
- If WIP.md shows a conflict → message the other developer before creating your branch
- Stale entries (>3 days old, no matching open PR) can be removed by anyone

### 12.3 Why Not Use GitHub Issues/Projects?

WIP.md is:
- Checked into the repo — everyone pulls it automatically
- Visible in `git pull` output — you see it without opening a browser
- Editable by AI agents — no GitHub UI needed
- Lightweight — no project management overhead

For larger teams (5+), migrate to GitHub Projects or Linear.
