"use server";

import type { TeamAction, TeamRole, ResourceAction } from "@/types/team";

/**
 * Team Permission Middleware
 *
 * Enforces role-based access control for team features.
 * Solo users (no teamId) bypass all team restrictions.
 * Permission checks happen at the server action level — UI hides
 * inaccessible actions but server enforces the truth.
 */

// ============================================================
// Role → Permission Mapping
// ============================================================

const ADMIN_PERMISSIONS: TeamAction[] = [
  "team:manage_settings",
  "team:invite_members",
  "team:remove_members",
  "team:view_audit_log",
  "contacts:view_team",
  "contacts:create",
  "contacts:delete",
  "contacts:share",
  "contacts:export",
  "listings:create",
  "listings:delete",
  "listings:modify_financials",
  "listings:share",
  "showings:manage_team",
  "showings:delegate",
  "deals:view_financials",
  "deals:create",
  "newsletters:create",
  "newsletters:send",
  "newsletters:send_team",
  "workflows:create",
  "tasks:assign",
  "content:create",
  "content:publish",
  "data:export",
  "integrations:manage",
];

const AGENT_PERMISSIONS: TeamAction[] = [
  "contacts:view_team",
  "contacts:create",
  "contacts:share",
  "contacts:export",
  "listings:create",
  "listings:modify_financials",
  "listings:share",
  "showings:manage_team",
  "showings:delegate",
  "deals:view_financials",
  "deals:create",
  "newsletters:create",
  "newsletters:send",
  "workflows:create",
  "tasks:assign",
  "content:create",
  "content:publish",
  "data:export",
  "integrations:manage",
];

const ASSISTANT_PERMISSIONS: TeamAction[] = [
  "contacts:create",
  "showings:manage_team",
  "tasks:assign",
  "content:create",
];

const ROLE_PERMISSIONS: Record<TeamRole, TeamAction[] | "*"> = {
  owner: "*",
  admin: ADMIN_PERMISSIONS,
  agent: AGENT_PERMISSIONS,
  assistant: ASSISTANT_PERMISSIONS,
};

// ============================================================
// Permission Check Functions
// ============================================================

interface TeamSession {
  user: {
    id: string;
    teamId?: string | null;
    teamRole?: TeamRole | null;
  };
}

/**
 * Check if the current user has permission to perform a team action.
 *
 * - Solo users (no teamId): always returns true (no restrictions)
 * - Owner: always returns true (wildcard)
 * - Admin/Agent/Assistant: checked against ROLE_PERMISSIONS
 *
 * @returns true if allowed, false if denied
 */
export function checkTeamPermission(
  session: TeamSession,
  action: TeamAction
): boolean {
  // Solo user — no team restrictions apply
  if (!session.user.teamId) return true;

  const role = session.user.teamRole;
  if (!role) return false;

  // Owner has wildcard access
  if (role === "owner") return true;

  const permissions = ROLE_PERMISSIONS[role];
  if (permissions === "*") return true;

  return permissions.includes(action);
}

/**
 * Check if the current user can perform a resource-level action
 * (edit, delete, share) on a specific resource owned by resourceOwnerId.
 *
 * - Solo users: always allowed
 * - Owner/Admin: always allowed (any resource in team)
 * - Agent: only own resources
 * - Assistant: cannot delete or share; can only edit assigned resources
 */
export function checkResourcePermission(
  session: TeamSession,
  action: ResourceAction,
  resourceOwnerId: string
): boolean {
  // Solo user — no restrictions
  if (!session.user.teamId) return true;

  const role = session.user.teamRole;
  if (!role) return false;

  // Owner/Admin can act on any team resource
  if (role === "owner" || role === "admin") return true;

  if (role === "agent") {
    // Agents can only modify their own resources
    return resourceOwnerId === session.user.id;
  }

  if (role === "assistant") {
    // Assistants cannot delete or share anything
    if (action === "delete" || action === "share") return false;
    // Can only edit if it's assigned to them (caller should verify assigned_to)
    return false; // Caller must explicitly check assigned_to
  }

  return false;
}

/**
 * Check if a user can view a resource based on visibility and team membership.
 *
 * Used for fine-grained visibility decisions on individual records.
 */
export function checkViewPermission(
  session: TeamSession,
  resource: {
    realtor_id: string;
    visibility: "private" | "team";
    assigned_to?: string | null;
  },
  teamMemberIds: string[]
): boolean {
  const userId = session.user.id;
  const role = session.user.teamRole;

  // Always can see own records
  if (resource.realtor_id === userId) return true;

  // Solo user can only see own
  if (!session.user.teamId) return false;

  // Directly assigned to this user
  if (resource.assigned_to === userId) return true;

  // Private records — only owner or assigned can see
  if (resource.visibility === "private") return false;

  // Team-visible records
  if (resource.visibility === "team") {
    // Must be in the same team
    const isTeamMember = teamMemberIds.includes(resource.realtor_id);
    if (!isTeamMember) return false;

    // Owner/Admin: see all team data
    if (role === "owner" || role === "admin") return true;

    // Agent: can see team-visible records
    if (role === "agent") return true;

    // Assistant: only sees assigned records (already checked above)
    if (role === "assistant") return false;
  }

  return false;
}

/**
 * Get all permissions for a given role.
 * Useful for UI: hide buttons/actions the user can't perform.
 */
export function getPermissionsForRole(role: TeamRole): TeamAction[] {
  if (role === "owner") {
    // Return all possible actions
    return [
      ...ADMIN_PERMISSIONS,
      "billing:access",
    ];
  }

  const perms = ROLE_PERMISSIONS[role];
  if (perms === "*") return [...ADMIN_PERMISSIONS, "billing:access"];
  return [...perms];
}

/**
 * Verify the session has a valid team context.
 * Throws a structured error if not.
 */
export function requireTeamContext(session: TeamSession): {
  teamId: string;
  teamRole: TeamRole;
} {
  if (!session.user.teamId || !session.user.teamRole) {
    throw new Error("TEAM_REQUIRED: This action requires team membership");
  }
  return {
    teamId: session.user.teamId,
    teamRole: session.user.teamRole,
  };
}

/**
 * Verify the session has Owner or Admin role.
 * Returns team context or throws.
 */
export function requireTeamAdmin(session: TeamSession): {
  teamId: string;
  teamRole: TeamRole;
} {
  const ctx = requireTeamContext(session);
  if (ctx.teamRole !== "owner" && ctx.teamRole !== "admin") {
    throw new Error("FORBIDDEN: This action requires Owner or Admin role");
  }
  return ctx;
}
