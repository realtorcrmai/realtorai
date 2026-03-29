#!/bin/bash
# ═══════════════════════════════════════════════════════════════
#  Playbook Enforcement Gate
#  Runs on every UserPromptSubmit — reminds Claude to follow
#  the agent playbook before doing any work.
# ═══════════════════════════════════════════════════════════════

cat << 'GATE_JSON'
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "PLAYBOOK ENFORCEMENT GATE: Before responding to this message, you MUST follow the agent playbook at .claude/agent-playbook.md. If you have not yet done so in this session: (1) Run scripts/health-check.sh, (2) Confirm branch is dev, (3) Output a task classification block BEFORE any code changes. If this is an INFO_QA or conversational message, state 'Task: INFO_QA' and proceed. If this is a CODING/TESTING/DEBUGGING task, you MUST output the full classification block with affected files before writing ANY code. Failure to classify = unauthorized change. This gate fires on EVERY message — no exceptions, no skipping, no batching."
  }
}
GATE_JSON
