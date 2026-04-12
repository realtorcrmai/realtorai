/**
 * Test: send a market update email — different template from listing alert.
 */
import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../src/config.js';
import { assembleEmail } from '../src/lib/email-blocks.js';
import { parseAIJson, unescapeNewlines } from '../src/lib/parse-ai-json.js';

const resend = new Resend(config.RESEND_API_KEY);
const anthropic = new Anthropic();

async function main() {
  // AI generates the personal note
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 300,
    system: `You write a SHORT market update note from realtor Kunal Dhindsa to a buyer. The email template will show stats (avg price, DOM, inventory) and recent sales separately — you just write the personal insight. 2-3 sentences, 50 words max. Reference their specific area interest. Return JSON: { "subject": "under 50 chars", "note": "the note" }`,
    messages: [{
      role: 'user',
      content: `Contact: Aman, active buyer, interested in Burnaby condos $600K-$900K range. Has been watching the market for 2 months. Opened every market update email so far. Recent click: Brentwood area listings.`,
    }],
  });

  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  console.log('Claude:', text);

  const parsed = parseAIJson<{ subject: string; note: string }>(text);
  if (!parsed) { console.log('Parse failed'); return; }

  const note = unescapeNewlines(parsed.note);
  console.log('\nSubject:', parsed.subject);
  console.log('Note:', note);

  const html = assembleEmail('market_update', {
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
      body: '',
      ctaText: 'See All Burnaby Listings',
      ctaUrl: 'https://realtors360.ai',
    },
    market: {
      avgPrice: '$742,000',
      avgDom: 18,
      inventoryChange: '+12%',
      recentSales: [
        { address: '4508 Hazel St, Burnaby', price: '$689,000', dom: 14 },
        { address: '2108-4880 Bennett St, Burnaby', price: '$775,000', dom: 21 },
        { address: '1903-2355 Madison Ave, Burnaby', price: '$829,000', dom: 9 },
      ],
    },
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
