# ORCHESTRATION Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Phase 1** — Workflow type: sequential, event-driven, state machine, fan-out. Map to existing: `trigger-engine.ts`, `workflow-engine.ts`, `contact-evaluator.ts`, `trust-gate.ts`, `send-governor.ts`

**Phase 2** — States & transitions. Guard conditions. Dead state handling. Rollback.

**Phase 3** — Error handling: timeouts, retries, human-in-the-loop, circuit breaker

**Phase 4** — Observability: log decisions to `agent_decisions`, track latency, define alerts

**Phase 5** — Output guardrails (required before any agent output reaches a user or external system):
1. **PII check** — No PII beyond Section 14.2 allowlist
2. **Hallucination check** — Any names, addresses, or prices in output MUST exist in Supabase
3. **Consent check** — Outbound messages require CASL consent_status = active
4. **Instruction leak check** — No system prompt fragments or tool schemas in output
5. If any check fails → suppress, log as `safety_flag`, return safe fallback
