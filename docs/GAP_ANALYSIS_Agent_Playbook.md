# Gap Analysis: Agent Playbook

> **Date:** 2026-03-29
> **Scope:** `.claude/agent-playbook.md` (1,849 lines)
> **Method:** Line-by-line audit across 3 parallel analysis passes + real task walkthrough
> **Updated:** Added Section 0 — Fatal Flaw (why NO task passes through the playbook)

---

## 0. THE FATAL FLAW — Why No Task Can Pass Through This Playbook

### Evidence: The Compliance Log Proves It

The compliance log (`.claude/compliance-log.md`) has **7 entries**. Of these:
- **2 are ❌ (failed)** — "Jumped straight to coding" / "continued without loading playbook"
- **5 are ✅ (passed)** — but 3 of these are DOCS/INFO_QA tasks (editing the playbook itself, analyzing tokens, committing). Only **2 entries are actual coding tasks** that claim full compliance.
- **0 WIP.md entries** exist despite 7 tasks being logged. WIP board is empty.
- **0 agent-eval runs** have ever occurred.
- **compliance-archive/ directory** does not exist (rotation never happened).

The playbook is not failing occasionally — it has never been fully followed for a real feature task.

### Root Cause: The Mandatory Step Count Makes It Impossible

Here is what the playbook demands for a simple task like **"add a lead_source field to the contacts table and show it in the form"**:

**Before writing a single line of code, the agent MUST:**

| Step | What | Source | Time/Tokens |
|------|------|--------|-------------|
| 1 | Run `health-check.sh` | Section 2.1 (BLOCKING) | ~30s |
| 2 | Check WIP.md for conflicts | Section 12 (BLOCKING) | Read file |
| 3 | `git checkout dev && git pull` | Section 2.2 | ~10s |
| 4 | Create feature branch | Section 2.2 | ~5s |
| 5 | Check `git log` for recent changes to affected files | Section 2.2 | ~5s |
| 6 | Read MEMORY.md | Section 2.4 | Read file |
| 7 | Check services are running | Section 2.3 | ~15s |
| 8 | Read FULL user prompt | Section 3.0 (BLOCKING) | — |
| 9 | Decompose into steps | Section 3.0 | Thinking |
| 10 | Map dependencies | Section 3.0 | Thinking |
| 11 | Reorder by dependency | Section 3.0 | Thinking |
| 12 | Output classification block | Section 3.1 (BLOCKING) | ~200 tokens output |
| 13 | Search codebase for existing similar capability | Section 4.1 Phase 0 | Grep/search |
| 14 | Summarize what exists in 3-5 bullets | Section 4.1 Phase 0 | ~200 tokens output |
| 15 | Answer "Does this enhance or create new?" | Section 4.1 Phase 0 | ~100 tokens output |
| 16 | Evaluate feature fit — what problem, what benefit? | Section 1.2 | ~300 tokens output |
| 17 | Compare against 2-3 competitors | Section 1.2 | Research |
| 18 | **PRD GATE: Decide if PRD needed** | Section 4.1 Line 367 (BLOCKING) | Decision |
| 19 | Document in `usecases/<feature>.md` | Section 4.1 Phase 0 | Write file |
| 20 | Add row to WIP.md | Section 12 | Edit file |
| 21 | List files to CREATE and MODIFY | Section 4.1 Phase 1 | ~200 tokens |
| 22 | List DB tables affected | Phase 1 | ~100 tokens |
| 23 | List API routes affected | Phase 1 | ~100 tokens |
| 24 | List UI components affected | Phase 1 | ~100 tokens |
| 25 | Check for overlap with existing features | Phase 1 | Grep |
| 26 | Check migration numbering | Phase 1 | `ls migrations/` |
| 27 | Check new env vars needed | Phase 1 | — |
| 28 | Check FINTRAC impact | Phase 1 | — |
| 29 | Check RLS needed | Phase 1 | — |
| 30 | Check tsconfig exclude array | Phase 1 | Read file |
| 31 | Read all relevant existing files | Phase 2 | Read 3-5 files |
| 32 | Read `database.ts` | Phase 2 | Read file |
| 33 | Read relevant migrations | Phase 2 | Read 1-2 files |
| 34 | Summarize current behavior in 3-5 bullets | Phase 2 | ~200 tokens |
| 35 | Write short plan | Phase 3 | ~300 tokens |
| 36 | Run `save-state.sh` if complex | Phase 3 | ~10s |

