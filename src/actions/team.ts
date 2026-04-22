"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import {
  checkTeamPermission,
  requireTeamContext,
  requireTeamAdmin,
} from "@/lib/team-permissions";
import type {
  TeamRole,
  CreateTeamInput,
  InviteMemberInput,
  UpdateRoleInput,
  OffboardImpact,
  TeamMemberWithUser,
  TeamOverview,
} from "@/types/team";

// ============================================================
// Helpers
// ============================================================

async function getSession() {
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user) throw new Error("Not authenticated");
  const user = session.user as Record<string, unknown>;
  return {
    id: (user.id as string) || "",
    email: (user.email as string) || "",
    name: (user.name as string) || "",
    teamId: (user.teamId as string) || null,
    teamRole: (user.teamRole as TeamRole) || null,
  };
}

async function logActivity(
  teamId: string,
  userId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Record<string, unknown> = {}
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("team_activity_log").insert({
    team_id: teamId,
    user_id: userId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
  if (error) console.error("[team] activity log insert failed:", error.message);
}

async function logAudit(
  teamId: string | null,
  userId: string,
  action: string,
  resourceType: string | null,
  resourceId: string | null,
  details: Record<string, unknown> = {}
) {
  const supabase = createAdminClient();
  const { error } = await supabase.from("audit_log").insert({
    team_id: teamId,
    user_id: userId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    details,
  });
  if (error) console.error("[team] audit log insert failed:", error.message);
}

// ============================================================
// Team CRUD
// ============================================================

/**
 * Create a new team. The current user becomes the Owner.
 */
export async function createTeam(input: CreateTeamInput) {
  const session = await getSession();
  const supabase = createAdminClient();

  // Cannot create team if already on one
  if (session.teamId) {
    return { error: "You are already a member of a team. Leave your current team first." };
  }

  // Create tenant
  const { data: tenant, error: tenantErr } = await supabase
    .from("tenants")
    .insert({
      name: input.name,
      slug: input.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 50),
      plan: "team",
      status: "active",
      owner_email: session.email,
      brokerage_name: input.brokerage_name || null,
      logo_url: input.logo_url || null,
      max_members: 15,
    })
    .select("id")
    .single();

  if (tenantErr || !tenant) {
    return { error: `Failed to create team: ${tenantErr?.message}` };
  }

  // Create owner membership
  const { error: memberErr } = await supabase
    .from("tenant_memberships")
    .insert({
      tenant_id: tenant.id,
      agent_email: session.email,
      user_id: session.id,
      role: "owner",
      joined_at: new Date().toISOString(),
    });

  if (memberErr) {
    return { error: `Failed to create membership: ${memberErr.message}` };
  }

  // Link user to team
  await supabase
    .from("users")
    .update({ team_id: tenant.id })
    .eq("id", session.id);

  // Refresh materialized view
  try { await supabase.rpc("refresh_team_members"); } catch { /* view may not exist yet */ }

  await logActivity(tenant.id, session.id, "team_created", "team", tenant.id, { name: input.name });
  await logAudit(tenant.id, session.id, "team_created", "team", tenant.id, { name: input.name });

  revalidatePath("/settings/team");
  return { data: { teamId: tenant.id } };
}

/**
 * Invite a member to the team via email.
 */
export async function inviteMember(input: InviteMemberInput) {
  const session = await getSession();
  if (!session.teamId || !session.teamRole) {
    return { error: "You are not on a team" };
  }

  // Permission check
  if (!checkTeamPermission({ user: session }, "team:invite_members")) {
    return { error: "You don't have permission to invite members" };
  }

  const supabase = createAdminClient();

  // Check seat limit
  const { count } = await supabase
    .from("tenant_memberships")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", session.teamId)
    .is("removed_at", null);

  const { data: team } = await supabase
    .from("tenants")
    .select("max_members, name, logo_url")
    .eq("id", session.teamId)
    .single();

  if (count && team && count >= team.max_members) {
    return { error: `Team is at maximum capacity (${team.max_members} members)` };
  }

  // Check if already invited or already a member
  const { data: existing } = await supabase
    .from("tenant_memberships")
    .select("id")
    .eq("tenant_id", session.teamId)
    .eq("agent_email", input.email)
    .is("removed_at", null)
    .single();

  if (existing) {
    return { error: "This person is already a member of your team" };
  }

  // Check for pending invite
  const { data: pendingInvite } = await supabase
    .from("team_invites")
    .select("id")
    .eq("team_id", session.teamId)
    .eq("email", input.email)
    .in("status", ["pending", "sent"])
    .single();

  if (pendingInvite) {
    return { error: "An invite is already pending for this email" };
  }

  // Create invite
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  const { error: inviteErr } = await supabase
    .from("team_invites")
    .insert({
      team_id: session.teamId,
      inviter_id: session.id,
      inviter_name: session.name,
      team_name: team?.name || null,
      team_logo_url: team?.logo_url || null,
      email: input.email,
      invite_token: token,
      role: input.role,
      status: "pending",
      expires_at: expiresAt.toISOString(),
    });

  if (inviteErr) {
    return { error: `Failed to create invite: ${inviteErr.message}` };
  }

  // Send invite email via Resend
  try {
    const { sendEmail } = await import("@/lib/resend");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl = `${appUrl}/invite/accept?token=${token}`;
    const teamName = team?.name || "a team";

    await sendEmail({
      to: input.email,
      subject: `${session.name} invited you to join ${teamName} on Realtors360`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="color: #2D3E50; font-size: 24px; margin-bottom: 8px;">You're invited!</h1>
          <p style="color: #555; font-size: 16px; line-height: 1.5;">
            <strong>${session.name}</strong> has invited you to join <strong>${teamName}</strong> as a <strong>${input.role}</strong> on Realtors360.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; background: #FF7A59; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 24px 0;">
            Accept Invite
          </a>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">
            This invite expires in 30 days. If you didn't expect this, you can ignore it.
          </p>
        </div>
      `,
    });
  } catch (emailErr) {
    // Don't fail the invite if email fails — invite is still created
    console.error("[team] Failed to send invite email:", emailErr);
  }

  // Send in-app notification if invitee is an existing portal user
  try {
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", input.email)
      .single();

    if (existingUser) {
      const { createNotification } = await import("@/lib/notifications");
      const teamName = team?.name || "a team";
      await createNotification(existingUser.id, {
        type: "team_invite",
        title: `You've been invited to join ${teamName}`,
        body: `${session.name} invited you as ${input.role}. Accept or decline from your notifications.`,
        related_type: "team_invite",
        related_id: token,
      });
    }
  } catch {
    // Don't fail invite if notification fails
  }

  await logActivity(session.teamId, session.id, "member_invited", "invite", null, {
    email: input.email,
    role: input.role,
  });

  revalidatePath("/settings/team");
  return { data: { token, email: input.email } };
}

