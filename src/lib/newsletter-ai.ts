"use server";

import Anthropic from "@anthropic-ai/sdk";
import { createWithRetry } from "@/lib/anthropic/retry";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const MODEL = process.env.NEWSLETTER_AI_MODEL ?? 'claude-haiku-4-5-20251001';

function sanitizeForPrompt(value: string | null | undefined, maxLen = 200): string {
  if (!value) return ''
  return String(value)
    .replace(/[`<>]/g, '')
    .replace(/ignore\s+previous|disregard|system\s+prompt|you\s+are\s+now/gi, '[redacted]')
    .slice(0, maxLen)
}

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
    type: "buyer" | "seller" | "customer" | "agent" | "partner" | "other";
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
    /** Raw newsletter_intelligence JSONB from contacts table */
    newsletter_intelligence?: Record<string, unknown> | null;
    aiHints?: {
      tone?: string;
      interests?: string[];
      price_anchor?: string;
      hot_topic?: string;
      avoid?: string;
      relationship_stage?: string;
      note?: string;
    };
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
  reasoning?: string;
}

export async function generateNewsletterContent(
  context: NewsletterContext
): Promise<GeneratedContent> {
  const systemPrompt = buildSystemPrompt(context);
  const userPrompt = buildUserPrompt(context);

  // RAG augmentation: retrieve relevant past interactions + successful emails
  let ragContext = '';
  try {
    const { retrieveContext } = await import('@/lib/rag/retriever');
    const contactId = (context as any).contact?.id;
    const db = createAdminClient();
    const retrieved = await retrieveContext(
      db,
      `${context.contact?.name} ${context.emailType} ${context.contact?.areas?.join(' ') ?? ''}`,
      {
        contact_id: contactId,
        content_type: ['message', 'activity', 'email'],
      },
      5
    );
    if (retrieved.formatted) {
      ragContext = `\n\nRELEVANT CONTEXT FROM CRM (use to personalize):\n${retrieved.formatted}`;
    }
  } catch (err) {
    console.warn('[newsletter-ai] RAG query failed, proceeding without context:', err)
  }

  const model = MODEL;

  const message = await createWithRetry(anthropic, {
    model,
    max_tokens: 2000,
    system: systemPrompt + ragContext,
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
  const hints = context.contact.aiHints;
  const hintsBlock = hints ? `

AI PERSONALIZATION HINTS (from lead scoring):
${hints.tone ? `- Tone: ${hints.tone}` : ""}
${hints.interests?.length ? `- Interests: ${hints.interests.join(", ")}` : ""}
${hints.price_anchor ? `- Price anchor: ${hints.price_anchor}` : ""}
${hints.hot_topic ? `- Hot topic: ${hints.hot_topic}` : ""}
${hints.avoid ? `- Avoid: ${hints.avoid}` : ""}
${hints.relationship_stage ? `- Relationship: ${hints.relationship_stage}` : ""}
${hints.note ? `- Note: ${hints.note}` : ""}
Use these hints to personalize the content. They are based on the contact's actual click behavior and engagement patterns.` : "";

  // Build contact intelligence block from newsletter_intelligence JSONB
  let intelligenceBlock = "";
  const intel = context.contact.newsletter_intelligence;
  if (intel) {
    const score = typeof intel.engagement_score === "number" ? intel.engagement_score : 0;
    const clickHistory = Array.isArray(intel.click_history) ? intel.click_history as Array<{ topic?: string; link_type?: string; area?: string }> : [];
    // Fix #3: read inferred_interests as object with .areas and .property_types (not flat array)
    const inferredInterestsObj = (intel.inferred_interests && !Array.isArray(intel.inferred_interests))
      ? (intel.inferred_interests as Record<string, unknown>)
      : null;
    const inferredAreas: string[] = inferredInterestsObj?.areas
      ? (inferredInterestsObj.areas as string[])
      : (Array.isArray(intel.inferred_interests) ? (intel.inferred_interests as string[]) : []);
    const inferredPropertyTypes: string[] = inferredInterestsObj?.property_types
      ? (inferredInterestsObj.property_types as string[])
      : [];
    const engagementScore = typeof intel.engagement_score === "number" ? intel.engagement_score : 0;

    // Fix #6: fall back to both last_clicked_at and last_clicked field names
    const lastClicked = typeof intel.last_clicked_at === "string"
      ? intel.last_clicked_at
      : (typeof intel.last_clicked === "string" ? intel.last_clicked : null);
    const lastOpened = typeof intel.last_opened_at === "string"
      ? intel.last_opened_at
      : (typeof intel.last_opened === "string" ? intel.last_opened : null);

    const hasMeaningfulData = score > 0 || clickHistory.length > 0 || inferredAreas.length > 0 || inferredPropertyTypes.length > 0;
    if (hasMeaningfulData) {
      const scoreLabel = engagementScore >= 70 ? "high" : engagementScore >= 40 ? "medium" : "low";
      const recentTopics = clickHistory
        .slice(-5)
        .map((c) => c.topic || c.link_type || c.area)
        .filter(Boolean)
        .join(", ");

      intelligenceBlock = `

CONTACT INTELLIGENCE:
- Engagement score: ${engagementScore}/100 (${scoreLabel})${lastClicked ? ` — last clicked ${lastClicked.split("T")[0]}` : ""}${lastOpened ? ` — last opened ${lastOpened.split("T")[0]}` : ""}
${recentTopics ? `- Recent click interests: ${recentTopics}` : ""}
${inferredAreas.length ? `- Inferred areas of interest: ${inferredAreas.join(", ")}` : ""}
${inferredPropertyTypes.length ? `- Inferred property types: ${inferredPropertyTypes.join(", ")}` : ""}
Use this to personalize the email angle — emphasize what this contact has shown interest in.`;
    }
  }

  // Fix #1: Buyer vs seller differentiation
  const contactTypeInstructions = context.contact.type === "seller"
    ? `
SELLER CONTEXT — This contact is a property seller. Your email must:
- Lead with market positioning: days on market, list-to-sale ratios, competing inventory
- Emphasize equity, proceeds, and timeline to close
- Use authority language: "Your home is worth..." / "Sellers in your market are achieving..."
- Primary CTA should be about pricing strategy, marketing plans, or listing timelines
- Avoid buyer-centric language like "find your perfect home"
- Create urgency around market windows and seasonal timing`
    : `
BUYER CONTEXT — This contact is a property buyer. Your email must:
- Lead with opportunity: new listings, price reductions, interest rate changes
- Emphasize value, lifestyle fit, and financial benefit of acting now
- Use discovery language: "We found..." / "New to market..." / "Before it sells..."
- Primary CTA should be about booking showings or getting pre-approved
- Avoid seller-centric language like "list your home" or "your equity"
- Create urgency around inventory scarcity and rate windows`;

  const phaseInstructions: Record<string, string> = {
    lead: "Tone: Educational and trust-building. They are just getting to know you. Focus on your expertise and the market.",
    active: "Tone: Action-oriented. They are actively searching/listing. Focus on specific opportunities and next steps.",
    under_contract: "Tone: Supportive and informative. They have an accepted deal. Focus on closing milestones and what to expect.",
    past_client: "Tone: Warm and relationship-driven. They closed with you. Focus on referrals, home value updates, and anniversary milestones.",
    dormant: "Tone: Re-engagement. They have gone quiet. Win them back with something genuinely valuable — not a generic check-in.",
  };
  const phaseInstruction = phaseInstructions[context.journeyPhase] ?? phaseInstructions.lead;

  return `You are a real estate email copywriter for ${sanitizeForPrompt(context.realtor.name)}${context.realtor.brokerage ? ` at ${sanitizeForPrompt(context.realtor.brokerage) || 'your brokerage'}` : ""}.

Write warm, professional, personal emails that feel like they're from a trusted advisor — NOT a marketing machine.

CONTENT BEST PRACTICES (BC real estate):
- Subject: Use [Area] + specific detail. E.g., "3 New Burnaby Townhouses Under $800K"
- Hook: Open with a relevant stat, question, or local event — never "I hope you're well"
- Body: Lead with value (listings, data, tips), then personal note, then CTA
- CTA: One clear action per email. "Book a Showing" not "Learn More"
- Local flavor: Reference specific BC neighborhoods, schools, parks, transit by name
- Length: 150-300 words for market updates, 100-200 for listing alerts
${contactTypeInstructions}

JOURNEY PHASE: ${context.journeyPhase}
${phaseInstruction}
${hintsBlock}${intelligenceBlock}

Rules:
- Keep it concise (150-250 words for the body)
- Use the contact's first name naturally
- Reference specific areas, prices, and details from the data
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
  "funFact": "Optional interesting neighbourhood fact",
  "reasoning": "1-2 sentences explaining WHY you chose this content, tone, and angle for this specific contact. Reference their click history, preferences, or journey phase."
}

Always include the "reasoning" field. The realtor sees this to understand why the AI chose this content. Omit other optional fields if not needed.`;
}

function buildUserPrompt(context: NewsletterContext): string {
  const { contact, emailType, journeyPhase, listings, additionalContext } = context;

  let prompt = `Generate a "${emailType}" email for:

Contact: ${sanitizeForPrompt(contact.name)} (${contact.type}, ${journeyPhase} phase)`;

  if (contact.areas?.length) {
    prompt += `\nInterested areas: ${contact.areas.map(a => sanitizeForPrompt(a)).join(", ")}`;
  }

  if (contact.preferences) {
    const prefs = contact.preferences;
    const parts = [];
    if (prefs.price_range_min || prefs.price_range_max) {
      parts.push(`budget: $${(prefs.price_range_min || 0).toLocaleString()}-$${(prefs.price_range_max || 0).toLocaleString()}`);
    }
    if (prefs.bedrooms) parts.push(`${prefs.bedrooms}+ bedrooms`);
    if (prefs.property_types?.length) parts.push(`types: ${prefs.property_types.map(t => sanitizeForPrompt(t)).join(", ")}`);
    if (parts.length) prompt += `\nBUYER PREFERENCES: ${parts.join(", ")}`;
  }

  // Fix #2: seller_preferences context
  const sellerPrefs = contact.type === "seller" ? (contact as any).seller_preferences : null;
  if (sellerPrefs) {
    const parts = [];
    if (sellerPrefs.target_price) parts.push(`target sale price: ${sellerPrefs.target_price}`);
    if (sellerPrefs.timeline) parts.push(`timeline: ${sellerPrefs.timeline}`);
    if (sellerPrefs.motivation) parts.push(`motivation: ${sellerPrefs.motivation}`);
    if (sellerPrefs.condition) parts.push(`property condition: ${sellerPrefs.condition}`);
    if (parts.length) {
      prompt += `\nSELLER PREFERENCES:\n${parts.map(p => `- ${p}`).join("\n")}`;
    }
  }

  // Fix #3: inferred interests from newsletter_intelligence.inferred_interests (object shape)
  const intel = (contact as any).newsletter_intelligence as Record<string, any> | null;
  if (intel) {
    const inferredInterestsObj = (intel.inferred_interests && !Array.isArray(intel.inferred_interests))
      ? (intel.inferred_interests as Record<string, unknown>)
      : null;
    const inferredAreas: string[] = inferredInterestsObj?.areas
      ? (inferredInterestsObj.areas as string[])
      : (Array.isArray(intel.inferred_interests) ? (intel.inferred_interests as string[]) : []);
    const inferredPropertyTypes: string[] = inferredInterestsObj?.property_types
      ? (inferredInterestsObj.property_types as string[])
      : [];

    if (inferredAreas.length > 0 || inferredPropertyTypes.length > 0) {
      prompt += `\nINFERRED INTERESTS FROM EMAIL CLICKS:`;
      if (inferredAreas.length > 0) prompt += `\n- Areas of interest: ${inferredAreas.join(", ")}`;
      if (inferredPropertyTypes.length > 0) prompt += `\n- Property types: ${inferredPropertyTypes.join(", ")}`;
      const engScore = typeof intel.engagement_score === "number" ? intel.engagement_score : null;
      if (engScore !== null) prompt += `\n- Engagement score: ${engScore}/100`;
    }
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
    prompt += `\n\nAdditional context: ${sanitizeForPrompt(additionalContext, 500)}`;
  }

  return prompt;
}