**That's 36 mandatory steps before the agent writes line 1 of code.**

For a task that should take 10 minutes (add a column, update the type, update the form), the playbook demands **20+ minutes of pre-work** across 36 checkpoints spread over 6 sections.

### Why Agents Skip It

1. **The user asked a simple question and wants a simple answer.** The agent knows the answer takes 5 minutes. The playbook demands 20 minutes of ceremony. The agent shortcuts.
2. **Context window exhaustion.** The playbook alone is ~1,849 lines (~22,000 tokens). CLAUDE.md adds ~500 lines (~6,000 tokens). After loading both + the user's prompt, the agent has already consumed 30,000+ tokens before reading a single project file. The actual task gets squeezed.
3. **No proportionality.** A 3-file change and a 30-file feature require the same 36 steps. The trivial fast path (Section 3.2) only applies to ≤3-line, single-file, no-logic changes — an almost impossible threshold. Everything else gets the full ceremony.
4. **The "BLOCKING" gates contradict workflow.** The agent cannot Read files before classification (Section 3.0), but needs to read files to classify correctly. So it either classifies blindly (wrong type) or ignores the rule (non-compliant).
5. **Zero enforcement mechanism.** The compliance log is self-reported. WIP.md is honor-system. No hook, CI check, or automated gate prevents skipping. When everything relies on self-discipline with no consequences, self-discipline fails.

### The Math

| Metric | Value |
|--------|-------|
| Playbook lines | 1,849 |
| Estimated tokens to load | ~22,000 |
| CLAUDE.md tokens | ~6,000 |
| Pre-code mandatory steps | 36 |
| BLOCKING gates | 7 |
| Compliance log entries total | 7 |
| Of which actual feature tasks that passed | ~2 |
| WIP.md entries ever created | 0 |
| Agent eval runs ever executed | 0 |
| Compliance archive rotations | 0 |

### What Should Happen Instead

The playbook needs **proportional process** — different levels of ceremony for different task sizes:

| Task Size | Steps Before Coding | Example |
|-----------|-------------------|---------|
| **Micro** (≤20 lines, 1-2 files, no schema) | Classify → Code → Test → Commit | Fix CSS, add a field to existing form |
| **Small** (20-100 lines, 2-5 files) | Classify → Scope → Code → Test → Commit | New API route, new component |
| **Medium** (100-500 lines, 5-15 files, may have schema) | Classify → Scope → Plan → Code → Test → Docs → Commit | New feature page with actions |
| **Large** (500+ lines, 15+ files, new tables) | PRD → Classify → Scope → Plan → Code → Test → Docs → Commit | New subsystem (social media, offer management) |

The current playbook applies the **Large** ceremony to everything. That's why nothing passes.

---

## Executive Summary

The playbook has **67 identified issues** across 8 categories, plus a **fatal structural flaw**: the mandatory step count (36 steps before coding) makes it impossible for any real task to pass through fully. The evidence is in the compliance log — only 2 actual coding tasks claim compliance out of 7 entries, WIP.md has never been used, and no infrastructure the playbook depends on (evals, archives, telemetry) has been built.

| Category | Count | Severity |
|----------|-------|----------|
| **Fatal flaw: 36 pre-code steps** | 1 | Critical — nothing passes |
| Contradictions | 8 | High — agents receive conflicting instructions |
| Duplication | 14 | High — wastes ~400 tokens on repeated rules |
| Unenforceable rules | 17 | High — creates false sense of compliance |
| Impractical rules | 10 | Medium — agents skip them, eroding trust in all rules |
| Missing rules | 11 | Medium — real gaps in coverage |
| Ambiguity | 10 | Medium — agents interpret differently each time |
| Context bloat | 13 sections (~500+ lines) | High — pushes actual task context out of window |
| Aspirational vs actual | 10 | High — describes systems that don't exist |

---

## 1. Contradictions (8)

### C1. "No exceptions" vs Trivial Fast Path
- **Line 9:** "No steps skipped. No exceptions. No bypass."
- **Lines 15-21:** Six "not for" bullets reinforcing zero tolerance
- **Line 264-283:** Defines a "Trivial Change Fast Path" that explicitly skips phases: "Skipped phases: scope analysis, plan, self-check, docs update"
- **Impact:** The playbook says "no exceptions" then immediately creates one. Agents learn the rules are negotiable.

