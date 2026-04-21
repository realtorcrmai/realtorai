"use client";

import { useState } from "react";
import {
  inviteMember,
  updateMemberRole,
  removeMember,
  cancelInvite,
  resendInvite,
} from "@/actions/team";
import type { TeamOverview, TeamRole, TeamMemberWithUser } from "@/types/team";
import { useRouter } from "next/navigation";

interface Props {
  overview: TeamOverview;
  currentUserId: string;
}

export default function TeamSettingsClient({ overview, currentUserId }: Props) {
  const router = useRouter();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<TeamRole>("agent");
  const [inviting, setInviting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleInvite = async () => {
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

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from the team? They will lose access to shared data.`)) return;
    const result = await removeMember(userId);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Member removed" });
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

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-foreground mb-1">Team Settings</h1>
      <p className="text-muted-foreground mb-6">
        {overview.team.name} — {overview.seat_count}/{overview.max_seats} seats used
      </p>

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

      {/* Invite Section */}
      <section className="bg-card border border-border rounded-lg p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">Invite New Member</h2>
        <div className="flex gap-2 items-end flex-wrap">
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
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim()}
            className="px-4 py-2 bg-brand text-white rounded-md hover:opacity-90 disabled:opacity-50 transition-opacity"
            aria-label="Send invite"
          >
            {inviting ? "Sending..." : "Invite"}
          </button>
        </div>
      </section>

      {/* Members Table */}
      <section className="bg-card border border-border rounded-lg p-5 mb-6">
        <h2 className="text-lg font-semibold mb-3">
          Members ({overview.members.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-label="Team members">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Role</th>
                <th className="pb-2 pr-4">Joined</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {overview.members.map((member: TeamMemberWithUser) => (
                <tr key={member.id} className="border-b border-border/50">
                  <td className="py-3 pr-4 font-medium">
                    {member.user?.name || member.agent_email.split("@")[0]}
                    {member.user_id === currentUserId && (
                      <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-muted-foreground">{member.agent_email}</td>
                  <td className="py-3 pr-4">
                    {member.role === "owner" ? (
                      <span className="inline-block px-2 py-0.5 bg-brand/10 text-brand text-xs rounded-full font-medium">
                        Owner
                      </span>
                    ) : member.user_id === currentUserId ? (
                      <span className="capitalize text-muted-foreground">{member.role}</span>
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
                  <td className="py-3">
                    {member.role !== "owner" && member.user_id !== currentUserId && member.user_id && (
                      <button
                        onClick={() => handleRemove(member.user_id!, member.user?.name || member.agent_email)}
                        className="text-xs text-destructive hover:underline"
                        aria-label={`Remove ${member.agent_email}`}
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending Invites */}
      {overview.pending_invites.length > 0 && (
        <section className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-lg font-semibold mb-3">
            Pending Invites ({overview.pending_invites.length})
          </h2>
          <div className="space-y-2">
            {overview.pending_invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
              >
                <div>
                  <span className="text-sm font-medium">{invite.email}</span>
                  <span className="ml-2 text-xs text-muted-foreground capitalize">({invite.role})</span>
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
  );
}
