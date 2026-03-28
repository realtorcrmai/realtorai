# ORCHESTRATION Playbook

> Task type: `ORCHESTRATION:workflow`, `ORCHESTRATION:trigger`, `ORCHESTRATION:pipeline`, `ORCHESTRATION:agent`

---

## Phase 1 — Workflow Type

Sequential, event-driven, state machine, fan-out. Map to existing:
- `trigger-engine.ts`
- `workflow-engine.ts`
- `contact-evaluator.ts`
- `trust-gate.ts`
- `send-governor.ts`

## Phase 2 — States & Transitions

States, transitions, guard conditions, dead state handling, rollback.

## Phase 3 — Error Handling

Timeouts, retries, human-in-the-loop, circuit breaker

## Phase 4 — Observability

Log decisions to `agent_decisions`, track latency, define alerts

## Phase 5 — Output Guardrails

Required before any agent output reaches a user or external system:

1. **PII check** — No PII beyond Section 14.2 allowlist (no phone numbers, emails, FINTRAC data)
2. **Hallucination check** — Contact names, listing addresses, prices MUST exist in Supabase
3. **Consent check** — If output triggers outbound message → verify CASL consent_status
4. **Instruction leak check** — No system prompt fragments, tool schemas, or playbook references in output
5. If any check fails → suppress output, log as `safety_flag`, return safe fallback or escalate
