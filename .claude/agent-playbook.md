# Agent Playbook — Realtors360 CRM

> Task execution framework for AI development agents working on the Realtors360 real estate CRM.

---

## 1. Purpose

This playbook governs how **all developers (human and AI)** operate on the Realtors360 codebase. Every task follows: **Pre-Flight → Classify → Execute → Validate → Log**. No steps skipped. No exceptions. No bypass.

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
- Every task MUST end with a compliance log entry (→ [compliance.md](playbook/compliance.md))
- A task without a classification block is an unauthorized change
- A task without a compliance log entry did not happen
- Work that skips the playbook WILL be reverted — it is not trusted
- No direct work on `main`. All changes go via `dev` and must pass `health-check.sh` + `test-suite.sh` before merge

**PR requirements (mandatory):**
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

### 1.1.1 Absolute Rules (Hard Constraints)

These apply to EVERY task. Violation = automatic revert.

| # | Rule |
|---|------|
| HC-1 | **No `any` type** — no `as any`, no `@ts-ignore`, no `@ts-expect-error` without comment |
| HC-2 | **No inline styles** — use `lf-*` CSS classes from design system |
| HC-3 | **Server Actions for mutations** — API routes only for GETs and webhooks |
| HC-4 | **RLS required on every table** with tenant-scoped policy |
| HC-5 | **CASL consent check** before every outbound message |
| HC-6 | **FINTRAC PII fields non-nullable** on `seller_identities` |
| HC-7 | **Never push directly to `main` or `dev`** — PRs only |
| HC-8 | **Never `git push --force`**, `git reset --hard`, `rm -rf /`, `DROP DATABASE` |
| HC-9 | **Never commit `.env.local`** — use `scripts/vault.sh` |
| HC-10 | **Zod v4 validation** on all form/API/webhook inputs |
| HC-11 | **No PII in AI prompts** beyond approved fields (→ [governance.md](playbook/governance.md) Section 14.2) |
| HC-12 | **Multi-tenant: use `getAuthenticatedTenantClient()`** for all user data — never raw admin client |
| HC-13 | **Verify against code, not reports.** All analysis MUST be verified by reading actual source code. Never trust previous reports or documentation alone. |
| HC-14 | **Every new table MUST have `realtor_id`** column with index and RLS policy |
| HC-15 | **Think before acting.** Read the full request twice. Consider 2+ approaches. Re-read output before presenting. Speed is never more important than correctness. |
| HC-16 | **No MD file >550 lines.** Split into focused modules. Never delete functionality — restructure into smaller files. |
| HC-17 | **Multi-task prompts: create task list first, verify at end.** Decompose → map dependencies → reorder → numbered task list → work in order → verify all complete at end. |

### 1.2 Feature Evaluation & Market Fit

**Before building any new feature (CODING:feature or DESIGN_SPEC), complete this checklist:**

| # | Question | Required Output |
|---|----------|----------------|
| FE-1 | What problem does this solve for BC realtors? | 1-2 sentence problem statement |
| FE-2 | What measurable benefit? | Specific metric or outcome |
| FE-3 | Does similar capability already exist? | `grep` result or "searched, none found" |
| FE-4 | How do 2-3 competitors handle this? | Table: competitor → approach → our angle |
| FE-5 | Are we copying, differentiating, or staying simpler? | Choice with justification |
| FE-6 | Does this fit Realtors360's vision? | YES + reason, or PAUSE + ask product owner |

**Quick competitor check:** Follow Up Boss, kvCORE, LionDesk, Realvolve.

### 1.2.1 Architectural Principles (Apply to Every Feature)

**Principle 1: UI Design** — Touch targets 44x44px, responsive (375/768/1280px), keyboard navigable, ARIA labels, empty states.

**Principle 2: Data Model** — Schema documented, types in `database.ts`, JSONB schemas typed, constraints enforced, `realtor_id` on every user table.

**Principle 3: Persona Mapping** — Feature knows its user role, workflow states documented, handles all 6 contact types, respects contact stage.

**Principle 4: Rollout** — Feature flag, error boundaries, rollback without data loss, idempotent migrations, <3s page loads.

### 1.3 Documentation Requirements

| Deliverable | Location | When Required |
|------------|----------|---------------|
| Use-case doc | `usecases/<feature>.md` | New feature or major enhancement |
| Test doc | `tests/<feature>.md` | Behavior change |
| Gap analysis | `docs/gap-analysis/<area>/` | Audit or assessment task |
| PRD | `docs/PRD_<feature>.md` | Large tier tasks |

