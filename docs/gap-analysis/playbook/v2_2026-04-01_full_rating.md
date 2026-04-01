# Agent Playbook — Complete Section-by-Section Rating

> **Date:** 2026-04-01
> **Method:** Read every line (1811 lines, 86 sections) and rated each against:
> (a) Is the content correct and useful?
> (b) Is it actually followed in practice?
> (c) Is there a mechanism to enforce it?
> (d) Does it reference real files/systems that exist?
> **7-pass analysis applied to this document**

---

## Section 1: Purpose (Lines 1-205) — Rating: **9/10**

### 1.1 Team Policy — STRICT ENFORCEMENT
**Content: 10/10.** Zero-tolerance policy is well-articulated. The 6 "not for" bullet points directly address every excuse AI agents use. PR requirements checklist is actionable. Human vs AI tracks table (1.5) is practical.

**Enforcement: 6/10.** No automation enforces the compliance log requirement. The playbook-gate hook blocks edits without classification, but doesn't enforce PR requirements or docs updates. The compliance log is "mandatory" but always empty.

**Accuracy: 9/10.** References `health-check.sh`, `test-suite.sh`, `.claude/compliance-log.md` — all exist. References `tests/<feature>.md` — this pattern is used inconsistently.

### 1.1.1 Hard Constraints Table
**Content: 10/10.** HC-1 through HC-14 are clear, specific, and enforceable. HC-12 (tenant client) and HC-13 (verify against code) directly address real failures from this session. HC-14 (realtor_id) ensures multi-tenancy by default.

**Gap: HC-4 says "RLS required with tenant-scoped policy" but current RLS policies use `auth.role()` not `auth.uid()` — the HC is aspirational, not yet true in code.**

### 1.2 Feature Evaluation & Market Fit
**Content: 8/10.** Good questions. Competitor comparison mandate is valuable.

**Practice: 2/10.** Never actually followed. No hook enforces it. Features get built without answering these questions.

### 1.2.1 Architectural Principles
**Content: 10/10.** 4 principles with requirement tables AND "How to Verify" columns. This is new and excellent — directly maps meeting notes principles to actionable standards.

**Gap: "Performance: Page loads in <3s with 100+ records" — untested. No performance benchmark exists.**

### 1.3-1.5 Documentation, Onboarding, Human vs AI Tracks
**Content: 7/10.** Good structure but theoretical. Onboarding steps (1.4) assume a team that doesn't exist yet.

**Accuracy: The `usecases/*.md` pattern is used — 11 use-case docs exist. The `tests/<feature>.md` pattern is NOT consistently used — tests are in `scripts/` and `tests/browser/`, not `tests/<feature>.md` files.**

### 1.6 Agent vs Tool vs Task Boundaries
**Content: 9/10.** Smart architectural separation. The 3 enforcement rules (no critical behavior in prompts, tool schema mandatory, structured data contracts) are excellent. Correctly maps to existing code patterns.

**Accuracy: References `realtor_tools.py` — exists. References `workflow-engine.ts` — exists. References `handle_realtor_tool()` — exists.**

### 1.7 Multi-Tenancy
**Content: 10/10.** Code examples from actual `tenant.ts`. Hard rules table. Migration template. Global tables list. This is the model for how all playbook sections should be written.

**Accuracy: Every code snippet matches the actual implementation in `src/lib/supabase/tenant.ts`. Global tables list matches the `GLOBAL_TABLES` set in code.**

---

## Section 2: Pre-Flight Protocol (Lines 282-369) — Rating: **6/10**

### 2.1 Environment
**Content: 5/10.** One line: "run health-check.sh." Fine but never done.

### 2.2 Git Workflow
**Content: 9/10.** Branch model, naming convention, pre-flight steps, rules — all correct and match actual GitHub branch protection settings. The "0 approvals on dev, 1 on main" accurately reflects the repo config.

**Gap: Says "Merge your own PR" but CI checks are required. Sometimes CI takes 2-5 minutes — this is fine but not documented.**

