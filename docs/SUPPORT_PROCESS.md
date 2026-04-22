<!-- docs-audit: src/app/api/webhooks/* -->

# Customer Support Loop

**Last reviewed:** 2026-04-21

---

## Ticket flow

```
User report → Triage → Investigate → Fix/Respond → Close → Playbook update
```

## Triage SLA

| Priority | Response time | Resolution time | Examples |
|----------|-------------|-----------------|----------|
| P0 — Outage | 30 min | 4 hours | Site down, data loss, security breach |
| P1 — Broken feature | 2 hours | 24 hours | Can't create listings, SMS not sending |
| P2 — Degraded | 24 hours | 1 week | Slow page loads, missing data |
| P3 — Enhancement | 1 week | Backlog | UI improvement, feature request |

## Channels

| Channel | Tool | Status |
|---------|------|--------|
| In-app feedback | Not implemented | Planned |
| Email | Support email | Not configured |
| GitHub Issues | realtorcrmai/realtorai | Active (internal only) |

## Ticket → playbook entry

When a support issue reveals a gap:
1. Fix the immediate issue
2. If it's a pattern (2+ occurrences): create a tech debt item in `docs/TECH_DEBT.md`
3. If it reveals a process gap: update relevant doc (DR runbook, privacy ops, etc.)
4. If it's a new failure mode: add to `docs/incidents/` as a post-mortem
