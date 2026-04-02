---
paths:
  - "src/**/listings/**"
  - "src/actions/listings.ts"
  - "src/actions/workflow.ts"
  - "src/components/workflow/**"
---

# Domain Rules: Listings & Workflow

## Listings
- `current_phase`: integer 1-8, never 0 or 9+. Advancement is sequential — never skip phases.
- `forms_status`: JSONB with keys matching BCREA form codes (DORTS, MLC, PDS, etc.)
- `list_price`: numeric, never store as string
- Kling AI: async — use `useKlingTask` hook, store `task_id` in `media_assets` with `status: 'pending'`

## Workflow (8-Phase Listing Lifecycle)
- Phases advance sequentially: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8. Never skip.
- Phase advancement logic: `src/actions/workflow.ts`
- Phase UI components: `src/components/workflow/Phase[1-8]*.tsx`
- Each advancement logs to audit trail
- Parent listing status NEVER "complete" if any child subtask is incomplete
- Data enrichment (Phase 2) uses external APIs (BC Geocoder, ParcelMap) — handle timeouts gracefully
- **Multi-tenant:** Always use `getAuthenticatedTenantClient()` — never raw admin client (HC-12)
