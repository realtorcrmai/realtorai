/**
 * Test: send an email exactly as the AI agent would — personal note
 * from Claude + luxury template blocks for listing data.
 */
import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../src/config.js';
import { assembleEmail } from '../src/lib/email-blocks.js';
import { parseAIJson, unescapeNewlines } from '../src/lib/parse-ai-json.js';

const resend = new Resend(config.RESEND_API_KEY);
const anthropic = new Anthropic();

const CONTACT_CONTEXT = `Name: Aman Dhindsa. Buyer. Active searcher.
Been looking for 3+ months in Vancouver West End / Yaletown area.
Clicked on 4 condo listings in the last 2 weeks — all 2-bed, all over $1.5M.
Opened last 3 emails. Engagement trend: accelerating.
Preferred areas: West End, Coal Harbour, Yaletown.
Budget signals: $1.5M - $2.5M range based on click history.
Last email opened: market update about downtown condo inventory 3 days ago.`;

const LISTING = {
  address: '1503-1365 Davie Street',
  area: 'West End, Vancouver',
  price: 2199000,
  beds: 2,
  baths: 3,
  sqft: '1,335',
  year: 2019,
  photos: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&h=800&fit=crop',
  ],
  openHouseDate: 'Saturday, April 12th',
  openHouseTime: '2:00 PM – 4:00 PM',
};

const SYSTEM_PROMPT = `You are writing a SHORT personal note from realtor Kunal Dhindsa to a buyer contact. This note sits ABOVE the listing details in a luxury email template — the listing photos, specs (beds/baths/sqft), price, and open house info are already rendered by the template. Do NOT repeat any listing data.

Your job: write 2-3 sentences explaining WHY this listing matters to THIS specific contact, based on their search history and preferences.

RULES:
- 40-60 words MAX. The template handles everything else.
- No "I hope this finds you well" or any generic opener.
- Reference their specific interests (areas, price range, what they clicked on).
- Sound like a friend texting — not a brochure.
- Canadian spelling (neighbourhood, favourite).
- Return ONLY JSON (no markdown fences): { "subject": "under 50 chars, specific", "note": "the personal note" }`;

async function main() {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `Contact:\n${CONTACT_CONTEXT}\n\nListing: ${LISTING.address}, ${LISTING.area} — $${LISTING.price.toLocaleString()} — ${LISTING.beds}bd/${LISTING.baths}ba/${LISTING.sqft}sqft`,
    }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  console.log('Claude:', text);

  const parsed = parseAIJson<{ subject: string; note: string }>(text);
  if (!parsed) {
    console.log('JSON parse failed');
    return;
  }

  const note = unescapeNewlines(parsed.note);
  console.log('\nSubject:', parsed.subject);
  console.log('Note:', note);

  const html = assembleEmail('luxury_listing', {
    contact: { name: 'Aman Dhindsa', firstName: 'Aman', type: 'buyer' },
    agent: {
      name: 'Kunal Dhindsa',
      brokerage: 'Realtors360',
      phone: '604-555-0123',
      initials: 'K',
      title: 'Licensed REALTOR',
      email: 'hello@realtors360.ai',
    },
    content: {
      subject: parsed.subject,
      intro: note,
      body: '', // No body dump — template blocks carry the listing data
      ctaText: 'VIEW FULL LISTING',
      ctaUrl: 'https://realtors360.ai',
    },
    listing: LISTING,
    unsubscribeUrl: 'https://realtors360.ai/unsubscribe',
  });

  console.log('\nHTML:', html.length, 'chars');

  const result = await resend.emails.send({
    from: 'Kunal Dhindsa <hello@realtors360.ai>',
    to: 'amandhindsa@outlook.com',
    subject: parsed.subject,
    html,
  });

  console.log('Sent:', result.data?.id ?? JSON.stringify(result.error));
}

main().catch(console.error);