/**
 * Accept a team invite using a token.
 */
export async function acceptInvite(token: string) {
  const session = await getSession();
  const supabase = createAdminClient();

  // Cannot join if already on a team
  if (session.teamId) {
    return { error: "You are already on a team. Leave your current team first." };
  }

  // Validate token
  const { data: invite, error: inviteErr } = await supabase
    .from("team_invites")
    .select("*")
    .eq("invite_token", token)
    .in("status", ["pending", "sent"])
    .single();

  if (inviteErr || !invite) {
    return { error: "Invalid or expired invite link" };
  }

  // Check expiry
  if (new Date(invite.expires_at) < new Date()) {
    await supabase
      .from("team_invites")
      .update({ status: "expired" })
      .eq("id", invite.id);
    return { error: "This invite has expired. Request a new one from your team lead." };
  }

  // Verify email matches (or allow if user email matches invite email)
  if (invite.email !== session.email) {
    return { error: `This invite was sent to ${invite.email}. Please sign in with that email.` };
  }

  // Create membership
  const { error: memberErr } = await supabase
    .from("tenant_memberships")
    .insert({
      tenant_id: invite.team_id,
      agent_email: session.email,
      user_id: session.id,
      role: invite.role,
      invited_by: invite.inviter_id,
      joined_at: new Date().toISOString(),
    });

  if (memberErr) {
    return { error: `Failed to join team: ${memberErr.message}` };
  }

  // Link user to team
  await supabase
    .from("users")
    .update({ team_id: invite.team_id })
    .eq("id", session.id);

  // Update invite status
  await supabase
    .from("team_invites")
    .update({ status: "accepted" })
    .eq("id", invite.id);

  // Refresh materialized view
  try { await supabase.rpc("refresh_team_members"); } catch { /* view may not exist yet */ }

  // Notify the inviter that their invite was accepted
  try {
    const { createNotification } = await import("@/lib/notifications");
    await createNotification(invite.inviter_id, {
      type: "team_invite_accepted",
      title: `${session.name} joined your team`,
      body: `${session.email} accepted your invite as ${invite.role}.`,
      related_type: "user",
      related_id: session.id,
    });
  } catch {
    // Don't fail accept if notification fails
  }

  await logActivity(invite.team_id, session.id, "member_joined", "user", session.id, {
    role: invite.role,
    invited_by: invite.inviter_id,
  });

  revalidatePath("/settings/team");
  return { data: { teamId: invite.team_id, role: invite.role } };
}

