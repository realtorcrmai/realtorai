<!-- docs-audit-reviewed: 2026-04-25 --paragon-pdf-import -->
<!-- docs-audit: docs/pendingwork.md, docs/MASTER_IMPLEMENTATION_PLAN.md, docs/GTM_Strategy_Realtors360.md -->
# Product Decision Process — Realtors360

> Adds structure to feature decisions without bureaucracy. Designed for a 1-person team,
> scales to 5. Current state: solo developer making all calls. This doc codifies that.
> Last updated: 2026-04-21.

---

## Decision Principles

1. **Regulatory first.** PIPEDA, CASL, FINTRAC features are always Must-Have. They block launch. Non-negotiable.
2. **User pain over feature ideas.** A bug reported by a paying realtor outranks a cool feature idea.
3. **Build for 80%.** Realtors360 serves BC residential realtors. Optimize for that persona, not edge cases.
4. **No gold-plating.** Ship working software quickly, then iterate. A passing build beats a perfect design doc.

---

## Who Decides What

| Decision Type | Owner | Approval Required |
|--------------|-------|-------------------|
| Feature prioritization | Product owner (Rahul) | None — single owner |
| Architecture choices | Tech lead (Rahul) | None at team ≤ 2 |
| Regulatory / compliance features | Compliance officer (Rahul / legal counsel) | Legal review for FINTRAC changes |
| DB schema changes | Tech lead | Review migration in `docs/PENDING_MIGRATIONS.md` |
| Third-party integrations (new APIs) | Product owner | Cost + security review |
| Feature removal / deprecation | Product owner | See `docs/DEPRECATION_PROCESS.md` |

When team grows to 3+: product owner retains final say on roadmap. Tech lead has veto on architecture. Regulatory decisions escalate to legal counsel if material.

---

## Priority Scoring Formula

For any feature request, compute:

```
Priority Score = (Impact × 3) + (Urgency × 2) - (Effort × 1) - (Risk × 2)
```

| Dimension | 1 | 2 | 3 |
|-----------|---|---|---|
| **Impact** | Affects <10% of realtors | Affects 10–50% | Affects >50% or core workflow |
| **Urgency** | Nice-to-have | User-reported pain | Blocking launch or compliance |
| **Effort** | >5 dev days | 2–5 dev days | <2 dev days |
| **Risk** | Touches RLS/auth/billing/compliance | Touches multi-tenant data | UI-only, no DB changes |

Score ≥ 7: Do this sprint. Score 4–6: Backlog (next quarter). Score <4: Reject or park indefinitely.

Regulatory features bypass the formula — they are automatically priority regardless of score.

---

## Feature Request Intake

All feature ideas enter via GitHub Issues. Required labels:

| Label | Meaning |
|-------|---------|
| `enhancement` | New capability |
| `bug` | Something broken |
| `compliance` | PIPEDA / CASL / FINTRAC requirement |
| `tech-debt` | Refactor, cleanup, performance |
| `p0` / `p1` / `p2` | Severity (bugs) or urgency (features) |

Issue template minimum: what problem does it solve, which realtors are affected, estimated impact on North Star metric (active listings managed per month).

---

## Prioritization Method: MoSCoW

Applied quarterly during roadmap review. Categories:

**Must-Have (M):** Non-negotiable for the current quarter. Includes all compliance features, launch blockers, and user-reported bugs with workarounds that realtors are actively hitting.

**Should-Have (S):** High priority but not blocking. Scheduled for the quarter unless Must-Haves take longer than expected.

**Could-Have (C):** Valuable but deferrable. Enters backlog. Reassessed next quarter.

**Won't-Have (W):** Explicitly rejected for this quarter. Documented so it doesn't resurface.

---

## Current Roadmap Phases (as of 2026-04-21)

| Phase | Name | Status |
|-------|------|--------|
| A (Sprints 0–9) | Email AI Engine | COMPLETE |
| B (Sprints 11–15) | Business Operations Brain | NOT STARTED |
| C (Sprint 10) | Demo Seed Data + Sales Presentation | NOT STARTED |
| D (Sprints 20–25) | Website Integration Platform | MOSTLY BUILT (Sprint 23–25 partial) |
| E (Future) | Home Services Marketplace | NOT STARTED |
| F (Future) | Social Media Content Studio | NOT STARTED |

Phase B Must-Haves before any customer launch: multi-tenancy hardening (complete), server-side pagination, team management, and offer management stub.

---

## Decision Records (ADR)

When a significant feature is built, deferred, or explicitly rejected, write an Architecture Decision Record in `docs/adr/`. File naming: `ADR-NNN-short-title.md`.

ADR format:
```
# ADR-NNN: Short Title
Date: YYYY-MM-DD
Status: Accepted | Rejected | Superseded
Context: What problem / decision was faced
Decision: What was chosen
Rationale: Why — trade-offs considered
Consequences: What changes as a result
```

Examples of decisions that require an ADR:
- Choosing Resend over SendGrid for email delivery
- Deferring Paragon API integration (Phase 8 manual)
- Removing voice agent after 90-day non-use
- Adopting React Hook Form + Zod v4 over Formik

The `docs/adr/` directory does not exist yet — create it when writing the first ADR.

---

## Review Cadence

**Monthly roadmap review (1st Monday of month):**
- Review GitHub Issues opened since last review
- Apply priority scoring to new requests
- Confirm Must-Haves are on track
- Update `docs/pendingwork.md` status

**Quarterly priority reassessment (first week of each quarter):**
- Re-run MoSCoW across full backlog
- Retire Won't-Haves that haven't been revisited in 2+ quarters
- Update this document if process itself needs adjustment

**Ad-hoc (any time):**
- Compliance change: BCREA, FINTRAC, CASL rule changes trigger immediate reassessment
- Major bug: P0 bypasses all queues, goes straight to current sprint

---

## Conflict Resolution Priority Order

When two items compete for the same sprint slot:

1. Regulatory compliance (PIPEDA, FINTRAC, CASL)
2. User-reported bugs (paying realtors blocked)
3. Business metrics impact (North Star: active listings per month)
4. Developer-reported tech debt (stability, security)
5. Feature requests (backlog)

If two items are the same type, use the priority score formula above.
