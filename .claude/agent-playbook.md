# Agent Playbook v8 — RealtorAI CRM

> Single source of truth for all AI and human developers. Every task follows the SDLC state machine. No exceptions.

---

## 1. Hard Constraints

These rules are absolute. Violating any one is an automatic revert + compliance flag.

| # | Rule | Rationale |
|---|------|-----------|
| HC-1 | **No `any` type** — no `as any`, no `@ts-ignore`, no `@ts-expect-error` | Type safety is the first line of defense |
| HC-2 | **No inline styles** — use `lf-*` CSS classes from the design system | Consistency, maintainability |
| HC-3 | **Server Actions for mutations** — API routes only for GETs and webhooks | Next.js convention, colocation |
| HC-4 | **RLS required on every table** — `ENABLE ROW LEVEL SECURITY` + policy | Data isolation |
| HC-5 | **CASL consent check before every outbound message** (email/SMS/WhatsApp) | Canadian anti-spam law |
| HC-6 | **FINTRAC PII fields non-nullable** — `seller_identities.full_name`, `dob`, `citizenship`, `id_type`, `id_number`, `id_expiry` | Regulatory compliance |
| HC-7 | **Never push directly to `main` or `dev`** — PRs only | Branch protection |
| HC-8 | **Never `git push --force`**, `git reset --hard`, `rm -rf /`, `rm -rf ~`, `DROP DATABASE`, `sudo` | Destructive commands forbidden |
| HC-9 | **Never commit `.env.local`** — use `scripts/vault.sh` | Secret management |
| HC-10 | **Zod v4 validation** on all form/API/webhook inputs | Input sanitization |
| HC-11 | **No PII in AI prompts** beyond approved fields (see Section 13) | Privacy law compliance |
| HC-12 | **`tsconfig.json` exclude array must be preserved** — `[app, app-backup, agent-pipeline, content-generator, listingflow-agent]` | Build isolation |

---

## 2. SDLC State Machine

Every task transitions through these states. Gates are enforced by hooks (Section 14).

```
CLASSIFY → [SPEC] → SCOPE → PLAN → IMPLEMENT → VERIFY → [REVIEW] → COMMIT
```

**State file:** `.claude/current-task.json`

```json
{
  "tier": "medium",
  "type": "CODING:feature",
  "phase": "IMPLEMENT",
  "description": "...",
  "phases": {
    "classified": true,
    "spec_written": false,
    "scoped": true,
    "planned": true,
    "implemented": false,
    "verified": false,
    "reviewed": false,
    "committed": false
  },
  "decisions": [],
  "created_at": "2026-03-30T00:00:00Z"
}
```

**Gate rules:**

| Transition | Gate | Enforced By |
|-----------|------|-------------|
| * -> CLASSIFY | Always first | `playbook-gate.sh` blocks edits without `classified: true` |
| CLASSIFY -> SPEC | Large tasks only | Manual (PRD template at `docs/templates/PRD_TEMPLATE.md`) |
| CLASSIFY -> SCOPE | `classified: true` | `playbook-gate.sh` |
| SCOPE -> PLAN | `scoped: true` (Medium+ only) | `playbook-gate.sh` |
| PLAN -> IMPLEMENT | Plan stated (Medium+) | Manual |
| IMPLEMENT -> VERIFY | Code complete | `completion-gate.sh` runs `tsc --noEmit` |
| VERIFY -> REVIEW | Tests pass (Medium+) | Subagent `code-reviewer` for Medium+ |
| REVIEW -> COMMIT | Review passed | Manual |

**Bracket states** `[SPEC]` and `[REVIEW]` are optional based on tier.

---

## 3. Classify Every Task

**No tool call (Read/Edit/Write/Bash) is permitted until classification is complete.**

### 3.1 Four Tiers

| Tier | Lines | Files | Ceremony |
|------|-------|-------|----------|
| **Micro** | <=3 | 1 | Classify -> Implement -> Commit |
| **Small** | 4-50 | 1-3 | Classify -> Scope -> Implement -> Verify -> Commit |
| **Medium** | 51-500 | 4-15 | Classify -> Scope -> Plan -> Implement -> Verify -> Review -> Commit |
| **Large** | 500+ | 15+ | Classify -> SPEC (PRD) -> Scope -> Plan -> Implement -> Verify -> Review -> Commit |

