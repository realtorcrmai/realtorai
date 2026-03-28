import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTutorAuth } from "@/lib/english-tutor/auth";

/**
 * GET /api/english-tutor/sessions/[id]/report
 * Get the session report (only available after session is completed).
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutorAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: session, error } = await supabase
    .from("tutor_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "completed") {
    return NextResponse.json(
      { error: "Session has not been completed yet. PATCH the session with status: completed first." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    report: {
      session_id: session.id,
      scenario: session.scenario,
      duration_seconds: session.duration_seconds,
      cefr_score: session.cefr_score,
      scores: {
        fluency: session.fluency_score,
        grammar: session.grammar_score,
        vocabulary: session.vocabulary_score,
        pronunciation: session.pronunciation_score,
      },
      corrections: session.corrections,
      vocabulary_learned: session.vocabulary_learned,
      summary: session.summary,
      strengths: session.strengths,
      areas_to_improve: session.areas_to_improve,
    },
  });
}
