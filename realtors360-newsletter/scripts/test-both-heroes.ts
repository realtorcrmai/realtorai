/**
 * Test: send two emails — one with hero image, one with gradient fallback.
 */
import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../src/config.js';
import { assembleEmail } from '../src/lib/email-blocks.js';
import { parseAIJson, unescapeNewlines } from '../src/lib/parse-ai-json.js';

const resend = new Resend(config.RESEND_API_KEY);
const anthropic = new Anthropic();

async function generateNote(context: string): Promise<{ subject: string; note: string }> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: `Write a 2-sentence personal note from realtor Kunal to a buyer. 40 words max. Return JSON: { "subject": "under 50 chars", "note": "the note" }`,
    messages: [{ role: 'user', content: context }],
  });
  const text = response.content[0]?.type === 'text' ? response.content[0].text : '';
  const parsed = parseAIJson<{ subject: string; note: string }>(text);
  return parsed || { subject: 'Market Update', note: text };
}

async function main() {
  // Email 1: Market update WITH hero image (Burnaby skyline)
  const note1 = await generateNote('Aman is watching Burnaby condo market, $600K-900K. Send a market update with Burnaby neighbourhood photo.');
  console.log('Email 1 (with image):', note1.subject);

  const html1 = assembleEmail('market_update', {
    contact: { name: 'Aman Dhindsa', firstName: 'Aman', type: 'buyer' },
    agent: { name: 'Kunal Dhindsa', brokerage: 'Realtors360', phone: '604-555-0123', initials: 'K', email: 'hello@realtors360.ai', title: 'Licensed REALTOR' },
    content: { subject: note1.subject, intro: unescapeNewlines(note1.note), body: '', ctaText: 'See Burnaby Listings', ctaUrl: 'https://realtors360.ai' },
    heroImageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&h=600&fit=crop',
    market: {
      avgPrice: '$742,000', avgDom: 18, inventoryChange: '+12%',
      recentSales: [
        { address: '4508 Hazel St, Burnaby', price: '$689,000', dom: 14 },
        { address: '2108-4880 Bennett St', price: '$775,000', dom: 21 },
        { address: '1903-2355 Madison Ave', price: '$829,000', dom: 9 },
      ],
    },
  });

  const r1 = await resend.emails.send({
    from: 'Kunal Dhindsa <hello@realtors360.ai>',
    to: 'amandhindsa@outlook.com',
    subject: `📊 ${note1.subject}`,
    html: html1,
  });
  console.log('Sent 1:', r1.data?.id);

  // Email 2: Birthday — no image, gradient fallback
  const note2 = await generateNote('Today is Aman\'s birthday. Write a short warm birthday note. No real estate pitch.');
  console.log('\nEmail 2 (gradient):', note2.subject);

  const html2 = assembleEmail('birthday', {
    contact: { name: 'Aman Dhindsa', firstName: 'Aman', type: 'buyer' },
    agent: { name: 'Kunal Dhindsa', brokerage: 'Realtors360', phone: '604-555-0123', initials: 'K', email: 'hello@realtors360.ai' },
    content: { subject: note2.subject, intro: unescapeNewlines(note2.note), body: '', ctaText: 'Reply to say hi', ctaUrl: 'mailto:hello@realtors360.ai' },
    tagLine: 'Happy Birthday',
  });

  const r2 = await resend.emails.send({
    from: 'Kunal Dhindsa <hello@realtors360.ai>',
    to: 'amandhindsa@outlook.com',
    subject: `🎂 ${note2.subject}`,
    html: html2,
  });
  console.log('Sent 2:', r2.data?.id);
}

main().catch(console.error);
