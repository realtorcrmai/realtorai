# DESIGN_SPEC Playbook

> Task type: `DESIGN_SPEC:architecture`, `DESIGN_SPEC:feature`, `DESIGN_SPEC:api`, `DESIGN_SPEC:migration`

---

**Output:** A Detailed Design Document at `docs/designs/<feature-name>.md` using `.claude/templates/detailed-design.md`.

## Phase 0 — Feature Justification

- Describe existing behavior and related components. Extension or new capability?
- Answer: What problem does this solve for BC realtors? What measurable benefit?
- Compare against 2-3 reference products (Follow Up Boss, LionDesk, kvCORE, Realvolve):
  - What do they do here? Are we copying, differentiating, or staying simpler?
  - What's our unique angle? (BC compliance, voice agent, AI content)
- Conclude: "Does this fit ListingFlow's vision?" If unclear → ask the product owner.
- Document in `usecases/<feature-name>.md` with problem statement + 3 scenarios + demo script

## Phase 1 — Goals & Constraints

Goals, non-goals, constraints, success metrics, dependencies

## Phase 2 — Current State Audit

What exists that we can reuse?

## Phase 3 — Design Options

2+ options with pros/cons/risks

## Phase 4 — Detailed Design

Complete ALL 10 sections of the Detailed Design Document template:
1. Feature overview
2. Users & roles
3. User journeys (happy, alternate, failure, retry, abandon)
4. UI specification (every screen, every state)
5. Data & backend (entities, fields, validation, errors)
6. Business rules
7. Content requirements (exact copy, not placeholders)
8. Edge cases
9. Acceptance criteria (GIVEN/WHEN/THEN)
10. Traceability (design → implementation → test)

**Definition of detailed:** A reviewer can implement the full feature without making material assumptions.

## Phase 5 — Operational

Deployment plan, monitoring, failure modes, cost

## Phase 6 — Implementation Plan

Phases, files per phase, test plan
