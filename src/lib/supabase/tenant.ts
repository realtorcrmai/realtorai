// Magnate — Multi-Tenant Query Wrapper
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
   
  insert(data: Record<string, unknown> | Record<string, unknown>[]): any {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.realtorId }))
      : { ...data, realtor_id: this.realtorId };

    return this.supabase.from(this.table).insert(withTenant); // .error checked by caller
  }

  /** INSERT with select — returns inserted row(s) */
  insertAndSelect(data: Record<string, unknown> | Record<string, unknown>[]) {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.realtorId }))
      : { ...data, realtor_id: this.realtorId };

    return this.supabase.from(this.table).insert(withTenant).select(); // .error checked by caller
  }

  /** UPDATE with automatic tenant filter — only updates rows belonging to this tenant */
   
  update(data: Record<string, unknown>): any {
    return this.supabase
      .from(this.table)
      .update(data)
      .eq("realtor_id", this.realtorId);
  }

  /** DELETE with automatic tenant filter — only deletes rows belonging to this tenant */
   
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

    return this.supabase.from(this.table).upsert(withTenant, options as any); // .error checked by caller
  }
}

// ============================================================
// Global Tables (no tenant filtering needed)
// ============================================================

/** Tables that are shared across all tenants (system-level).
 * Only include tables that actually exist and are intentionally global.
 * Tables with realtor_id (e.g. competitive_insights post-migration-070) should NOT be here.
 */