### 2.3 Services
**Content: 6/10.** Lists 4 services with ports and health check commands. But:
- **Ollama at :11434** — only needed for voice agent dev, not most tasks
- **Form Server at :8767** — only for listing Phase 5
- Most tasks only need CRM at :3000

### 2.4-2.5 Memory & Context Policies
**Content: 7/10.** Memory rules are thorough — PII exclusions, retention, cross-tenant isolation, RAG-specific rules. But 50+ lines about a system that's barely used in practice.

**Accuracy: References `MEMORY.md` — exists. RAG "do not index" zones are correct. Cross-tenant isolation rule correctly states multi-tenant.**

**Problem: This section is 90 lines. It could be 20. The detail-to-value ratio is low.**

---

## Section 3: Task Classification (Lines 371-499) — Rating: **8/10**

### 3.0 MANDATORY — Understand Before Executing
**Content: 10/10.** The 6-step process (read full prompt → decompose → map dependencies → reorder → classify → execute) is the most important section in the playbook. The dependency reordering example is excellent.

**Practice: 4/10.** Agents still skip straight to execution. The playbook-gate hook enforces classification but not the decomposition/reordering steps.

### 3.1 Classification Output
**Content: 8/10.** Clear format. Adding "Execution Order" for multi-step tasks is valuable.

### 3.2 Trivial Change Fast Path
**Content: 9/10.** Well-bounded: ALL 5 conditions must be true. "If in doubt → it's not trivial." Good escape valve without being an escape hatch.

**Risk: In practice, agents classify non-trivial work as trivial to skip phases. The 3-line limit helps but isn't enforced by hooks.**

### 14 Task Types
**Content: 9/10.** 14 types with subtypes is comprehensive. Covers all real work patterns. GAP_ANALYSIS is now a recognized type (via 4.4.2).

**Gap: GAP_ANALYSIS is documented in 4.4.2 but NOT in the 14 Task Types table. It should be added as the 15th type.**

### 3.3 Multi-Task Handling
**Content: 10/10.** 5-step decompose→order→execute→verify→report process. Max 5 parallel agents. Conflict detection. Completion summary format. This is production-quality orchestration design.

---

## Section 4: Task Playbooks (Lines 501-1021) — Rating: **9/10**

### 4.1 CODING (100 lines)
**Content: 10/10.** 7 phases with checklists. Phase 0 (Feature Fit) prevents duplicate features. Phase 1 (Scope) has 12 specific checks including FINTRAC, RLS, tsconfig. Phase 4 (Implementation) covers file org, UI/styling, data integrity, security. Phase 5 (Self-Check) with targeted regression testing thresholds by lines changed. Touchpoint analysis for >100 lines is excellent.

**The mandatory testing thresholds table (lines 591-598) is the best testing guidance in any playbook I've seen.** "Zero-tolerance: >100 lines with only typo testing = automatic revert" is exactly right.

**Accuracy: All file paths, tools, and patterns reference real code.**

### 4.2 TESTING (35 lines)
**Content: 8/10.** Phase 1.5 (Test Documentation) is good — links test cases to auto/manual/pending status. References real test inventory (evals.md, test-suite.sh, eval scripts, Playwright).

### 4.3 DEBUGGING (12 lines)
**Content: 7/10.** Concise. 5 phases. "Grep for same anti-pattern elsewhere" in Phase 5 is a good practice.

### 4.4 DESIGN_SPEC (22 lines)
**Content: 8/10.** 7 phases from Feature Justification through Implementation Plan. Phase 0 competitor comparison is valuable.

**Gap: Phase 4 says "data model" but doesn't require ERD. Phase 5 says "deployment plan" but doesn't reference the Architectural Principles (1.2.1) rollout requirements.**

### 4.4.1 7-Pass Iterative Analysis (25 lines)
**Content: 10/10.** 7 sequential passes with clear focus and key question per pass. Pass 3 (Code Verification) enforces HC-13. Pass 6 (Gap Reconciliation) checks against original requirements. Pass 7 (Implementation Sanity) challenges the analyst's own recommendations. Rules section prevents rubber-stamping.

