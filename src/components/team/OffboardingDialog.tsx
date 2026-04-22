"use client";

import { useState, useEffect } from "react";
import { getOffboardImpact, removeMember, getTeamMembers } from "@/actions/team";
import type { OffboardImpact, TeamMemberWithUser } from "@/types/team";

interface Props {
  userId: string;
  userName: string;
  currentUserId: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function OffboardingDialog({ userId, userName, currentUserId, onComplete, onCancel }: Props) {
  const [impact, setImpact] = useState<OffboardImpact | null>(null);
  const [members, setMembers] = useState<TeamMemberWithUser[]>([]);
  const [reassignTo, setReassignTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getOffboardImpact(userId),
      getTeamMembers(),
    ]).then(([impactRes, membersRes]) => {
      if (impactRes.data) setImpact(impactRes.data);
      if (membersRes.data) {
        setMembers(membersRes.data.filter((m) => m.user_id !== userId && m.user_id !== null));
      }
      setLoading(false);
    });
  }, [userId]);

  const totalImpact = impact
    ? impact.contacts_count + impact.listings_count + impact.deals_count + impact.active_workflows_count + impact.scheduled_showings_count
    : 0;

  async function handleRemove() {
    setRemoving(true);
    setError(null);

    // TODO: In future, reassign records before removal.
    // For now, records stay with the removed user's realtor_id.
    const result = await removeMember(userId);
    if (result.error) {
      setError(result.error);
      setRemoving(false);
    } else {
      onComplete();
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-lg">
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-muted-foreground/30 border-t-brand animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-lg">
        <h2 className="text-lg font-bold">Remove {userName}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review the impact before removing this team member.
        </p>

        {/* Impact summary */}
        {impact && totalImpact > 0 && (
          <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm space-y-1">
            <p className="font-medium text-amber-800">This member has active records:</p>
            {impact.contacts_count > 0 && (
              <p className="text-amber-700">📇 {impact.contacts_count} contacts</p>
            )}
            {impact.listings_count > 0 && (
              <p className="text-amber-700">🏠 {impact.listings_count} active listings</p>
            )}
            {impact.deals_count > 0 && (
              <p className="text-amber-700">💼 {impact.deals_count} open deals</p>
            )}
            {impact.active_workflows_count > 0 && (
              <p className="text-amber-700">⚡ {impact.active_workflows_count} active workflows</p>
            )}
            {impact.scheduled_showings_count > 0 && (
              <p className="text-amber-700">📅 {impact.scheduled_showings_count} upcoming showings</p>
            )}
          </div>
        )}

        {totalImpact === 0 && (
          <div className="mt-4 p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            This member has no active records. Safe to remove.
          </div>
        )}

        {/* Reassignment selector (shown when impact > 0) */}
        {totalImpact > 0 && members.length > 0 && (
          <div className="mt-4">
            <label className="text-xs text-muted-foreground block mb-1">Reassign records to (optional)</label>
            <select
              value={reassignTo}
              onChange={(e) => setReassignTo(e.target.value)}
              className="w-full h-9 px-3 text-sm rounded-lg border border-border bg-background"
            >
              <option value="">Keep with removed member</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id!}>
                  {m.user?.name || m.agent_email}
                  {m.user_id === currentUserId ? " (me)" : ""}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground mt-1">
              {reassignTo
                ? "Records will be transferred after removal."
                : "Records will remain but won't appear in team view."}
            </p>
          </div>
        )}

        {error && (
          <div className="mt-3 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onCancel}
            disabled={removing}
            className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={handleRemove}
            disabled={removing}
            className="px-4 py-2 text-sm rounded-lg bg-destructive text-white hover:opacity-90 disabled:opacity-50"
          >
            {removing ? "Removing..." : totalImpact > 0 ? "Remove Anyway" : "Remove Member"}
          </button>
        </div>
      </div>
    </div>
  );
}
