export const dynamic = "force-dynamic";

import { getTeamOverview, getTeamBasicInfo } from "@/actions/team";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TeamSettingsClient from "./TeamSettingsClient";
import CreateTeamClient from "./CreateTeamClient";

export default async function TeamSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as Record<string, unknown>;
  const userId = user?.id as string | undefined;
  if (!userId) redirect("/login");

  const teamId = user?.teamId as string | null;
  const teamRole = (user?.teamRole as string) || "";
  const isAdmin = teamRole === "owner" || teamRole === "admin";

  // ── Solo user: show Create Team page ──
  if (!teamId) {
    return <CreateTeamClient />;
  }

  // ── Owner/Admin: full management view with invites ──
  if (isAdmin) {
    const result = await getTeamOverview();

    if (result.error || !result.data) {
      return (
        <div className="p-6">
          <h1 className="text-2xl font-bold mb-4">Team</h1>
          <p className="text-destructive">{result.error || "Failed to load team data"}</p>
        </div>
      );
    }

    return (
      <TeamSettingsClient
        team={{ name: result.data.team.name }}
        members={result.data.members}
        pendingInvites={result.data.pending_invites}
        seatCount={result.data.seat_count}
        maxSeats={result.data.max_seats}
        currentUserId={userId}
        isAdmin
        currentRole={teamRole}
      />
    );
  }

  // ── Agent/Assistant: read-only member list ──
  const basicResult = await getTeamBasicInfo();

  if (basicResult.error || !basicResult.data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Team</h1>
        <p className="text-destructive">{basicResult.error || "Failed to load team data"}</p>
      </div>
    );
  }

  return (
    <TeamSettingsClient
      team={{ name: basicResult.data.name }}
      members={basicResult.data.members}
      pendingInvites={[]}
      seatCount={basicResult.data.members.length}
      maxSeats={basicResult.data.maxMembers}
      currentUserId={userId}
      isAdmin={false}
      currentRole={teamRole}
    />
  );
}