### 3.2 Type Enum

| Type | Subtypes | When |
|------|----------|------|
| CODING | feature, bugfix, refactor, script, trivial | Build or modify code |
| TESTING | unit, integration, e2e, eval | Write or run tests |
| DEBUGGING | error, performance, data_issue | Investigate failures |
| DESIGN_SPEC | architecture, feature, api, migration | Plan before building |
| DATA_MIGRATION | schema, seed, bulk_fix, rollback | DB migrations |
| SECURITY_AUDIT | rls, webhooks, secrets, compliance | Security review |
| INTEGRATION | api_connect, webhook, auth, data_sync | External services |
| ORCHESTRATION | workflow, trigger, pipeline, agent | AI agent workflows |
| VOICE_AGENT | tool_dev, provider_switch, system_prompt, eval | Voice agent |
| RAG_KB | pipeline, tuning, evaluation, content | RAG system |
| DEPLOY | local, production, rollback, migration_only | Deployment |
| DOCS | spec, guide, runbook, changelog | Documentation |
| EVAL | metrics, golden_set, ab_test, quality_gate | Quality evaluation |
| INFO_QA | explain, compare, recommend | Questions (no code) |

### 3.3 Classification Output

```
Task Type: CODING:feature
Tier: medium
Confidence: high
Reasoning: [1-2 sentences]
Affected: [files, tables, APIs]
Execution Order: [dependency-ordered steps]
```

Write `.claude/current-task.json` with `phases.classified: true` before proceeding.

### 3.4 PRD Trigger (Large Tier)

Large tasks require a PRD before coding. Use the interview pattern:

1. Ask 5-8 clarifying questions (scope, edge cases, tradeoffs, existing overlap)
2. Write PRD from `docs/templates/PRD_TEMPLATE.md`
3. Get user approval
4. Set `phases.spec_written: true`

### 3.5 Per-Tier Ceremony Table

| Phase | Micro | Small | Medium | Large |
|-------|-------|-------|--------|-------|
| Classify | Required | Required | Required | Required |
| SPEC (PRD) | - | - | - | Required |
| Scope | - | Required | Required | Required |
| Plan | - | - | Required | Required |
| Implement | Required | Required | Required | Required |
| Verify | - | `tsc` | `tsc` + tests | `tsc` + tests + suite |
| Review | - | - | Subagent | Subagent + human |
| Commit | Required | Required | Required | Required |
| Compliance log | Required | Required | Required | Required |

---

## 4. Scope & Plan

### 4.1 Pre-Flight (Every Session)

```bash
bash scripts/health-check.sh
git checkout dev && git pull origin dev
git checkout -b <developer>/<feature-name>
```

Check `.claude/WIP.md` for conflicts. Load `MEMORY.md`.

### 4.2 Scope Paragraph (Small+)

Before coding, write one paragraph covering:
- Files to CREATE and MODIFY
- DB tables affected (new columns? constraints? indexes?)
- API routes affected
- UI components that render affected data
- New env vars or migrations needed

### 4.3 Context Loading

- Read relevant files from scope (only those)
- Read `src/types/database.ts` if touching schema
- Summarize current behavior in 3-5 bullets BEFORE modifying

### 4.4 Downside Check (Medium+)

Answer these 5 questions before coding:

| # | Question | Purpose |
|---|----------|---------|
| Q1 | What breaks if this is wrong? | Blast radius |
| Q2 | Is this reversible? | Rollback plan |
| Q3 | Does similar capability exist? | Avoid duplication |
| Q4 | Does this cross a compliance boundary? (FINTRAC/CASL/RLS) | Regulatory check |
| Q5 | Who else is working on related files? | Conflict prevention |

### 4.5 Plan (Medium+)

Write a short plan: entry points -> data flow -> new types/functions -> error handling. Present to user before coding if 5+ files or schema change.

---

## 5. Execution Patterns

See `.claude/rules/execution-patterns.md` for the full reference.

