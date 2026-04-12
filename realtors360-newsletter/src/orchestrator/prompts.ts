/**
 * System prompts for the newsletter orchestrator.
 *
 * The persona is a thoughtful real estate marketing copywriter who writes for
 * a single agent's brand voice. It reads context (RAG), makes one specific
 * decision, and outputs structured JSON the renderer can consume.
 */

export const NEWSLETTER_PERSONA_SYSTEM = `You are the email content engine for a Canadian real estate CRM (Realtors360).

Your job is to write a SINGLE personalized real estate email for ONE specific contact, using ONLY the data provided in the user message. You never invent listings, prices, neighbourhoods, or facts.

Voice rules:
- Warm, professional, never pushy
- Maximum 120 words in the body
- One clear call to action
- No emoji unless the realtor's voice profile explicitly uses them
- Canadian spelling (favourite, neighbourhood, etc.)

Output rules:
- If you don't have enough data, return JSON with status "insufficient_data" and a short reason
- Never write more than one CTA
- Never quote prices unless they appear in the provided data`;

export function buildSavedSearchUserPrompt(args: {
  contactFirstName: string;
  realtorName: string;
  matchedListingAddress: string;
  matchCount: number;
}): string {
  return `A new active listing matches a saved search for ${args.contactFirstName}.

Realtor: ${args.realtorName}
Matched listing: ${args.matchedListingAddress}
Total matches today: ${args.matchCount}

Write a short personalized "saved search match" email for this contact.`;
}

export function buildPriceDropUserPrompt(args: {
  sellerFirstName: string;
  realtorName: string;
  listingAddress: string;
  oldPrice: number | null;
  newPrice: number | null;
}): string {
  const oldStr = args.oldPrice != null ? `$${args.oldPrice.toLocaleString('en-CA')}` : 'the previous price';
  const newStr = args.newPrice != null ? `$${args.newPrice.toLocaleString('en-CA')}` : 'the new price';
  return `The list price for one of ${args.sellerFirstName}'s listings has been adjusted.

Realtor: ${args.realtorName}
Listing: ${args.listingAddress}
Old price: ${oldStr}
New price: ${newStr}

Write a short, reassuring confirmation email to the seller letting them know the price update is live and what the realtor recommends as the next step. One clear CTA — "Talk to ${args.realtorName}" linking to a contact page.`;
}

export function buildListingSoldUserPrompt(args: {
  sellerFirstName: string;
  realtorName: string;
  listingAddress: string;
}): string {
  return `One of ${args.sellerFirstName}'s listings just transitioned to "sold".

Realtor: ${args.realtorName}
Listing: ${args.listingAddress}

Write a short, warm congratulations email to the seller. Acknowledge the moment, thank them for trusting the realtor, and tee up the next step (closing logistics, paperwork, or a celebration). One clear CTA — "See your closing checklist" or similar.`;
}

export function buildShowingConfirmedUserPrompt(args: {
  sellerFirstName: string;
  realtorName: string;
  listingAddress: string;
  showingTimeIso: string;
}): string {
  // Format the time in Vancouver local since that's where the realtors are
  const formatted = new Date(args.showingTimeIso).toLocaleString('en-CA', {
    timeZone: 'America/Vancouver',
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  return `A showing for ${args.sellerFirstName}'s listing has been confirmed.

Realtor: ${args.realtorName}
Listing: ${args.listingAddress}
Showing time: ${formatted} (Vancouver time)

Write a short, warm confirmation email to the seller letting them know the showing is on the books, what to expect, and how to prepare. One clear CTA — "View showing details" linking to the listing page.`;
}

export function buildBirthdayUserPrompt(args: {
  contactFirstName: string;
  realtorName: string;
}): string {
  return `Today is ${args.contactFirstName}'s birthday.

Realtor: ${args.realtorName}

Write a SHORT, sincere birthday note from the realtor — no real estate pitch, no CTA pressuring a meeting. Keep it human. The CTA can be a simple "Reply to say hi" linking to a mailto.`;
}

/**
 * A2: Build a voice profile block from the realtor's `realtor_agent_config`
 * row. Injected into the system prompt so every email reflects the
 * realtor's brand voice, preferred topics, and content preferences.
 *
 * Returns null if the config row has no useful voice data (brand new
 * realtor with default config).
 */
export function buildVoiceProfileBlock(
  agentConfig: {
    tone?: string | null;
    content_rankings?: unknown;
    writing_style_rules?: unknown;
    brand_name?: string | null;
  }
): string | null {
  const parts: string[] = [];

  if (agentConfig.brand_name) {
    parts.push(`Brand: ${agentConfig.brand_name}`);
  }

  if (agentConfig.tone) {
    parts.push(`Tone: ${agentConfig.tone}`);
  }

  if (agentConfig.writing_style_rules) {
    const rules = agentConfig.writing_style_rules;
    if (typeof rules === 'string') {
      parts.push(`Writing style rules: ${rules}`);
    } else if (Array.isArray(rules) && rules.length > 0) {
      parts.push(`Writing style rules:\n${rules.map((r: string) => `- ${r}`).join('\n')}`);
    }
  }

  if (agentConfig.content_rankings) {
    const rankings = agentConfig.content_rankings;
    if (Array.isArray(rankings) && rankings.length > 0) {
      const top3 = rankings.slice(0, 3);
      const formatted = top3
        .map((r: { type?: string; effectiveness?: number }) =>
          `${r.type ?? 'unknown'} (${Math.round((r.effectiveness ?? 0) * 100)}% effectiveness)`
        )
        .join(', ');
      parts.push(`This realtor's audience responds best to: ${formatted}`);
    }
  }

  if (parts.length === 0) return null;

  return `REALTOR VOICE PROFILE (adapt your writing to match):\n${parts.join('\n')}`;
}
