/**
 * Test Database Setup & Teardown
 *
 * For Realtors360, we use the shared Supabase dev database with:
 * - Admin client (bypasses RLS) for setup/teardown
 * - `is_sample` flag on test-created rows for easy cleanup
 * - Deterministic test data prefix (E2ETEST) for identification
 *
 * Note: Schema-per-PR isolation is not yet implemented (requires Supabase Pro
 * with branching or a separate test project). Current strategy: mark test data
 * with `is_sample: true` and clean up after each run.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

let _admin: SupabaseClient | null = null;

export function getTestAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("[test-db] Missing Supabase env vars in .env.local");
  }

  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

// ── Test data prefix ────────────────────────────────────────

export const TEST_PREFIX = "E2ETEST";
export const TEST_EMAIL_DOMAIN = "@e2etest.example.com";

// ── Get demo realtor ID ─────────────────────────────────────

let _demoRealtorId: string | null = null;

export async function getDemoRealtorId(): Promise<string> {
  if (_demoRealtorId) return _demoRealtorId;

  const { data, error } = await getTestAdmin()
    .from("users")
    .select("id")
    .eq("email", process.env.DEMO_EMAIL || "demo@realestatecrm.com")
    .maybeSingle();

  if (error || !data) {
    throw new Error(`[test-db] Demo user not found: ${error?.message ?? "not in users table"}`);
  }

  _demoRealtorId = data.id;
  return _demoRealtorId;
}

// ── Seed helpers ────────────────────────────────────────────

export async function seedRow(
  table: string,
  data: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const realtorId = await getDemoRealtorId();
  const row = { ...data, realtor_id: realtorId, is_sample: true };

  const { data: result, error } = await getTestAdmin()
    .from(table)
    .upsert(row, { onConflict: "id" })
    .select()
    .single();

  if (error) throw new Error(`[test-db] seed(${table}): ${error.message}`);
  return result;
}

export async function seedRows(
  table: string,
  rows: Record<string, unknown>[]
): Promise<Record<string, unknown>[]> {
  const realtorId = await getDemoRealtorId();
  const withTenant = rows.map((r) => ({ ...r, realtor_id: realtorId, is_sample: true }));

  const { data, error } = await getTestAdmin()
    .from(table)
    .upsert(withTenant, { onConflict: "id" })
    .select();

  if (error) throw new Error(`[test-db] seedRows(${table}): ${error.message}`);
  return data ?? [];
}

// ── Cleanup helpers ─────────────────────────────────────────

/** Remove all test-created data (is_sample = true with TEST_PREFIX in name) */
export async function cleanupTestData(): Promise<{ deleted: Record<string, number> }> {
  const admin = getTestAdmin();
  const deleted: Record<string, number> = {};

  // Order matters — child tables first (FK constraints)
  const tables = [
    "communications",
    "notifications",
    "tasks",
    "newsletter_events",
    "newsletters",
    "contact_journeys",
    "seller_identities",
    "listing_documents",
    "listing_enrichment",
    "media_assets",
    "prompts",
    "appointments",
    "listings",
    "contacts",
  ];

  for (const table of tables) {
    const { count, error } = await admin
      .from(table)
      .delete({ count: "exact" })
      .eq("is_sample", true)
      .like("name", `${TEST_PREFIX}%`)
      .select("id", { count: "exact", head: true });

    // Fallback: try without name filter (not all tables have name column)
    if (error) {
      const { count: c2 } = await admin
        .from(table)
        .delete({ count: "exact" })
        .eq("is_sample", true);
      deleted[table] = c2 ?? 0;
    } else {
      deleted[table] = count ?? 0;
    }
  }

  return { deleted };
}

/** Remove a specific row by ID */
export async function deleteTestRow(table: string, id: string): Promise<void> {
  const { error } = await getTestAdmin().from(table).delete().eq("id", id);
  if (error) console.warn(`[test-db] deleteTestRow(${table}, ${id}): ${error.message}`);
}

// ── Query helpers for assertions ────────────────────────────

export async function getRow(
  table: string,
  id: string
): Promise<Record<string, unknown> | null> {
  const { data } = await getTestAdmin().from(table).select("*").eq("id", id).maybeSingle();
  return data;
}

export async function getRows(
  table: string,
  filters: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  let query = getTestAdmin().from(table).select("*");
  for (const [k, v] of Object.entries(filters)) {
    query = query.eq(k, v as string);
  }
  const { data } = await query;
  return data ?? [];
}

export async function countRows(
  table: string,
  filters: Record<string, unknown>
): Promise<number> {
  let query = getTestAdmin().from(table).select("id", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) {
    query = query.eq(k, v as string);
  }
  const { count } = await query;
  return count ?? 0;
}
