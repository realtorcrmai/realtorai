import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTutorAuth } from "@/lib/english-tutor/auth";

/**
 * GET /api/english-tutor/profile/history
 * Get CEFR level history for progress tracking.
 * Query: ?limit=50
 */
export async function GET(req: NextRequest) {
  const auth = await requireTutorAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;
  const limit = params.get("limit") ? Number(params.get("limit")) : 50;

  const { data: history, error } = await supabase
    .from("tutor_cefr_history")
    .select("id, cefr_level, scores, assessed_at, session_id")
    .eq("user_id", auth.user.id)
    .order("assessed_at", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    history: history ?? [],
    current_level: auth.user.cefr_level,
  });
}
