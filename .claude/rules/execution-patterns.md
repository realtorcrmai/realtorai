---
paths:
  - "src/**"
  - "supabase/**"
---

# Execution Patterns

## Add a New Page

1. Create route: `src/app/(dashboard)/[name]/page.tsx`
2. Add `export const dynamic = 'force-dynamic'` if page needs real-time data
3. Use `lf-glass` header, `lf-card` for sections, emoji icons (not Lucide on pages)
4. Add ARIA labels to interactive elements. Use design system colors (pre-tested for contrast).
5. Link from navigation
6. Verify: page loads, no TS errors, responsive on mobile

## Add a Server Action

1. Create or extend file in `src/actions/[domain].ts`
2. Define Zod v4 schema for inputs (use `.min(1)` not `.nonempty()`)
3. Use `supabaseAdmin` for database operations (server-side, bypasses RLS)
4. Call `revalidatePath('/affected-route')` after mutations
5. Return typed response — never throw, return `{ error: string }` objects
6. Verify: action callable, data persists, path revalidated

**Common mistakes:** Forgetting `revalidatePath` (UI shows stale data). Using `supabase` client instead of `supabaseAdmin` on server (fails silently due to RLS). Throwing errors instead of returning them (breaks error UI).

## Add a Database Table

1. **NEVER modify a migration file that has already been applied.** Always create a new migration.
2. Create migration: `supabase/migrations/[next_number]_[name].sql`
   - Check highest number: `ls supabase/migrations/ | tail -5` (note: 050-053 have duplicates)
3. Include RLS: `ALTER TABLE x ENABLE ROW LEVEL SECURITY; CREATE POLICY x ON table FOR ALL USING (true);`
4. Include constraints: FK, NOT NULL, CHECK, UNIQUE. Use JSONB for flexible data.
5. Add indexes: every FK column, every status/type column used for filtering, every column in WHERE/JOIN queries.
6. Idempotency: `IF NOT EXISTS`, `ON CONFLICT DO NOTHING`
7. Update `src/types/database.ts` with new table types
8. Create server action for CRUD in `src/actions/`
9. For destructive migrations: write rollback SQL at `supabase/rollbacks/[same_number]_rollback.sql` in the same commit
10. Execute one at a time, verify each before running next
11. **Run migration-reviewer subagent** on all new migration files (Medium+ tasks)

## Add a GET API Route (webhooks, polling, data endpoints)

1. Create route: `src/app/api/[domain]/route.ts`
2. Export `GET` handler (or `POST` for webhooks only)
3. Validate query params with Zod. Validate webhook signatures (svix for Resend, `validateRequest` for Twilio).
4. Use `supabaseAdmin` for data access
5. Return proper status codes: 200 (success), 400 (bad input), 401 (unauthorized), 500 (error)
6. Wrap in try/catch — return JSON error, never unhandled exceptions
7. For cron endpoints: require `Authorization: Bearer $CRON_SECRET` header

**Common mistakes:** Missing webhook signature validation (security hole). Returning HTML instead of JSON. Not handling the `OPTIONS` method for CORS.

## Add/Modify a Component

1. Use `lf-*` CSS classes — no inline styles
2. Emoji icons on pages, Lucide only inside reusable `src/components/ui/` primitives
3. Handle loading, error, and empty states
4. Add ARIA labels to buttons, inputs, and modals. Use design system colors for contrast.
5. Path alias: `@/` maps to `src/`
6. Verify: renders correctly, handles edge cases (null data, empty arrays)
