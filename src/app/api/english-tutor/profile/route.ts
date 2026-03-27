import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTutorAuth } from "@/lib/english-tutor/auth";
import type { CEFRLevel } from "@/lib/english-tutor/types";

/**
 * GET /api/english-tutor/profile
 * Get the current user's profile.
 */
export async function GET(req: NextRequest) {
  const auth = await requireTutorAuth(req);
  if (!auth.authorized) return auth.error;

  // Get session stats
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("tutor_sessions")
    .select("*", { count: "exact", head: true })
    .eq("user_id", auth.user.id)
    .eq("status", "completed");

  return NextResponse.json({
    profile: {
      id: auth.user.id,
      name: auth.user.name,
      native_language: auth.user.native_language,
      cefr_level: auth.user.cefr_level,
      interests: auth.user.interests,
      profession: auth.user.profession,
      total_sessions: count ?? 0,
      created_at: auth.user.created_at,
    },
  });
}

/**
 * PATCH /api/english-tutor/profile
 * Update user profile fields.
 * Body: { name?, native_language?, cefr_level?, interests?, profession? }
 */
export async function PATCH(req: NextRequest) {
  const auth = await requireTutorAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.name) updates.name = body.name;
  if (body.native_language) updates.native_language = body.native_language;
  if (body.interests) updates.interests = body.interests;
  if (body.profession !== undefined) updates.profession = body.profession;

  if (body.cefr_level) {
    const valid: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
    if (!valid.includes(body.cefr_level)) {
      return NextResponse.json(
        { error: "Invalid CEFR level" },
        { status: 400 }
      );
    }
    updates.cefr_level = body.cefr_level;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tutor_users")
    .update(updates)
    .eq("id", auth.user.id)
    .select("id, name, native_language, cefr_level, interests, profession")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: data });
}