const GLOBAL_TABLES = new Set([
  "knowledge_articles",       // shared RAG knowledge base
  "newsletter_templates",     // system email templates (is_system=true)
  "email_template_registry",  // shared template registry
  "form_templates",           // BCREA form templates
  "neighbourhood_data",       // shared neighbourhood reference data
  "market_stats_cache",       // shared market statistics
  "help_events",              // help/onboarding events
  "help_community_tips",      // community tips
  "google_tokens",            // keyed by user_email, not realtor_id
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

// ============================================================
// Team-Aware Tenant Client
// ============================================================

import type { DataScope, TeamRole } from "@/types/team";

interface TeamSessionInfo {
  userId: string;
  teamId: string | null;
  teamRole: TeamRole | null;
}

/**
 * Get a tenant-scoped client that respects team visibility.
 *
 * - scope="personal" → same as getAuthenticatedTenantClient() (default, unchanged)
 * - scope="team" → queries filtered by role:
 *   - Owner/Admin: sees all team members' data
 *   - Agent: sees own + visibility='team' + assigned_to=self
 *   - Assistant: sees only assigned_to=self
 *
 * Solo users (no teamId): always returns personal scope regardless of param.
 *
 * Usage:
 *   const tc = await getScopedTenantClient("team");
 *   const { data } = await tc.from("contacts").select("*");
 */
export async function getScopedTenantClient(scope: DataScope = "personal") {
  const { auth } = await import("@/lib/auth");
  const session = await auth();

  if (!session?.user) {
    throw new Error("Not authenticated — no session found");
  }

  const user = session.user as Record<string, unknown>;
  const userId = (user.id as string) || (user.userId as string) || "";
  const teamId = (user.teamId as string) || null;
  const teamRole = (user.teamRole as TeamRole) || null;

  if (!userId) throw new Error("No user ID found in session");

  // Solo user or personal scope: standard single-user client
  if (scope === "personal" || !teamId) {
    return tenantClient(userId);
  }

  // Team scope: get team member IDs and return appropriate client
  const teamInfo: TeamSessionInfo = { userId, teamId, teamRole };
  return createTeamScopedClient(teamInfo);
}

/**
 * Internal: creates a team-scoped client based on the user's role.
 */
async function createTeamScopedClient(info: TeamSessionInfo) {
  const { userId, teamId, teamRole } = info;
  const memberIds = await getTeamMemberIds(teamId!);

  if (teamRole === "owner" || teamRole === "admin") {
    // Owner/Admin see ALL team data
    return teamTenantClient(memberIds, userId);
  }

  if (teamRole === "agent") {
    // Agent sees: own + team-visible from teammates + assigned to self
    return agentTeamClient(userId, memberIds);
  }

  // Assistant: sees only assigned records
  return assistantClient(userId);
}

/**
 * Fetch all user_ids for a given team. Cached per request.
 */
const getTeamMemberIds = cache(async (teamId: string): Promise<string[]> => {
  const supabase = createAdminClient();

  // Try materialized view first (fast), fall back to direct query
  const { data: viewData } = await supabase
    .from("team_members_active")
    .select("user_id")
    .eq("team_id", teamId);

  if (viewData && viewData.length > 0) {
    return viewData.map((r: { user_id: string }) => r.user_id);
  }

  // Fallback: query tenant_memberships + users directly
  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("agent_email, user_id")
    .eq("tenant_id", teamId)
    .is("removed_at", null);

  if (!memberships || memberships.length === 0) return [];

  // Get user IDs from emails where user_id is not set
  const emailsWithoutId = memberships
    .filter((m: { user_id: string | null }) => !m.user_id)
    .map((m: { agent_email: string }) => m.agent_email);

  let additionalIds: string[] = [];
  if (emailsWithoutId.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id")
      .in("email", emailsWithoutId);
    additionalIds = users?.map((u: { id: string }) => u.id) || [];
  }

  const directIds = memberships
    .filter((m: { user_id: string | null }) => m.user_id)
    .map((m: { user_id: string }) => m.user_id);

  return [...new Set([...directIds, ...additionalIds])];
});

/**
 * Team client for Owner/Admin: queries filter by all team member IDs.
 * INSERT still uses the current user's ID as realtor_id.
 * DELETE restricted to current user's records (safety).
 */
function teamTenantClient(memberIds: string[], currentUserId: string) {
  const supabase = createAdminClient();

  return {
    raw: supabase,
    realtorId: currentUserId,
    from(table: string) {
      return new TeamQueryBuilder(supabase, table, memberIds, currentUserId);
    },
  };
}

/**
 * Team client for Agent role: sees own + team-visible + assigned.
 * Uses OR filter: realtor_id=self OR (visibility=team AND in team) OR assigned_to=self
 */
function agentTeamClient(userId: string, memberIds: string[]) {
  const supabase = createAdminClient();

  return {
    raw: supabase,
    realtorId: userId,
    from(table: string) {
      return new AgentTeamQueryBuilder(supabase, table, userId, memberIds);
    },
  };
}

/**
 * Assistant client: only sees records assigned to them.
 */
function assistantClient(userId: string) {
  const supabase = createAdminClient();

  return {
    raw: supabase,
    realtorId: userId,
    from(table: string) {
      return new AssistantQueryBuilder(supabase, table, userId);
    },
  };
}

// ============================================================
// Team Query Builders
// ============================================================

/** Owner/Admin: queries filtered by all team member IDs */
class TeamQueryBuilder {
  private supabase: SupabaseClient;
  private table: string;
  private memberIds: string[];
  private currentUserId: string;

  constructor(supabase: SupabaseClient, table: string, memberIds: string[], currentUserId: string) {
    this.supabase = supabase;
    this.table = table;
    this.memberIds = memberIds;
    this.currentUserId = currentUserId;
  }

   
  select(columns = "*", options?: Record<string, unknown>): any {
    const base = options
      ? this.supabase.from(this.table).select(columns, options)
      : this.supabase.from(this.table).select(columns);
    return base.in("realtor_id", this.memberIds);
  }

   
  insert(data: Record<string, unknown> | Record<string, unknown>[]): any {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.currentUserId }))
      : { ...data, realtor_id: this.currentUserId };
    return this.supabase.from(this.table).insert(withTenant); // .error checked by caller
  }

  insertAndSelect(data: Record<string, unknown> | Record<string, unknown>[]) {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.currentUserId }))
      : { ...data, realtor_id: this.currentUserId };
    return this.supabase.from(this.table).insert(withTenant).select(); // .error checked by caller
  }

   
  update(data: Record<string, unknown>): any {
    return this.supabase.from(this.table).update(data).in("realtor_id", this.memberIds); // .error checked by caller
  }


  delete(): any {
    // Safety: Owner/Admin DELETE restricted to own records to prevent accidental mass delete
    return this.supabase.from(this.table).delete().eq("realtor_id", this.currentUserId); // .error checked by caller
  }

   
  upsert(data: Record<string, unknown> | Record<string, unknown>[], options?: Record<string, unknown>): any {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.currentUserId }))
      : { ...data, realtor_id: this.currentUserId };
    return this.supabase.from(this.table).upsert(withTenant, options as any); // .error checked by caller
  }
}

