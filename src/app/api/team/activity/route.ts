import { NextRequest, NextResponse } from "next/server";
import { getTeamActivity } from "@/actions/team";

// GET /api/team/activity?limit=N — fetch team activity log
export async function GET(req: NextRequest) {
  const rawLimit = parseInt(req.nextUrl.searchParams.get("limit") || "20");
  const limit = Number.isNaN(rawLimit) ? 20 : Math.min(Math.max(rawLimit, 1), 100);

  const result = await getTeamActivity(limit);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result.data);
}
