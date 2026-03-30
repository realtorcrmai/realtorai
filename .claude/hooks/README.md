# Playbook Enforcement Hooks

> Mechanical enforcement of the agent playbook. These hooks physically prevent skipping playbook steps — no self-discipline required.

## How It Works

The system uses a **state file** (`.claude/current-task.json`) to track which playbook phases are complete. Hooks check this file before allowing actions.

### The 4 Hooks

| Hook | Event | What It Does |
|------|-------|-------------|
| `playbook-gate.sh` | PreToolUse (Edit/Write) | Blocks source code edits unless classification + required phases are complete |
| `playbook-reminder.sh` | UserPromptSubmit | Injects a playbook status reminder before every prompt |
| `completion-gate.sh` | Stop | Blocks task completion for Medium+ tiers without validation + compliance log |
| `git-protection.sh` | PreToolUse (Bash) | Blocks direct push to dev/main, force push, reset --hard, destructive rm |

### Task Lifecycle

```
1. User gives a task
2. Agent reads files (always allowed — Read/Grep/Glob are not gated)
3. Agent classifies by writing .claude/current-task.json
4. Agent completes required phases for the tier (scope, plan, etc.)
5. Agent edits source code (hook checks phases — blocks if incomplete)
6. Agent runs validation (tsc, tests)
7. Agent writes compliance log (for Medium+)
8. Agent finishes (Stop hook checks completion for Medium+)
9. Task file is archived to .claude/task-archive/ and deleted
```

### State File Format (.claude/current-task.json)

```json
{
  "tier": "medium",
  "type": "CODING:feature",
  "affected": [
    "src/actions/contacts.ts",
    "src/components/contacts/ContactForm.tsx",
    "supabase/migrations/058_add_lead_source.sql"
  ],
  "phases": {
    "classified": true,
    "scope": true,
    "plan": true,
    "plan_approved": false,
    "validated": false,
    "compliance_logged": false
  },
  "created_at": "2026-03-30T10:00:00Z"
}
```

### Phase Requirements by Tier

| Tier | Required phases before coding |
|------|------------------------------|
| **Micro** | `classified` |
| **Small** | `classified` + `scope` + `downside_check` |
| **Medium** | `classified` + `scope` + `downside_check` + `plan` |
| **Large** | `classified` + `scope` + `downside_check` + `plan` + `plan_approved` |

### What's Exempt (Not Blocked)

- **Read/Grep/Glob** — always allowed (needed to classify)
- **`.claude/*` files** — always writable (state file, compliance log, settings)
- **`docs/*` files** — always writable (PRDs, specs, gap analyses)
- **Non-code files** — `.md`, `.json`, `.env`, `.yaml`, `.css`, `.html` always allowed
- **Files outside project** — memory files at `~/.claude/` always allowed
- **INFO tasks** — no state file needed, no compliance log needed

### Adding a File to Scope Mid-Task

If you discover you need to edit a file not in your original `affected` list:
1. Update `.claude/current-task.json` → add the file to the `affected` array
2. The hook will then allow edits to that file

### Completing a Phase

After completing each playbook phase, update `.claude/current-task.json`:
```bash
# Example: mark scope as complete
jq '.phases.scope = true' .claude/current-task.json > .tmp && mv .tmp .claude/current-task.json
```

Or use Write tool to update the file directly.

### Resetting for a New Task

When starting a new task, either:
- Delete `.claude/current-task.json` and create a fresh one
- Or let the Stop hook auto-archive it when the current task completes

### Troubleshooting

**"BLOCKED: No task classification found"**
→ Write `.claude/current-task.json` with your classification before editing code.

**"BLOCKED: Medium tier requires plan phase"**
→ Write your numbered plan, then set `phases.plan = true` in the task file.

**"BLOCKED: File not in scope"**
→ Add the file to the `affected` array in `.claude/current-task.json`.

**"BLOCKED: Never push directly to dev or main"**
→ Push to your feature branch, then create a PR.
