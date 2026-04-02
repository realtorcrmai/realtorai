# Compliance Tracking & WIP Visibility

> **Module of:** `.claude/agent-playbook.md` (Sections 11-12)
> **Load when:** Completing tasks (compliance log), starting tasks (WIP board)

---

## 11. Playbook Compliance Tracker — MANDATORY

**A task without a compliance log entry is an unauthorized change.** No exceptions.

### 11.1 When to Log

- After EVERY task — no matter how small
- Before reporting completion to the user
- If the task was abandoned mid-way — still log it with status "abandoned"
- If the user says "skip the playbook" — log it as FAIL with note "user override"

**A task is not complete until its compliance entry exists.**

### 11.2 How to Log

Append a row to `.claude/compliance-log.md`:

```markdown
| Date | Developer | Task Summary | Type | Playbook Followed | Phases Completed | Phases Skipped | Notes |
|------|-----------|-------------|------|-------------------|-----------------|----------------|-------|
| 2026-03-27 | claude | Voice agent TTS rewrite | VOICE_AGENT:system_prompt | FAIL | 2,3,4,5 | 0,1.2,6 | Jumped to coding without loading playbook |
```

### 11.3 Required Fields

- **Date**: ISO date (YYYY-MM-DD)
- **Developer**: who did the work (claude, rahul, etc.)
- **Task Summary**: 1-line description
- **Type**: classification from Section 3.1
- **Playbook Followed**: PASS (ALL phases completed) or FAIL (ANY phase skipped)
- **Phases Completed**: list of phase numbers/names actually followed
- **Phases Skipped**: list of phases missed + brief reason
- **Notes**: context, lessons learned, what broke

### 11.4 Strict Rules

1. **No log = unauthorized change** — work without a log entry is untrusted and subject to revert
2. **Every task, every developer, every time** — no exceptions for "small" tasks
3. **Append-only** — never edit, rewrite, or delete past entries (audit trail)
4. **Honest logging** — FAIL is acceptable; missing entries are not
5. **3+ consecutive FAIL from any developer** → mandatory process review before next task
6. **No classification block in conversation = FAIL**
7. **Weekly review** — scan log for patterns
8. **The log tracks ALL developers equally** — human and AI

### 11.5 Log Rotation

- Active log: `.claude/compliance-log.md` (current month)
- Archive: `.claude/compliance-archive/YYYY-MM.md` (previous months)
- On the 1st of each month: move current log rows to archive, keep header
- Archives are read-only

### 11.6 Velocity Metrics (from compliance log)

| Metric | How to Calculate | What It Reveals |
|--------|-----------------|-----------------|
| Tasks per developer per week | Count rows grouped by developer | Who's active, who's blocked |
| Compliance rate by developer | PASS count / total per developer | Who follows the playbook |
| Most common task type | Count by Type column | Where team spends time |
| Most skipped phases | Frequency in "Phases Skipped" | Process bottlenecks |
| Average tasks per day | Total rows / days in period | Velocity trend |

---

## 12. Work-In-Progress Visibility

### 12.1 WIP Board

Before starting any task, announce in `.claude/WIP.md`:

```markdown
# Work In Progress

| Developer | Branch | What | Started | Files Touched |
|-----------|--------|------|---------|---------------|
| rahul | rahul/voice-tts | Voice agent Edge TTS integration | 2026-03-27 | voice_agent/server/main.py |
| claude | claude/playbook-v4 | Playbook gap fixes | 2026-03-27 | .claude/agent-playbook.md |
```

### 12.2 Rules

| Rule | Why |
|------|-----|
| Add your row BEFORE starting work | Other devs know you're touching those files |
| Remove your row AFTER PR merged | Prevents stale entries |
| Check WIP.md BEFORE starting | Detect file conflicts early |
| Conflict detected → coordinate first | Prevents merge conflicts |
| Stale entries (>3 days, no open PR) → remove | Keep board current |

**AI agent integration:** Agents should check WIP.md before creating branches.

### 12.3 Why Not Use GitHub Issues/Projects?

WIP.md is checked into the repo (everyone pulls it), visible in `git pull` output, editable by AI agents, and lightweight. For larger teams (5+), migrate to GitHub Projects or Linear.