### C2. "Never push to dev" vs Quick Reference "git push dev"
- **Line 178:** "NEVER push directly to dev or main — both are protected, use PRs"
- **Line 1174:** "git push origin <developer>/<feature-branch>"
- **Line 1462:** Quick Reference says "git push dev"
- **Impact:** Agent following Quick Reference will violate the branching rules.

### C3. Code review checklist with 0-approval PRs
- **Lines 33-52:** Detailed code review checklist ("MUST verify" scope analysis, test cases, RLS, etc.)
- **Line 174:** "dev: PR required, 0 approvals — merge your own PRs"
- **Impact:** Who performs the code review if you merge your own PR? The checklist is unenforceable.

### C4. "Cannot skip playbook" vs "User override — log as failure"
- **Line 23:** "If you cannot follow the playbook for a task, you do not do the task."
- **Line 1515:** "If the user explicitly says 'skip the playbook' — log it as ❌ with note 'user override'"
- **Impact:** Section 1.1 says refuse. Section 11.1 says comply and log. Agent has no clear directive.

### C5. Model selection stated twice with override
- **Lines 1060-1066:** Section 5.1 "Model Selection" table
- **Line 1128:** "Model selection rules (override Section 5.1 guidance → these are rules)"
- **Impact:** 5.1 exists only to be overridden 60 lines later. Dead weight that confuses priority.

### C6. Netlify vs Vercel deployment
- **Lines 895-899:** Reference Netlify deployment exclusively
- **CLAUDE.md:** References `vercel.json` for cron jobs, Vercel deployment
- **Impact:** Playbook and CLAUDE.md disagree on deployment platform.

### C7. "No Read/Edit/Write before classification" vs needing to read to classify
- **Line 230:** "No Read, Edit, Write, Bash, or Agent tool call is permitted until this section is complete."
- **Reality:** Agent often needs to READ files to understand the task before classifying it.
- **Impact:** Forces blind classification, leading to wrong task types that waste time.

### C8. PRD Gate timing vs Phase 0
- **Line 367:** "PRD MUST exist... before proceeding to Phase 1"
- **Lines 361-366:** Phase 0 says to search codebase and evaluate feature fit first
- **Impact:** Unclear if PRD is written during Phase 0 or must exist before Phase 0.

---

## 2. Duplication (14)

Each duplicated rule consumes tokens on every agent load with zero additional value.

| Rule | Locations | Count |
|------|-----------|-------|
| "No exceptions" policy | Lines 9, 14-22, 137, 1167, 1419, 1508 | 6x |
| RLS requirement | Lines 381, 788, 972, 1003, 1434 | 5x |
| CASL consent check | Lines 419, 818, 837, 1022, 1432 | 5x |
| Compliance log mandatory | Lines 28, 52, 1506, 1517, 1475 | 5x |
| FINTRAC non-nullable | Lines 379, 1018, 1432 | 3x |
| Feature branch workflow | Lines 146-183, 1174-1179, 1421-1423 | 3x |
| Migration numbering warning (050-053) | Lines 383, 969 | 2x |
| Migration execution command | Lines 885, 989 | 2x |
| User model override | Lines 1071, 1137 | 2x |
| Trivial task model ban | Lines 1072, 1136 | 2x |
| Model selection table | Lines 1060-1066, 1130-1137 | 2x (full table) |
| Test inventory list | Lines 506-511, 1401-1408 | 2x |
| "Task not complete without log" | Lines 1509, 1517 | 2x (8 lines apart) |
| Section 10 vs Sections 3-14 | Lines 1416-1502 (86 lines) | Entire card is duplication |

**Estimated waste:** ~400 lines of pure duplication across the playbook.

---

## 3. Unenforceable Rules (17)

Rules that sound authoritative but have no mechanism to verify or enforce.

