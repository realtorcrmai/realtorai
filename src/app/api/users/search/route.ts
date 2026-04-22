import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";

// GET /api/users/search?q=email — search existing portal users for invite autocomplete
export async function GET(req: NextRequest) {
  let tc;
  try { tc = await getAuthenticatedTenantClient(); }
  catch { return NextResponse.json({ error: "Authentication required" }, { status: 401 }); }

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q || q.length < 2) return NextResponse.json([]);

  // Sanitize: strip special Postgres pattern chars to prevent injection via .or()
  const safe = q.replace(/[%_\\'"]/g, "");
  if (!safe) return NextResponse.json([]);

  const { data } = await tc.raw
    .from("users")
    .select("id, name, email, team_id")
    .or(`email.ilike.%${safe}%,name.ilike.%${safe}%`)
    .neq("id", tc.realtorId)
    .limit(5);

  return NextResponse.json(
    (data ?? []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      hasTeam: !!u.team_id,
    }))
  );
}
