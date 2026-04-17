import { NextRequest, NextResponse } from "next/server";
import { requireVoiceAgentAuth } from "@/lib/voice-agent-auth";
import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";
import { z } from "zod";

const draftSchema = z.object({
  contact_name: z.string().min(1),
  contact_type: z.string().default("client"),
  contact_notes: z.string().default(""),
  email_type: z.string().default("follow_up"),
  context: z.string().default(""),
  contact_email: z.string().default(""),
});

/**
 * POST /api/voice-agent/draft-email
 * Generate an actual email draft using Claude, optimized for voice agent use.
 */
export async function POST(req: NextRequest) {
  const auth = await requireVoiceAgentAuth(req);
  if (!auth.authorized) return auth.error;

  const body = await req.json();
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", issues: parsed.error.issues }, { status: 400 });
  }

  const { contact_name, contact_type, contact_notes, email_type, context } = parsed.data;

  const anthropic = new Anthropic();

  const typeLabels: Record<string, string> = {
    follow_up: "a professional follow-up",
    introduction: "a warm introduction",
    listing_update: "a listing status update",
    market_update: "a market update",
    thank_you: "a thank-you note",
    check_in: "a friendly check-in",
    appointment_reminder: "an appointment reminder",
  };

  const typeLabel = typeLabels[email_type] || `a ${email_type.replace(/_/g, " ")}`;

  const message = await createWithRetry(anthropic, {
    model: "claude-opus-4-6",
    max_tokens: 600,
    system: `You are a professional real estate agent's email assistant. Write concise, warm, professional emails. Return ONLY valid JSON with "subject" and "body" keys. The body should be plain text (no HTML). Keep emails under 150 words.`,
    messages: [{
      role: "user",
      content: `Write ${typeLabel} email to ${contact_name} (${contact_type}).${contact_notes ? ` Notes about them: ${contact_notes}` : ""}${context ? ` Additional context: ${context}` : ""}\n\nReturn JSON: {"subject": "...", "body": "..."}`,
    }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const draft = JSON.parse(jsonMatch[0]);
      return NextResponse.json({
        subject: draft.subject || "Follow up",
        body: draft.body || text,
        to: contact_name,
        email_type,
      });
    }
  } catch {
    // Parse failed — return raw text as body
  }

  return NextResponse.json({
    subject: `${email_type.replace(/_/g, " ")} — ${contact_name}`,
    body: text,
    to: contact_name,
    email_type,
  });
}