| # | Rule | Line | Why Unenforceable |
|---|------|------|-------------------|
| U1 | "Work that skips the playbook WILL be reverted" | 30 | No automated detection. 0-approval PRs mean nobody checks. |
| U2 | Classification block before any tool call | 230 | No automated gate. Agent self-reports. |
| U3 | Token budgets "enforced — not guidelines" | 1116 | Claude has no mid-conversation token counter. |
| U4 | Latency SLOs (P95 targets) | 1139 | No measurement mechanism exists. |
| U5 | Circuit breaker (3x retry limit) | 1147 | Requires agent to maintain counters. No native support. |
| U6 | Least-privilege tools per agent | 1086 | Claude Code doesn't support dynamic tool restriction. |
| U7 | Context contamination prevention | 1109 | No listing/contact-scoped context isolation exists. |
| U8 | Supervisor/Judge pattern | 1091 | No review-and-gate mechanism between sub-agents. |
| U9 | PRD Quality Rules "ZERO TOLERANCE — PRD rejected" | 780 | Rejected by whom? No automated validator. |
| U10 | Compliance log append-only | 1546 | No file-level write protection. Honor system only. |
| U11 | "3+ consecutive ❌ → mandatory process review" | 1548 | No reviewer defined. No trigger mechanism. |
| U12 | Weekly cost tracking | 1160 | No script or dashboard exists. |
| U13 | All AI API calls through wrappers | 1745 | No lint rule enforces this. |
| U14 | Quarterly PII prompt audit | 1762 | No calendar event or reminder exists. |
| U15 | No model/provider without table update | 1744 | No code-level gate. Social rule only. |
| U16 | Weekly velocity metrics from compliance log | 1560 | No script exists to extract them. |
| U17 | Agent eval gate (score ≥ 25/30 for new behaviors) | 1677 | No scoring system exists. |

---

## 4. Impractical Rules (10)

Rules that an agent will realistically skip because they add friction with no payoff.

| # | Rule | Line | Why Impractical |
|---|------|------|-----------------|
| I1 | Competitor analysis for every CODING:feature | 54-63 | Adding a contact field doesn't need competitor research. |
| I2 | "Manual walkthrough of UI changes" for 500+ lines | 454 | AI agent cannot visually verify UI unless it has browser access. |
| I3 | Pre-execution classification of EVERY bash command | 1300 | Classifying `ls` or `git status` into 4 tiers wastes tokens. |
| I4 | "git stash before each retry attempt" | 1224 | Creates orphaned stash stack. Partial changes make stash unreliable. |
| I5 | WIP.md entry before every task | 1595 | Solo dev + AI agent doesn't need a coordination board. Concurrent agents create merge conflicts on WIP.md itself. |
| I6 | Compliance log for INFO_QA tasks | 1510 | "What does this function do?" shouldn't require a compliance entry. |
| I7 | Rollback SQL before every migration | 997 | `CREATE TABLE` doesn't need rollback SQL. Rule makes sense only for destructive migrations. |
| I8 | Inter-agent message safety rules | 1102 | Describes a multi-agent framework that doesn't exist in Claude Code. |
| I9 | Onboarding "print it, keep it visible" | 78 | AI agents cannot print physical documents. |
| I10 | PRD reference at `/Users/rahulmittal/Downloads/` path | 539 | Downloads folder is ephemeral. File could be moved/deleted any time. |

---

## 5. Missing Rules (11)

Real gaps where the playbook should have guidance but doesn't.

| # | Gap | Impact |
|---|-----|--------|
| M1 | No definition of "major change" (PRD trigger threshold) | Agent doesn't know when a PRD is needed vs overkill. |
| M2 | No conflict resolution between playbook and CLAUDE.md | When they disagree (Netlify vs Vercel), no hierarchy is stated. |
| M3 | No guidance on context window limits | Large tasks hit context limits. No strategy for what to do. |
| M4 | No partial completion guidance | If agent completes 3/5 steps then hits a blocker, what to commit? |
| M5 | No playbook versioning | Can't track which version was in effect for past compliance entries. |
| M6 | No rule for when PRD vs Use-Case doc | Both cover new features. Both have problem statements and scenarios. No guidance on which to write or if both are always required. |
| M7 | No VOICE_AGENT post-task validation | Python service has no test runner in the post-task checklist. |
| M8 | No database backup before destructive migration | Rollback SQL may not be sufficient. No backup step defined. |
| M9 | No incident response for AI-specific failures | AI generates harmful content or false information — no protocol. |
| M10 | No FINTRAC 5-year retention rule | PIPEDA mentioned but FINTRAC's specific retention requirement is absent. |
| M11 | No rule about playbook size or token cost | 1,849 lines consumes significant context. No rule to keep it concise. |

---

## 6. Ambiguity (10)

Rules that could be interpreted differently each time.