**Key rules:**
- Server Actions for mutations -> `src/actions/`
- API routes for GETs and webhooks -> `src/app/api/`
- Zod v4 for all validation
- `lf-*` CSS classes, no inline styles
- Emoji icons on pages, Lucide only inside reusable components
- `force-dynamic` on pages with live Supabase data
- `revalidatePath()` after every mutation
- JSONB columns for flexible structured data
- `@/` path alias maps to `src/`

---

## 6. Analysis & Design Tasks

All analysis, design specs, gap analyses, and architecture documents must go through 5 iterative passes. Each pass takes 2-5 minutes of real thinking.

| Pass | Focus | Output |
|------|-------|--------|
| 1 | **Breadth** — Identify all gaps, issues, opportunities | Raw list of findings |
| 2 | **Depth** — Compare against best-in-market, add evidence | Validated findings with sources |
| 3 | **Verification** — Check claims against actual codebase | Corrected findings, false positives removed |
| 4 | **Actionability** — Expand into implementable specs | Concrete recommendations with effort estimates |
| 5 | **Prioritization** — Final priority matrix, dependencies | Ordered implementation plan |

**Rules:**
- Each pass MUST produce visible output (not just "I thought about it")
- Pass 3 MUST include actual file reads / greps to verify claims
- At least 1 pass should use a different model (fresh perspective)
- Document pass history at the top of the output

---

## 7. Verification Lattice

5 layers, with per-tier requirements.

| Layer | What | Micro | Small | Medium | Large |
|-------|------|-------|-------|--------|-------|
| 1. **Deterministic** | `tsc --noEmit`, `eslint`, unit tests | - | tsc | tsc + lint | tsc + lint + tests |
| 2. **Functional** | `test-suite.sh`, e2e tests | - | - | test-suite | test-suite + e2e |
| 3. **Security** | `npm audit`, secret scan, RLS check | - | - | secret-scan | full audit |
| 4. **Agentic** | Subagent review (code-reviewer, security-reviewer) | - | - | code-reviewer | code + security |
| 5. **Human** | PR review, risk-based escalation | - | - | PR to dev | PR + 1 approval |

**Testing thresholds by lines changed:**

| Lines | Minimum Testing |
|-------|----------------|
| <=20 | Smoke + `tsc --noEmit` |
| 21-100 | Targeted tests per changed function + `tsc` |
| 101-500 | Full touchpoint analysis + `test-suite.sh` + documented results |
| 500+ | All above + e2e + manual UI walkthrough + Test Report in PR |

---

## 8. Self-Healing

When validation fails, follow this algorithm strictly.

```
MAX_RETRIES = 3 per error, 5 total across all errors

For each failure:
  1. CAPTURE — Read full error (stack trace, file:line)
  2. DIAGNOSE — Form hypothesis in ONE sentence
  3. SCOPE CHECK — Is fix within original task scope?
     NO → HALT, report as pre-existing
  4. FIX — Minimal change addressing the hypothesis only
  5. RE-VALIDATE — Run same check that failed
     PASS → continue
     SAME ERROR → hypothesis wrong, retry
     NEW ERROR → count toward total cap
```

**Error recovery decision tree:**

```
Cannot form hypothesis? → HALT immediately
Error in file you didn't modify? → HALT, pre-existing
Fix requires >5 files beyond scope? → HALT, reclassify
3 retries on same error exhausted? → HALT, escalate
```

**Never:**
- Retry without a new hypothesis
- Suppress a test to make validation pass
- Cast to `any` to silence TypeScript
- Delete failing code instead of fixing it

---

## 9. Model Routing

| Task Phase | Model | Rationale |
|-----------|-------|-----------|
| Classification / triage | Haiku | Fast, cheap, sufficient for structured output |
| Scope / plan writing | Sonnet | Good quality/cost for text generation |
| Code implementation | Sonnet | Best quality/speed for coding |
| Architecture / security review | Opus | Deep reasoning for high-stakes decisions |
| 5-pass analysis (>=1 pass) | Different model | Fresh perspective requirement |

**Overrides:**
- User explicitly requests a model -> use it
- Micro/trivial tasks -> Haiku or Sonnet only (Opus banned)
- Rate-limited -> fall back one tier (Opus -> Sonnet -> Haiku)
- Token budget >80% consumed -> auto-downgrade one tier

