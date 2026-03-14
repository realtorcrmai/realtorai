import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireTutorAuth } from "@/lib/english-tutor/auth";
import { sendTutorMessage } from "@/lib/english-tutor/claude";
import { buildSystemPrompt } from "@/lib/english-tutor/prompts";
import type { Scenario } from "@/lib/english-tutor/types";

/**
 * POST /api/english-tutor/sessions/[id]/message
 * Send a user message and get the tutor's response.
 * Body: { content: string }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireTutorAuth(req);
  if (!auth.authorized) return auth.error;

  const { id: sessionId } = await params;
  const body = await req.json();

  if (!body.content || typeof body.content !== "string") {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Verify session ownership and status
  const { data: session, error: sessionError } = await supabase
    .from("tutor_sessions")
    .select("*")
    .eq("id", sessionId)
    .eq("user_id", auth.user.id)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (session.status !== "active") {
    return NextResponse.json(
      { error: "Session is not active" },
      { status: 400 }
    );
  }

  // Get conversation history
  const { data: existingMessages } = await supabase
    .from("tutor_messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const conversationHistory = (existingMessages ?? [])
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // Build system prompt
  const systemPrompt = buildSystemPrompt(session.scenario as Scenario, {
    userName: auth.user.name,
    nativeLanguage: auth.user.native_language,
    cefrLevel: auth.user.cefr_level as "A1" | "A2" | "B1" | "B2" | "C1" | "C2",
    interests: auth.user.interests || [],
    profession: auth.user.profession,
  });

  // Save user message
  await supabase.from("tutor_messages").insert({
    session_id: sessionId,
    role: "user",
    content: body.content,
  });

  // Get tutor response from Claude
  const tutorResponse = await sendTutorMessage(
    systemPrompt,
    conversationHistory,
    body.content
  );

  // Save assistant message with corrections and vocabulary
  await supabase.from("tutor_messages").insert({
    session_id: sessionId,
    role: "assistant",
    content: tutorResponse.reply,
    corrections: tutorResponse.corrections,
    vocabulary: tutorResponse.vocabulary,
  });

  return NextResponse.json({
    reply: tutorResponse.reply,
    corrections: tutorResponse.corrections,
    vocabulary: tutorResponse.vocabulary,
  });
}
