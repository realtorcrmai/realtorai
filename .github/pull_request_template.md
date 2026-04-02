## Classification
<!-- REQUIRED — Copy from your task classification block -->
```
Task Type: 
Tier: 
Affected: 
```

## Summary
<!-- 1-3 bullet points: what changed and why -->
- 

## Playbook Compliance
<!-- Check ALL that apply. Unchecked items = explain why skipped. -->
- [ ] Classification block outputted BEFORE coding
- [ ] Scope analysis completed (Medium+ tier)
- [ ] Use-case doc created/updated (`usecases/<feature>.md`) — if CODING:feature
- [ ] Tests written/updated — if any behavior change
- [ ] Tests run and passing — `npm run typecheck` + relevant tests
- [ ] Multi-tenant: `getAuthenticatedTenantClient()` used for user data
- [ ] RLS policy exists on new tables with `realtor_id` scoping
- [ ] No hardcoded local paths (`/Users/...`, `/home/...`)
- [ ] No secrets in code (API keys, tokens, JWTs)
- [ ] Compliance log entry appended to `.claude/compliance-log.md` (Medium+ tier)

## Test Results
<!-- Paste actual results, not "tests pass" -->
```
tsc: 
lint: 
test: 
```

## Risk
<!-- LOW (≤50 lines, no schema) | MEDIUM (50-200 lines or schema) | HIGH (200+ lines, auth/compliance) -->

---
*Realtors360 Playbook v8 — see `.claude/agent-playbook.md` for full rules*
