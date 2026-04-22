# DEBUGGING Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Phase 1** — Restate symptom precisely. Error message? Stack trace? When? Scope?

**Phase 2** — Reproduce. Trace call path. Check: data issue? env issue? race condition?

**Phase 3** — Hypotheses (2-4), ordered by likelihood. Check most likely first.

**Phase 4** — Minimal fix. No surrounding refactors.

**Phase 5** — Write regression test. Grep for same anti-pattern elsewhere.
