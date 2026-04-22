import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

// GET /api/team/audit-log — fetch audit log entries for the team
export async function GET(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  // Get team context from session
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  const user = session?.user as Record<string, unknown> | undefined;
  const teamId = user?.teamId as string | null;
  const teamRole = user?.teamRole as string | null;

  if (!teamId) {
    return NextResponse.json({ error: "Not on a team" }, { status: 400 });
  }

  if (teamRole !== "owner" && teamRole !== "admin") {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 200);

  // audit_log is team-scoped (no realtor_id), use raw client with team_id filter
  const { data, error } = await tc.raw
    .from("audit_log")
    .select("id, action, resource_type, resource_id, details, created_at, user_id")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}