**Token budgets:**

| Task Type | Max Input | Max Output |
|-----------|----------|------------|
| INFO_QA | 50K | 5K |
| CODING:trivial | 30K | 10K |
| CODING:feature | 200K | 50K |
| DESIGN_SPEC | 300K | 30K |
| All others | 150K | 30K |

---

## 10. Domain Rules

Domain-specific rules are maintained in separate files for focused loading.

| File | Domain |
|------|--------|
| `.claude/rules/domain-contacts.md` | Contact management, CASL, FINTRAC identity |
| `.claude/rules/domain-email.md` | Email engine, newsletters, journey system |
| `.claude/rules/domain-listings.md` | Listing workflow (8 phases), MLS, forms |
| `.claude/rules/domain-showings.md` | Showings, Twilio SMS/WhatsApp, calendar |
| `.claude/rules/domain-voice.md` | Voice agent, Python server, TTS, tools |
| `.claude/rules/execution-patterns.md` | Coding conventions, UI patterns, data integrity |

Load the relevant domain file(s) when the task touches that domain.

---

## 11. Session Management

### 11.1 Checkpoints

For Medium+ tasks, save state at key points:
- Before starting implementation: `bash scripts/save-state.sh`
- Before risky operations (migrations, bulk changes): `git stash`
- After each major milestone: commit WIP to feature branch

### 11.2 Partial Completion

If a task cannot be completed in one session:
1. Commit working code to feature branch with `WIP:` prefix
2. Update `.claude/current-task.json` with current phase and what remains
3. Add entry to `.claude/WIP.md` with branch, files touched, and next steps

### 11.3 Handoff Protocol

When handing off to another developer (human or AI):
1. Push feature branch with all WIP committed
2. Update `.claude/WIP.md` with handoff notes
3. List: what's done, what's remaining, known blockers, decisions made and why

### 11.4 Decision Trail

For Medium+ tasks, record key decisions in `current-task.json`:

```json
"decisions": [
  { "step": "schema", "decision": "JSONB over separate table", "rationale": "Fewer joins, flexible structure", "ts": "2026-03-30T10:00:00Z" }
]
```

---

## 12. Safety Levels

Every bash command must be classified before execution.

| Level | Label | Action | Examples |
|-------|-------|--------|----------|
| 1 | **Safe** | Execute without confirmation | `cat`, `grep`, `ls`, `git status`, `git log`, `tsc --noEmit`, `test-suite.sh` |
| 2 | **Guarded** | Execute with stated safeguards | `git add/commit/push` (feature branch only), file create/edit (repo only), `npm install` |
| 3 | **Dangerous** | Ask human to confirm | `rm`, `git reset`, SQL writes, migration execution, `kill`, outbound mutations |
| 4 | **Forbidden** | Never execute | `rm -rf /`, `rm -rf ~`, `git push --force origin main`, `DROP DATABASE`, `sudo`, `curl \| bash`, `chmod 777` |

**Pre-execution:** Classify -> Level 1? Execute. Level 2? State safeguards. Level 3? Ask. Level 4? Refuse.

---

## 13. Compliance & Governance

### 13.1 Compliance Log

Every task MUST produce an entry in `.claude/compliance-log.md`. No log = unauthorized change.

```markdown
| Date | Developer | Task Summary | Type | Followed | Phases Done | Phases Skipped | Notes |
|------|-----------|-------------|------|----------|-------------|----------------|-------|
| 2026-03-30 | claude | Add lead_source to contacts | CODING:feature | YES | 1-7 | - | Model: sonnet-4.6, ~12K tokens |
```

**Rules:**
- Append-only (audit trail)
- Every task, every developer, every time
- 3+ consecutive failures -> mandatory process review
- Monthly rotation to `.claude/compliance-archive/YYYY-MM.md`

### 13.2 PII Rules

**Never in AI prompts:** Full FINTRAC data, phone numbers, email addresses, calendar tokens, `seller_identities` fields, `.env.local` contents.