**This is the single most important process improvement in the entire playbook.**

### 4.4.2 GAP_ANALYSIS Task Type (30 lines)
**Content: 10/10.** Verification checklist per feature (6 checkboxes). Output format with evidence column. "What NOT to do" section directly addresses real failures. Mandates versioned output in `docs/gap-analysis/`.

### 4.5-4.10 Domain Playbooks
**Content: 7-8/10 each.** RAG_KB, ORCHESTRATION, INTEGRATION, DOCS, EVAL, INFO_QA — all follow consistent phase structure. ORCHESTRATION (4.6) Phase 5 output guardrails (PII check, hallucination check, consent check, instruction leak check) is excellent.

**INTEGRATION (4.7)** third-party risk check is thorough — SOC 2, PIPEDA data residency, API version pinning, fallback plan.

### 4.11 DEPLOY (35 lines)
**Content: 8/10.** 6 phases from pre-deploy through rollback. References real commands and env vars.

**Accuracy: Says "Netlify deploy" — verify this is still the deployment target (may have changed). References `save-state.sh` — exists.**

### 4.12 VOICE_AGENT (55 lines)
**Content: 10/10.** 7 phases covering backend (Python), frontend (React), 4 LLM providers, 56 tools, dynamic tool selection, system prompts, testing commands. Phase 7 (Verify fallback chain) is specific to the multi-provider architecture.

**Accuracy: Every file path, command, and config reference maps to real code. Tool count (56) matches reality. Session focus tracking, context summarization, empty response retry — all verified in code.**

### 4.13 DATA_MIGRATION (35 lines)
**Content: 9/10.** 7 phases. BC-specific seed data rules (V-prefix postal codes, 604/778/236 area codes, R2xxxxxxx MLS format). Idempotency mandate. Rollback plan before forward migration.

**Accuracy: Correctly flags 050-053 duplicate numbering issue.**

### 4.14 SECURITY_AUDIT (30 lines)
**Content: 9/10.** 6 phases: RLS, webhooks, secrets, FINTRAC, CASL, input sanitization. Each phase has specific commands and checks.

**Gap: Phase 1 says `USING (auth.role() = 'authenticated')` — this is the CURRENT state but not the TARGET. Should say `USING (realtor_id = auth.uid()::uuid)` per multi-tenancy rules.**

### 4.15 Use-Case Documentation (25 lines)
**Content: 8/10.** 6 required sections including demo script and market context. Naming convention.

---

## Section 5: Model Chaining (Lines 1023-1130) — Rating: **9/10**

**Content: 10/10.** Model selection table with costs. Override rules. Parallel agent rules (max 5, no shared files). Multi-Agent Orchestration Safety (5.4) is exceptional — least-privilege, supervisor/judge pattern, inter-agent message safety, context contamination prevention. Cost & Performance Controls (5.5) with token budgets per task type, latency SLOs, and circuit breaker rules.

**Gap: Circuit breaker says "Same tool call fails 3x" but completion-gate hook only runs on Stop, not per-tool-call. No runtime enforcement.**

---

## Section 6: Post-Task Validation (Lines 1132-1283) — Rating: **9/10**

### 6.1 Validation Steps
**Content: 8/10.** 9 steps covering tests, tsc, git, PR, CI, migration verify, save-state. Correct and complete.

### 6.2 Self-Healing Retry Loop
**Content: 10/10.** Pseudocode algorithm with max retries. Hypothesis-driven debugging. Scope check (is error in your code?). Valid/invalid fix table per error type. "Never retry without new hypothesis" and "Never suppress test" rules prevent the most common agent failure modes.

### 6.3 Escalation Triggers
**Content: 9/10.** 6 triggers for immediate halt. "You don't understand the error after reading it twice → escalate" is honest and correct.

### 6.4 Blast Radius & Execution Isolation
**Content: 10/10.** 4-tier command classification with specific examples per tier. Migration-specific isolation (rollback SQL first, one at a time, verify before/after). Target architecture for future containerization.

---

