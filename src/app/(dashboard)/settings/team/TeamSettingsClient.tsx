"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  inviteMember,
  updateMemberRole,
  removeMember,
  cancelInvite,
  resendInvite,
  leaveTeam,
} from "@/actions/team";
import type { TeamRole, TeamMemberWithUser } from "@/types/team";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";

interface InviteData {
  id: string;
  email: string;
  role: string;
  expires_at: string;
}

interface Props {
  team: { name: string };
  members: TeamMemberWithUser[];
  pendingInvites: InviteData[];
  seatCount: number;
  maxSeats: number;
  currentUserId: string;
  isAdmin: boolean;
  currentRole: string;
}

export default function TeamSettingsClient({
  team,
  members,
  pendingInvites,
  seatCount,
  maxSeats,
  currentUserId,
  isAdmin,
  currentRole,
}: Props) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("agent");
  const [inviting, setInviting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleInvite = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setMessage(null);

    const result = await inviteMember({ email: inviteEmail.trim(), role: inviteRole });

    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: `Invite sent to ${inviteEmail}` });
      setInviteEmail("");
      router.refresh();
    }
    setInviting(false);
  };

  const handleRoleChange = async (membershipId: string, newRole: TeamRole) => {
    const result = await updateMemberRole({ membership_id: membershipId, new_role: newRole });
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      router.refresh();
    }
  };

  const handleRemove = async (userId: string) => {
    const result = await removeMember(userId);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Member removed" });
      setConfirmRemove(null);
      router.refresh();
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    const result = await cancelInvite(inviteId);
    if (result.error) setMessage({ type: "error", text: result.error });
    else router.refresh();
  };

  const handleResendInvite = async (inviteId: string) => {
    const result = await resendInvite(inviteId);
    if (result.error) setMessage({ type: "error", text: result.error });
    else {
      setMessage({ type: "success", text: "Invite resent" });
      router.refresh();
    }
  };

  const handleLeave = async () => {
    setLeaving(true);
    const result = await leaveTeam();
    if (result.error) {
      setMessage({ type: "error", text: result.error });
      setLeaving(false);
    } else {
      // Hard navigate to force full server re-render — updateSession() hangs
      // in NextAuth v5 beta 30, so use window.location instead
      window.location.href = "/settings/team";
    }
  };

  const ROLE_STYLES: Record<string, string> = {
    owner: "bg-brand/10 text-brand",
    admin: "bg-primary/10 text-primary",
    agent: "bg-success/10 text-success",
    assistant: "bg-warning/10 text-warning",
  };

  const roleBadge = (role: string) => (
    <span className={`inline-block px-2 py-0.5 text-xs rounded-full font-medium capitalize ${ROLE_STYLES[role] || "bg-muted text-muted-foreground"}`}>
      {role}
    </span>
  );

  return (
    <>
      <PageHeader
        title={team.name}
        subtitle={isAdmin
          ? `${seatCount}/${maxSeats} seats used · You are the team ${currentRole}`
          : `You are a team ${currentRole}`
        }
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Team" },
        ]}
        actions={
          currentRole !== "owner" ? (
            leaving ? (
              <span className="text-sm text-muted-foreground">Leaving...</span>
            ) : (
              <button
                onClick={handleLeave}
                className="px-3 py-1.5 text-sm border border-destructive/30 text-destructive rounded-md hover:bg-destructive/10 transition-colors"
                aria-label="Leave team"
              >
                Leave Team
              </button>
            )
          ) : undefined
        }
      />

      <div className="p-6 max-w-4xl mx-auto">
        {message && (
          <div
            className={`mb-4 p-3 rounded-md text-sm ${
              message.type === "error" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
            }`}
            role="alert"
          >
            {message.text}
          </div>
        )}

        {/* Invite Section — admin only */}
        {isAdmin && (
          <section className="bg-card border border-border rounded-lg p-5 mb-6">
            <h2 className="text-lg font-semibold mb-3">Invite New Member</h2>
            <form onSubmit={handleInvite} className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label htmlFor="invite-email" className="text-sm text-muted-foreground block mb-1">
                  Email address
                </label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="agent@example.com"
                  className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  aria-label="Invite email address"
                />
              </div>
              <div>
                <label htmlFor="invite-role" className="text-sm text-muted-foreground block mb-1">
                  Role
                </label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  aria-label="Select role for invite"
                >
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                  <option value="assistant">Assistant</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                className="px-4 py-2 bg-brand text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
                aria-label="Send invite"
              >
                {inviting ? "Sending..." : "Invite"}
              </button>
            </form>
          </section>
        )}

        {/* Members Table */}
        <section className="bg-card border border-border rounded-lg p-5 mb-6">
          <h2 className="text-lg font-semibold mb-3">
            Members ({members.length})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" aria-label="Team members">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Email</th>
                  <th className="pb-2 pr-4">Role</th>
                  <th className="pb-2 pr-4">Joined</th>
                  {isAdmin && <th className="pb-2">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {members.map((member: TeamMemberWithUser) => (
                  <tr key={member.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3 pr-4 font-medium">
                      {member.user?.name || member.agent_email.split("@")[0]}
                      {member.user_id === currentUserId && (
                        <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{member.agent_email}</td>
                    <td className="py-3 pr-4">
                      {!isAdmin || member.role === "owner" || member.user_id === currentUserId ? (
                        roleBadge(member.role)
                      ) : (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as TeamRole)}
                          className="text-sm border border-border rounded px-2 py-1 bg-background"
                          aria-label={`Change role for ${member.agent_email}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="agent">Agent</option>
                          <option value="assistant">Assistant</option>
                        </select>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground text-xs">
                      {member.joined_at
                        ? new Date(member.joined_at).toLocaleDateString()
                        : "—"}
                    </td>
                    {isAdmin && (
                      <td className="py-3">
                        {member.role !== "owner" && member.user_id !== currentUserId && member.user_id && (
                          confirmRemove === member.user_id ? (
                            <span className="flex gap-2">
                              <button
                                onClick={() => handleRemove(member.user_id!)}
                                className="text-xs text-white bg-destructive px-2 py-0.5 rounded hover:opacity-90"
                                aria-label={`Confirm remove ${member.agent_email}`}
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setConfirmRemove(null)}
                                className="text-xs text-muted-foreground hover:underline"
                              >
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <button
                              onClick={() => setConfirmRemove(member.user_id!)}
                              className="text-xs text-destructive hover:underline"
                              aria-label={`Remove ${member.agent_email}`}
                            >
                              Remove
                            </button>
                          )
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Pending Invites — admin only */}
        {isAdmin && pendingInvites.length > 0 && (
          <section className="bg-card border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold mb-3">
              Pending Invites ({pendingInvites.length})
            </h2>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                >
                  <div>
                    <span className="text-sm font-medium">{invite.email}</span>
                    <span className="ml-2">{roleBadge(invite.role)}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      Expires {new Date(invite.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResendInvite(invite.id)}
                      className="text-xs text-brand hover:underline"
                      aria-label={`Resend invite to ${invite.email}`}
                    >
                      Resend
                    </button>
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="text-xs text-destructive hover:underline"
                      aria-label={`Cancel invite to ${invite.email}`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