**Allowed in AI prompts:** Contact first name, listing address/price, property details (beds/baths/sqft), anonymized engagement data.

### 13.3 Regulatory Reference

| Regulation | Applies To | Enforcement |
|-----------|-----------|-------------|
| FINTRAC | Seller identity | Phase 1 workflow, non-nullable fields |
| CASL | All outbound messages | Consent check before send, expiry cron |
| PIPEDA | All personal data | Data minimization, cross-tenant isolation |

---

## 14. Mechanical Enforcement

7 hooks enforce the playbook automatically via `.claude/settings.json`.

| Hook | Event | File | What It Does |
|------|-------|------|-------------|
| **playbook-gate** | PreToolUse (Edit/Write) | `.claude/hooks/playbook-gate.sh` | Blocks code edits unless `current-task.json` exists with `classified: true`. Medium+ also requires `scoped: true`. |
| **git-protection** | PreToolUse (Bash) | `.claude/hooks/git-protection.sh` | Blocks `push origin main/dev`, `push --force`, `reset --hard`, `rm -rf /`, `rm -rf ~` |
| **secret-scan** | PreToolUse (Bash) | `.claude/hooks/secret-scan.sh` | Blocks `git commit` if staged files contain secret patterns |
| **auto-lint** | PostToolUse (Edit/Write) | `.claude/hooks/auto-lint.sh` | Runs `eslint --fix` on changed .ts/.tsx files |
| **playbook-reminder** | UserPromptSubmit | `.claude/hooks/playbook-reminder.sh` | Shows current task status: tier, type, completed phases |
| **completion-gate** | Stop | `.claude/hooks/completion-gate.sh` | Runs `tsc --noEmit` for CODING tasks, checks compliance log for Medium+, archives task file |
| **subagent-suggest** | PostToolUse (Edit/Write) | `.claude/hooks/subagent-suggest.sh` | Suggests security-reviewer or migration-reviewer when sensitive files change |

---

## 15. Subagents

4 specialized agents defined in `.claude/agents/`.

| Agent | Model | Tools | When to Spawn |
|-------|-------|-------|---------------|
| `security-reviewer` | Opus | Read, Grep, Glob | Medium+ touching auth, RLS, webhooks, AI prompts, migrations |
| `code-reviewer` | Sonnet | Read, Grep, Glob | Medium+ before PR (fresh-eye review, no access to implementation reasoning) |
| `test-writer` | Sonnet | Read, Grep, Write | Medium+ after implementation (generate unit + integration tests) |
| `migration-reviewer` | Opus | Read, Grep | Every DATA_MIGRATION (rollback plan, idempotency, index coverage) |

**Writer/Reviewer pattern:** For Medium+ tasks, the implementing agent MUST NOT review its own code. Spawn `code-reviewer` in a separate context.

See `.claude/agents/*.md` for full definitions.

---

## 16. Production Incidents

6-step checklist:

| Step | Action | Where |
|------|--------|-------|
| 1 | Check Netlify status | app.netlify.com/projects/realtorai-crm |
| 2 | Check Supabase status | supabase.com/dashboard |
| 3 | Test cron jobs | `curl -H "Authorization: Bearer $CRON_SECRET" localhost:3000/api/cron/process-workflows` |
| 4 | Check Resend delivery | resend.com/dashboard |
| 5 | Rollback | Redeploy previous Netlify deploy from dashboard |
| 6 | DB restore | Supabase Dashboard -> Database -> Backups |

**Dev branch broken:** 30-minute SLA. Author fixes or anyone reverts. Never force-push dev.

---

## 17. Secret Rotation

1. Generate new key in provider dashboard (Anthropic, Resend, Twilio, Supabase)
2. `./scripts/vault.sh decrypt` -> edit `.env.local` -> `./scripts/vault.sh encrypt`
3. Update Netlify env vars (Settings -> Environment Variables)
4. Update GitHub secrets: `gh secret set KEY_NAME --body "value"`
5. Redeploy
6. Revoke old key in provider dashboard

---

## 18. Commit Convention

Format: `<type>(<scope>): <description>`

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring |
| `test` | Adding/updating tests |
| `docs` | Documentation |
| `chore` | Config, deps, scripts |
| `migration` | Database schema changes |
| `security` | Security fixes |

