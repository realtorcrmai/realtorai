"use server";

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const anthropic = new Anthropic();

const GeneratedContentSchema = z.object({
  subject: z.string().min(1).max(120),
  intro: z.string().min(1),
  body: z.string().min(1),
  ctaText: z.string().default("Learn More"),
  highlights: z.array(z.string()).optional(),
  stats: z.array(z.object({
    label: z.string(),
    value: z.string(),
    change: z.string().optional(),
  })).optional(),
  tips: z.array(z.string()).optional(),
  funFact: z.string().optional(),
  area: z.string().optional(),
  address: z.string().optional(),
  salePrice: z.string().optional(),
  daysOnMarket: z.number().optional(),
  estimatedValue: z.string().optional(),
  appreciation: z.string().optional(),
  years: z.number().optional(),
  recentSales: z.array(z.object({
    address: z.string(),
    price: z.string(),
    daysOnMarket: z.number(),
  })).optional(),
});

export interface NewsletterContext {
  contact: {
    name: string;
    firstName: string;
    type: "buyer" | "seller";
    email: string;
    areas?: string[];
    preferences?: {
      price_range_min?: number;
      price_range_max?: number;
      bedrooms?: number;
      property_types?: string[];
    };
    engagementScore?: number;
    clickHistory?: Array<{
      linkType: string;
      area?: string;
      date: string;
    }>;
  };
  realtor: {
    name: string;
    brokerage?: string;
    phone?: string;
    email?: string;
    areas?: string[];
  };
  listings?: Array<{
    address: string;
    price: number;
    beds: number;
    baths: number;
    status: string;
    daysOnMarket?: number;
    heroImageUrl?: string;
  }>;
  emailType: string;
  journeyPhase: string;
  additionalContext?: string;
}

interface GeneratedContent {
  subject: string;
  intro: string;
  body: string;
  ctaText: string;
  highlights?: string[];
  stats?: Array<{ label: string; value: string; change?: string }>;
  tips?: string[];
  funFact?: string;
}

export async function generateNewsletterContent(
  context: NewsletterContext
): Promise<GeneratedContent> {
  const systemPrompt = buildSystemPrompt(context);
  const userPrompt = buildUserPrompt(context);

  const model = process.env.NEWSLETTER_AI_MODEL || "claude-sonnet-4-20250514";

  const message = await anthropic.messages.create({
    model,
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Parse and validate JSON response
  try {
    // Extract JSON — handle markdown code fences
    let jsonStr = text;
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    } else {
      const braceMatch = text.match(/\{[\s\S]*\}/);
      if (braceMatch) jsonStr = braceMatch[0];
    }

    const parsed = JSON.parse(jsonStr);
    const validated = GeneratedContentSchema.parse(parsed);
    return validated as GeneratedContent;
  } catch (e) {
    console.warn("AI content parsing failed, using fallback:", e instanceof Error ? e.message : e);
  }

  // Fallback: construct from raw text
  return {
    subject: `Update for ${context.contact.firstName}`,
    intro: text.slice(0, 300).replace(/[{}"\[\]]/g, "").trim(),
    body: text.slice(0, 800).replace(/[{}"\[\]]/g, "").trim(),
    ctaText: "Learn More",
  };
}

function buildSystemPrompt(context: NewsletterContext): string {
  return `You are a real estate email copywriter for ${context.realtor.name}${context.realtor.brokerage ? ` at ${context.realtor.brokerage}` : ""}.

Write warm, professional, personal emails that feel like they're from a trusted advisor — NOT a marketing machine.

Rules:
- Keep it concise (150-250 words for the body)
- Use the contact's first name naturally
- Reference specific areas, prices, and details from the data
- No generic filler like "I hope this email finds you well"
- Sound like a knowledgeable local expert, not a salesperson
- Match the tone to the relationship stage: new leads get more informative, past clients get more casual/warm
- Always respond with valid JSON matching this structure:

{
  "subject": "Email subject line (compelling, under 60 chars)",
  "intro": "Opening 1-2 sentences (personal, relevant)",
  "body": "Main content (2-3 paragraphs, valuable information)",
  "ctaText": "Call-to-action button text (5-7 words)",
  "highlights": ["Optional bullet points for key info"],
  "stats": [{"label": "Stat name", "value": "$X", "change": "+X%"}],
  "tips": ["Optional tips or advice"],
  "funFact": "Optional interesting neighbourhood fact"
}

Only include fields relevant to the email type. Omit optional fields if not needed.`;
}

function buildUserPrompt(context: NewsletterContext): string {
  const { contact, emailType, journeyPhase, listings, additionalContext } = context;

  let prompt = `Generate a "${emailType}" email for:

Contact: ${contact.name} (${contact.type}, ${journeyPhase} phase)`;

  if (contact.areas?.length) {
    prompt += `\nInterested areas: ${contact.areas.join(", ")}`;
  }

  if (contact.preferences) {
    const prefs = contact.preferences;
    const parts = [];
    if (prefs.price_range_min || prefs.price_range_max) {
      parts.push(`budget: $${(prefs.price_range_min || 0).toLocaleString()}-$${(prefs.price_range_max || 0).toLocaleString()}`);
    }
    if (prefs.bedrooms) parts.push(`${prefs.bedrooms}+ bedrooms`);
    if (prefs.property_types?.length) parts.push(`types: ${prefs.property_types.join(", ")}`);
    if (parts.length) prompt += `\nPreferences: ${parts.join(", ")}`;
  }

  if (contact.engagementScore !== undefined) {
    prompt += `\nEngagement score: ${contact.engagementScore}/100`;
  }

  if (contact.clickHistory?.length) {
    const recentClicks = contact.clickHistory.slice(-5);
    prompt += `\nRecent clicks: ${recentClicks.map(c => `${c.linkType}${c.area ? ` (${c.area})` : ""}`).join(", ")}`;
  }

  if (listings?.length) {
    prompt += `\n\nRelevant listings:`;
    for (const l of listings.slice(0, 5)) {
      prompt += `\n- ${l.address}: $${l.price.toLocaleString()}, ${l.beds}bd/${l.baths}ba, ${l.status}`;
      if (l.daysOnMarket) prompt += `, ${l.daysOnMarket} DOM`;
    }
  }

  if (additionalContext) {
    prompt += `\n\nAdditional context: ${additionalContext}`;
  }

  return prompt;
}
