# Violation Log

> Append-only. Written by enforcement hooks when a gate blocks an action.
> Format: `| timestamp | hook | rule | blocked action | target |`
> Review monthly for patterns. See AGENTS.md for rule definitions.

| Timestamp | Hook | Rule | Blocked Action | Target |
|-----------|------|------|----------------|--------|
| 2026-04-21 23:12 | playbook-gate | classification | No task file — Edit blocked | /Users/rahulmittal/Library/CloudStorage/OneDrive-Personal/CoWork/realtorai/src/actions/team.ts |
| 2026-04-21 23:13 | playbook-gate | classification | No task file — Bash blocked | git add .claude/compliance-log.md .claude/playbook/lessons-learned.md .claude/violation-log.md src/app/\(dashboard\)/settings/team/TeamSettingsClient.tsx src/components/team/OffboardingDialog.tsx src/app/api/notifications/ && git commit -m "$(cat <<'EOF'
chore: push session artifacts — compliance log, lessons, violation log, team WIP

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)" && git push origin claude/team-management 2>&1 | tail -3 |
