<!-- docs-audit-reviewed: 2026-04-22 -->
<!-- docs-audit: src/app/api/, supabase/migrations/, src/actions/, docs/FEATURE_FLAGS.md -->
# Deprecation Process — Realtors360

> How to safely retire API endpoints, DB columns, features, and config flags without
> breaking realtors' workflows or losing data. Last updated: 2026-04-21.

---

## Why This Doc Exists

Realtors360 has 163 DB tables, 19 active agent tools, 12 crons, and multiple API routes built across dozens of sprints. As the platform matures, old patterns get superseded. This doc defines the controlled process to retire them.

**Golden rule:** Never remove something that is in active use. Always measure first.

---

## Type 1 — API Endpoint Deprecation

**Example:** `/api/contacts/log-interaction` was an early REST endpoint superseded by the `logInteraction` server action in `src/actions/contacts.ts`.

### Process

**Step 1 — Add deprecation header (Day 0)**
```typescript
// In the old API route handler:
response.headers.set('Deprecation', 'true');
response.headers.set('Sunset', new Date(Date.now() + 90 * 86400000).toUTCString());
response.headers.set('Link', '</actions/contacts.ts>; rel="successor-version"');
```

**Step 2 — Log usage for 30 days**
Add a Supabase insert to an `api_deprecation_log` table (or use existing `activity_log`) on each call. If zero calls in 30 days, safe to remove. If calls exist, find the caller and migrate it.

**Step 3 — Console warning (Day 30)**
Add `console.warn('[DEPRECATED] /api/contacts/log-interaction — use logInteraction server action. Removing 2026-07-01.')` to the route handler.

**Step 4 — Remove (Day 90)**
Delete the route file. Add migration note in `supabase/migrations/` if any DB-side trigger pointed to it. Create a GitHub Issue with label `deprecation-complete`.

**Revert plan:** Git revert the route deletion commit. No DB changes needed for pure endpoint removal.

---

## Type 2 — DB Column Sunset

**Example:** `contacts.lifecycle_stage` (string column, freeform text) is superseded by the `contact_journeys` table which provides structured journey phases with FK integrity.

### Process

**Step 1 — Add new column / table (Day 0)**
Write and apply a migration that adds the replacement. Ensure the new structure is in use by all server actions before proceeding.

**Step 2 — Dual-write period (Days 0–30)**
Server actions write to BOTH old column and new structure. This ensures no data loss if rollback is needed.
```typescript
// In contacts.ts updateContact:
await supabase.from('contacts').update({
  lifecycle_stage: newStage,          // OLD — still writing
  // New structure handled by contact_journeys table separately
});
```

**Step 3 — Verify data parity (Day 30)**
Run SQL to confirm all records with a value in the old column also have a corresponding record in the new structure:
```sql
SELECT COUNT(*) FROM contacts
WHERE lifecycle_stage IS NOT NULL
AND id NOT IN (SELECT contact_id FROM contact_journeys);
-- Must return 0 before proceeding
```

**Step 4 — Stop writing to old column (Day 30)**
Remove old-column writes from all server actions. RLS policies still protect it. Monitor for any errors.

**Step 5 — Drop old column (Day 60)**
```sql
-- Migration NNN_drop_contacts_lifecycle_stage.sql
ALTER TABLE contacts DROP COLUMN IF EXISTS lifecycle_stage;
```

Apply via Supabase SQL editor. Update `src/types/database.ts` to remove the column type.

**Revert plan:** Dual-write period exists specifically to enable safe revert. During Days 0–30, reverting means: stop writing to new structure, keep reading old column, drop new migration. After Day 60, revert requires data restore from backup — treat as DR event.

---

## Type 3 — Feature Removal

**Example:** The voice agent (`realtors360-agent/voice/`) was built in Sprint 6 but has zero usage after 90 days. It adds 3 crons and consumes Render resources.

### Process

**Step 1 — Disable via feature flag (Day 0)**
If the feature has a flag (e.g., `FLAG_VOICE_AGENT`), set it to `off` in Render/Vercel env vars. The feature is now hidden from UI but code still exists.

**Step 2 — Monitor for complaints (Days 0–30)**
Watch GitHub Issues and any support channels. If zero complaints in 30 days, proceed.

**Step 3 — Remove UI entry points (Day 30)**
Remove sidebar nav links, page routes, and any dashboard widgets. The underlying code remains but is unreachable.

**Step 4 — Remove code (Day 90)**
Delete the feature directory, associated server actions, API routes, and cron registrations. Update `CLAUDE.md` Project Structure section.

**Step 5 — Drop DB tables (Day 90 + 30 buffer)**
Only drop DB tables after code is removed AND after confirming the tables have no FK references from active tables. Write a migration:
```sql
-- Migration NNN_drop_voice_agent_tables.sql
-- Prerequisite: voice agent code removed in PR #NNN
DROP TABLE IF EXISTS voice_sessions CASCADE;
DROP TABLE IF EXISTS voice_transcripts CASCADE;
```

**Revert plan:** Re-enable feature flag first. If code was deleted, restore from git history via `git show <commit>:<path>`. If DB tables were dropped, restore from Supabase point-in-time backup.

---

## Type 4 — Config Flag Removal

**Example:** `FLAG_PROCESS_WORKFLOWS=on` on Render. This flag was introduced to gate the newsletter workflow processing cron. Once stable and permanently enabled, the flag itself can be removed to simplify the codebase.

### Process

See `docs/FEATURE_FLAGS.md` for the full flag lifecycle. Summary for flag removal:

**Step 1 — Confirm flag is permanently `on` in all environments** (never toggled off in 60+ days)

**Step 2 — Inline the behavior**
Replace all `if (process.env.FLAG_PROCESS_WORKFLOWS === 'on')` checks with unconditional code. The cron now always runs.

**Step 3 — Remove env var from Render dashboard**
Document in PR: "Removed FLAG_PROCESS_WORKFLOWS — behavior is now unconditional."

**Step 4 — Update `docs/ENVIRONMENTS.md`** to remove the flag from the critical rules section.

**Revert plan:** Add the flag back to Render env vars and redeploy. The code still has the if-check until merged, so rollback is clean.

---

## Communication Requirements

| Change Type | Notify Who | How |
|------------|-----------|-----|
| API endpoint removal | Internal developers | PR description + compliance-log.md entry |
| DB column removal | Internal developers | Migration file comment + PR description |
| User-facing feature removal | Realtors (if they used it) | In-app notification via `notifications` table, 30 days before removal |
| Config flag removal | Internal developers | PR description |

For any change affecting FINTRAC, CASL, or PIPEDA compliance features: notify legal counsel before starting the deprecation process.

---

## Deprecation Log

Maintain a running table in this doc of all active and completed deprecations:

| Item | Type | Started | Target Removal | Status |
|------|------|---------|---------------|--------|
| `contacts.lifecycle_stage` | DB column | — | Pending Phase B | Not started |
| `/api/contacts/log-interaction` | API endpoint | — | Pending audit | Not started |
| `FLAG_PROCESS_WORKFLOWS` | Config flag | — | After 60-day stability | Not started |

Add a row here when starting any deprecation. Update status as it progresses.

<!-- Last reviewed: 2026-04-21 — team WIP session artifacts -->
