# Enforcement Matrix

> For each policy rule, the hook/script that enforces it, the event it fires on, and what happens if the enforcer is absent.
> Source of truth: `AGENTS.md` v0.6. This matrix is a readable cross-reference.

## Hard constraints

| Rule | Principle | Enforcer | Event | Failure if absent |
|------|-----------|----------|-------|-------------------|
| HC-1 | Quality | `eslint.config.mjs` (consistent-type-assertions) + `review-pr.mjs` check 2 | CI lint + PR creation | `as any` casts ship to production |
| HC-2 | Quality | `review-pr.mjs` check 6 | PR creation | Inline styles bypass design system |
| HC-3 | Process | None | — | Mutations in API routes instead of Server Actions |
| HC-4 | Security | `subagent-suggest.sh` (advisory) | PostToolUse | New tables without RLS policies |
| HC-5 | Compliance | Runtime send path | Application runtime | Messages sent without CASL consent |
| HC-6 | Compliance | `subagent-suggest.sh` (advisory) | PostToolUse | FINTRAC PII fields made nullable |
| HC-7 | Safety | `git-protection.sh` | PreToolUse Bash | Direct push to main/dev |
| HC-8 | Safety | `git-protection.sh` | PreToolUse Bash | Force push, hard reset, rm -rf |
| HC-9 | Safety | `secret-scan.sh` | PreToolUse Bash | Secrets committed to git |
| HC-10 | Process | None | — | Unvalidated inputs in actions/APIs |
| HC-11 | Security | None | — | PII sent to AI providers |
| HC-12 | Compliance | `review-pr.mjs` check 4 | PR creation | Admin client bypasses tenant isolation |
| HC-13 | Quality | `verify-citations.mjs` | PR creation (docs-gate) | Invalid file:line citations in docs |
| HC-14 | Security | `subagent-suggest.sh` (advisory) | PostToolUse | New tables without realtor_id |
| HC-15 | Quality | `playbook-reminder.sh` (advisory) | UserPromptSubmit | Agent skips analysis, rushes to code |
| HC-16 | Process | None | — | Markdown files exceed 550 lines |
| HC-17 | Process | `playbook-reminder.sh` (advisory) | UserPromptSubmit | Multi-task prompts executed without decomposition |
| HC-18 | Compliance | `docs-gate.sh` → 3 audit scripts | PR creation | Stale docs ship with code changes |

## Feature quality gates (CODING:feature only)

| Rule | Enforcer | Event | Failure if absent |
|------|----------|-------|-------------------|
| FQ-1 | `demo-gate.sh` | PR creation | Features without reproducible demo |
| FQ-2 | `completion-gate.sh` + `extract-new-exports.mjs` | Stop | New exports without test coverage |
| FQ-3 | `playbook-gate.sh` | PreToolUse Edit/Write | Code without use-case documentation |
| FQ-4 | `completion-gate.sh` + `run-smoke.mjs` | Stop | Features that crash on first call |
| FQ-5 | `playbook-gate.sh` | PreToolUse Edit/Write | Duplicate code (no prior search) |

## Classification & completion

| Gate | Enforcer | Event | Failure if absent |
|------|----------|-------|-------------------|
| Task classification | `playbook-gate.sh` | PreToolUse | Unclassified code changes |
| Scope declaration | `playbook-gate.sh` (medium/large) | PreToolUse | Medium+ tasks without scope |
| TypeScript check | `completion-gate.sh` | Stop | Type errors ship |
| Compliance logging | `completion-gate.sh` | Stop | Task not recorded |
| Scope warning | `playbook-gate.sh` | PreToolUse | Edits outside declared scope |

## Backlog: rules needing enforcers

| Rule | Recommended enforcer | Effort |
|------|---------------------|--------|
| HC-3 | `review-pr.mjs` check: `.insert/.update/.delete` in `src/app/api/` non-cron/webhook/auth | 2 hours |
| HC-10 | `review-pr.mjs` check: Server Action without `.parse()/.safeParse()` | 2 hours |
| HC-11 | Prompt-send wrapper scanning for PII fields | 1 day |
| HC-16 | Pre-commit hook: `wc -l` on changed .md files | 1 hour |
