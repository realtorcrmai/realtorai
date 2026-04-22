# CLAUDE.md — Realtors360 Real Estate CRM

**Agent-specific instructions for Realtors360.** Automatically loaded by Claude Code at session start.

This file covers only what an AI agent needs that a human developer does not. For everything else, follow the pointers below. Do not duplicate content from referenced files here — when in doubt, update the source and leave this file thin.

---

## Pointers — read these, do not re-read the content inline

| Topic | Source of truth |
|-------|-----------------|
| Stack, local setup, prerequisites | `CONTRIBUTING.md` |
| Git workflow, CI checks, branch rules | `CONTRIBUTING.md` |
| Project structure (`src/` tree) | `CONTRIBUTING.md` |
| Design system, CSS classes | `CONTRIBUTING.md` (design section) — see drift note below |
| Database, migrations, multi-tenancy | `CONTRIBUTING.md` |
| Environments, URLs, Supabase projects | `docs/ENVIRONMENTS.md` |
| **Policy (MUST / MUST NOT rules)** | `AGENTS.md` — policy layer, enforcer-labeled |
| **Task execution procedure** | `.claude/agent-playbook.md` — MANDATORY; 15 task types, per-type checklists |
| Enforcement implementation | `.claude/hooks/`, `scripts/audit-*.mjs`, `scripts/review-pr.mjs` |
| 8-Phase listing workflow | `docs/SPEC_8_Phase_Workflow.md` |
| AI email marketing engine | `docs/SPEC_AI_Email_Engine.md` |
| Website generation platform | `docs/SPEC_Realtors360_Sites.md` |
| Known issues, tech debt | `docs/KNOWN_ISSUES.md` |

---

## Core agent discipline

Before any tool call, every session:

1. **Think thoroughly.** Read the full request twice. Consider 2–3 alternative approaches. Analyze trade-offs. Present the best option with reasoning, not the first. Re-read your own output before presenting. The user prefers a slow thorough answer over a fast shallow one.

2. **Classify before acting.** No Edit/Write/Agent/Bash permitted until `.claude/current-task.json` exists with `phases.classified == true`. For medium/large tier, also `phases.scoped == true`. `playbook-gate.sh` enforces this.

3. **Follow the playbook.** `.claude/agent-playbook.md` defines the 5-step pipeline: Pre-flight → Classify → Execute → Validate → Log. Every task, every time. The per-type checklist in that document determines what "done" means for the task type.

4. **Respect blast radius tiers.** SAFE tier runs autonomously. GUARDED tier requires a classified task. DANGEROUS tier requires human confirmation in chat. FORBIDDEN tier never runs. Tiers defined in `AGENTS.md`.

5. **A task without a classification block is an unauthorized change. A task without a compliance log entry did not happen.**

---

## Agent-specific conventions

Things a human reading `CONTRIBUTING.md` does not need to know, but an agent does:

**Task-type selection.** When the user request is ambiguous, default to the narrowest task type. "Fix this bug" → DEBUGGING, not CODING:feature. "Add a field" → CODING:feature only if it's behavior-changing; CODING:bugfix if it's completing an existing incomplete implementation. Wrong classification cascades into wrong validation.

**Tool choice.**
- `Read`, `Grep`, `Glob`, `TodoWrite` — always allowed, no classification needed
- `Bash` with read-only commands (git status/log/diff, ls, cat, grep, health-check, tsc) — always allowed
- `Bash` with write effects, `Edit`, `Write`, `Agent` — blocked without classified task
- Prefer `Grep`/`Glob` over recursive `Bash find` for exploration

**Emoji in page content, Lucide icons in sidebar navigation.** This is a codebase convention not enforceable by lint. Easy to get wrong.

**`lf-*` deprecation — drift warning.** `CONTRIBUTING.md` still documents `lf-card`, `lf-btn`, etc. as current. The codebase is mid-migration to a flatter HubSpot-inspired style using `bg-card`, `bg-brand`, semantic Button/Badge variants. **For new code, use the new style.** For edits to existing files, match the file's current style — don't mix. This conflict should be resolved in `CONTRIBUTING.md` soon; until then, this is the agent-side source of truth.

**Server Actions for mutations, API routes for GETs/webhooks.** Enforcement for this rule does not currently exist (HC-3 in AGENTS.md is `[none]`). Agents must self-enforce. Do not introduce mutations in `src/app/api/` outside cron, webhook, or auth routes.

**Zod validation on inputs.** Same situation (HC-10 is `[none]`). Every Server Action and every POST/PATCH API route MUST call `.parse()` or `.safeParse()` on input before any logic. Self-enforced.

**Error handling in Server Actions.** Return `{ error: string }` on failure, never throw. Never swallow Supabase errors — check `{ error }` on every `.insert()`, `.update()`, `.delete()` within 3 lines (this IS enforced by `review-pr.mjs` check 3).

**PII and AI prompts.** Never include contact phone, email, or FINTRAC identity fields in AI prompts. No scanner exists (HC-11 is `[none]`). Self-enforced.

**File:line citations in analysis.** When writing gap analyses or design specs, cite with `path/to/file.ts:123` format. No verifier exists yet (HC-13), but citations that don't resolve are bugs. Run `grep -n` on each citation before including it.

---

## Project overview (quick reference)

Realtors360 is a real estate transaction management CRM for licensed BC realtors. It automates the full property listing lifecycle — from seller intake through closing — with integrated showing management, BCREA form generation, AI content creation, and regulatory compliance tracking.

**Live URL:** localhost:3000 (dev)
**App files:** `src/`, `package.json`, `next.config.ts` at repo root (flat monorepo)
**Secrets:** Encrypted in `.env.vault`. Never commit `.env.local`.

### Git workflow
```
feature branch → PR → dev (integration) → PR → main (production)
```
Never push directly to `dev` or `main` — always via PRs.

### Key services

| Service | Port | Command |
|---------|------|---------|
| CRM (Next.js) | 3000 | `npm run dev` from repo root |
| Website Agent | 8768 | `npm run dev` from `realtors360-agent/` |
| Form Server | 8767 | Python server (separate) |

### Testing — Use `/test`
Run before every build/deploy. 73+ tests across 7 categories.

### Deployment — Use `/deploy`
Builds and starts all services locally.

---

## When CLAUDE.md and CONTRIBUTING.md conflict

CONTRIBUTING.md is the human source of truth. CLAUDE.md is the agent source of truth. When they conflict, the conflict is a bug in one of them and should be flagged, not silently resolved. The `lf-*` deprecation is the current known drift — documented above. If you find a new conflict during a task, note it in the task's classification block and mention it in the compliance log.

Do not copy content from CONTRIBUTING.md into this file. Pointer, not duplicate.

---

## Meta

Version: 2.0 (slim rewrite) | Last verified: 2026-04-21 | Line budget: 200.

If this file grows past 200 lines, something belongs in a referenced doc instead. The discipline is: content gets added here only if (a) it is agent-specific and (b) there is no other correct home for it.

<!-- Last reviewed: 2026-04-21 — playbook audit Phase 2 CLAUDE.md slim rewrite -->