**Key rule:** Use-case doc BEFORE coding. Tests AFTER coding. Deliverables are part of "done".

### 1.4 Onboarding — New Developers

Setup (15 min): Read `CONTRIBUTING.md`, run `health-check.sh`, load `.claude/quick-reference.md`. First task: follow Quick Reference step by step. First week: read full playbook, complete 3 tasks with full compliance. AI agents: load `.claude/quick-reference.md` at session start.

### 1.5 Human vs AI Developer Tracks

Same rules, different enforcement. Humans protected by CI gates. AI protected by classification blocks + compliance log. Both produce the same quality output.

---

## 1.6 Agent vs Tool vs Task Boundaries

| Concept | Definition | Rules |
|---------|-----------|-------|
| **Agent** | Decides and orchestrates | NEVER contains business logic, NEVER executes side-effects directly |
| **Tool** | Deterministic function with typed schema | All business logic lives here. Zod/JSON Schema on inputs AND outputs. Independently testable. |
| **Task** | Logged unit of work | Every task produces a compliance log entry |

**Rules:** No critical behavior in prompts — extract to tools. Tool schema (input/output/side-effects/idempotency) is mandatory. Agent ↔ Tool contract uses structured data, not free text.

---

## 1.7 Multi-Tenancy — Data Isolation Rules

Realtors360 is **multi-tenant**. Every data row belongs to a `realtor_id`. This is the #1 data integrity rule.

**ALWAYS use the tenant client:**
```typescript
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
const tc = await getAuthenticatedTenantClient();
const { data } = await tc.from("contacts").select("*"); // Auto-filtered
await tc.from("contacts").insert({ name: "John" });      // Auto-injects realtor_id
```

**Admin client ONLY for:** global config tables, cron jobs, migrations, webhook handlers.

| Rule | Why |
|------|-----|
| Every new table MUST have `realtor_id uuid NOT NULL` | Tenant isolation |
| Every new migration MUST add index on `realtor_id` | Query performance |
| Every new RLS policy MUST scope by `realtor_id` | DB-level defense |
| Every server action MUST use `getAuthenticatedTenantClient()` | App-level isolation |

**Migration template:**
```sql
CREATE TABLE new_table (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  realtor_id uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
CREATE INDEX idx_new_table_realtor ON new_table(realtor_id);
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_rls_new_table ON new_table
  FOR ALL USING (realtor_id = auth.uid()::uuid);
```

**Global tables (exempt):** `google_tokens`, `newsletter_templates`, `workflow_blueprints`, `help_articles`, `knowledge_articles`, `feature_flags`.

---

## 2. Pre-Flight Protocol (Every Task, No Exceptions)

### 2.1 Environment
```bash
bash scripts/health-check.sh
```
Fix any failures before proceeding.

### 2.2 Git — Feature Branch Workflow

```
feature branch → PR → dev (integration) → PR → main (production)
```

Both `dev` and `main` are **protected** — no direct pushes.

**Branch naming:** `<developer>/<short-description>` (e.g. `rahul/voice-tts`, `claude/playbook-fix`)

**Pre-flight:** checkout dev → pull → create feature branch → check recent changes on affected files.
**When done:** commit → push feature branch → PR to dev → merge → (release: PR dev → main, 1 approval).

**Rules:** Never push directly to dev/main. Rebase (not merge) stale branches. Delete branches after merge.

### 2.3 Services
| Service | Port | Check |
|---------|------|-------|
| CRM (Next.js) | 3000 | `curl -s localhost:3000` |
| Voice Agent | 8768 | `curl -s localhost:8768/api/health` |
| Form Server | 8767 | `curl -s localhost:8767/health` |

### 2.4 Memory & Context

Read `MEMORY.md` at session start. Never store PII, secrets, or tenant-specific data in memory. Never carry data between contacts/listings. Never index `.env.local`, `.env.vault`, `seller_identities`, `google_tokens`.

---

## 3. Task Classification

### 3.0 MANDATORY — Think Before Acting (HC-15)

**No Read, Edit, Write, Bash, or Agent tool call is permitted until this section is complete.**

**Speed is never more important than correctness.**

#### Phase 1: Understand (before any tool call)

1. **Read the FULL request TWICE** — first to understand, second to catch what you missed
2. **Decompose** into discrete tasks — number them
3. **Map dependencies** — does task B need task A's output?
4. **Reorder by dependency** — users write in thought order, NOT dependency order
5. **Create a task list** using TodoWrite — verify it at the END
6. **Consider 2+ approaches** — never take the first idea
7. **Output the classification block** (Section 3.1)
8. **Only then** proceed to execution

