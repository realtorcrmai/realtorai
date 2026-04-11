/**
 * Test: send 3 different template types with photos to show the improvement.
 */
import { Resend } from 'resend';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../src/config.js';
import { assembleEmail } from '../src/lib/email-blocks.js';
import { parseAIJson, unescapeNewlines } from '../src/lib/parse-ai-json.js';

const resend = new Resend(config.RESEND_API_KEY);
const anthropic = new Anthropic();

async function note(context: string): Promise<{ subject: string; note: string }> {
  const r = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 200,
    system: 'Write a 2-sentence personal note from realtor Kunal. 40 words max. Return JSON: { "subject": "under 50 chars", "note": "..." }',
    messages: [{ role: 'user', content: context }],
  });
  const t = r.content[0]?.type === 'text' ? r.content[0].text : '';
  return parseAIJson<{ subject: string; note: string }>(t) || { subject: 'Update', note: t };
}

async function send(subject: string, html: string) {
  const r = await resend.emails.send({ from: 'Kunal Dhindsa <hello@realtors360.ai>', to: 'amandhindsa@outlook.com', subject, html });
  console.log(`  Sent: ${r.data?.id}`);
}

async function main() {
  // ── 1. Neighbourhood Guide — with area photos ──
  console.log('1. Neighbourhood Guide...');
  const n1 = await note('Write about the West End neighbourhood in Vancouver for buyer Aman who is new to the area.');
  const html1 = assembleEmail('neighbourhood_guide', {
    contact: { name: 'Aman', firstName: 'Aman', type: 'buyer' },
    agent: { name: 'Kunal Dhindsa', brokerage: 'Realtors360', phone: '604-555-0123', initials: 'K', email: 'hello@realtors360.ai' },
    content: { subject: n1.subject, intro: unescapeNewlines(n1.note), body: '', ctaText: 'Explore West End', ctaUrl: 'https://realtors360.ai' },
    heroImageUrl: 'https://images.unsplash.com/photo-1559511260-66a654ae982a?w=1200&h=600&fit=crop',
    photos: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&h=700&fit=crop',
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=600&h=400&fit=crop',
    ],
    anniversary: { areaHighlights: [
      { icon: '🏖️', text: 'English Bay Beach — 5 min walk' },
      { icon: '🌳', text: 'Stanley Park — 10 min walk' },
      { icon: '🍜', text: 'Denman Street restaurants — 2 min walk' },
      { icon: '🏥', text: 'St. Paul\'s Hospital — 8 min walk' },
    ]},
  });
  await send(`🏡 ${n1.subject}`, html1);

  // ── 2. Welcome Email — with area + team photos ──
  console.log('2. Welcome Email...');
  const n2 = await note('Welcome new buyer Aman who just signed up. He is interested in Vancouver condos.');
  const html2 = assembleEmail('welcome', {
    contact: { name: 'Aman Dhindsa', firstName: 'Aman', type: 'buyer' },
    agent: { name: 'Kunal Dhindsa', brokerage: 'Realtors360', phone: '604-555-0123', initials: 'K', email: 'hello@realtors360.ai', instagram: 'https://instagram.com/realtors360', linkedin: 'https://linkedin.com/in/realtors360' },
    content: { subject: n2.subject, intro: unescapeNewlines(n2.note), body: '', ctaText: 'Browse Listings', ctaUrl: 'https://realtors360.ai' },
    heroImageUrl: 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&h=600&fit=crop',
    photos: [
      'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=400&fit=crop',
    ],
    market: { avgPrice: '$850,000', avgDom: 22, inventoryChange: '+8%' },
  });
  await send(`👋 ${n2.subject}`, html2);

  // ── 3. Home Anniversary — with neighbourhood photos ──
  console.log('3. Home Anniversary...');
  const n3 = await note('It is the 1-year anniversary of Aman buying his condo in Kitsilano. His home appreciated 6%.');
  const html3 = assembleEmail('home_anniversary', {
    contact: { name: 'Aman Dhindsa', firstName: 'Aman', type: 'buyer' },
    agent: { name: 'Kunal Dhindsa', brokerage: 'Realtors360', phone: '604-555-0123', initials: 'K', email: 'hello@realtors360.ai' },
    content: { subject: n3.subject, intro: unescapeNewlines(n3.note), body: '', ctaText: 'See Your Home Value', ctaUrl: 'https://realtors360.ai' },
    heroImageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=600&fit=crop',
    photos: [
      'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=600&h=400&fit=crop',
      'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&h=400&fit=crop',
    ],
    anniversary: {
      purchasePrice: '$685,000',
      currentEstimate: '$726,100',
      appreciation: '6%',
      equityGained: '$41,100',
      areaHighlights: [
        { icon: '🏗️', text: 'New Arbutus Greenway bike path completed' },
        { icon: '🛒', text: 'Whole Foods opened at 4th & Vine' },
        { icon: '📈', text: 'Kits condos up 6% avg this year' },
      ],
    },
  });
  await send(`🎉 ${n3.subject}`, html3);

  console.log('\nDone — 3 emails sent!');
}

main().catch(console.error);