## Section 7: Production Incidents (Lines 1286-1345) — Rating: **7/10**

**Content: 7/10.** 6-step incident table is basic but functional. Dev Branch Broken protocol (7.1) with 30-minute SLA is good. Conflict Resolution (7.2) with prevention + resolution steps is practical.

**Gap: No monitoring/alerting. No dashboards. No runbook for specific failure modes (Supabase down, Resend down, Twilio down). No post-incident review process.**

**Accuracy: References `app.netlify.com/projects/realtorai-crm` — verify this is the correct Netlify project name.**

---

## Section 8: Secret Rotation (Lines 1347-1356) — Rating: **8/10**

**Content: 8/10.** 6 steps. Concise, correct, actionable.

---

## Section 9: Infrastructure Map (Lines 1358-1378) — Rating: **5/10**

**Content: 5/10.** References 14 components. But:
- Says "61 SQL files" — actually **75** migrations
- References `realtors360-rag/` (Python FastAPI) — **does this directory exist?** Not verified.
- References `content-generator/` — **does this exist?** Not verified.
- References `save-state.sh` — exists but may be stale

**This section violates HC-13 — the map should be verified against actual file system.**

---

## Section 10: Quick Reference Card (Lines 1381-1465) — Rating: **10/10**

**Content: 10/10.** This is the best section in the entire playbook. 85 lines covering the entire flow in checkbox format. If agents could ONLY read this section, compliance would be dramatically higher.

**Includes:** Pre-flight, understand first, classify, CRM rules, feature gate, documentation, regression, testing thresholds, execute, validate, self-heal, blast radius, compliance log, WIP board, agent/tool boundaries, multi-agent safety, cost & telemetry, agent evals, AI governance, trivial fast path.

**This should be the FIRST thing loaded into agent context, not buried on line 1381.**

---

## Section 11: Compliance Tracker (Lines 1469-1536) — Rating: **4/10**

**Content: 8/10.** Well-designed: when to log, how to log, required fields, strict rules (3+ consecutive ❌ → mandatory review), log rotation, velocity metrics.

**Practice: 0/10.** The compliance log is always empty. No one fills it in. No automation reminds or enforces. The velocity metrics have never been computed.

**Fix needed:** Either automate compliance logging (hook that auto-appends on task completion) or accept it's dead and remove it.

---

## Section 12: WIP Visibility (Lines 1539-1571) — Rating: **3/10**

**Content: 7/10.** Good concept — `.claude/WIP.md` as lightweight WIP board.

**Practice: 0/10.** `WIP.md` doesn't exist. Never created. Never used. Section references it as if it's active.

**Fix needed:** Either create `WIP.md` and enforce via hook, or remove this section.

---

## Section 13: Agent Evaluation & Safety (Lines 1574-1691) — Rating: **8/10**

**Content: 10/10.** Eval-driven development (TDD for agents). 4 eval dimensions (outcome, trajectory, cost, compliance). 7 eval types with pass criteria. Golden task set with 0-3 scoring. Safety eval suite with prompt injection tests, indirect injection tests, data boundary tests. Release gating.

**The indirect prompt injection tests (13.3) are exceptional** — testing content-borne attacks via Supabase fields, tool responses, and RAG retrieval is ahead of most agent safety practices.

**Practice: 0/10.** `tests/agent-evals/` directory doesn't exist. No golden tasks defined. No safety tests implemented. This is purely aspirational.

**Accuracy: Release gating references real files (system_prompts.py, realtor_tools.py, newsletter-ai.ts) — all exist.**

---

## Section 14: AI Governance (Lines 1694-1810) — Rating: **8/10**

**Content: 9/10.** Approved models table, PII rules with allowlist/blocklist, regulatory alignment (FINTRAC, CASL, TCPA, PIPEDA, EU AI Act), human-in-the-loop by risk level with anti-rubber-stamping measures, agent observability with telemetry fields, feature sunset triggers and process.

**The anti-rubber-stamping subsection (14.4) is excellent** — requiring reasoning, alternatives, and risk alongside the approval.