| # | Rule | Line | Ambiguity |
|---|------|------|-----------|
| A1 | "major change" triggers PRD requirement | 535 | Undefined. 50-line bugfix touching 3 files? New API route? |
| A2 | "Merge your own PR" | 170 | Author merges with failing CI? 0-approval means no check. |
| A3 | "logic change" in trivial definition | 267 | Changing `false` to `true` — logic change or config flip? |
| A4 | "Auto-downgrade one tier" at 80% budget | 1135 | Downgrade mid-task? What about context that exceeds Haiku's window? |
| A5 | "tasks are independent (no shared files)" | 1079 | Two agents touch different files but same DB table. Independent? |
| A6 | Circuit breaker overlap: 3x tool fail vs 10 iterations | 1147-1156 | Tool fails 3x at iteration 3. Which rule triggers? |
| A7 | "Deploy agents using model chaining" | 321 | Mechanism never specified. Sub-agents? Separate sessions? |
| A8 | "Maximum 5 parallel agents" | 1079 | What is a "parallel agent"? Sub-agent tool? Separate terminal? |
| A9 | Existing file references in ORCHESTRATION Phase 1 | 806 | 5 files listed. If renamed/moved, instruction silently wrong. |
| A10 | "Anonymized IDs" for contact data | 1751 | No anonymization system exists. What IDs to use? |

---

## 7. Context Bloat (~500+ lines)

Sections that consume tokens on every agent load with minimal value for most tasks.

| # | Section | Lines | Tokens (est.) | Why Bloat |
|---|---------|-------|---------------|-----------|
| B1 | PRD template (4.4) | 533-791 (258 lines) | ~3,000 | Only relevant for DESIGN_SPEC. Loaded on every task. Should be a separate referenced file. |
| B2 | Quick Reference Card (10) | 1416-1502 (86 lines) | ~1,000 | 100% duplication of Sections 3-14. |
| B3 | Agent Eval & Safety (13) | 1610-1728 (118 lines) | ~1,400 | Describes systems that don't exist (golden tasks, safety suite). |
| B4 | AI Governance (14) | 1730-1849 (119 lines) | ~1,400 | ~60% aspirational (telemetry, sunset, quarterly audits). |
| B5 | Velocity metrics | 1560-1572 (12 lines) | ~150 | No automation exists to calculate them. |
| B6 | "Why Not GitHub Issues?" | 1599-1607 (8 lines) | ~100 | Rationale, not operational rule. |
| B7 | "Target architecture (future)" | 1314-1318 (4 lines) | ~50 | "Zero-cost to document" is false — costs tokens every load. |
| B8 | Voice agent curl examples | 950-957 (7 lines) | ~100 | Reference material, not execution rule. |
| B9 | Feature sunset process | 1830-1849 (19 lines) | ~230 | Depends on systems that don't exist. |
| B10 | Rubber-stamp approval UX | 1789-1793 (4 lines) | ~50 | Product design note, not agent rule. |
| B11 | Use-case documentation template (4.15) | 1031-1054 (23 lines) | ~280 | Document template. Should be a separate file. |
| B12 | Multi-agent orchestration safety | 1085-1112 (27 lines) | ~330 | Describes capabilities that don't exist in Claude Code. |
| B13 | Compliance log rotation | 1555-1558 (3 lines) | ~40 | Archive directory doesn't exist. Process never executed. |

**Total estimated bloat: ~500+ lines, ~7,000+ tokens per agent load.**

---

## 8. Aspirational vs Actual (10)

Things described as rules/systems but which don't exist in the codebase.

| # | Claim | Line | Reality |
|---|-------|------|---------|
| AS1 | Golden task set at `tests/agent-evals/golden-tasks.md` | 1653 | Directory does not exist. |
| AS2 | Safety eval suite at `tests/agent-evals/safety-tests.md` | 1682 | Directory does not exist. |
| AS3 | Eval-driven development | 1615 | No eval has been written before a feature (per compliance log). |
| AS4 | Release gating via eval suite | 1711 | Playbook edits merged without any eval run. |
| AS5 | Structured telemetry fields | 1810 | Compliance log Notes is freeform text, not structured. |
| AS6 | Token budget enforcement | 1116 | No measurement mechanism exists. |
| AS7 | Compliance log rotation to archive | 1555 | Archive directory doesn't exist. No rotation has occurred. |
| AS8 | WIP board in active use | 1577 | WIP.md is empty — no entries despite multiple tasks completed. |
| AS9 | Groq integration | 1739 | Listed as approved provider but no code exists. |
| AS10 | Feature sunset triggers (golden task score, token cost) | 1835 | Depends on systems that aren't built. |

