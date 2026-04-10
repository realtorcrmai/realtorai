// Realtors360 — Multi-Tenant Query Wrapper
// Auto-injects .eq('realtor_id', id) on every query to prevent cross-tenant data access
// Use this instead of raw createAdminClient() for all user-initiated operations

import { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { createAdminClient } from "./admin";

/**
 * Creates a tenant-scoped Supabase client wrapper.
 * Every query automatically filters by realtor_id.
 *
 * Usage:
 *   const tc = tenantClient(realtorId);
 *   const { data } = await tc.from("contacts").select("*");
 *   // Automatically adds .eq("realtor_id", realtorId)
 */
export function tenantClient(realtorId: string) {
  if (!realtorId) throw new Error("realtorId is required for tenant-scoped queries");

  const supabase = createAdminClient();

  return {
    /** Raw supabase client — use only when you need unscoped access (e.g., global tables) */
    raw: supabase,

    /** Tenant-scoped query builder */
    from(table: string) {
      return new TenantQueryBuilder(supabase, table, realtorId);
    },

    /** The realtor_id this client is scoped to */
    realtorId,
  };
}

/**
 * Query builder that auto-injects realtor_id filtering.
 * Wraps Supabase's query methods with tenant isolation.
 */
class TenantQueryBuilder {
  private supabase: SupabaseClient;
  private table: string;
  private realtorId: string;

  constructor(supabase: SupabaseClient, table: string, realtorId: string) {
    this.supabase = supabase;
    this.table = table;
    this.realtorId = realtorId;
  }

  /** SELECT with automatic tenant filter */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  select(columns = "*", options?: Record<string, unknown>): any {
    if (options) {
      return this.supabase
        .from(this.table)
        .select(columns, options)
        .eq("realtor_id", this.realtorId);
    }
    return this.supabase
      .from(this.table)
      .select(columns)
      .eq("realtor_id", this.realtorId);
  }

  /** INSERT with automatic realtor_id injection */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insert(data: Record<string, unknown> | Record<string, unknown>[]): any {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.realtorId }))
      : { ...data, realtor_id: this.realtorId };

    return this.supabase.from(this.table).insert(withTenant);
  }

  /** INSERT with select — returns inserted row(s) */
  insertAndSelect(data: Record<string, unknown> | Record<string, unknown>[]) {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.realtorId }))
      : { ...data, realtor_id: this.realtorId };

    return this.supabase.from(this.table).insert(withTenant).select();
  }

  /** UPDATE with automatic tenant filter — only updates rows belonging to this tenant */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update(data: Record<string, unknown>): any {
    return this.supabase
      .from(this.table)
      .update(data)
      .eq("realtor_id", this.realtorId);
  }

  /** DELETE with automatic tenant filter — only deletes rows belonging to this tenant */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete(): any {
    return this.supabase
      .from(this.table)
      .delete()
      .eq("realtor_id", this.realtorId);
  }

  /** UPSERT with automatic realtor_id injection */
   
  upsert(
    data: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string; ignoreDuplicates?: boolean; count?: string }
  ): any {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.realtorId }))
      : { ...data, realtor_id: this.realtorId };

    return this.supabase.from(this.table).upsert(withTenant, options as any);
  }
}

// ============================================================
// Global Tables (no tenant filtering needed)
// ============================================================

/** Tables that are shared across all tenants (system-level) */
const GLOBAL_TABLES = new Set([
  "knowledge_articles",
  "newsletter_templates",    // system templates (is_system=true)
  "social_templates",        // system templates (is_system=true)
  "form_templates",
  "help_events",
  "help_community_tips",
  "platform_intelligence",
  "competitive_insights",
  "tenants",
  "tenant_memberships",
  "tenant_api_keys",
  "tenant_audit_log",
]);

/** Check if a table is global (no tenant filtering needed) */
export function isGlobalTable(table: string): boolean {
  return GLOBAL_TABLES.has(table);
}

// ============================================================
// Helper: Get realtor ID from NextAuth session
// ============================================================

/**
 * Extracts the realtor_id from the current NextAuth session.
 * Use in server actions and API routes.
 *
 * Usage:
 *   const realtorId = await getRealtorId();
 *   const tc = tenantClient(realtorId);
 */
export async function getRealtorId(): Promise<string> {
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated — no session found");
  }

  // Use userId from session (set in auth.ts JWT callback)
  const realtorId =
    (session.user as Record<string, unknown>).userId as string ||
    session.user.id ||
    session.user.email;

  if (!realtorId) {
    throw new Error("No realtor ID found in session");
  }

  return realtorId;
}

/**
 * Convenience: get a tenant-scoped client for the current authenticated user.
 * Uses React cache() to deduplicate within a single server request —
 * layout + page calling this function share the same auth() lookup.
 *
 * Usage:
 *   const tc = await getAuthenticatedTenantClient();
 *   const { data } = await tc.from("contacts").select("*");
 */
export const getAuthenticatedTenantClient = cache(async () => {
  const realtorId = await getRealtorId();
  return tenantClient(realtorId);
});