/** Agent: sees own + shared team data + assigned records */
class AgentTeamQueryBuilder {
  private supabase: SupabaseClient;
  private table: string;
  private userId: string;
  private memberIds: string[];

  constructor(supabase: SupabaseClient, table: string, userId: string, memberIds: string[]) {
    this.supabase = supabase;
    this.table = table;
    this.userId = userId;
    this.memberIds = memberIds;
  }

   
  select(columns = "*", options?: Record<string, unknown>): any {
    // Use Supabase OR filter: own records + team-visible + assigned
    const base = options
      ? this.supabase.from(this.table).select(columns, options)
      : this.supabase.from(this.table).select(columns);

    return base.or(
      `realtor_id.eq.${this.userId},` +
      `and(visibility.eq.team,realtor_id.in.(${this.memberIds.join(",")})),` +
      `assigned_to.eq.${this.userId}`
    );
  }

   
  insert(data: Record<string, unknown> | Record<string, unknown>[]): any {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.userId }))
      : { ...data, realtor_id: this.userId };
    return this.supabase.from(this.table).insert(withTenant); // .error checked by caller
  }

  insertAndSelect(data: Record<string, unknown> | Record<string, unknown>[]) {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.userId }))
      : { ...data, realtor_id: this.userId };
    return this.supabase.from(this.table).insert(withTenant).select(); // .error checked by caller
  }

   
  update(data: Record<string, unknown>): any {
    // Agent can only update own records
    return this.supabase.from(this.table).update(data).eq("realtor_id", this.userId); // .error checked by caller
  }

   
  delete(): any {
    // Agent can only delete own records
    return this.supabase.from(this.table).delete().eq("realtor_id", this.userId); // .error checked by caller
  }

   
  upsert(data: Record<string, unknown> | Record<string, unknown>[], options?: Record<string, unknown>): any {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.userId }))
      : { ...data, realtor_id: this.userId };
    return this.supabase.from(this.table).upsert(withTenant, options as any); // .error checked by caller
  }
}

/** Assistant: only sees records where assigned_to = self */
class AssistantQueryBuilder {
  private supabase: SupabaseClient;
  private table: string;
  private userId: string;

  constructor(supabase: SupabaseClient, table: string, userId: string) {
    this.supabase = supabase;
    this.table = table;
    this.userId = userId;
  }

   
  select(columns = "*", options?: Record<string, unknown>): any {
    const base = options
      ? this.supabase.from(this.table).select(columns, options)
      : this.supabase.from(this.table).select(columns);
    // Assistant sees: own records OR assigned to them
    return base.or(`realtor_id.eq.${this.userId},assigned_to.eq.${this.userId}`);
  }

   
  insert(data: Record<string, unknown> | Record<string, unknown>[]): any {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.userId }))
      : { ...data, realtor_id: this.userId };
    return this.supabase.from(this.table).insert(withTenant); // .error checked by caller
  }

  insertAndSelect(data: Record<string, unknown> | Record<string, unknown>[]) {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.userId }))
      : { ...data, realtor_id: this.userId };
    return this.supabase.from(this.table).insert(withTenant).select(); // .error checked by caller
  }

   
  update(data: Record<string, unknown>): any {
    // Assistant cannot update (enforced at permission level, but defense-in-depth)
    return this.supabase.from(this.table).update(data).eq("assigned_to", this.userId);
  }

   
  delete(): any {
    // Assistant cannot delete
    throw new Error("FORBIDDEN: Assistant role cannot delete records");
  }

   
  upsert(data: Record<string, unknown> | Record<string, unknown>[], options?: Record<string, unknown>): any {
    const withTenant = Array.isArray(data)
      ? data.map((row) => ({ ...row, realtor_id: this.userId }))
      : { ...data, realtor_id: this.userId };
    return this.supabase.from(this.table).upsert(withTenant, options as any); // .error checked by caller
  }
}
