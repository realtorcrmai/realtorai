import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

function cleanJsonResponse(text: string): string {
  return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

interface ListingContext {
  address: string;
  listPrice?: number | null;
  notes?: string | null;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  yearBuilt?: number;
  features?: string;
  showingInstructions?: string;
}

export async function generateMLSRemarks(listing: ListingContext): Promise<{
  publicRemarks: string;
  realtorRemarks: string;
}> {
  const message = await createWithRetry(anthropic, {
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a professional BC real estate copywriter. Generate two types of MLS remarks for a property listing.

Rules:
- Each must be MAXIMUM 500 characters (this is a hard limit)
- Use Canadian English spelling
- Be factual — never fabricate features
- Public remarks: Consumer-facing. Highlight key selling points, neighbourhood, lifestyle. Do NOT include agent contact info, commission details, or showing instructions.
- REALTOR remarks: Agent-only. Include showing instructions, access details, offer presentation preferences, and any agent-to-agent notes.

Respond with ONLY valid JSON (no markdown, no code fences) in this format:
{"publicRemarks": "...", "realtorRemarks": "..."}`,
    messages: [
      {
        role: "user",
        content: `Generate MLS remarks for this property:\n${JSON.stringify(listing, null, 2)}`,
      },
    ],
  });

  const raw =
    message.content[0].type === "text" ? message.content[0].text : "";
  const text = cleanJsonResponse(raw);
  try {
    const parsed = JSON.parse(text);
    return {
      publicRemarks: (parsed.publicRemarks ?? "").slice(0, 500),
      realtorRemarks: (parsed.realtorRemarks ?? "").slice(0, 500),
    };
  } catch {
    return {
      publicRemarks: text.slice(0, 500),
      realtorRemarks: "",
    };
  }
}

export async function generateContentPrompts(listing: ListingContext): Promise<{
  videoPrompt: string;
  imagePrompt: string;
  igCaption: string;
}> {
  const message = await createWithRetry(anthropic, {
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are a creative director for luxury real estate marketing. Generate three pieces of content for a property listing:

1. VIDEO PROMPT: A cinematic prompt for AI video generation (Kling AI). Describe camera movements, lighting, mood, and scenes. The video will be 9:16 (vertical for Instagram Reels/TikTok). Max 500 characters.

2. IMAGE PROMPT: A prompt for AI image generation (Kling AI). Describe the ideal hero shot — lighting, angle, style, atmosphere. The image will be 1:1 (square for Instagram). Max 500 characters.

3. INSTAGRAM CAPTION: A compelling caption with relevant hashtags for the listing post. Include 5-10 hashtags. Max 2200 characters.

Respond with ONLY valid JSON (no markdown, no code fences) in this format:
{"videoPrompt": "...", "imagePrompt": "...", "igCaption": "..."}`,
    messages: [
      {
        role: "user",
        content: `Generate content prompts for this property:\n${JSON.stringify(listing, null, 2)}`,
      },
    ],
  });

  const raw =
    message.content[0].type === "text" ? message.content[0].text : "";
  const text = cleanJsonResponse(raw);
  try {
    const parsed = JSON.parse(text);
    return {
      videoPrompt: parsed.videoPrompt ?? "",
      imagePrompt: parsed.imagePrompt ?? "",
      igCaption: parsed.igCaption ?? "",
    };
  } catch {
    return {
      videoPrompt: "",
      imagePrompt: "",
      igCaption: text,
    };
  }
}
