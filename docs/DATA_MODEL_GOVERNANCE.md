<!-- docs-audit: created 2026-04-21 -->
# Data Model Governance — Realtors360

**Scope:** Schema design standards, change process, and entity relationships for the Realtors360 Supabase PostgreSQL database.
**Current state:** 163 tables, 156 migration files (001–144 applied; see `docs/ENVIRONMENTS.md`). No ERD exists as of 2026-04-21. This document is the authoritative reference until a generated ERD is produced.

---

## 1. Core Entity Relationships

```
users (realtor_id)
  ├── contacts (realtor_id FK → users.id)
  │     ├── communications (contact_id FK)
  │     ├── contact_journeys (contact_id FK)
  │     └── newsletter_intelligence (JSONB on contacts)
  ├── listings (realtor_id FK → users.id)
  │     ├── appointments / showings (listing_id FK)
  │     ├── listing_documents (listing_id FK)
  │     ├── listing_enrichment (listing_id FK, 1:1)
  │     ├── seller_identities / FINTRAC (listing_id FK)
  │     ├── prompts (listing_id FK)
  │     └── media_assets (listing_id FK)
  ├── notifications (realtor_id FK)
  ├── newsletters (realtor_id FK)
  │     └── newsletter_events (newsletter_id FK)
  ├── tasks (realtor_id FK)
  │     ├── task_comments (task_id FK)
  │     └── subtasks (parent_task_id FK → tasks.id)
  └── team_members (realtor_id FK, many-to-many via team_invites)

-- Global tables (no realtor_id, shared across tenants):
google_tokens, newsletter_templates, workflow_blueprints, knowledge_articles
```

**Key FK rules:**
- `contacts.seller_id` → a contact can be the seller on many listings (`listings.seller_id FK → contacts.id`)
- `appointments.listing_id` FK → listings; soft-delete pattern: use `status = 'cancelled'` not hard delete
- `communications.contact_id` FK → contacts; `related_id` is a polymorphic reference (listing or showing UUID — no FK constraint, validated at app layer)

---

## 2. Schema Change Process

All schema changes follow this five-step gate. No step may be skipped.

### Step 1: Write the Migration File
- File: `supabase/migrations/<NNN>_<descriptive_name>.sql`
- Number: increment from current highest (`144` as of 2026-04-21 → next is `145`)
- Must be idempotent: wrap DDL in `IF NOT EXISTS` / `IF EXISTS` guards
- Must include: RLS policy if new table has `realtor_id`, indexes per Section 5, rollback comment block

### Step 2: Migration Reviewer Subagent
Before applying, run a self-review check:
- Does every new table have `realtor_id UUID REFERENCES users(id) ON DELETE CASCADE`? (unless global table)
- Does every new table have a corresponding RLS policy?
- Are all FKs indexed?
- Does the migration have a `-- rollback:` comment block?
- Does `EXPLAIN ANALYZE` on the new query use an index scan (not seq scan) for anticipated load?

### Step 3: Apply to Dev (Supabase project `qcohfohjihazivkforsj`)
- Paste SQL into: https://supabase.com/dashboard/project/qcohfohjihazivkforsj/sql/new
- Confirm: table appears in Supabase Table Editor, RLS policies visible in Auth > Policies
- Run: `bash scripts/test-suite.sh` — all existing tests must still pass

### Step 4: Code + Test
- Implement feature using new schema
- Add/update TypeScript types in `src/types/database.ts`
- Write test scenarios in `docs/tests/<slug>.md`

### Step 5: Document
- Update this file (entity relationships section) if new core table added
- Update `CLAUDE.md` Database Schema table if new core table
- Update `docs/ENVIRONMENTS.md` migration catalogue entry

---

## 3. New Table vs. JSONB Extension — Decision Framework

When adding new data to the schema, choose between a new table and extending an existing JSONB column.

### Use a New Table When:
- The data has **structured relationships** to other entities (needs FK, JOIN, or cascade delete)
- You need to **query individual fields** in WHERE or JOIN clauses
- The data has **variable cardinality** — one parent row can have many child rows (e.g., task_comments on tasks)
- You need **row-level audit** (created_at, updated_by per row)
- Example: `task_comments` → new table (many comments per task, need created_at per comment)
- Example: `listing_documents` → new table (many docs per listing, each has its own file_url and status)

