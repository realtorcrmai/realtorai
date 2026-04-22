import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/team/audit-log — fetch audit log entries for the team
export async function GET(req: NextRequest) {
  // Auth check via session
  const { auth } = await import("@/lib/auth");
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const user = session.user as Record<string, unknown>;
  const teamId = user.teamId as string | null;
  const teamRole = user.teamRole as string | null;

  if (!teamId) {
    return NextResponse.json({ error: "Not on a team" }, { status: 400 });
  }

  // Only owner/admin can view audit log
  if (teamRole !== "owner" && teamRole !== "admin") {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") || "50");
  const limit = Number.isNaN(rawLimit) ? 50 : Math.min(Math.max(rawLimit, 1), 200);

  const supabase = createAdminClient();
  const { data, error } = await supabase
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