/**
 * Decline an invite from the notification center.
 */
export async function declineInvite(token: string) {
  const session = await getSession();
  const supabase = createAdminClient();

  const { data: invite } = await supabase
    .from("team_invites")
    .select("id, email, inviter_id, team_id")
    .eq("invite_token", token)
    .in("status", ["pending", "sent"])
    .single();

  if (!invite) return { error: "Invite not found or already processed" };
  if (invite.email !== session.email) return { error: "This invite is not for you" };

  await supabase
    .from("team_invites")
    .update({ status: "expired" })
    .eq("id", invite.id);

  // Notify inviter of decline
  try {
    const { createNotification } = await import("@/lib/notifications");
    await createNotification(invite.inviter_id, {
      type: "team_invite_declined",
      title: `${session.name} declined your invite`,
      body: `${session.email} declined the team invitation.`,
      related_type: "user",
      related_id: session.id,
    });
  } catch { /* ignore */ }

  await logActivity(invite.team_id, session.id, "invite_declined", "invite", invite.id, {
    email: invite.email,
  });

  revalidatePath("/settings/team");
  return { success: true };
}

/**
 * Update a team member's role.
 */
export async function updateMemberRole(input: UpdateRoleInput) {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  if (!checkTeamPermission({ user: session }, "team:manage_settings")) {
    return { error: "You don't have permission to change roles" };
  }

  const supabase = createAdminClient();

  // Fetch the membership being updated
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("id, role, user_id, agent_email")
    .eq("id", input.membership_id)
    .eq("tenant_id", session.teamId)
    .is("removed_at", null)
    .single();

  if (!membership) return { error: "Member not found" };

  // Cannot change owner role (must transfer ownership first)
  if (membership.role === "owner") {
    return { error: "Cannot change the owner's role. Use ownership transfer instead." };
  }

  // Admin cannot promote to owner or admin
  if (session.teamRole === "admin" && (input.new_role === "owner" || input.new_role === "admin")) {
    return { error: "Only the owner can promote to Admin or Owner" };
  }

  const { error } = await supabase
    .from("tenant_memberships")
    .update({ role: input.new_role })
    .eq("id", input.membership_id);

  if (error) return { error: `Failed to update role: ${error.message}` };

  // Refresh materialized view
  try { await supabase.rpc("refresh_team_members"); } catch { /* view may not exist yet */ }

  await logAudit(session.teamId, session.id, "role_change", "membership", input.membership_id, {
    old_role: membership.role,
    new_role: input.new_role,
    target_email: membership.agent_email,
  });

  await logActivity(session.teamId, session.id, "role_changed", "user", membership.user_id, {
    old_role: membership.role,
    new_role: input.new_role,
  });

  // Notify the affected member about their role change
  if (membership.user_id && membership.user_id !== session.id) {
    try {
      const { createNotification } = await import("@/lib/notifications");
      await createNotification(membership.user_id, {
        type: "team_role_changed",
        title: "Your team role has been updated",
        body: `Your role was changed from ${membership.role} to ${input.new_role} by ${session.name}.`,
        related_type: "team",
        related_id: session.teamId,
      });
    } catch { /* Don't fail role change if notification fails */ }
  }

  revalidatePath("/settings/team");
  return { data: { success: true } };
}

