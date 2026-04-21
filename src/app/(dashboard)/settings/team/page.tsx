export const dynamic = "force-dynamic";

import { getTeamOverview } from "@/actions/team";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import TeamSettingsClient from "./TeamSettingsClient";

export default async function TeamSettingsPage() {
  const session = await auth();
  const user = session?.user as Record<string, unknown> | undefined;
  const teamId = user?.teamId as string | null;
  const teamRole = user?.teamRole as string | null;

  // Solo users or non-admin roles: redirect
  if (!teamId) {
    redirect("/settings");
  }

  if (teamRole !== "owner" && teamRole !== "admin") {
    redirect("/settings");
  }

  const result = await getTeamOverview();

  if (result.error || !result.data) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Team Settings</h1>
        <p className="text-destructive">{result.error || "Failed to load team data"}</p>
      </div>
    );
  }

  return <TeamSettingsClient overview={result.data} currentUserId={user?.id as string} />;
}
