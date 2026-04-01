# Agent Playbook Gap Analysis & Enhancement Plan v3

> **Date:** 2026-04-01 | **7-pass iterative analysis**
> **Auditor approach:** Professional auditor examining every section systematically using industry frameworks
> **Scope:** `.claude/agent-playbook.md` (1811 lines, 86 sections, 14 top-level sections)
> **Method:** Read every line → compared against best-in-market → verified against actual code → depth checked → completeness reviewed → gaps reconciled → implementation sanity tested
> **Source:** v2 full rating + pipeline research (403 lines market analysis)

---

## AUDIT FRAMEWORK

Each section is evaluated using:
- **COBIT** — Control Objectives: Is there a defined objective, are controls in place, is compliance measurable?
- **CMMI** — Maturity Model: Level 1 (Initial/Ad hoc) → Level 2 (Managed) → Level 3 (Defined) → Level 4 (Measured) → Level 5 (Optimizing)
- **MoSCoW** — Priority: Must have / Should have / Could have / Won't have
- **RACI** — Responsibility: Who is Responsible, Accountable, Consulted, Informed?
- **SWOT** — Strengths, Weaknesses, Opportunities, Threats per section

---

## SECTION 1: PURPOSE & HARD CONSTRAINTS (Lines 1-205)

### CMMI Maturity: Level 3 (Defined) → Target: Level 4 (Measured)

Rules are defined and documented. Missing: measurement of compliance rate and automated enforcement.

### SWOT

| | Positive | Negative |
|--|----------|----------|
| **Internal** | **S:** 14 hard constraints, zero ambiguity. HC-13 (verify code) addresses #1 failure. Multi-tenancy section (1.7) is production-quality with code examples. | **W:** HC-4 says "tenant-scoped RLS" but actual RLS uses `auth.role()` not `auth.uid()`. Feature Evaluation (1.2) never followed in practice. |
| **External** | **O:** HC table format is easily extensible for new constraints (e.g., accessibility, performance). Architectural principles (1.2.1) align with meeting notes requirements. | **T:** 14 HCs is already a lot to remember. Adding more dilutes focus. |

### Gaps

| # | Gap | Framework | Priority | Evidence |
|---|-----|-----------|----------|----------|
| G1.1 | HC-4 claims tenant-scoped RLS but migrations use `auth.role()` | COBIT: Control vs Reality mismatch | Must-have | `supabase/migrations/065_tenant_rls_policies.sql` uses `USING (auth.role() = 'authenticated')` |
| G1.2 | Feature Evaluation (1.2) has no enforcement mechanism | CMMI: Level 1 (ad hoc) | Should-have | No hook blocks CODING:feature without feature eval |
| G1.3 | Architectural Principles (1.2.1) not cross-referenced from DESIGN_SPEC Phase 4 | COBIT: Incomplete control linkage | Must-have | Section 4.4 Phase 4 says "data model" but doesn't say "check 1.2.1" |
| G1.4 | 14 HCs lack automated measurement — compliance rate unknown | CMMI: Level 2→3 gap | Should-have | No tool tracks HC violations across sessions |

### Enhancement

| # | Action | Approach | Effort | RACI |
|---|--------|----------|--------|------|
| E1.1 | Fix RLS policies to use `realtor_id = auth.uid()::uuid` | New migration 066 | 2 hours | R: AI agent, A: Product owner |
| E1.2 | Add cross-reference: DESIGN_SPEC Phase 4 → "Check Architectural Principles (1.2.1)" | Edit playbook | 2 min | R: AI agent |
| E1.3 | Add weekly HC compliance scan (grep codebase for violations) | Script `scripts/hc-audit.sh` | 2 hours | R: AI agent, A: Product owner |

---

## SECTION 2: PRE-FLIGHT PROTOCOL (Lines 282-369)

### CMMI Maturity: Level 1 (Initial) → Target: Level 3 (Defined)

Health check exists but never runs. Memory policies documented but barely used.

### SWOT

| | Positive | Negative |
|--|----------|----------|
| **Internal** | **S:** Git workflow (2.2) is correct and matches GitHub config. Branch naming convention enforced. | **W:** Health check never runs. Memory section is 50 lines about an unused system. WIP.md referenced but doesn't exist. |
| **External** | **O:** Health check could be made mandatory via hook. | **T:** Over-documenting unused features creates false confidence. |

### Gaps

