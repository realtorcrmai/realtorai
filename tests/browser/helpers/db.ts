/**
 * Supabase Admin Helper for E2E Test Assertions
 *
 * Provides direct DB access via the service-role key (bypasses RLS).
 * Used for:
 *   - 4-layer assertions: verify DB state after UI actions
 *   - Test data setup: seed specific rows before tests
 *   - Cleanup: remove test-created rows after tests
 *
 * NEVER use this in production code — admin client bypasses tenant isolation.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

// Load env from .env.local (Playwright runs outside Next.js)
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

let _client: SupabaseClient | null = null;

/** Get the shared admin client (singleton, bypasses RLS) */
export function getAdminClient(): SupabaseClient {
  if (_client) return _client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "[test/db] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local"
    );
  }

  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}

// ── Query helpers ─────────────────────────────────────────────

/** Fetch a single row by ID from any table */
export async function getById(
  table: string,
  id: string
): Promise<Record<string, unknown> | null> {
  const { data, error } = await getAdminClient()
    .from(table)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`[test/db] getById(${table}, ${id}): ${error.message}`);
  return data;
}

/** Fetch rows matching a filter */
export async function getWhere(
  table: string,
  filters: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  let query = getAdminClient().from(table).select("*");
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val as string);
  }
  const { data, error } = await query;
  if (error) throw new Error(`[test/db] getWhere(${table}): ${error.message}`);
  return data ?? [];
}

/** Count rows matching a filter */
export async function countWhere(
  table: string,
  filters: Record<string, unknown>
): Promise<number> {
  let query = getAdminClient()
    .from(table)
    .select("id", { count: "exact", head: true });
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val as string);
  }
  const { count, error } = await query;
  if (error) throw new Error(`[test/db] countWhere(${table}): ${error.message}`);
  return count ?? 0;
}

// ── Seed helpers (idempotent via upsert) ──────────────────────

/** Upsert a row — safe for repeated test runs */
export async function seed(
  table: string,
  row: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { data, error } = await getAdminClient()
    .from(table)
    .upsert(row, { onConflict: "id" })
    .select()
    .single();
  if (error) throw new Error(`[test/db] seed(${table}): ${error.message}`);
  return data;
}

/** Delete a row by ID — for cleanup */
export async function deleteById(table: string, id: string): Promise<void> {
  const { error } = await getAdminClient().from(table).delete().eq("id", id);
  if (error) throw new Error(`[test/db] deleteById(${table}, ${id}): ${error.message}`);
}

/** Delete rows matching a filter — for bulk cleanup */
export async function deleteWhere(
  table: string,
  filters: Record<string, unknown>
): Promise<void> {
  let query = getAdminClient().from(table).delete();
  for (const [col, val] of Object.entries(filters)) {
    query = query.eq(col, val as string);
  }
  const { error } = await query;
  if (error) throw new Error(`[test/db] deleteWhere(${table}): ${error.message}`);
}

// ── Assertion helpers ─────────────────────────────────────────

/** Assert a row exists with expected fields */
export async function expectRowExists(
  table: string,
  id: string,
  expected: Record<string, unknown>
): Promise<void> {
  const row = await getById(table, id);
  if (!row) throw new Error(`[test/db] Expected row in ${table} with id=${id} but got null`);
  for (const [key, val] of Object.entries(expected)) {
    const actual = row[key];
    if (JSON.stringify(actual) !== JSON.stringify(val)) {
      throw new Error(
        `[test/db] ${table}.${key}: expected ${JSON.stringify(val)}, got ${JSON.stringify(actual)}`
      );
    }
  }
}

/** Assert no row exists with the given ID */
export async function expectRowNotExists(
  table: string,
  id: string
): Promise<void> {
  const row = await getById(table, id);
  if (row) {
    throw new Error(`[test/db] Expected no row in ${table} with id=${id} but found one`);
  }
}

/** Assert exact row count matching filters */
export async function expectCount(
  table: string,
  filters: Record<string, unknown>,
  expectedCount: number
): Promise<void> {
  const count = await countWhere(table, filters);
  if (count !== expectedCount) {
    throw new Error(
      `[test/db] ${table} count: expected ${expectedCount}, got ${count} (filters: ${JSON.stringify(filters)})`
    );
  }
}

// ── Tenant isolation helper ───────────────────────────────────

/** Get the realtor_id for the demo user (used to verify tenant scoping) */
export async function getDemoRealtorId(): Promise<string> {
  const { data, error } = await getAdminClient()
    .from("users")
    .select("id")
    .eq("email", "demo@realestatecrm.com")
    .maybeSingle();
  if (error || !data) {
    throw new Error(`[test/db] Could not find demo user: ${error?.message ?? "not found"}`);
  }
  return data.id;
}
