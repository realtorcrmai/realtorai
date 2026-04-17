/**
 * Integration test: editorial personalized send end-to-end
 * Simulates the per-contact loop from sendEdition() without UI.
 *
 * Run: node scripts/test-editorial-send.mjs
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { createHmac } from 'crypto'

dotenv.config({ path: '.env.local' })

const TMPDIR = process.env.TMPDIR || '/tmp'
const MARKER = '<!-- __PERSONALIZED_BLOCK__ -->'

// ── Supabase client ───────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Anthropic client ──────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── generatePersonalizedBlock (inline mirror of editorial-personalizer.ts) ───
function wrapInBlock(text) {
  return [
    '<tr><td style="padding:0 40px 24px">',
    '  <p style="font-family:Georgia,\'Times New Roman\',serif;font-size:15px;color:#4a4a3a;',
    'margin:0;line-height:1.75;font-style:italic;border-left:3px solid #c9a96e;',
    'padding-left:16px">',
    text,
    '  </p>',
    '</td></tr>',
  ].join('')
}

async function generatePersonalizedBlock(ctx) {
  try {
    const recentIntent = (() => {
      const clicks = ctx.intelligence?.click_history
      if (!clicks || clicks.length === 0) return 'none'
      const sorted = [...clicks]
        .filter(c => c.clicked_at)
        .sort((a, b) => (b.clicked_at ?? '').localeCompare(a.clicked_at ?? ''))
      return sorted[0]?.link_type ?? 'none'
    })()

    const prompt = `You are writing a single short personalized paragraph (2-4 sentences max) to insert into a real estate newsletter email. Match the editorial tone — professional, warm, data-grounded. Do NOT use placeholder text. Do NOT start with "Hi" or the contact's name.

Contact profile:
- Name: ${ctx.contactName || 'this reader'}
- Inferred interests: ${JSON.stringify(ctx.intelligence?.inferred_interests || {})}
- Recent click intent: ${recentIntent}
- Lead score intent: ${ctx.leadScore?.intent || 'unknown'}
- Buying readiness: ${ctx.leadScore?.buying_readiness ?? 'unknown'}/100
- Hot topic: ${ctx.leadScore?.personalization_hints?.hot_topic || 'none'}
- Realtor notes: ${ctx.notes || 'none'}

Edition type: ${ctx.editionType}

Write one paragraph (no HTML tags, plain text only) that feels personally relevant to this reader based on their profile. If no useful signals exist, return exactly: SKIP`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }]
    })

    const raw = response.content[0]?.type === 'text' ? response.content[0].text.trim() : ''
    if (!raw || raw.toUpperCase().startsWith('SKIP')) return ''

    const clean = raw.replace(/<[^>]*>/g, '').trim()
    return clean ? wrapInBlock(clean) : ''
  } catch (err) {
    console.error('  [Haiku] Error:', err.message)
    return ''
  }
}

// ── pickPersonalizedSubject ────────────────────────────────────────────────────
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

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('─────────────────────────────────────────────────')
console.log('  Editorial Personalized Send — Integration Test  ')
console.log('─────────────────────────────────────────────────\n')

// 1. Fetch a real editorial edition
const { data: editions, error: edErr } = await supabase
  .from('editorial_editions')
  .select('id, title, edition_type, subject_a, subject_b, blocks')
  .eq('status', 'draft')
  .order('created_at', { ascending: false })
  .limit(5)

if (edErr || !editions?.length) {
  console.log('⚠️  No draft editorial editions found — creating mock HTML for test')
}

const editionTitle = editions?.[0]?.title ?? 'Mock April Market Update'
const editionType = editions?.[0]?.edition_type ?? 'market_update'
const subjectA = editions?.[0]?.subject_a ?? 'April 2026 Market Update — Vancouver'
const subjectB = editions?.[0]?.subject_b ?? 'Oak Bay Prices Up 3.2%'
console.log(`📰 Edition: "${editionTitle}"`)
console.log(`   Type: ${editionType} | Subject A: "${subjectA}"\n`)

// Mock HTML with the PERSONALIZED_BLOCK_MARKER inserted before the footer
const mockHtml = `<!DOCTYPE html>
<html><body>
<table width="600" style="margin:0 auto;font-family:Georgia,serif">
  <tr><td style="padding:40px;background:#1a2e1a;color:#fff">
    <h1>April 2026 Market Update</h1>
    <p>The Metro Vancouver real estate market saw...</p>
  </td></tr>
  <tr><td style="padding:20px">
    <h2>Market Headlines</h2>
    <p>Sales activity increased 8% month-over-month...</p>
  </td></tr>
  ${MARKER}
  <tr><td style="background:#1a2e1a;padding:20px;color:#fff;font-size:12px">
    <p>© 2026 Realtors360 | <a href="__UNSUBSCRIBE_URL__">Unsubscribe</a></p>
  </td></tr>
</table>
</body></html>`

// 2. Fetch real contacts with intelligence data
const { data: contacts, error: cErr } = await supabase
  .from('contacts')
  .select('id, name, email, notes, newsletter_intelligence, ai_lead_score')
  .not('email', 'is', null)
  .not('casl_consent_given', 'is', false)
  .order('created_at', { ascending: false })
  .limit(10)

if (cErr) {
  console.error('❌ Could not fetch contacts:', cErr.message)
  process.exit(1)
}

console.log(`👥 Contacts found: ${contacts?.length ?? 0}`)
const withSignals = contacts?.filter(c => c.newsletter_intelligence || c.ai_lead_score || c.notes) ?? []
console.log(`   With personalization signals: ${withSignals.length}\n`)

// 3. Run the per-contact personalization loop (cap=5 for test)
const PERSONALIZATION_CAP = 5
let personalizedCount = 0
const results = []

const testContacts = contacts?.slice(0, 5) ?? []
console.log('── Per-contact personalization ─────────────────────────────────')

for (const contact of testContacts) {
  const hasSignals = contact.newsletter_intelligence || contact.ai_lead_score || contact.notes
  const htmlWithUnsub = mockHtml.replace(
    '__UNSUBSCRIBE_URL__',
    `http://localhost:3000/api/editorial/unsubscribe?email=${encodeURIComponent(contact.email)}`
  )

  let finalHtml = htmlWithUnsub
  let blockResult = 'base (no signals)'

  if (hasSignals && personalizedCount < PERSONALIZATION_CAP) {
    if (personalizedCount > 0) await new Promise(r => setTimeout(r, 100))

    process.stdout.write(`  ${contact.name ?? contact.email}: `)
    const block = await generatePersonalizedBlock({
      contactName: contact.name ?? null,
      notes: contact.notes ?? null,
      intelligence: contact.newsletter_intelligence ?? null,
      leadScore: contact.ai_lead_score ?? null,
      editionType
    })

    if (block) {
      finalHtml = htmlWithUnsub.replace(MARKER, block)
      blockResult = `personalized ✅ (${block.length} chars)`
      console.log(blockResult)
      personalizedCount++
    } else {
      finalHtml = htmlWithUnsub.replace(MARKER, '')
      blockResult = '⏭ SKIP (no signals or model returned SKIP)'
      console.log(blockResult)
    }
  } else {
    finalHtml = htmlWithUnsub.replace(MARKER, '')
    console.log(`  ${contact.name ?? contact.email}: base HTML (${hasSignals ? 'cap reached' : 'no signals'})`)
  }

  // Per-contact subject personalization
  const subjects = [subjectA, subjectB].filter(Boolean)
  const resolvedSubject = pickPersonalizedSubject(subjects, contact.newsletter_intelligence) || subjectA

  results.push({ contact, finalHtml, resolvedSubject, blockResult })
}

console.log(`\n✅ Personalized: ${personalizedCount}/${testContacts.length} contacts`)

// 4. Write a combined preview HTML
const dir = join(TMPDIR, 'dev-emails')
await mkdir(dir, { recursive: true })

const summaryHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
body { font:14px/1.6 Arial; max-width:900px; margin:40px auto; color:#333 }
h2 { color:#1a2e1a; border-bottom:2px solid #c9a96e; padding-bottom:8px }
.card { border:1px solid #ddd; border-radius:8px; margin:20px 0; overflow:hidden }
.card-header { background:#1a2e1a; color:#fff; padding:12px 20px; font-size:13px }
.card-body { padding:20px }
.pill { display:inline-block; padding:2px 8px; border-radius:99px; font-size:11px; font-weight:600; margin-left:8px }
.personalized { background:#d1fae5; color:#065f46 }
.base { background:#f3f4f6; color:#374151 }
.skip { background:#fef3c7; color:#92400e }
iframe { width:100%; height:400px; border:1px solid #eee; border-radius:4px; margin-top:12px }
</style></head>
<body>
<h2>📧 Editorial Personalized Send — Integration Test Results</h2>
<p><strong>Edition:</strong> ${editionTitle}<br>
<strong>Subject A:</strong> ${subjectA}<br>
<strong>Subject B:</strong> ${subjectB || '(none)'}<br>
<strong>Generated:</strong> ${new Date().toISOString()}<br>
<strong>Contacts tested:</strong> ${testContacts.length} | <strong>Personalized:</strong> ${personalizedCount}</p>

${results.map((r, i) => {
  const isPersonalized = r.blockResult.includes('✅')
  const isSkip = r.blockResult.includes('SKIP')
  const pillClass = isPersonalized ? 'personalized' : isSkip ? 'skip' : 'base'
  const pillText = isPersonalized ? '🎯 Personalized' : isSkip ? '⏭ SKIP' : '📄 Base HTML'
  const escapedHtml = r.finalHtml.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  return `
<div class="card">
  <div class="card-header">
    ${r.contact.name ?? r.contact.email}
    <span class="pill ${pillClass}">${pillText}</span>
    <span style="font-size:11px;margin-left:12px;opacity:.7">Subject: "${r.resolvedSubject}"</span>
  </div>
  <div class="card-body">
    <details>
      <summary style="cursor:pointer;color:#6b21a8;font-size:13px">View rendered HTML (${r.finalHtml.length} chars)</summary>
      <pre style="background:#f9f9f9;padding:12px;font-size:11px;overflow:auto;max-height:200px">${escapedHtml.slice(0, 1500)}...</pre>
    </details>
  </div>
</div>`
}).join('')}

<h2 style="margin-top:40px">📊 Summary</h2>
<table style="border-collapse:collapse;width:100%">
  <tr style="background:#f3f4f6">
    <th style="padding:8px 12px;text-align:left;border:1px solid #ddd">Contact</th>
    <th style="padding:8px 12px;text-align:left;border:1px solid #ddd">Email</th>
    <th style="padding:8px 12px;text-align:left;border:1px solid #ddd">Subject Sent</th>
    <th style="padding:8px 12px;text-align:left;border:1px solid #ddd">Personalization</th>
  </tr>
  ${results.map(r => `
  <tr>
    <td style="padding:8px 12px;border:1px solid #ddd">${r.contact.name ?? '—'}</td>
    <td style="padding:8px 12px;border:1px solid #ddd">${r.contact.email}</td>
    <td style="padding:8px 12px;border:1px solid #ddd">${r.resolvedSubject}</td>
    <td style="padding:8px 12px;border:1px solid #ddd">${r.blockResult}</td>
  </tr>`).join('')}
</table>
</body></html>`

const file = join(dir, `${Date.now()}-editorial-integration-test.html`)
await writeFile(file, summaryHtml, 'utf-8')
console.log(`\n✅ Preview saved → ${file}`)
console.log(`   Open: open "${file}"`)