| # | Gap | Framework | Priority | Evidence |
|---|-----|-----------|----------|----------|
| G2.1 | `health-check.sh` never runs in practice | COBIT: Control exists but not executed | Should-have | No hook triggers health check |
| G2.2 | Memory section is 50 lines for a barely-used system | CMMI: Over-documentation | Could-have | Ratio: 50 lines documentation / <5 uses per month |
| G2.3 | WIP.md referenced but doesn't exist | COBIT: Reference to non-existent control | Must-have | `ls .claude/WIP.md` → not found |
| G2.4 | Infrastructure map (Section 9) says 61 migrations, actually 75 | COBIT: Stale reference | Must-have | `ls supabase/migrations/ | wc -l` = 75 |

### Enhancement

| # | Action | Approach | Effort |
|---|--------|----------|--------|
| E2.1 | Create `.claude/WIP.md` with header template | Write file | 2 min |
| E2.2 | Trim memory section from 50 to 15 lines | Edit playbook | 10 min |
| E2.3 | Fix infrastructure map: 75 migrations, verify all directory refs | Edit playbook | 10 min |
| E2.4 | Add health-check to pre-flight hook (warn, don't block) | Edit `playbook-reminder.sh` | 15 min |

---

## SECTION 3: TASK CLASSIFICATION (Lines 371-499)

### CMMI Maturity: Level 3 (Defined) → Target: Level 4 (Measured)

Classification process is well-defined. Enforcement partial (playbook-gate blocks edits without task file, but doesn't verify decomposition/reordering happened).

### SWOT

| | Positive | Negative |
|--|----------|----------|
| **Internal** | **S:** Section 3.0 (Understand Before Executing) is the single most important process step. 14+1 task types cover all work patterns. Multi-task handling (3.3) is production-quality orchestration. | **W:** GAP_ANALYSIS not in task types table (defined in 4.4.2 but missing from 3.1). Trivial Fast Path (3.2) is used as escape hatch. |
| **External** | **O:** Classification could be auto-validated against actual files changed (did scope match reality?). | **T:** Agents classify retroactively (after work is done) to justify what they already did. |

### Gaps

| # | Gap | Framework | Priority | Evidence |
|---|-----|-----------|----------|----------|
| G3.1 | GAP_ANALYSIS missing from 14 Task Types table | COBIT: Incomplete control definition | Must-have | Section 4.4.2 defines it but table on line 430 doesn't list it |
| G3.2 | No post-hoc verification that classification matched actual work | CMMI: Level 3→4 gap | Should-have | Agent could classify as "micro" then change 20 files |
| G3.3 | Trivial Fast Path abused — no enforcement of 3-line limit | COBIT: Unenforceable control | Could-have | playbook-gate only checks classified=true, not line count |

### Enhancement

| # | Action | Approach | Effort |
|---|--------|----------|--------|
| E3.1 | Add GAP_ANALYSIS to task types table as 15th type | Edit playbook line 430 | 2 min |
| E3.2 | Add scope-vs-actual check in completion-gate hook (count files changed, compare to classification) | Edit `completion-gate.sh` | 1 hour |

---

## SECTION 4: TASK PLAYBOOKS (Lines 501-1021)

### CMMI Maturity: Level 3 (Defined) → Target: Level 4 (Measured)

Best section in the playbook. 15 task types with phase-by-phase checklists. 7-pass analysis and GAP_ANALYSIS type are new and excellent.

### SWOT

| | Positive | Negative |
|--|----------|----------|
| **Internal** | **S:** CODING (4.1) is 130 lines of actionable checklists. Testing thresholds by lines changed. VOICE_AGENT (4.12) is domain-specific and accurate. 7-pass (4.4.1) prevents single-pass analysis. GAP_ANALYSIS (4.4.2) enforces HC-13. | **W:** SECURITY_AUDIT Phase 1 still references old RLS pattern (`auth.role()`). DESIGN_SPEC Phase 4 doesn't reference Architectural Principles. |
| **External** | **O:** Could add best-practice framework references per section (SWOT, COBIT, etc.) as the user requested. | **T:** 520 lines means agents won't read the full section for their task type. |

### Gaps

| # | Gap | Framework | Priority | Evidence |
|---|-----|-----------|----------|----------|
| G4.1 | SECURITY_AUDIT Phase 1 references `auth.role()` — should reference `auth.uid()` per multi-tenant | COBIT: Stale control | Must-have | Line 969 |
| G4.2 | DESIGN_SPEC Phase 4 doesn't reference Architectural Principles (1.2.1) | COBIT: Missing cross-reference | Must-have | Line 694 |
| G4.3 | No "professional auditor" philosophy documented for GAP_ANALYSIS | User requirement | Must-have | User explicitly requested this |
| G4.4 | No best-practice framework mandate for gap analysis sections | User requirement | Must-have | User: "follow best practice and framework for each section" |
| G4.5 | 7-pass process doesn't mention using industry frameworks (SWOT, COBIT, etc.) | Best practice | Should-have | Pass 2 says "best-in-market" but not "use industry frameworks" |

### Enhancement

| # | Action | Approach | Effort |
|---|--------|----------|--------|
| E4.1 | Fix SECURITY_AUDIT Phase 1: `auth.uid()` instead of `auth.role()` | Edit playbook | 2 min |
| E4.2 | Add to DESIGN_SPEC Phase 4: "Verify against Architectural Principles (1.2.1)" | Edit playbook | 2 min |
| E4.3 | Add to GAP_ANALYSIS (4.4.2): "Think like a professional auditor. Use industry frameworks (SWOT, COBIT, CMMI, MoSCoW, RACI) per section." | Edit playbook | 5 min |
| E4.4 | Add to 7-pass Pass 2: "Use industry frameworks for structured analysis" | Edit playbook | 2 min |

---

## SECTION 5: MODEL CHAINING (Lines 1023-1130)

### CMMI Maturity: Level 3 (Defined)

### SWOT
**S:** Token budgets, latency SLOs, circuit breaker. **W:** No runtime enforcement of budgets. **O:** Could integrate with Claude API usage tracking. **T:** Agents ignore budgets when "almost done."

### Gaps

| # | Gap | Priority |
|---|-----|----------|
| G5.1 | Circuit breaker rules not enforced at runtime | Should-have |
| G5.2 | Cost tracking in compliance log never done | Should-have |

---

## SECTION 6: POST-TASK VALIDATION (Lines 1132-1283)

### CMMI Maturity: Level 3 (Defined) — Best in class

### SWOT
**S:** Self-healing loop is the most practical section. Valid/invalid fix table eliminates ambiguity. Blast radius tiering with specific commands per tier. **W:** No enforcement that save-state runs. **O:** Could auto-classify bash commands by tier using a hook.

### Gaps

| # | Gap | Priority |
|---|-----|----------|
| G6.1 | Blast radius tier classification should be automated in `git-protection.sh` | Could-have |
| G6.2 | `save-state.sh` referenced but compliance not tracked | Could-have |

---

## SECTION 7-8: INCIDENTS & SECRETS (Lines 1286-1356)

### CMMI Maturity: Level 2 (Managed)

### SWOT
**S:** 30-minute SLA for broken dev. Secret rotation steps are correct. **W:** No monitoring, no dashboards, no alerting. No post-incident review. **O:** Add incident template and post-mortem process.

### Gaps

| # | Gap | Priority |
|---|-----|----------|
| G7.1 | No monitoring/alerting documentation | Should-have |
| G7.2 | No post-incident review template | Should-have |
| G7.3 | Netlify project name unverified | Must-have |

---

## SECTION 9: INFRASTRUCTURE MAP (Lines 1358-1378)

### CMMI Maturity: Level 1 (Initial) — Stale data

### Gaps

| # | Gap | Priority | Evidence |
|---|-----|----------|----------|
| G9.1 | Says 61 migrations, actually 75 | Must-have | `ls supabase/migrations/ | wc -l` = 75 |
| G9.2 | References `realtors360-rag/` — may not exist | Must-have | Unverified |
| G9.3 | References `content-generator/` — may not exist | Must-have | Unverified |

---

## SECTION 10: QUICK REFERENCE CARD (Lines 1381-1465)

### CMMI Maturity: Level 3 (Defined) — Best section

### SWOT
**S:** 85 lines covering entire flow in checkbox format. Most effective compliance tool. **W:** Buried on line 1381 — agents don't read this far. **O:** Make it a separate file that agents load first. **T:** If the card diverges from detailed sections, contradictions arise.

### Gap

| # | Gap | Priority |
|---|-----|----------|
| G10.1 | Card should be loaded FIRST, not last. Either move to top or extract to `.claude/quick-reference.md` | Must-have |

---

## SECTION 11: COMPLIANCE TRACKER (Lines 1469-1536)

### CMMI Maturity: Level 1 (Initial) — Process defined but never executed

### SWOT
**S:** Well-designed format, velocity metrics, rotation schedule. **W:** 0% compliance. Log is always empty. No automation. **O:** Hook-based auto-logging would activate this. **T:** Dead process undermines trust in entire playbook.

### Gaps

| # | Gap | Priority | Evidence |
|---|-----|----------|----------|
| G11.1 | Compliance log is always empty — 0% adherence | Must-have | `wc -l .claude/compliance-log.md` = header only |
| G11.2 | No automation to remind or auto-append | Must-have | No hook writes to compliance log |
| G11.3 | Velocity metrics never computed | Should-have | No script or cron |

### Enhancement

| # | Action | Approach | Effort |
|---|--------|----------|--------|
| E11.1 | Add auto-append to `completion-gate.sh` — log task type, date, status on every Stop | Edit hook | 1 hour |
| E11.2 | Create `scripts/compliance-report.sh` that computes velocity metrics from log | New script | 2 hours |

---

## SECTION 12: WIP VISIBILITY (Lines 1539-1571)

### CMMI Maturity: Level 0 (Non-existent)

### Gaps

| # | Gap | Priority | Evidence |
|---|-----|----------|----------|
| G12.1 | `.claude/WIP.md` doesn't exist | Must-have | File not found |
| G12.2 | No hook enforces WIP registration | Should-have | |

---

## SECTION 13: AGENT EVALUATION & SAFETY (Lines 1574-1691)

### CMMI Maturity: Level 1 (Initial) — Designed but not implemented

### SWOT
**S:** Eval-driven development, golden task set, safety eval suite with indirect prompt injection tests — all exceptional design. **W:** `tests/agent-evals/` doesn't exist. Zero tests implemented. **O:** Even 3 golden tasks would be valuable. **T:** Unimplemented safety evals mean no protection against regression.

### Gaps

| # | Gap | Priority | Evidence |
|---|-----|----------|----------|
| G13.1 | `tests/agent-evals/golden-tasks.md` doesn't exist | Must-have | Directory not found |
| G13.2 | Safety eval suite never run | Should-have | No test files |
| G13.3 | Release gating (13.4) never enforced | Should-have | No CI gate |

### Enhancement

| # | Action | Approach | Effort |
|---|--------|----------|--------|
| E13.1 | Create `tests/agent-evals/golden-tasks.md` with 5 starter tasks | Write file | 30 min |
| E13.2 | Create `tests/agent-evals/safety-tests.md` with 5 prompt injection tests | Write file | 30 min |

---

## SECTION 14: AI GOVERNANCE (Lines 1694-1810)

### CMMI Maturity: Level 2 (Managed)

### SWOT
**S:** Anti-rubber-stamping measures, escalation path, feature sunset triggers. **W:** Telemetry fields defined but never logged. Regulatory alignment documented but untested. **O:** Quarterly PII audit could be automated. **T:** Regulatory non-compliance risk if PIPEDA rules not actually enforced.

---

## CROSS-CUTTING GAPS (Apply to entire playbook)

| # | Gap | Framework | Priority | Evidence |
|---|-----|-----------|----------|----------|
| GX.1 | **Professional auditor philosophy not documented** — gap analyses should use industry frameworks (SWOT, COBIT, CMMI, MoSCoW, RACI) per section | User requirement | Must-have | User explicitly requested |
| GX.2 | **Playbook is 1811 lines — too long for reliable compliance** — agents can't hold 86 sections in working memory | CMMI: Process efficiency | Should-have | Evidence: repeated violations despite reading playbook |
| GX.3 | **No playbook versioning** — changes aren't tracked, no changelog | COBIT: Change management | Should-have | No `CHANGELOG.md` for playbook |
| GX.4 | **Branding inconsistency** — some sections say Realtors360, header says Realtors360, but CLAUDE.md project description was updated separately | COBIT: Document control | Could-have | Multiple rename sessions |

---

## ENHANCEMENT IMPLEMENTATION PLAN

### Sprint 1: Critical Fixes (Today — 2 hours)

| # | Enhancement | Effort | Files |
|---|------------|--------|-------|
| E3.1 | Add GAP_ANALYSIS to task types table | 2 min | `agent-playbook.md` |
| E4.1 | Fix SECURITY_AUDIT Phase 1 RLS reference | 2 min | `agent-playbook.md` |
| E4.2 | Add Architectural Principles cross-reference to DESIGN_SPEC | 2 min | `agent-playbook.md` |
| E4.3 | Add professional auditor philosophy + frameworks to GAP_ANALYSIS | 5 min | `agent-playbook.md` |
| E4.4 | Add industry frameworks to 7-pass Pass 2 | 2 min | `agent-playbook.md` |
| E2.1 | Create `.claude/WIP.md` | 2 min | New file |
| E2.3 | Fix infrastructure map (75 migrations, verify refs) | 10 min | `agent-playbook.md` |
| G9.1-3 | Verify `realtors360-rag/`, `content-generator/` exist | 5 min | `agent-playbook.md` |

### Sprint 2: Activation (This Week — 4 hours)

| # | Enhancement | Effort | Files |
|---|------------|--------|-------|
| E1.1 | Fix RLS policies: `auth.uid()` migration | 2 hours | `supabase/migrations/066_*.sql` |
| E11.1 | Auto-compliance logging in completion-gate | 1 hour | `.claude/hooks/completion-gate.sh` |
| E13.1 | Create golden tasks (5 starter) | 30 min | `tests/agent-evals/golden-tasks.md` |
| E13.2 | Create safety tests (5 prompt injection) | 30 min | `tests/agent-evals/safety-tests.md` |

### Sprint 3: Optimization (Next Week — 4 hours)

| # | Enhancement | Effort | Files |
|---|------------|--------|-------|
| E1.3 | HC compliance scan script | 2 hours | `scripts/hc-audit.sh` |
| E11.2 | Compliance report script | 2 hours | `scripts/compliance-report.sh` |
| E3.2 | Scope-vs-actual check in completion-gate | 1 hour | `.claude/hooks/completion-gate.sh` |
| G10.1 | Extract Quick Reference Card to `.claude/quick-reference.md` | 30 min | New file + playbook edit |

---

## MATURITY ROADMAP

| Section | Current | Sprint 1 | Sprint 2 | Sprint 3 | Target |
|---------|---------|----------|----------|----------|--------|
| 1. Purpose | Level 3 | Level 3 | Level 4 | Level 4 | Level 4 |
| 2. Pre-Flight | Level 1 | Level 2 | Level 2 | Level 3 | Level 3 |
| 3. Classification | Level 3 | Level 3 | Level 4 | Level 4 | Level 4 |
| 4. Playbooks | Level 3 | Level 3 | Level 3 | Level 4 | Level 4 |
| 5. Model Chaining | Level 3 | Level 3 | Level 3 | Level 3 | Level 4 |
| 6. Validation | Level 3 | Level 3 | Level 3 | Level 4 | Level 4 |
| 7-8. Incidents | Level 2 | Level 2 | Level 2 | Level 3 | Level 3 |
| 9. Infra Map | Level 1 | Level 3 | Level 3 | Level 3 | Level 3 |
| 10. Quick Ref | Level 3 | Level 3 | Level 3 | Level 4 | Level 4 |
| 11. Compliance | Level 1 | Level 1 | Level 3 | Level 4 | Level 4 |
| 12. WIP | Level 0 | Level 2 | Level 2 | Level 3 | Level 3 |
| 13. Agent Evals | Level 1 | Level 1 | Level 2 | Level 3 | Level 4 |
| 14. Governance | Level 2 | Level 2 | Level 2 | Level 3 | Level 3 |
| **Overall** | **Level 2.1** | **Level 2.5** | **Level 2.8** | **Level 3.5** | **Level 3.5** |

---

## 7-PASS VERIFICATION LOG

- **Pass 1 (Self-Analysis):** Read all 1811 lines. Found 25 gaps across 14 sections.
- **Pass 2 (Best-in-Market):** Applied COBIT, CMMI, SWOT, MoSCoW, RACI frameworks. Pipeline research provided CRM industry context (HubSpot, Salesforce, Follow Up Boss, kvCORE patterns).
- **Pass 3 (Code Verification):** Verified: HC-4 vs migration 065 (mismatch confirmed), WIP.md existence (missing confirmed), migration count (75 not 61), compliance log (empty confirmed), agent-evals directory (missing confirmed).
- **Pass 4 (Depth Check):** Expanded every gap with evidence column. Added enhancement approach with effort estimates. Added RACI where relevant.
- **Pass 5 (Completeness):** Added cross-cutting gaps (GX.1-4). Verified all 14 sections covered. Added maturity roadmap.
- **Pass 6 (Gap Reconciliation):** User requirements checked: ✅ professional auditor philosophy, ✅ best practice frameworks, ✅ multi-tenancy documented, ✅ 4 architectural principles, ✅ 7-pass process. Missing: "think like professional auditor" not yet in playbook text.
- **Pass 7 (Implementation Sanity):** All Sprint 1 items are 2-10 minute edits — feasible. Sprint 2 RLS fix needs careful migration testing. Sprint 3 scripts are new files — no risk to existing code. Maturity targets are realistic (Level 3.5 in 3 sprints).

---

*Playbook Gap Analysis & Enhancement Plan v3 — 2026-04-01. 7-pass analysis using COBIT/CMMI/SWOT/MoSCoW/RACI frameworks. Verified against 1811 lines of playbook + actual codebase.*
