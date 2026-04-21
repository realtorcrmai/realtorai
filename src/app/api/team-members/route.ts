import { NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/team-members — list active team members for assignment pickers
export async function GET() {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const admin = createAdminClient();

  // Get current user's team_id
  const { data: currentUser } = await admin
    .from("users")
    .select("id, name, email, team_id")
    .eq("id", tc.realtorId)
    .single();

  if (!currentUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If user has a team, fetch all active team members
  if (currentUser.team_id) {
    const { data: memberships } = await admin
      .from("tenant_memberships")
      .select("user_id, role, users(id, name, email)")
      .eq("tenant_id", currentUser.team_id)
      .is("removed_at", null);

    const members = (memberships ?? [])
      .filter((m) => m.users)
      .map((m) => {
        const user = m.users as unknown as { id: string; name: string | null; email: string };
        return {
          id: user.id,
          name: user.name || user.email,
          email: user.email,
          role: m.role,
          is_current: user.id === tc.realtorId,
        };
      });

    return NextResponse.json(members);
  }

  // Solo user — return just themselves
  return NextResponse.json([{
    id: currentUser.id,
    name: currentUser.name || currentUser.email,
    email: currentUser.email,
    role: "owner",
    is_current: true,
  }]);
}
