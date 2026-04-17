/**
 * Test script for editorial personalizer logic.
 * Run: node scripts/test-personalizer.mjs
 *
 * Tests:
 *  1. injectPersonalizedBlock — marker injection, empty block, no marker passthrough
 *  2. pickPersonalizedSubject — cold/investor/area/fallback rules
 *  3. Live Haiku call — generatePersonalizedBlock with mock contact profiles
 */

import * as dotenv from 'dotenv'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

dotenv.config({ path: '.env.local' })

const MARKER = '<!-- __PERSONALIZED_BLOCK__ -->'
const TMPDIR = process.env.TMPDIR || '/tmp'

// ── 1. Injection logic ────────────────────────────────────────────────────────
console.log('── 1. Injection logic ───────────────────────────────────────────')

const baseHtml = `<html><body><table width="600"><tr><td>Hero block</td></tr></table>${MARKER}<table style="background:#1a2e1a"><tr><td>Footer</td></tr></table></body></html>`
const blockHtml = '<tr><td style="padding:0 40px 24px"><p style="font-style:italic;border-left:3px solid #c9a96e;padding-left:16px">Based on your interest in Oak Bay, the spring market is showing the strongest buyer activity in three years.</p></td></tr>'

const injected = baseHtml.replace(MARKER, blockHtml)
console.log('Injection works:', injected.includes('Oak Bay') ? '✅' : '❌')
console.log('Marker removed: ', !injected.includes(MARKER) ? '✅' : '❌')
console.log('Footer intact:  ', injected.includes('1a2e1a') ? '✅' : '❌')

const cleaned = baseHtml.replace(MARKER, '')
console.log('Empty = clean:  ', !cleaned.includes(MARKER) ? '✅' : '❌')

const noMarker = '<html><body>plain</body></html>'
const passthrough = noMarker.includes(MARKER) ? noMarker.replace(MARKER, blockHtml) : noMarker
console.log('No marker pass: ', passthrough === noMarker ? '✅' : '❌')

// ── 2. Subject picker ─────────────────────────────────────────────────────────
console.log('\n── 2. Subject personalization rules ────────────────────────────')

function pickPersonalizedSubject(subjects, intelligence) {
  if (!subjects || subjects.length === 0) return ''
  const primary = subjects[0]
  if (!intelligence) return primary

  const interests = intelligence.inferred_interests || {}
  const score = intelligence.engagement_score

  const propTypes = (interests.property_types || []).map(s => s.toLowerCase())
  if (propTypes.some(t => t.includes('invest') || t.includes('commercial'))) {
    const match = subjects.find(s => /invest|roi|return|income/i.test(s))
    if (match) return match
  }

  if (score !== undefined && score < 30) {
    const match = subjects.find(s => s.length < 50 || /\?|you/i.test(s))
    if (match) return match
  }

  const areas = (interests.areas || []).map(s => s.toLowerCase())
  if (areas.length > 0) {
    const match = subjects.find(s => areas.some(a => s.toLowerCase().includes(a)))
    if (match) return match
  }

  return primary
}

const subjects = [
  'April 2026 Market Update — Vancouver',
  'Oak Bay Prices Up 3.2% — What Buyers Need to Know',
  'Investment Returns in Victoria: Q1 2026 Data'
]

const tests = [
  { label: 'Investor contact', intel: { engagement_score: 72, inferred_interests: { property_types: ['investment', 'condo'] } }, expected: 'Investment' },
  { label: 'Cold contact   ', intel: { engagement_score: 15, inferred_interests: {} }, expected: 'Oak Bay' },
  { label: 'Oak Bay contact', intel: { engagement_score: 55, inferred_interests: { areas: ['Oak Bay', 'Saanich'] } }, expected: 'Oak Bay' },
  { label: 'No intel       ', intel: null, expected: 'April 2026' },
]

for (const t of tests) {
  const result = pickPersonalizedSubject(subjects, t.intel)
  const pass = result.includes(t.expected)
  console.log(`${pass ? '✅' : '❌'} ${t.label}: "${result}"`)
}

// ── 3. Live Haiku call ────────────────────────────────────────────────────────
console.log('\n── 3. Live Haiku personalization (3 contact profiles) ──────────')

