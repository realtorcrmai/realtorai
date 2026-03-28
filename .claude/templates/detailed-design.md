# Detailed Design Document Template

> **Definition of Detailed:** A document is considered detailed only if a reviewer can implement the full feature — including UI, behavior, validations, content, states, and tests — without making material assumptions.

Save as: `docs/designs/<feature-name>.md`

---

## 1. Feature Overview

- **Feature name:**
- **Business problem:** (what user pain does this solve?)
- **Goal:** (measurable outcome)
- **Success criteria:** (how do we know it worked?)
- **In scope:**
- **Out of scope:**
- **Dependencies:** (other features, APIs, tables, services)

## 2. Users & Roles

- **Primary users:**
- **Secondary users:**
- **Role-based differences:** (what does each role see/do differently?)
- **Permission rules:** (who can create/read/update/delete?)
- **Visibility rules:** (what data is hidden from which roles?)

## 3. User Journeys

For each journey, define:

### Journey: [Name]
- **Actor:**
- **Preconditions:** (user state, data state)
- **Happy path:** (numbered steps: user does X → system does Y → user sees Z)
- **Alternate paths:** (e.g., user cancels mid-way, user edits after saving)
- **Failure paths:** (API fails, validation fails, permission denied)
- **Retry paths:** (what happens if user retries after failure?)
- **Exit/abandon:** (what state is the system left in if user leaves mid-flow?)

Minimum: 3 journeys (happy + 2 alternate/failure).

## 4. UI Specification

For each screen/route:

### Screen: [Route path]
- **Layout:** (sections, columns, cards, tabs, accordions, modals, drawers)
- **Components:** (list each with its purpose and behavior)
- **Buttons & actions:** (what each does, where it navigates, what state it changes)
- **Labels & helper text:** (exact copy, not "add appropriate label")
- **States:**
  - Empty state (no data yet)
  - Loading state (data being fetched)
  - Success state (action completed)
  - Error state (action failed — what message, what recovery options)
  - Partial state (some data loaded, some failed)
- **Mobile behavior:** (responsive changes, hidden elements, bottom sheets)

**No placeholders allowed.** If exact copy is not known, write realistic draft copy that reflects actual product behavior. "Coming soon" and "Content goes here" are prohibited.

## 5. Data & Backend

- **Entities/tables used:** (existing + new)
- **New fields:** (name, type, nullable, default, constraints)
- **Validation rules:** (per field — min/max, format, uniqueness, cross-field)
- **Save behavior:** (what happens on create/update — which tables, in what order)
- **Delete behavior:** (cascade? soft delete? archive?)
- **Error handling:** (per operation — what errors, what user sees, what is logged)
- **API routes:** (method, path, request schema, response schema, auth required)
- **Events/logging:** (what gets logged to `communications`, `agent_decisions`, etc.)

## 6. Business Rules

- **Role restrictions:** (who can do what — be explicit)
- **Ordering constraints:** (must step A complete before step B?)
- **Dependencies:** (does feature X require feature Y to exist?)
- **Region/compliance rules:** (FINTRAC, CASL, PIPEDA implications)
- **Exceptions & overrides:** (when can rules be bypassed, by whom?)

## 7. Content Requirements

- **Exact copy:** (headlines, descriptions, CTAs, confirmation messages)
- **Help/tooltips:** (what each one says — not "add tooltip")
- **Tour steps:** (if onboarding flow — each step's title, body, target element, intent)
- **FAQ content:** (actual questions and answers — not "add FAQ section")
- **Error messages:** (per error condition — not "show error")
- **Empty state messages:** (per screen — what to show and what action to offer)

**Rule:** Every content slot must have draft copy. If product-owner review is needed, mark as `[DRAFT — needs review]` but still write realistic content.

## 8. Edge Cases

For each, state: what triggers it, expected behavior, and how the UI communicates it.

- Missing data (required field absent, FK target deleted)
- Duplicate actions (user clicks submit twice)
- Network failure (mid-save, mid-load)
- Partial completion (3 of 5 steps done, user leaves)
- Invalid input (type mismatch, exceeds max, SQL injection attempt)
- Permission denial (user tries action they can't do)
- Stale state (data changed by another user while viewing)
- Component missing (referenced UI element doesn't exist yet)
- Unsupported combinations (feature flag off, missing integration)

## 9. Acceptance Criteria

Scenario-based, testable, measurable. Format:

```
GIVEN [precondition]
WHEN [action]
THEN [observable outcome]
```

Minimum: 1 acceptance criterion per user journey + 1 per edge case.

## 10. Traceability

| Design Section | Implementation Task | Test Case |
|---------------|-------------------|-----------|
| Journey: Happy path | `src/app/(dashboard)/feature/page.tsx` | `tests/feature.md` — TC-001 |
| Edge: Network failure | `src/actions/feature.ts` error handling | `tests/feature.md` — TC-012 |
| UI: Empty state | `src/components/feature/EmptyState.tsx` | `tests/feature.md` — TC-008 |

Every design section must map to at least one implementation task and one test case.
