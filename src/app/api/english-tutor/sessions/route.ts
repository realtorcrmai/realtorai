import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTutorAuth } from "@/lib/english-tutor/auth";
import type { Scenario } from "@/lib/english-tutor/types";

const VALID_SCENARIOS: Scenario[] = [
  "free-talk",
  "job-interview",
  "meeting",
  "presentation",
  "daily-life",
  "debate",
];

/**
 * POST /api/english-tutor/sessions
 * Start a new conversation session.
 * Body: { scenario?: Scenario }
 */
export async function POST(req: NextRequest) {
  const auth = await requireTutorAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json().catch(() => ({}));
  const scenario = (body.scenario as Scenario) || "free-talk";

  if (!VALID_SCENARIOS.includes(scenario)) {
    return NextResponse.json(
      { error: `Invalid scenario. Must be one of: ${VALID_SCENARIOS.join(", ")}` },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tutor_sessions")
    .insert({
      user_id: auth.user.id,
      scenario,
    })
    .select("id, scenario, status, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, session: data },
    { status: 201 }
  );
}

/**
 * GET /api/english-tutor/sessions
 * List user's sessions, newest first.
 * Query: ?limit=20&status=completed
 */
export async function GET(req: NextRequest) {
  const auth = await requireTutorAuth(req);
  if (!auth.authorized) return auth.error;

  const supabase = createAdminClient();
  const params = req.nextUrl.searchParams;

  let query = supabase
    .from("tutor_sessions")
    .select("id, scenario, status, cefr_score, fluency_score, grammar_score, vocabulary_score, pronunciation_score, duration_seconds, created_at, ended_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false });

  const status = params.get("status");
  if (status) {
    query = query.eq("status", status);
  }

  const limit = params.get("limit");
  query = query.limit(limit ? Number(limit) : 20);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sessions: data ?? [], count: data?.length ?? 0 });
}