/**
 * Get all team members with user details.
 */
export async function getTeamMembers(): Promise<{ data?: TeamMemberWithUser[]; error?: string }> {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  const supabase = createAdminClient();

  const { data: memberships } = await supabase
    .from("tenant_memberships")
    .select("id, tenant_id, agent_email, role, joined_at, removed_at, user_id")
    .eq("tenant_id", session.teamId)
    .is("removed_at", null)
    .order("joined_at", { ascending: true });

  if (!memberships) return { data: [] };

  // Fetch user details for each member
  const userIds = memberships
    .map((m: { user_id: string | null }) => m.user_id)
    .filter(Boolean) as string[];

  const { data: users } = userIds.length > 0
    ? await supabase
        .from("users")
        .select("id, name, email, avatar_url")
        .in("id", userIds)
    : { data: [] };

  const userMap = new Map(
    (users || []).map((u: { id: string; name: string | null; email: string; avatar_url: string | null }) => [u.id, u])
  );

  const members: TeamMemberWithUser[] = memberships.map((m: {
    id: string;
    user_id: string | null;
    agent_email: string;
    role: TeamRole;
    joined_at: string | null;
    removed_at: string | null;
  }) => ({
    id: m.id,
    user_id: m.user_id,
    agent_email: m.agent_email,
    role: m.role,
    joined_at: m.joined_at,
    removed_at: m.removed_at,
    user: m.user_id ? userMap.get(m.user_id) : undefined,
  }));

  return { data: members };
}

/**
 * Get full team overview (for settings page).
 */
export async function getTeamOverview(): Promise<{ data?: TeamOverview; error?: string }> {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  if (!checkTeamPermission({ user: session }, "team:manage_settings")) {
    return { error: "You don't have permission to view team settings" };
  }

  const supabase = createAdminClient();

  const [teamRes, membersRes, invitesRes] = await Promise.all([
    supabase.from("tenants").select("*").eq("id", session.teamId).single(),
    getTeamMembers(),
    supabase
      .from("team_invites")
      .select("*")
      .eq("team_id", session.teamId)
      .in("status", ["pending", "sent"])
      .order("created_at", { ascending: false }),
  ]);

  if (!teamRes.data) return { error: "Team not found" };

  return {
    data: {
      team: teamRes.data,
      members: membersRes.data || [],
      pending_invites: invitesRes.data || [],
      seat_count: (membersRes.data || []).length,
      max_seats: teamRes.data.max_members || 15,
    },
  };
}

/**
 * Get basic team info visible to any team member (name + member list).
 * No admin permission required — any member can see who's on the team.
 */