const { Anthropic } = await import('@anthropic-ai/sdk')
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const profiles = [
  {
    label: 'Active buyer — Oak Bay interest, high readiness',
    ctx: {
      contactName: 'Sarah',
      notes: 'Interested in Oak Bay, budget around 1.4M, has 2 kids, wants good schools',
      intelligence: {
        engagement_score: 78,
        inferred_interests: { areas: ['Oak Bay'], property_types: ['single-family'] },
        click_history: [{ link_type: 'book_showing', clicked_at: '2026-04-10T12:00:00Z' }]
      },
      leadScore: { intent: 'serious_buyer', buying_readiness: 82, personalization_hints: { hot_topic: 'school districts', price_anchor: '$1.4M' } },
      editionType: 'market_update'
    }
  },
  {
    label: 'Investor — dormant, commercial interest',
    ctx: {
      contactName: 'Michael',
      notes: 'Real estate investor, owns 3 rental properties, skeptical of current prices',
      intelligence: {
        engagement_score: 22,
        inferred_interests: { property_types: ['investment', 'multi-family'] },
        click_history: []
      },
      leadScore: { intent: 'investor', buying_readiness: 40, personalization_hints: { hot_topic: 'cap rates' } },
      editionType: 'market_update'
    }
  },
  {
    label: 'No signals — should return SKIP',
    ctx: {
      contactName: null,
      notes: null,
      intelligence: null,
      leadScore: null,
      editionType: 'market_update'
    }
  }
]

const results = []
for (const p of profiles) {
  process.stdout.write(`  ${p.label}... `)
  try {
    const recentIntent = p.ctx.intelligence?.click_history?.[0]?.link_type ?? 'none'
    const prompt = `You are writing a single short personalized paragraph (2-4 sentences max) to insert into a real estate newsletter email. Match the editorial tone — professional, warm, data-grounded. Do NOT use placeholder text. Do NOT start with "Hi" or the contact's name.

Contact profile:
- Name: ${p.ctx.contactName || 'this reader'}
- Inferred interests: ${JSON.stringify(p.ctx.intelligence?.inferred_interests || {})}
- Recent click intent: ${recentIntent}
- Lead score intent: ${p.ctx.leadScore?.intent || 'unknown'}
- Buying readiness: ${p.ctx.leadScore?.buying_readiness ?? 'unknown'}/100
- Hot topic: ${p.ctx.leadScore?.personalization_hints?.hot_topic || 'none'}
- Realtor notes: ${p.ctx.notes || 'none'}

Edition type: ${p.ctx.editionType}

Write one paragraph (no HTML tags, plain text only) that feels personally relevant to this reader based on their profile. If no useful signals exist, return exactly: SKIP`

    const response = await client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })
    const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    const isSkip = !text || text.toUpperCase().startsWith('SKIP')
    console.log(isSkip ? '⏭ SKIP' : `✅ ${text.slice(0, 60)}...`)
    results.push({ label: p.label, text: isSkip ? '' : text })
  } catch (err) {
    console.log('❌ Error:', err.message)
    results.push({ label: p.label, text: '' })
  }
}

// Write preview HTML
const dir = join(TMPDIR, 'dev-emails')
await mkdir(dir, { recursive: true })

const previewHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body { font: 14px/1.6 Arial; max-width: 700px; margin: 40px auto; color: #333 }
h2 { color: #1a2e1a; border-bottom: 2px solid #c9a96e; padding-bottom: 8px }
.block { background: #f9f7f2; padding: 20px; margin: 16px 0; border-left: 3px solid #c9a96e }
.label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px }
.skip { color: #888; font-style: italic }
</style></head>
<body>
<h2>Editorial Personalizer — Test Results</h2>
<p>Generated: ${new Date().toISOString()}</p>
${results.map(r => `
<div class="block">
  <div class="label">${r.label}</div>
  ${r.text ? `<p style="font-style:italic;margin:8px 0 0">${r.text}</p>` : '<p class="skip">→ SKIP (no useful signals — contact gets base HTML)</p>'}
</div>`).join('')}
<h2 style="margin-top:40px">Injection Test</h2>
<p>Marker: <code>${MARKER}</code></p>
<p>Injected HTML:</p>
<pre style="background:#f0f0f0;padding:12px;font-size:12px;overflow:auto">${injected.replace(/</g, '&lt;').slice(0, 400)}...</pre>
</body></html>`

const file = join(dir, `${Date.now()}-personalizer-test.html`)
await writeFile(file, previewHtml, 'utf-8')
console.log(`\n✅ Preview saved → ${file}`)
console.log(`   Open: open "${file}"`)