**Multi-task ordering is MANDATORY:**
```
WRONG: Split tasks → work in prompt order
RIGHT: Split tasks → map dependencies → reorder → numbered list → work in dependency order → verify at end
```

#### Phase 2: Execute with care
- Before each action: "Is this the right approach, or am I rushing?"
- Before writing code, read the existing code first
- Before marking "done", verify it actually works (HC-13)

#### Phase 3: Review before presenting
- Re-read your output — would a senior engineer approve?
- Did you answer what was ASKED, or what you assumed?
- Did you verify against code, or against assumptions?

### 3.1 Classification Output

```
Task Type: CODING:feature
Confidence: high/medium/low
Reasoning: [1-2 sentences]
Affected: [files, tables, APIs]
Execution Order: [if multi-step, reordered sequence]
```

### 3.2 Trivial Change Fast Path

**All must be true:** ≤3 lines, single file, no logic change, no schema/API change. Still requires: classification block, feature branch, PR, CI pass, compliance log.

### 15 Task Types

| Type | Subtypes | When |
|------|----------|------|
| CODING | feature, bugfix, refactor, script | Build or modify code |
| TESTING | unit, integration, e2e, eval | Write or run tests |
| DEBUGGING | error, performance, data_issue | Investigate failures |
| DESIGN_SPEC | architecture, feature, api, migration | Plan before building |
| GAP_ANALYSIS | codebase, playbook, feature, security | Audit & gap assessment |
| RAG_KB | pipeline, tuning, evaluation, content | RAG system work |
| ORCHESTRATION | workflow, trigger, pipeline, agent | AI agent workflows |
| INTEGRATION | api_connect, webhook, auth, data_sync | Wire external services |
| DOCS | spec, guide, runbook, changelog | Documentation |
| EVAL | metrics, golden_set, ab_test, quality_gate | Quality evaluation |
| INFO_QA | explain, compare, recommend | Answer questions (no code) |
| DEPLOY | local, production, rollback, migration_only | Build & deploy |
| VOICE_AGENT | tool_dev, provider_switch, system_prompt, eval | Python voice agent |
| DATA_MIGRATION | schema, seed, bulk_fix, rollback | DB migrations & data |
| SECURITY_AUDIT | rls, webhooks, secrets, compliance | Security review |

### 3.3 Multi-Task Handling

**Step 1 — Decompose:** Break into numbered list with type, affected files, dependencies.
**Step 2 — Order:** Independent → parallel agents. Dependent → sequential.
**Step 3 — Execute:** Haiku for INFO_QA, Sonnet for CODING, Opus for DESIGN_SPEC.
**Step 4 — Verify:** Review outputs, run tests, check for conflicts.
**Step 5 — Report:** Completion summary with pass/fail per task.

**Rules:** Full playbook per task. Never mark complete if validation failed. Max 5 parallel agents.

### 3.4 Sprint Verification Gates

After EACH sprint/batch, STOP and verify:
1. List every change made
2. Verify each exists in target file
3. `npx tsc --noEmit`
4. Run relevant tests
5. Fix before next sprint
6. Report: "Sprint N: X/Y verified"

**Never proceed to the next sprint if the current one has unverified changes.**

---

## Playbook Modules (Load Per Task Type)

The detailed playbooks, validation rules, and governance policies are in focused module files. Load the relevant module when executing your task.

| Module | Contents | When to Load |
|--------|----------|-------------|
| [task-playbooks.md](playbook/task-playbooks.md) | Per-type checklists for all 15 task types, 7-pass analysis, GAP_ANALYSIS rules | Executing any classified task |
| [model-chaining.md](playbook/model-chaining.md) | Model selection, parallel agents, cost controls, circuit breaker | Selecting models, launching agents, monitoring costs |
| [validation.md](playbook/validation.md) | Post-task validation, self-healing retry, blast radius tiers | Completing tasks, handling failures, running commands |
| [operations.md](playbook/operations.md) | Incident protocol, secret rotation, infrastructure map | Handling incidents, rotating secrets, checking infra |
| [compliance.md](playbook/compliance.md) | Compliance tracker, WIP board | Every task completion, starting new work |
| [governance.md](playbook/governance.md) | Agent evals, AI governance, PII rules, layered enforcement | Changing agent behaviors, reviewing governance |

### Quick Reference

For a condensed checklist of all steps, see [`.claude/quick-reference.md`](quick-reference.md).