export async function getTeamBasicInfo(): Promise<{
  data?: { name: string; members: TeamMemberWithUser[]; maxMembers: number };
  error?: string;
}> {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  // tenants is a global table (no realtor_id scoping); admin client is correct here.
  const supabase = createAdminClient();

  const [teamRes, membersRes] = await Promise.all([
    supabase.from("tenants").select("name, max_members").eq("id", session.teamId).single(),
    getTeamMembers(),
  ]);

  if (!teamRes.data) return { error: "Team not found" };

  return {
    data: {
      name: teamRes.data.name,
      members: membersRes.data || [],
      maxMembers: teamRes.data.max_members || 15,
    },
  };
}

/**
 * Remove a member from the team (soft delete).
 */
export async function removeMember(userId: string) {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  if (!checkTeamPermission({ user: session }, "team:remove_members")) {
    return { error: "You don't have permission to remove members" };
  }

  const supabase = createAdminClient();

  // Cannot remove yourself (use leaveTeam instead)
  if (userId === session.id) {
    return { error: "Cannot remove yourself. Use 'Leave Team' instead." };
  }

  // Fetch membership
  const { data: membership } = await supabase
    .from("tenant_memberships")
    .select("id, role, agent_email")
    .eq("tenant_id", session.teamId)
    .eq("user_id", userId)
    .is("removed_at", null)
    .single();

  if (!membership) return { error: "Member not found" };

  // Cannot remove owner
  if (membership.role === "owner") {
    return { error: "Cannot remove the team owner" };
  }

  // Admin cannot remove other admins
  if (session.teamRole === "admin" && membership.role === "admin") {
    return { error: "Only the owner can remove admins" };
  }

  // Soft delete membership
  await supabase
    .from("tenant_memberships")
    .update({ removed_at: new Date().toISOString() })
    .eq("id", membership.id);

  // Clear user's team_id
  await supabase
    .from("users")
    .update({ team_id: null })
    .eq("id", userId);

  // Refresh materialized view
  try { await supabase.rpc("refresh_team_members"); } catch { /* view may not exist yet */ }

  await logAudit(session.teamId, session.id, "member_removed", "user", userId, {
    removed_email: membership.agent_email,
    removed_role: membership.role,
  });

  await logActivity(session.teamId, session.id, "member_removed", "user", userId, {
    email: membership.agent_email,
  });

  // Notify the removed member
  try {
    const { createNotification } = await import("@/lib/notifications");
    await createNotification(userId, {
      type: "team_removed",
      title: "You have been removed from the team",
      body: `${session.name} removed you from the team.`,
      related_type: "team",
      related_id: session.teamId,
    });
  } catch { /* Don't fail removal if notification fails */ }

  revalidatePath("/settings/team");
  return { data: { success: true } };
}

/**
 * Leave the current team (for non-owners).
 */
export async function leaveTeam() {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  if (session.teamRole === "owner") {
    return { error: "Owner cannot leave. Transfer ownership first or delete the team." };
  }

  const supabase = createAdminClient();

  const { error: leaveErr } = await supabase
    .from("tenant_memberships")
    .update({ removed_at: new Date().toISOString() })
    .eq("tenant_id", session.teamId)
    .eq("user_id", session.id)
    .is("removed_at", null);

  if (leaveErr) {
    return { error: `Failed to leave team: ${leaveErr.message}` };
  }

  await supabase
    .from("users")
    .update({ team_id: null })
    .eq("id", session.id);

  try { await supabase.rpc("refresh_team_members"); } catch { /* view may not exist yet */ }

  await logActivity(session.teamId, session.id, "member_left", "user", session.id, {});

  revalidatePath("/settings/team");
  revalidatePath("/");
  return { data: { success: true } };
}

/**
 * Transfer team ownership to another admin.
 */
