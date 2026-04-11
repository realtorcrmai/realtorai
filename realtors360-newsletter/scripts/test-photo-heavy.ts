/**
 * Test: photo-heavy luxury listing email — 6 photos like Engel & Völkers.
 */
import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../src/config.js';
import { assembleEmail } from '../src/lib/email-blocks.js';
import { parseAIJson, unescapeNewlines } from '../src/lib/parse-ai-json.js';

const resend = new Resend(config.RESEND_API_KEY);
const anthropic = new Anthropic();

async function main() {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: `Write a 2-sentence personal note from realtor Kunal to buyer Aman about a luxury condo listing. Reference his West End interest. 40 words max. Return JSON: { "subject": "under 50 chars", "note": "the note" }`,
    messages: [{ role: 'user', content: 'Listing: 1503-1365 Davie St, West End Vancouver. $2.2M. 2bd/3ba. Ocean views. Mirabel building.' }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const parsed = parseAIJson<{ subject: string; note: string }>(text) || { subject: 'Stunning West End Penthouse', note: text };
  console.log('Subject:', parsed.subject);
  console.log('Note:', parsed.note);

  const html = assembleEmail('luxury_listing', {
    contact: { name: 'Aman Dhindsa', firstName: 'Aman', type: 'buyer' },
    agent: {
      name: 'Kunal Dhindsa', brokerage: 'Realtors360', phone: '604-555-0123',
      initials: 'K', title: 'Licensed REALTOR', email: 'hello@realtors360.ai',
    },
    content: {
      subject: parsed.subject,
      intro: unescapeNewlines(parsed.note),
      body: 'Experience elevated sky home living at Mirabel. Sweeping ocean views, fantastic natural light, and beautifully designed living spaces with Sub-Zero, Wolf, and Bosch appliances. Seamless indoor-outdoor flow to an oversized south-facing terrace perfect for entertaining above the city.',
      ctaText: 'VIEW FULL LISTING',
      ctaUrl: 'https://realtors360.ai',
    },
    listing: {
      address: '1503-1365 Davie Street',
      area: 'West End, Vancouver',
      price: 2199000,
      beds: 2,
      baths: 3,
      sqft: '1,335',
      year: 2019,
      photos: [
        // Hero — exterior/main shot
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
        // Living room
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
        // Kitchen
        'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&h=800&fit=crop',
        // Bedroom
        'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&h=800&fit=crop',
        // Bathroom
        'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&h=800&fit=crop',
        // View/terrace
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop',
      ],
      openHouseDate: 'Saturday, April 12th',
      openHouseTime: '2:00 PM – 4:00 PM',
    },
    unsubscribeUrl: 'https://realtors360.ai/unsubscribe',
  });

  console.log('HTML:', html.length, 'chars');

  const result = await resend.emails.send({
    from: 'Kunal Dhindsa <hello@realtors360.ai>',
    to: 'amandhindsa@outlook.com',
    subject: parsed.subject,
    html,
  });

  console.log('Sent:', result.data?.id ?? JSON.stringify(result.error));
}

main().catch(console.error);