Examples:
```
feat(contacts): add lead_source field with migration
fix(showings): handle +1 prefix in Twilio formatter
migration(056): add contact_segments table with RLS
```

**PR requirements:**
- Task type classification block in description
- Phases completed (list them)
- Test results (pass/fail counts)
- Compliance log entry reference

---

## 19. Worked Examples

### Micro — Fix Typo

```
Task Type: CODING:trivial
Tier: micro
Affected: src/components/listings/ListingCard.tsx
```
-> Fix typo -> Commit -> Compliance log. Done.

### Small — Add Field

```
Task Type: CODING:feature
Tier: small
Affected: migration, database.ts, ContactForm.tsx
```
-> Classify -> Scope (3 files, 1 table) -> Implement (migration, type, UI) -> Verify (`tsc`) -> Commit -> Compliance log.

### Medium — New API Integration

```
Task Type: INTEGRATION:api_connect
Tier: medium
Affected: 8 files, 2 tables, 3 API routes
```
-> Classify -> Scope (list all touchpoints) -> Downside check (Q1-Q5) -> Plan (data flow diagram) -> Implement -> Verify (`tsc` + `test-suite.sh`) -> Review (spawn `code-reviewer`) -> Commit -> Compliance log.

### Large — New Feature Module

```
Task Type: CODING:feature
Tier: large
Affected: 20+ files, 4 tables, 6 API routes
```
-> Classify -> Interview (5-8 questions) -> Write PRD -> Scope -> Downside check -> Plan -> Implement (phased) -> Verify (full lattice) -> Review (code + security reviewers) -> Commit -> Compliance log.

---

## 20. Test Cases & Use Cases

### Scale Requirements

| Tier | Min Test Cases | Categories |
|------|---------------|------------|
| Micro | 0 | - |
| Small | 3+ | Happy path, 1 edge case, 1 error |
| Medium | 10+ | Happy path, edge cases, error conditions, data integrity |
| Large | 25+ | All above + race conditions, cascade effects, performance |

### Category Distribution

Every test suite should cover:
- **Happy path** (40%) — Primary success scenarios
- **Edge cases** (25%) — Empty inputs, nulls, boundaries, duplicates
- **Error conditions** (20%) — Network failure, missing data, auth failures
- **Data integrity** (15%) — FK integrity, cascade effects, cross-table consistency

### Automation Mandate

- All tests in `scripts/test-suite.sh` or `tests/` directory
- Mark each test: `[auto]` (scripted), `[manual]` (with steps), `[pending]` (not yet)
- Target: 80%+ automation for Medium+, 90%+ for Large
- New features MUST add route to `test-suite.sh` navigation section

---

## 21. References

| Document | Location |
|----------|----------|
| Agent Playbook (this file) | `.claude/agent-playbook.md` |
| Execution Patterns | `.claude/rules/execution-patterns.md` |
| Domain: Contacts | `.claude/rules/domain-contacts.md` |
| Domain: Email | `.claude/rules/domain-email.md` |
| Domain: Listings | `.claude/rules/domain-listings.md` |
| Domain: Showings | `.claude/rules/domain-showings.md` |
| Domain: Voice | `.claude/rules/domain-voice.md` |
| Subagent: Security Reviewer | `.claude/agents/security-reviewer.md` |
| Subagent: Code Reviewer | `.claude/agents/code-reviewer.md` |
| Subagent: Test Writer | `.claude/agents/test-writer.md` |
| Subagent: Migration Reviewer | `.claude/agents/migration-reviewer.md` |
| PRD Template | `docs/templates/PRD_TEMPLATE.md` |
| Compliance Log | `.claude/compliance-log.md` |
| WIP Board | `.claude/WIP.md` |
| Task File | `.claude/current-task.json` |
| Task Archive | `.claude/task-archive/` |
| Health Check | `scripts/health-check.sh` |
| Test Suite | `scripts/test-suite.sh` |
| Save State | `scripts/save-state.sh` |
| Vault | `scripts/vault.sh` |

---

*Playbook v8 — 2026-03-30. RealtorAI CRM.*
