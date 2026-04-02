# Post-Task Validation & Blast Radius

> **Module of:** `.claude/agent-playbook.md` (Section 6)
> **Load when:** Completing any task, handling validation failures, running commands

---

## 6.1 Validation Steps

1. `bash scripts/test-suite.sh` — all tests pass
2. `npx tsc --noEmit` — no TypeScript errors in `src/`
3. `git status` — clean working tree
4. `git push origin <developer>/<feature-branch>` — push your feature branch (NOT dev or main)
5. `gh pr create --base dev` — create PR to dev with classification block + test results
6. Check GitHub Actions CI: `gh run view`
7. If new migration: verify it applied on remote DB
8. `bash scripts/save-state.sh` — snapshot saved
9. After PR approval + merge → delete feature branch: `git branch -d <branch>`

## 6.2 Self-Healing Retry Loop (When Validation Fails)

**When steps 6.1.1 or 6.1.2 fail, follow this algorithm — not improvise.**

```
RETRY_LOOP (max_retries = 3 per error, 5 total across all errors):

  attempt = 0
  while attempt < 3:
    attempt += 1

    1. CAPTURE — Read the FULL error output (stack trace, TS error, test failure message)
       - Do NOT skim. Copy the exact error message and file:line location.

    2. DIAGNOSE — Form a hypothesis in ONE sentence:
       - "The test fails because X function returns Y instead of Z"
       - If you cannot form a clear hypothesis → HALT immediately

    3. SCOPE CHECK — Is the fix within your original task's scope?
       - YES → proceed to step 4
       - NO (error is in unrelated code you didn't touch) → HALT, report as pre-existing

    4. FIX — Apply the minimal change that addresses the hypothesis
       - Fix ONLY the diagnosed issue. No surrounding refactors.

    5. RE-VALIDATE — Run the same validation step that failed
       - PASS → exit loop, continue to step 6.1.3+
       - FAIL with SAME error → hypothesis was wrong. Increment attempt.
       - FAIL with NEW error → count toward 5-total cap, diagnose the new error

  HALT — 3 attempts on same error exhausted (or 5 total). Do NOT continue.
    - Log: what failed, what you tried, what you think the root cause is
    - Commit working code (if any) to a WIP branch
    - Escalate: "Validation failed after N retries."
    - Compliance log: FAIL with Notes: "self-heal failed, escalated"
```

**Rules:**
- **Never retry without a new hypothesis.**
- **Never suppress a test to make validation pass.**
- **Never broaden types to silence TypeScript.** Casting to `any`, adding `// @ts-ignore` is not a fix.
- **Save state before each retry attempt:** `git stash` so you can revert if the fix makes things worse.

**Valid vs Invalid fixes:**

| Error Type | Valid Fix | Invalid Fix (NEVER) |
|-----------|-----------|-------------|
| Test assertion failure | Fix the code so assertion passes | Change the assertion |
| TypeScript type error | Fix the type or value to match contract | Cast to `any` |
| Import error | Fix the import path or add missing export | Delete the import |
| Runtime error in test | Fix root cause | Wrap in try/catch that swallows |
| Build error | Fix the source | Skip the build step |
| Migration failure | Fix the SQL | Drop table and recreate |

## 6.3 Escalation Triggers (Immediate Halt — No Retries)

| Trigger | Why |
|---------|-----|
| Error is in a file you did NOT modify | Pre-existing issue |
| Error references missing env var or secret | Environment config |
| Error is a Supabase connection failure | Infrastructure issue |
| Test passes locally but CI fails | Environment divergence |
| Fix requires changing >5 files beyond original scope | Wrong classification |
| You don't understand the error after reading it twice | Honesty > heroics |

## 6.4 Blast Radius & Execution Isolation

**Tier 1 — SAFE (execute without confirmation):**
- Read-only file ops: `cat`, `grep`, `ls`, `find`, `wc`, `diff`, `head`, `tail`
- Git read ops: `git status`, `git log`, `git diff`, `git branch`
- TypeScript check: `npx tsc --noEmit`
- Test suite: `bash scripts/test-suite.sh`
- HTTP GET: `curl -s localhost:3000`

**Tier 2 — GUARDED (execute with stated safeguards):**
- Git writes (`add`, `commit`, `push`) — only on feature branches
- File create/edit — only within repo root
- npm commands — `install` only for packages in `package.json`. Never `-g`.
- Supabase read queries — parameterized only

**Tier 3 — DANGEROUS (human confirmation required):**
- `rm`, `rm -rf`, `mv` (overwrite)
- `git push --force`, `git reset --hard`, `git clean -fd`
- SQL writes (`INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, `TRUNCATE`)
- Migration execution (`npx supabase db query --linked`)
- `kill`, `pkill`
- `curl -X POST/PUT/DELETE` (outbound mutations)
- `./scripts/vault.sh encrypt/decrypt`

**Tier 4 — FORBIDDEN (never execute):**
- `rm -rf /` or `rm -rf ~` or recursive delete above repo root
- `git push --force origin main`
- `DROP DATABASE` or `DROP SCHEMA public CASCADE`
- Any command with `sudo`
- `curl | bash` or `eval $(curl ...)`
- `chmod 777`, downloading/executing unknown binaries

**Pre-execution classification (EVERY bash command):**
1. Tier 1? → Execute.
2. Tier 2? → Execute with stated safeguards.
3. Tier 3? → State what it does and why. Ask human to confirm.
4. Tier 4? → Refuse.

**Migration-specific isolation:**
1. Write rollback SQL BEFORE running forward migration
2. Run `SELECT` verification queries before AND after
3. For destructive migrations: export affected data first
4. Run one migration at a time — verify each, then run the next
5. If a migration fails halfway: do NOT re-run. Check partial state, write targeted fix.
