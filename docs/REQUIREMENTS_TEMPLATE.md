<!-- docs-audit: created 2026-04-21 -->
# Requirements Template — Medium Tier Features

**Scope:** Lightweight requirements format for medium-tier features on Realtors360.
**Context:** The agent-playbook.md PRD template (10 sections) is sized for large-tier work. Medium-tier features (estimated 2–5 days, 1–3 files changed) need a leaner contract that still enforces testable acceptance criteria and scope control.

---

## 1. When to Use This Template

| Tier | Lines Changed (est.) | Use |
|------|---------------------|-----|
| Small (bug fix, copy change) | <50 | No requirements doc — just describe in PR |
| **Medium (this template)** | **50–300** | **`usecases/<slug>.md` using this template** |
| Large (new module, multi-table) | 300+ | Full PRD in `docs/functional-specs/` + discovery doc |

File location: `docs/usecases/<slug>.md`
Linked from: PR description, compliance log entry, and the feature branch commit message.

---

## 2. Template

```markdown
# Requirements: <Feature Name>

**Date:** YYYY-MM-DD
**Author:** <developer or PM>
**Branch:** <feature branch name>
**Tier:** medium
**Status:** draft | approved | implemented

---

## Problem
<1 paragraph. What can't a user do today, and what is the cost of that gap?>

## Users
<Who triggers this feature and who is affected?>
- **Primary:** <persona name> — <what they do>
- **Secondary (if any):** <persona> — <how they're affected>

## Acceptance Criteria
Each criterion must be independently testable (true/false).

- [ ] AC-1: <specific, observable behavior>
- [ ] AC-2: <specific, observable behavior>
- [ ] AC-3: <specific, observable behavior>
- [ ] AC-4 (optional): <edge case or error condition>
- [ ] AC-5 (optional): <performance or accessibility criterion>

## Scope
**In scope:**
- <explicit list of what will be built>

**Out of scope (explicitly excluded):**
- <things that might seem related but are not included>

## Dependencies
- <other features, migrations, or third-party services this depends on>
- Migration number if DB change required: migration `NNN_<name>.sql`

## Test Scenarios
Reference: `docs/tests/<slug>.md` (create alongside this doc)
- Happy path: <1 sentence>
- Edge case: <1 sentence>
- Error condition: <1 sentence>

## Success Metric
How will we know this is working in production?
<1 measurable statement — e.g. "Zero support tickets about X in 30 days post-deploy.">
```

---

## 3. Filled Example: Server-Side Pagination on Contacts Page

**File:** `docs/usecases/contacts-server-side-pagination.md`

---

### Requirements: Server-Side Pagination on Contacts Page

**Date:** 2026-04-21
**Author:** claude/team-management (AI agent)
**Branch:** claude/contacts-pagination
**Tier:** medium
**Status:** draft

---

### Problem
The `/contacts` page uses a client-side 200-item hard cap (`src/app/api/contacts/route.ts` returns `limit(200)`). Agents with large books of business (some BC realtors maintain 500–1,000+ contacts) silently miss contacts beyond the 200th row. There is no pagination UI and no indication that results are truncated. This is a data visibility gap that erodes trust in the CRM as a source of truth.

### Users
- **Primary:** Solo Agent (Sarah) and Team Lead (Marcus) — any agent with >200 contacts who needs to browse their full client list.
- **Secondary:** Brokerage Admin (Karen) — cannot run accurate compliance reports if contacts are silently capped.

### Acceptance Criteria
- [ ] AC-1: The contacts API (`/api/contacts`) accepts `page` (integer, default 1) and `pageSize` (integer, default 50, max 200) query parameters and returns the correct slice of results ordered by `created_at DESC`.
- [ ] AC-2: The API response includes a `total` field (total matching rows respecting `realtor_id` RLS and any active `?search=` filter) alongside the paginated `data` array.
- [ ] AC-3: The `ContactsTableClient` component renders a pagination control (Previous / Next / page indicator) that is keyboard-accessible and matches the `DataTable` component pattern.
- [ ] AC-4: Searching via the existing `?search=` param resets to page 1 and correctly paginates filtered results.
- [ ] AC-5: A realtor with 201+ contacts can navigate to page 2 and see contacts not previously visible. No contacts are duplicated or omitted across pages.

### Scope
**In scope:**
- Supabase query change in `src/app/api/contacts/route.ts`: replace `limit(200)` with range-based pagination using `.range(from, to)`.
- Pagination UI in `src/components/contacts/ContactsTableClient.tsx`.
- `total` count query using `.count()` with same filters.

**Out of scope:**
- Bulk export (separate feature; tracked in `discovery/bulk-contact-export.md`).
- Server-side pagination on listings, showings, or newsletters pages (separate tasks).
- Infinite scroll (pagination controls chosen for accessibility and predictability).

### Dependencies
- No new migrations required — this is a query-layer change only.
- Must not break the existing `?search=` sanitization (quote-stripping) added in commit `b921169`.
- `DataTable` component (`src/components/ui/data-table.tsx`) already accepts a `pagination` prop — use it.

### Test Scenarios
Reference: `docs/tests/contacts-server-side-pagination.md`
- Happy path: Agent with 250 contacts loads page 1 (50 rows), navigates to page 2 (50 rows), page 3 (50 rows), page 5 (50 rows).
- Edge case: Agent with exactly 200 contacts — page 2 returns empty, pagination shows "Page 1 of 4" then correctly "Page 4 of 4" as last.
- Error condition: `page=-1` or `pageSize=0` returns 400 with descriptive error; does not crash.
- Search + paginate: searching "Chen" filters to matching contacts, pagination reflects filtered total.

### Success Metric
Zero support tickets about missing/truncated contacts within 60 days of deploy. `/api/contacts` p95 response time remains under 400ms at 1,000 contacts (validate via Supabase query planner with `EXPLAIN ANALYZE`).

---

## 4. How This Connects to Playbook Gates

1. Discovery (if required) → `docs/discovery/<slug>.md`
2. **This requirements doc** → `docs/usecases/<slug>.md` (created before coding starts)
3. Test scenarios → `docs/tests/<slug>.md` (created alongside requirements)
4. Code → feature branch
5. Navigation test → add route to `scripts/test-suite.sh` if new page
6. Compliance log → append to `.claude/compliance-log.md`
7. PR description links this file and lists ACs with pass/fail status

The requirements doc is the contract. If a PR's diff satisfies all ACs, it ships. If any AC fails, the PR does not merge.
