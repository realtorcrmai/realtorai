import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTutorAuth } from "@/lib/english-tutor/auth";
import { assessCEFR } from "@/lib/english-tutor/claude";
import { buildCEFRAssessmentPrompt } from "@/lib/english-tutor/prompts";
import { scoreToCEFR } from "@/lib/english-tutor/cefr";

/**
 * GET /api/english-tutor/sessions/[id]
 * Get a session with its messages.
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

  const { data: messages } = await supabase
    .from("tutor_messages")
    .select("*")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  return NextResponse.json({ session, messages: messages ?? [] });
}

/**
 * PATCH /api/english-tutor/sessions/[id]
 * End a session — triggers CEFR assessment.
 * Body: { status: "completed" }
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutorAuth(req);
  if (!auth.authorized) return auth.error;

  const { id } = await params;
  const supabase = createAdminClient();

  // Verify ownership
  const { data: session, error: fetchError } = await supabase
    .from("tutor_sessions")
    .select("*")
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .single();

  if (fetchError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status === "completed") {
    return NextResponse.json({ error: "Session already completed" }, { status: 400 });
  }

  // Get all messages for CEFR assessment
  const { data: messages } = await supabase
    .from("tutor_messages")
    .select("role, content")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  if (!messages || messages.length < 2) {
    // Too short to assess, just close
    const { data: updated } = await supabase
      .from("tutor_sessions")
      .update({ status: "completed", ended_at: new Date().toISOString() })
      .eq("id", id)
      .select("*")
      .single();

    return NextResponse.json({ session: updated, assessment: null });
  }

  // Build conversation text for assessment
  const conversationText = messages
    .map((m) => `${m.role === "user" ? "Learner" : "Tutor"}: ${m.content}`)
    .join("\n\n");

  // Run CEFR assessment via Claude
  const assessmentPrompt = buildCEFRAssessmentPrompt(
    conversationText,
    auth.user.native_language
  );

  const assessment = await assessCEFR(assessmentPrompt);

  // Calculate duration
  const durationSeconds = Math.round(
    (Date.now() - new Date(session.created_at).getTime()) / 1000
  );

  // Aggregate corrections from all messages
  const allCorrections: unknown[] = [];
  const allVocabulary: unknown[] = [];

  const { data: detailedMessages } = await supabase
    .from("tutor_messages")
    .select("corrections, vocabulary")
    .eq("session_id", id)
    .eq("role", "assistant");

  if (detailedMessages) {
    for (const msg of detailedMessages) {
      if (Array.isArray(msg.corrections)) allCorrections.push(...msg.corrections);
      if (Array.isArray(msg.vocabulary)) allVocabulary.push(...msg.vocabulary);
    }
  }

  // Update session with assessment
  const { data: updated } = await supabase
    .from("tutor_sessions")
    .update({
      status: "completed",
      ended_at: new Date().toISOString(),
      cefr_score: assessment.cefr_level,
      fluency_score: assessment.scores.fluency,
      grammar_score: assessment.scores.grammar,
      vocabulary_score: assessment.scores.vocabulary,
      pronunciation_score: assessment.scores.pronunciation,
      duration_seconds: durationSeconds,
      summary: assessment.summary,
      corrections: allCorrections,
      strengths: assessment.strengths,
      areas_to_improve: assessment.areas_to_improve,
      vocabulary_learned: allVocabulary,
    })
    .eq("id", id)
    .select("*")
    .single();

  // Update user's CEFR level
  const newCEFR = scoreToCEFR(
    (assessment.scores.fluency +
      assessment.scores.grammar +
      assessment.scores.vocabulary +
      assessment.scores.pronunciation) /
      4
  );

  await supabase
    .from("tutor_users")
    .update({ cefr_level: newCEFR })
    .eq("id", auth.user.id);

  // Record CEFR history
  await supabase.from("tutor_cefr_history").insert({
    user_id: auth.user.id,
    session_id: id,
    cefr_level: newCEFR,
    scores: assessment.scores,
  });

  return NextResponse.json({ session: updated, assessment });
}