export async function transferOwnership(newOwnerId: string) {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };
  if (session.teamRole !== "owner") return { error: "Only the owner can transfer ownership" };

  const supabase = createAdminClient();

  // Verify new owner is a current admin on this team
  const { data: target } = await supabase
    .from("tenant_memberships")
    .select("id, role")
    .eq("tenant_id", session.teamId)
    .eq("user_id", newOwnerId)
    .is("removed_at", null)
    .single();

  if (!target) return { error: "Target user is not on this team" };
  if (target.role !== "admin") return { error: "Can only transfer ownership to an Admin" };

  // Promote new owner
  await supabase
    .from("tenant_memberships")
    .update({ role: "owner" })
    .eq("id", target.id);

  // Demote current owner to admin
  await supabase
    .from("tenant_memberships")
    .update({ role: "admin" })
    .eq("tenant_id", session.teamId)
    .eq("user_id", session.id)
    .is("removed_at", null);

  // Update tenants.owner_email
  const { data: newOwnerUser } = await supabase
    .from("users")
    .select("email")
    .eq("id", newOwnerId)
    .single();

  if (newOwnerUser) {
    await supabase
      .from("tenants")
      .update({ owner_email: newOwnerUser.email })
      .eq("id", session.teamId);
  }

  try { await supabase.rpc("refresh_team_members"); } catch { /* view may not exist yet */ }

  await logAudit(session.teamId, session.id, "ownership_transferred", "team", session.teamId, {
    new_owner_id: newOwnerId,
  });

  revalidatePath("/settings/team");
  return { data: { success: true } };
}

/**
 * Get offboarding impact for an agent before removal.
 */
export async function getOffboardImpact(userId: string): Promise<{ data?: OffboardImpact; error?: string }> {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  const supabase = createAdminClient();

  const [contacts, listings, deals, workflows, showings] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("realtor_id", userId),
    supabase.from("listings").select("*", { count: "exact", head: true }).eq("realtor_id", userId).in("status", ["active", "pending", "conditional"]),
    supabase.from("deals").select("*", { count: "exact", head: true }).eq("realtor_id", userId).neq("status", "closed"),
    supabase.from("workflow_enrollments").select("*", { count: "exact", head: true }).eq("realtor_id", userId).eq("status", "active"),
    supabase.from("appointments").select("*", { count: "exact", head: true }).eq("realtor_id", userId).in("status", ["pending", "confirmed"]).gte("start_time", new Date().toISOString()),
  ]);

  return {
    data: {
      contacts_count: contacts.count || 0,
      listings_count: listings.count || 0,
      deals_count: deals.count || 0,
      active_workflows_count: workflows.count || 0,
      scheduled_showings_count: showings.count || 0,
    },
  };
}

/**
 * Get recent team activity feed.
 */
