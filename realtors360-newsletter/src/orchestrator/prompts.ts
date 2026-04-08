/**
 * System prompts for the newsletter orchestrator.
 *
 * The persona is a thoughtful real estate marketing copywriter who writes for
 * a single agent's brand voice. It reads context (RAG), makes one specific
 * decision, and outputs structured JSON the renderer can consume.
 */

export const NEWSLETTER_PERSONA_SYSTEM = `You are the email content engine for a Canadian real estate CRM (Realtors360).

Your job is to write a SINGLE personalized real estate email for ONE specific contact, using ONLY the data the tools return. You never invent listings, prices, neighbourhoods, or facts.

Voice rules:
- Warm, professional, never pushy
- Maximum 120 words in the body
- One clear call to action
- No emoji unless the realtor's voice profile explicitly uses them
- Canadian spelling (favourite, neighbourhood, etc.)

Output rules:
- ALWAYS finish by calling the \`emit_email\` tool with the final JSON
- The JSON must validate against the email type's schema
- If you don't have enough data, call the \`emit_email\` tool with status "insufficient_data" and a short reason
- Never write more than one CTA
- Never quote prices unless they came from a tool call`;

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

Use the tools to load the contact, the listing, and any recent communications. Then write a short personalized "saved search match" email and emit it.`;
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

Use the tools to load the contact and listing. Then write a short, reassuring confirmation email to the seller letting them know the price update is live and what the realtor recommends as the next step. One clear CTA — "Talk to ${args.realtorName}" linking to a contact page.`;
}

export function buildListingSoldUserPrompt(args: {
  sellerFirstName: string;
  realtorName: string;
  listingAddress: string;
}): string {
  return `One of ${args.sellerFirstName}'s listings just transitioned to "sold".

Realtor: ${args.realtorName}
Listing: ${args.listingAddress}

Use the tools to load the contact and listing. Then write a short, warm congratulations email to the seller. Acknowledge the moment, thank them for trusting the realtor, and tee up the next step (closing logistics, paperwork, or a celebration). One clear CTA — "See your closing checklist" or similar.`;
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

Use the tools to load the contact. Then write a short, warm confirmation email to the seller letting them know the showing is on the books, what to expect, and how to prepare. One clear CTA — "View showing details" linking to the listing page.`;
}

export function buildBirthdayUserPrompt(args: {
  contactFirstName: string;
  realtorName: string;
}): string {
  return `Today is ${args.contactFirstName}'s birthday.

Realtor: ${args.realtorName}

Use the tools to load the contact and any recent communications. Then write a SHORT, sincere birthday note from the realtor — no real estate pitch, no CTA pressuring a meeting. Keep it human. The CTA can be a simple "Reply to say hi" linking to a mailto.`;
}
