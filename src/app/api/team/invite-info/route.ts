import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET /api/team/invite-info?token=xxx — public endpoint to fetch invite details
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: invite, error } = await supabase
    .from("team_invites")
    .select("email, role, inviter_name, team_name, status, expires_at")
    .eq("invite_token", token)
    .single();

  if (error || !invite) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (invite.status !== "pending" && invite.status !== "sent") {
    return NextResponse.json({ error: `This invite has already been ${invite.status}` }, { status: 410 });
  }

  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 410 });
  }

  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    inviter_name: invite.inviter_name || "A team member",
    team_name: invite.team_name || "a team",
  });
}
