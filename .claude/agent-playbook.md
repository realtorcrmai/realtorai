# Agent Playbook — Realtors360 CRM

> Task execution framework. Every task follows: **Pre-Flight → Classify → Execute → Validate → Log**.

---

## Pipeline

```
Pre-flight → Classify → Scope → Execute → Validate → Log
```

**Policy rules (MUST/MUST NOT):** `AGENTS.md` — enforcer-labeled, 5 principle groups.
**Enforcement matrix:** `.claude/playbook/reference/enforcement-matrix.md`

---

## Pre-Flight (every task)

```bash
bash scripts/health-check.sh
```

1. Check branch (never work on dev/main directly)
2. Run health check — fix failures before proceeding
3. Load memory (`MEMORY.md` at session start)
4. Read last 3 lessons (`playbook-reminder.sh` does this automatically)

---

## Classification (HC-15: think before acting)

**No Edit/Write/Agent/Bash until classification is complete.**

### Phase 1: Understand
1. Read the full request **twice**
2. Decompose into discrete tasks
3. Map dependencies — reorder by dependency (not prompt order)
4. Consider 2+ approaches
5. Output classification block

### Phase 2: Create task file
```bash
cat > .claude/current-task.json << 'EOF'
{
  "type": "CODING:feature",
  "tier": "medium",
  "slug": "feature-slug",
  "summary": "Short description",
  "phases": { "classified": true, "scoped": false },
  "affected_files": [],
  "existing_search": []
}
EOF
```

`playbook-gate.sh` blocks tools without this file. This is mechanical — not optional.

### 15 task types

| Type | When | Procedure |
|------|------|-----------|
| CODING | Build or modify code | `procedure/coding.md` |
| TESTING | Write or run tests | `procedure/testing.md` |
| DEBUGGING | Investigate failures | `procedure/debugging.md` |
| DESIGN_SPEC | Plan before building | `procedure/design-spec.md` |
| GAP_ANALYSIS | Audit & assessment | `procedure/gap-analysis.md` |
| RAG_KB | RAG system work | `procedure/rag-kb.md` |
| ORCHESTRATION | AI agent workflows | `procedure/orchestration.md` |
| INTEGRATION | Wire external services | `procedure/integration.md` |
| DOCS | Documentation | `procedure/docs.md` |
| EVAL | Quality evaluation | `procedure/eval.md` |
| INFO_QA | Answer questions (no code) | `procedure/info-qa.md` |
| DEPLOY | Build & deploy | `procedure/deploy.md` |
| VOICE_AGENT | Python voice agent | `procedure/voice-agent.md` |
| DATA_MIGRATION | DB migrations & data | `procedure/data-migration.md` |
| SECURITY_AUDIT | Security review | `procedure/security-audit.md` |

**Load the procedure file for your task type.** Each contains the per-phase checklist.

### Tiers

| Tier | Scope | Extra requirements |
|------|-------|--------------------|
| micro | ≤3 lines, 1 file | Classification + compliance log only |
| small | Single concern, few files | Full pipeline |
| medium | Multiple files, schema changes | Scope phase required, decision trail |
| large | Cross-cutting, 10+ files | PRD required, supervisor review |

---

## Execute

Follow the per-type procedure file. Key cross-cutting rules:

- **Multi-tenancy:** Always `getAuthenticatedTenantClient()` for user data (HC-12)
- **Validation:** Zod v4 on all inputs (HC-10)
- **Server Actions** for mutations, API routes for GETs/webhooks (HC-3)
- **CODING:feature gates:** existing_search (FQ-5), usecases (FQ-3), demo (FQ-1), tests (FQ-2), smoke (FQ-4)

---

## Validate

1. `npx tsc --noEmit` — completion-gate blocks on failure
2. Run relevant tests
3. `node scripts/review-pr.mjs` — check before PR
4. `node scripts/audit-docs.mjs` — docs freshness

---

## Log

Append entry to `.claude/compliance-log.md`. Set `phases.compliance_logged = true`.

Format: `| date | developer | description | type | status | phases | branch | notes |`

---

## Modules (load as needed)

| Module | When |
|--------|------|
| `playbook/model-chaining.md` | Selecting models, parallel agents, cost controls |
| `playbook/validation.md` | Post-task validation, self-healing, blast radius |
| `playbook/operations.md` | Incidents, secrets, infrastructure |
| `playbook/compliance.md` | Compliance tracker format, velocity metrics |
| `playbook/governance.md` | Agent evals, AI governance, PII rules |
| `playbook/reference/enforcement-matrix.md` | Rule → hook → event mapping |

---

## Self-learning

1. `completion-gate.sh` extracts lesson → `lessons-learned.md`
2. `playbook-reminder.sh` surfaces last 3 lessons at session start
3. Monthly: review patterns → promote to HC rules or playbook updates

**Principle:** System captures and surfaces. Human reviews and decides. Playbook never self-modifies.