---

## Recommendations (Priority Order)

### P-CRITICAL — Fix the Fatal Flaw

**0. Replace the one-size-fits-all 36-step ceremony with proportional process tiers.**

| Tier | Trigger | Steps Before Coding | Steps After Coding |
|------|---------|--------------------|--------------------|
| **Micro** | ≤20 lines, 1-2 files, no schema change | Classify → Code | tsc → Commit |
| **Small** | 20-100 lines, 2-5 files, no new tables | Classify → Scope (1 paragraph) → Code | tsc → Test → Commit |
| **Medium** | 100-500 lines, 5-15 files, may have migration | Classify → Scope → Plan → Code | tsc → test-suite.sh → Docs → Commit → Compliance log |
| **Large** | 500+ lines, 15+ files, new tables/subsystem | PRD → Classify → Scope → Plan → Code | tsc → test-suite.sh → Docs → Commit → Compliance log |

This means:
- A CSS fix goes through **2 steps**, not 36
- A new API route goes through **5 steps**, not 36
- A new feature page goes through **8 steps**, not 36
- Only full subsystems get the full ceremony

The trivial fast path (Section 3.2) tries to do this but its threshold (≤3 lines, single file, no logic change) is too strict — almost nothing qualifies. The tiers above cover the real distribution of tasks.

### P0 — Fix Now (Blocking Agent Effectiveness)

1. **Shrink the playbook to ≤500 lines.** The current 1,849 lines consume ~22,000 tokens. Target: ≤6,000 tokens. Achieved by:
   - Extract PRD template to `docs/templates/PRD_TEMPLATE.md` (saves 258 lines)
   - Delete Section 10 Quick Reference Card or reduce to 5 items (saves 86 lines)
   - Move Sections 13-14 aspirational content to `docs/ROADMAP_Agent_Infrastructure.md` (saves ~300 lines)
   - Deduplicate all rules — each stated once (saves ~200 lines)
   - Remove use-case template inline (saves 23 lines)
   - Remove curl examples, rationale paragraphs, future architecture (saves ~50 lines)
2. **Allow Read/Grep/Glob before classification.** Only block mutations (Edit/Write/Bash). Fix line 230.
3. **Resolve the 8 contradictions** — especially C1 (no exceptions vs fast path), C4 (refuse vs comply-and-log), C7 (read before classify).
4. **Define "major change"** with a concrete threshold: new DB table OR new page route OR new subsystem (3+ new files in a new directory) = major → PRD required. Everything else = not major.
5. **State CLAUDE.md vs playbook hierarchy.** "CLAUDE.md = project facts. Playbook = process rules. On conflict, playbook wins for process, CLAUDE.md wins for tech details."
6. **Fix "git push dev" in Quick Reference** to "git push origin <branch>".

### P1 — Fix Soon (Reducing Noise)

7. **Exempt Micro and INFO_QA from compliance logging.** Only Small+ tasks need audit trail.
8. **Remove WIP.md requirement** until team is 3+ developers. Currently solo dev + AI — it's pure overhead.
9. **Remove aspirational enforcement language** from rules that have no mechanism: token budgets, latency SLOs, circuit breakers, least-privilege tools. Keep them as guidelines, not "BLOCKING" rules.
10. **Collapse 14 task types to 6:** CODING, TESTING, DESIGN, DEPLOY, INFO, VOICE_AGENT. Subtypes handle the rest (DEBUGGING → CODING:bugfix, DATA_MIGRATION → CODING:migration, etc.).

### P2 — Fix Later (Nice to Have)

11. **Add a worked example** — one real task (e.g., "add lead_source to contacts") showing the full flow at each tier.
12. **Version the playbook** — add `v5.0` and a changelog at the top.
13. **Create 5 golden tasks** — make Section 13 real instead of aspirational.
14. **Build compliance log automation** — a hook that auto-appends an entry when a commit is made on a feature branch.
15. **Add context window strategy** — what to do when a large task exceeds context limits.

---

*Analysis completed 2026-03-29. 67 issues identified across 1,849 lines.*
