import Anthropic from "@anthropic-ai/sdk";
import type { TutorResponse, Correction, VocabularyItem } from "./types";

function getClient() {
  const key = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error("CLAUDE_API_KEY is not set in .env.local");
  }
  return new Anthropic({ apiKey: key });
}

interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Send a message to Claude and get a tutor response (non-streaming).
 * Parses the JSON correction block from Claude's response.
 */
export async function sendTutorMessage(
  systemPrompt: string,
  conversationHistory: ConversationMessage[],
  userMessage: string
): Promise<TutorResponse> {
  const messages: ConversationMessage[] = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const fullText =
    response.content[0].type === "text" ? response.content[0].text : "";

  return parseResponse(fullText);
}

/**
 * Stream a tutor response. Returns an async generator of text chunks
 * and the final parsed response with corrections.
 */
export async function streamTutorMessage(
  systemPrompt: string,
  conversationHistory: ConversationMessage[],
  userMessage: string
): Promise<{ stream: AsyncIterable<string>; getResult: () => Promise<TutorResponse> }> {
  const messages: ConversationMessage[] = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  const stream = getClient().messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  let fullText = "";

  const textStream = (async function* () {
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        fullText += event.delta.text;
        yield event.delta.text;
      }
    }
  })();

  const getResult = async (): Promise<TutorResponse> => {
    // Ensure stream is fully consumed
    if (!fullText) {
      const finalMessage = await stream.finalMessage();
      fullText =
        finalMessage.content[0].type === "text"
          ? finalMessage.content[0].text
          : "";
    }
    return parseResponse(fullText);
  };

  return { stream: textStream, getResult };
}

/**
 * Assess CEFR level from a conversation using Claude.
 */
export async function assessCEFR(
  assessmentPrompt: string
): Promise<{
  cefr_level: string;
  scores: { fluency: number; grammar: number; vocabulary: number; pronunciation: number };
  strengths: string[];
  areas_to_improve: string[];
  summary: string;
}> {
  const response = await getClient().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: assessmentPrompt }],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[1]);
  }

  // Try parsing the whole text as JSON
  return JSON.parse(text);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parseResponse(fullText: string): TutorResponse {
  let reply = fullText;
  let corrections: Correction[] = [];
  let vocabulary: VocabularyItem[] = [];

  // Extract JSON block from the end of the response
  const jsonMatch = fullText.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    // Remove the JSON block from the visible reply
    reply = fullText.replace(/```json\s*[\s\S]*?\s*```/, "").trim();

    try {
      const parsed = JSON.parse(jsonMatch[1]);
      corrections = parsed.corrections || [];
      vocabulary = parsed.vocabulary || [];
    } catch {
      // JSON parse failed, return reply without corrections
    }
  }

  return { reply, corrections, vocabulary };
}
