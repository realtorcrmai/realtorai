# Quick Reference Card — Realtors360 CRM

> **Load this FIRST on every task.** This is the playbook in checkbox format.
> Full details: `.claude/agent-playbook.md`

```
STRICT POLICY: No step below can be skipped. No exceptions. No bypass.

═══ PIPELINE FIRST ═══
□ Run agent-pipeline: cd /Users/rahulmittal/agent-pipeline && npx tsx src/pipeline.ts --dry-run "<task>"
□ Wait for result before proceeding

═══ PRE-FLIGHT (BLOCKING — nothing runs until green) ═══
□ health-check.sh  □ check WIP.md for conflicts  □ feature branch from dev
□ pull latest  □ load memory  □ services up (if needed)

═══ THINK BEFORE ACTING (HC-15, Section 3.0 — BLOCKING) ═══
□ Read FULL request TWICE  □ Decompose steps  □ Map dependencies  □ Reorder correctly
□ Consider 2+ approaches before picking one  □ Multiple tasks? → Create task list
□ During execution: "Am I rushing or thinking?"  □ Before presenting: re-read own output
□ Speed ≠ quality. Hours of thinking > minutes of garbage.

═══ CLASSIFY (BLOCKING — no code changes until block is outputted) ═══
□ type:subtype (15 types)  □ tier (micro/small/medium/large)
□ confidence  □ reasoning  □ affected files  □ execution order

═══ MULTI-TENANCY (HC-12, HC-14 — every data operation) ═══
□ Use getAuthenticatedTenantClient() — NEVER raw admin client for user data
□ New tables: realtor_id NOT NULL + index + RLS policy
□ RLS: USING (realtor_id = auth.uid()::uuid)

═══ ARCHITECTURAL PRINCIPLES (Section 1.2.1 — every feature) ═══
□ P1 UI: Touch 44px, responsive, keyboard, ARIA, empty states
□ P2 Data: Types in database.ts, JSONB documented, FK constraints, realtor_id
□ P3 Personas: Roles gated, workflow transitions documented, all 6 contact types
□ P4 Rollout: Feature flag, error handling, migration rollback, <3s page load

═══ THINKING GATE (L3 — at every phase boundary, Section 15.3) ═══
□ Output checkpoint: "What I completed | What I'm about to do | Am I rushing?"
□ "Did I read the relevant code?" □ "Alternative approach considered?"
□ If rushing → STOP, re-read HC-15, slow down
□ This is the layer that prevents auto-piloting. Never skip it.

═══ CRM RULES (every CODING task) ═══
□ FINTRAC fields non-nullable  □ CASL consent before outbound
□ RLS on new tables  □ lf-* design classes  □ Zod v4 validation
□ force-dynamic on live pages  □ Parent ≠ complete if child incomplete

═══ FEATURE GATE (CODING:feature + DESIGN_SPEC) ═══
□ Search for existing capability  □ Summarize what exists
□ What problem? What benefit?  □ Compare 2-3 competitors
□ Fits Realtors360 vision?  □ If unclear → ask product owner

═══ GAP ANALYSIS (GAP_ANALYSIS type — Section 4.4.2) ═══
□ Read ACTUAL code, not reports (HC-13)
□ 7-pass process (self → market → code verify → depth → complete → reconcile → sanity)
□ Use frameworks: SWOT, COBIT, CMMI, MoSCoW, RACI
□ Think like professional auditor
□ Save to docs/gap-analysis/<area>/v<N>_<date>.md

═══ DELIVERABLES (BLOCKING — task NOT done without these) ═══
□ CODING:feature → usecases/<feature>.md created/updated BEFORE coding
□ CODING:feature/bugfix/refactor → tests written or updated AFTER coding
□ Any code change → tests RUN (not just tsc — actual test execution)
□ DESIGN_SPEC → PRD or spec doc with acceptance criteria
□ GAP_ANALYSIS → versioned doc in docs/gap-analysis/, 7-pass, deep not surface-level

═══ EXECUTE ═══
→ Follow per-type checklist phase by phase
→ Model chain: Haiku classify → Sonnet code → Opus architect

═══ SPRINT VERIFICATION (Section 3.4 — after each batch) ═══
□ List every change  □ Verify each exists (grep/read/run)
□ tsc --noEmit  □ Run relevant tests
□ Report: "Sprint N: X/Y verified ✅"
□ NEVER proceed to next sprint if current has unverified changes

═══ VALIDATE ═══
□ test-suite.sh  □ tsc --noEmit  □ git push feature branch
□ gh pr create --base dev  □ check CI  □ save-state.sh

═══ SELF-HEAL ON FAILURE (max 3 retries per error, 5 total) ═══
□ Capture full error  □ Diagnose in 1 sentence  □ Scope check (your code?)
□ Minimal fix  □ Re-validate  □ If 3 fails → HALT + escalate to human
□ NEVER: suppress test, cast to any, delete failing code, retry without hypothesis

═══ COMPLIANCE LOG (BLOCKING — task NOT complete without this) ═══
□ Auto-logged by completion-gate hook on Stop
□ Manual: append to .claude/compliance-log.md  □ ✅ or ❌

═══ HARD CONSTRAINTS (HC-1 through HC-14 — violation = revert) ═══
□ No any type  □ No inline styles  □ Server Actions for mutations
□ RLS + realtor_id on every table  □ CASL consent  □ FINTRAC non-nullable
□ Never push main/dev directly  □ Never force push  □ Never commit .env.local
□ Zod validation  □ No PII in prompts  □ Tenant client for user data
□ Verify against code not reports (HC-13)  □ realtor_id on new tables (HC-14)
```
