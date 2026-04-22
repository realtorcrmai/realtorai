# GAP_ANALYSIS Procedure

> Extracted from task-playbooks.md. See AGENTS.md for policy rules.

**Classification:** `Type: GAP_ANALYSIS` | Tier: typically Medium or Large

**Mandatory process:**
1. Read actual source code for every feature being assessed — NOT previous reports, docs, or summaries (HC-13)
2. For each feature: verify imports, exports, rendering, DB wiring, and integration
3. "Code written" != "Feature works" — check that components are rendered in pages, actions are called from components, migrations are applied
4. Save as versioned file: `docs/gap-analysis/<area>/v<N>_<date>.md`
5. Follow the 7-pass process (see design-spec.md)

**Versioned gap document (single source of truth per area):**
- ONE gap document per area (e.g., `docs/gap-analysis/rag-voice-agent/`)
- Each sprint → new version (v1→v2→v3) with: changelog (PR#s), scorecard, open/closed gaps
- Keep old versions for history. **Update gap doc after every sprint, before starting next**

**Verification checklist per feature:**
- [ ] Page renders feature? Server action does real CRUD? API handles auth/validation?
- [ ] Migration applied with correct columns? Component imported and rendered?
- [ ] Data flows end-to-end (page → component → action → DB → back)?

**Output format:**
```markdown
| Feature | Completeness | Production Ready | Evidence (file:line) | Critical Gap |
```

**Auditor philosophy:**
Think like a professional auditor. For each section use industry frameworks: SWOT, COBIT, CMMI, MoSCoW, RACI.

Every gap must have: evidence (file:line or command output), framework classification, priority, and implementation approach with effort estimate.

**Depth rule: No surface-level analysis.** Every finding must go deep — not just "what" but "why" and "what's the root cause." A gap analysis that just lists problems without explaining their cause is useless.