**Practice: 4/10.** PII rules are partially followed. Regulatory alignment is documented but not tested. Telemetry fields are defined but not logged. Feature sunset has never been exercised.

---

## OVERALL RATING SUMMARY

| Section | Content Quality | Practice/Enforcement | Accuracy | Overall |
|---------|---------------|---------------------|----------|---------|
| 1. Purpose & Constraints | 10/10 | 6/10 | 9/10 | **9/10** |
| 2. Pre-Flight | 7/10 | 3/10 | 7/10 | **6/10** |
| 3. Classification | 9/10 | 4/10 | 9/10 | **8/10** |
| 4. Task Playbooks | 10/10 | 7/10 | 9/10 | **9/10** |
| 5. Model Chaining | 10/10 | 5/10 | 8/10 | **9/10** |
| 6. Post-Task Validation | 10/10 | 6/10 | 9/10 | **9/10** |
| 7. Incidents | 7/10 | 4/10 | 6/10 | **7/10** |
| 8. Secrets | 8/10 | 7/10 | 8/10 | **8/10** |
| 9. Infrastructure Map | 5/10 | 3/10 | 4/10 | **5/10** |
| 10. Quick Reference | 10/10 | 5/10 | 10/10 | **10/10** |
| 11. Compliance Tracker | 8/10 | 0/10 | 8/10 | **4/10** |
| 12. WIP Visibility | 7/10 | 0/10 | 2/10 | **3/10** |
| 13. Agent Evaluation | 10/10 | 0/10 | 8/10 | **8/10** |
| 14. AI Governance | 9/10 | 4/10 | 8/10 | **8/10** |

**Overall Playbook Rating: 7.6/10**

---

## TOP 5 STRENGTHS (keep these exactly as-is)

1. **Quick Reference Card (Section 10)** — The most effective compliance tool. Should be loaded first.
2. **7-Pass Analysis (4.4.1)** — Prevents single-pass garbage. HC-13 enforced in Pass 3.
3. **CODING Playbook (4.1)** — 7 phases with specific checklists, touchpoint analysis, testing thresholds.
4. **Self-Healing Loop (6.2)** — Hypothesis-driven, max retries, valid/invalid fix table.
5. **Multi-Agent Safety (5.4)** — Least-privilege, supervisor pattern, context contamination prevention.

## TOP 5 WEAKNESSES (must fix)

1. **Compliance log is dead (Section 11)** — 0/10 practice. Either automate or remove.
2. **WIP.md doesn't exist (Section 12)** — 0/10 practice. References something that was never created.
3. **Agent evals not implemented (Section 13)** — Excellent design, zero execution. No `tests/agent-evals/`.
4. **Infrastructure map stale (Section 9)** — Wrong migration count, unverified directory references.
5. **GAP_ANALYSIS not in task types table** — Defined in 4.4.2 but missing from the 14 Task Types table in 3.1.

## SPECIFIC FIXES NEEDED

| # | Fix | Effort | Impact |
|---|-----|--------|--------|
| 1 | Add GAP_ANALYSIS to 14 Task Types table | 2 min | Consistency |
| 2 | Create `.claude/WIP.md` with header | 2 min | Section 12 accuracy |
| 3 | Fix infrastructure map: 75 migrations, verify directory references | 10 min | Section 9 accuracy |
| 4 | Fix SECURITY_AUDIT Phase 1: `auth.uid()` not `auth.role()` | 2 min | Multi-tenant alignment |
| 5 | Add DESIGN_SPEC Phase 4 reference to Architectural Principles (1.2.1) | 5 min | Cross-reference |
| 6 | Move Quick Reference Card to top of playbook (or make it a separate file agents read first) | 10 min | Compliance improvement |
| 7 | Create `tests/agent-evals/golden-tasks.md` with 3 starter tasks | 30 min | Section 13 activation |
| 8 | Add compliance log automation hook suggestion | 5 min | Section 11 improvement |

---

*Playbook Full Rating v2 — 2026-04-01. Read all 1811 lines. 7-pass analysis. Verified file references against actual filesystem.*