### Use JSONB on an Existing Table When:
- The data is **tightly coupled** to the parent row and always loaded with it
- The schema is **evolving** — fields will change during development without requiring migrations
- You will only ever **read the whole blob** or do simple key extraction — not filter rows by individual keys
- The data is **optional and sparse** — most rows won't have it
- Example: `contacts.newsletter_intelligence` — engagement score, preferences, last-touch data. Always loaded with contact, schema evolved weekly during newsletter sprint.
- Example: `listing_enrichment.geo`, `.parcel`, `.ltsa`, `.assessment` — external API payloads, each is a self-contained blob, structure varies by BC Geocoder / ParcelMap response shape.

### Do NOT Use JSONB When:
- You need `WHERE jsonb_column->>'field' = value` on large tables (requires GIN index and is slower than a native column)
- The field is a FK to another table
- The field appears in frequent ORDER BY clauses

---

## 4. Column Naming Conventions

| Convention | Rule | Example |
|-----------|------|---------|
| Case | `snake_case` always | `listing_price`, not `listingPrice` |
| FK columns | `<entity>_id` suffix | `listing_id`, `realtor_id`, `contact_id` |
| Timestamps | `_at` suffix, type `TIMESTAMPTZ` | `created_at`, `updated_at`, `sent_at` |
| Booleans | `is_` or `has_` prefix | `is_active`, `is_read`, `has_deposit` |
| Status fields | `status` (not `state`) | `status VARCHAR CHECK (status IN (...))` |
| Multi-tenant | `realtor_id` on every user-scoped table | not `agent_id`, not `user_id` |
| Soft delete | `deleted_at TIMESTAMPTZ NULL` | NULL = active; populated = soft-deleted |
| JSONB blobs | descriptive noun | `newsletter_intelligence`, `enrichment_data` |

---

## 5. Index Policy

Every new table must have indexes on:

1. **All FK columns** — `CREATE INDEX ON table_name (realtor_id)`, `CREATE INDEX ON table_name (listing_id)`
2. **Status and type columns** used in WHERE — `CREATE INDEX ON listings (status)`, `CREATE INDEX ON contacts (type)`
3. **Timestamp columns** used in ORDER BY — `CREATE INDEX ON communications (created_at DESC)`
4. **Search columns** — GIN index for full-text or JSONB: `CREATE INDEX ON contacts USING GIN (newsletter_intelligence)`
5. **Compound indexes** for common query patterns — e.g., `CREATE INDEX ON appointments (listing_id, status)` when listing detail page queries pending showings

**Anti-pattern:** Do not add indexes "just in case." Every index slows writes. Add indexes when the query plan for an anticipated access pattern shows a seq scan on a table with >1,000 expected rows.

---

## 6. RLS Policy Standard

Every non-global table with `realtor_id` must have:

```sql
-- Enable RLS
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- SELECT: own rows only
CREATE POLICY "<table>_select_own" ON <table_name>
  FOR SELECT USING (realtor_id = auth.uid());

-- INSERT: set realtor_id to calling user
CREATE POLICY "<table>_insert_own" ON <table_name>
  FOR INSERT WITH CHECK (realtor_id = auth.uid());

-- UPDATE/DELETE: own rows only
CREATE POLICY "<table>_update_own" ON <table_name>
  FOR UPDATE USING (realtor_id = auth.uid());

CREATE POLICY "<table>_delete_own" ON <table_name>
  FOR DELETE USING (realtor_id = auth.uid());
```

App layer **also** enforces `realtor_id` via `getAuthenticatedTenantClient()` in `src/lib/supabase/tenant.ts`. Both layers are required — DB-level RLS is the last line of defense if app code regresses.

Admin client (`createAdminClient()` in `src/lib/supabase/admin.ts`) bypasses RLS. It is only permitted for: cron jobs, seed scripts, migration scripts, and the admin panel. Never use the admin client in user-facing server actions.