export async function getTeamActivity(limit = 50) {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  const supabase = createAdminClient();

  const { data } = await supabase
    .from("team_activity_log")
    .select("*")
    .eq("team_id", session.teamId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return { data: data || [] };
}

/**
 * Cancel a pending invite.
 */
export async function cancelInvite(inviteId: string) {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  if (!checkTeamPermission({ user: session }, "team:invite_members")) {
    return { error: "You don't have permission to manage invites" };
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("team_invites")
    .update({ status: "expired" })
    .eq("id", inviteId)
    .eq("team_id", session.teamId)
    .in("status", ["pending", "sent"]);

  if (error) return { error: `Failed to cancel invite: ${error.message}` };

  revalidatePath("/settings/team");
  return { data: { success: true } };
}

/**
 * Toggle contact visibility between private and team.
 * Checks for duplicates when sharing with team.
 */
export async function toggleContactVisibility(contactId: string) {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  const supabase = createAdminClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, visibility, email, name, realtor_id")
    .eq("id", contactId)
    .eq("realtor_id", session.id)
    .single();

  if (!contact) return { error: "Contact not found" };

  const newVis = contact.visibility === "team" ? "private" : "team";

  // Check for duplicates when sharing with team
  if (newVis === "team" && contact.email) {
    const { data: memberships } = await supabase
      .from("tenant_memberships")
      .select("user_id")
      .eq("tenant_id", session.teamId)
      .is("removed_at", null);

    const memberIds = (memberships ?? [])
      .map((m: { user_id: string | null }) => m.user_id)
      .filter((id): id is string => !!id && id !== session.id);

    if (memberIds.length > 0) {
      const { data: duplicates } = await supabase
        .from("contacts")
        .select("id, name, realtor_id")
        .eq("email", contact.email)
        .eq("visibility", "team")
        .in("realtor_id", memberIds)
        .limit(1);

      if (duplicates && duplicates.length > 0) {
        return { warning: `A team member already has a contact with email ${contact.email}. Sharing anyway.`, duplicate: true };
      }
    }
  }

  const { error } = await supabase
    .from("contacts")
    .update({
      visibility: newVis,
      shared_at: newVis === "team" ? new Date().toISOString() : null,
      shared_by: newVis === "team" ? session.id : null,
    })
    .eq("id", contactId)
    .eq("realtor_id", session.id);

  if (error) return { error: `Failed to update visibility: ${error.message}` };

  revalidatePath(`/contacts/${contactId}`);
  revalidatePath("/contacts");
  return { data: { visibility: newVis } };
}

/**
 * Toggle listing visibility between private and team.
 */
export async function toggleListingVisibility(listingId: string) {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  const supabase = createAdminClient();

  const { data: listing } = await supabase
    .from("listings")
    .select("id, visibility")
    .eq("id", listingId)
    .eq("realtor_id", session.id)
    .single();

  if (!listing) return { error: "Listing not found" };

  const newVis = listing.visibility === "team" ? "private" : "team";

  const { error } = await supabase
    .from("listings")
    .update({
      visibility: newVis,
      shared_at: newVis === "team" ? new Date().toISOString() : null,
    })
    .eq("id", listingId)
    .eq("realtor_id", session.id);

  if (error) return { error: `Failed to update visibility: ${error.message}` };

  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/listings");
  return { data: { visibility: newVis } };
}

/**
 * Resend a pending invite (resets expiry).
 */
export async function resendInvite(inviteId: string) {
  const session = await getSession();
  if (!session.teamId) return { error: "Not on a team" };

  if (!checkTeamPermission({ user: session }, "team:invite_members")) {
    return { error: "You don't have permission to manage invites" };
  }

  const supabase = createAdminClient();
  const newExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const { error } = await supabase
    .from("team_invites")
    .update({
      expires_at: newExpiry.toISOString(),
      status: "sent",
    })
    .eq("id", inviteId)
    .eq("team_id", session.teamId)
    .in("status", ["pending", "sent"]);

  if (error) return { error: `Failed to resend invite: ${error.message}` };

  // Fetch invite details to send email
  const { data: invite } = await supabase
    .from("team_invites")
    .select("email, invite_token, role, inviter_name, team_name")
    .eq("id", inviteId)
    .single();

  if (invite) {
    try {
      const { sendEmail } = await import("@/lib/resend");
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteUrl = `${appUrl}/invite/accept?token=${invite.invite_token}`;
      const teamName = invite.team_name || "a team";
      const inviterName = invite.inviter_name || session.name;

      await sendEmail({
        to: invite.email,
        subject: `Reminder: ${inviterName} invited you to join ${teamName} on Realtors360`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
            <h1 style="color: #2D3E50; font-size: 24px; margin-bottom: 8px;">Reminder: You're invited!</h1>
            <p style="color: #555; font-size: 16px; line-height: 1.5;">
              <strong>${inviterName}</strong> invited you to join <strong>${teamName}</strong> as a <strong>${invite.role}</strong> on Realtors360.
            </p>
            <a href="${inviteUrl}" style="display: inline-block; background: #FF7A59; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin: 24px 0;">
              Accept Invite
            </a>
            <p style="color: #999; font-size: 13px; margin-top: 24px;">
              This invite expires in 30 days. If you didn't expect this, you can ignore it.
            </p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.error("[team] Failed to resend invite email:", emailErr);
    }
  }

  revalidatePath("/settings/team");
  return { data: { success: true } };
}
