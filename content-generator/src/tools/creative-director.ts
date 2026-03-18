import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

function cleanJsonResponse(text: string): string {
  return text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

export interface ListingContext {
  address: string;
  listPrice?: number | null;
  notes?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  sqft?: number | null;
  yearBuilt?: number | null;
  lotSize?: string | null;
  propertyType?: string | null;
  features?: string | null;
  showingInstructions?: string | null;
  mlsNumber?: string | null;
  sellerName?: string | null;
  // Enrichment data
  neighbourhood?: string | null;
  zoning?: string | null;
  assessedValue?: number | null;
  strataFees?: number | null;
  lotDimensions?: string | null;
}

export async function generateMLSRemarks(listing: ListingContext): Promise<{
  publicRemarks: string;
  realtorRemarks: string;
}> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: `You are a professional BC real estate copywriter. Generate two types of MLS remarks for a property listing.

Rules:
- Each must be MAXIMUM 500 characters (this is a hard limit)
- Use Canadian English spelling
- Be factual — never fabricate features not provided in the listing data
- Reference specific property details when available (bedrooms, bathrooms, sqft, year built, lot size, features)
- If enrichment data is provided (neighbourhood, zoning, assessed value, strata fees), weave relevant details in naturally
- Public remarks: Consumer-facing. Highlight key selling points, neighbourhood, lifestyle. Do NOT include agent contact info, commission details, or showing instructions.
- REALTOR remarks: Agent-only. Include showing instructions, access details, offer presentation preferences, and any agent-to-agent notes. Reference the lockbox/showing window if provided.

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
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are a creative director for luxury real estate marketing in British Columbia. Generate three pieces of content for a property listing.

Use ALL available property details to create highly specific, compelling content. Reference actual features (bedrooms, bathrooms, sqft, year built, lot size, property type) — never generic fluff. If neighbourhood or assessment data is available, incorporate location-specific details.

1. VIDEO PROMPT: A cinematic prompt for AI video generation (Kling AI). Describe camera movements, lighting, mood, and scenes that showcase the specific property features provided. The video will be 9:16 (vertical for Instagram Reels/TikTok). Max 500 characters.

2. IMAGE PROMPT: A prompt for AI image generation (Kling AI). Describe the ideal hero shot — lighting, angle, style, atmosphere — tailored to the property type and features. The image will be 1:1 (square for Instagram). Max 500 characters.

3. INSTAGRAM CAPTION: A compelling caption with relevant hashtags for the listing post. Reference specific property highlights and neighbourhood. Include 5-10 hashtags including location-specific ones. Max 2200 characters.

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
