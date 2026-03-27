import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomBytes } from "crypto";
import type { CEFRLevel } from "@/lib/english-tutor/types";

/**
 * POST /api/english-tutor/auth/register
 * Create a new tutor user and return their API key.
 * Body: { name, native_language?, cefr_level?, interests?, profession? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();

  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }

  const validLevels: CEFRLevel[] = ["A1", "A2", "B1", "B2", "C1", "C2"];
  if (body.cefr_level && !validLevels.includes(body.cefr_level)) {
    return NextResponse.json(
      { error: "Invalid CEFR level. Must be one of: A1, A2, B1, B2, C1, C2" },
      { status: 400 }
    );
  }

  const apiKey = `et_${randomBytes(32).toString("hex")}`;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tutor_users")
    .insert({
      name: body.name,
      native_language: body.native_language || "Hindi",
      cefr_level: body.cefr_level || "B1",
      interests: body.interests || [],
      profession: body.profession || null,
      api_key: apiKey,
    })
    .select("id, name, cefr_level")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    {
      ok: true,
      user_id: data.id,
      name: data.name,
      cefr_level: data.cefr_level,
      api_key: apiKey,
    },
    { status: 201 }
  );
}
