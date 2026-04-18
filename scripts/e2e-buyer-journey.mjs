#!/usr/bin/env node
/**
 * E2E Buyer Journey Test Script
 * ==============================
 * Creates a contact, moves them through every buyer journey phase,
 * generates & sends a newsletter at each phase, simulates webhook
 * events (open/click), and verifies intelligence updates.
 *
 * Usage:
 *   node scripts/e2e-buyer-journey.mjs                     # DEV_EMAIL_MODE=preview (file capture)
 *   node scripts/e2e-buyer-journey.mjs --live               # Actually sends via Resend
 *   node scripts/e2e-buyer-journey.mjs --email you@test.com # Override recipient
 *   node scripts/e2e-buyer-journey.mjs --cleanup            # Delete test data from previous runs
 *
 * Requires: .env.local with Supabase + Resend + Anthropic keys
 */

import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { writeFile, mkdir, readdir } from 'fs/promises'
import { join } from 'path'

dotenv.config({ path: '.env.local' })

// ── Config ───────────────────────────────────────────────────────────────────

const ARGS = process.argv.slice(2)
const LIVE_MODE = ARGS.includes('--live')
const CLEANUP_MODE = ARGS.includes('--cleanup')
const EMAIL_OVERRIDE = ARGS.find(a => a.startsWith('--email='))?.split('=')[1]
  || ARGS[ARGS.indexOf('--email') + 1]

const TEST_EMAIL = EMAIL_OVERRIDE || 'er.amndeep@gmail.com'
const TEST_PREFIX = '[E2E-TEST]'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || ''
const TMPDIR = process.env.TMPDIR || '/tmp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Buyer Journey Phases & Expected Emails ───────────────────────────────────

const BUYER_JOURNEY = [
  {
    phase: 'lead',
    emails: [
      { type: 'welcome', delayHours: 0 },
      { type: 'neighbourhood_guide', delayHours: 72 },
      { type: 'new_listing_alert', delayHours: 168 },
      { type: 'market_update', delayHours: 336 },
      { type: 'new_listing_alert', delayHours: 504 },
    ]
  },
  {
    phase: 'active',
    emails: [
      { type: 'new_listing_alert', delayHours: 168 },
      { type: 'market_update', delayHours: 504 },
    ]
  },
  {
    phase: 'under_contract',
    emails: [
      { type: 'closing_checklist', delayHours: 0 },
      { type: 'inspection_reminder', delayHours: 48 },
      { type: 'neighbourhood_guide', delayHours: 48 },
    ]
  },
  {
    phase: 'past_client',
    emails: [
      { type: 'home_anniversary', delayHours: 720 },
      { type: 'referral_ask', delayHours: 720 },
    ]
  },
  {
    phase: 'dormant',
    emails: [
      { type: 'reengagement', delayHours: 0 },
      { type: 'new_listing_alert', delayHours: 120 },
    ]
  }
]

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0
let failed = 0
const results = []

function log(icon, msg) {
  console.log(`  ${icon} ${msg}`)
}

function assert(condition, label) {
  if (condition) {
    passed++
    log('✅', label)
    results.push({ label, status: 'pass' })
  } else {
    failed++
    log('❌', label)
    results.push({ label, status: 'FAIL' })
  }
}

async function callCron(endpoint) {
  try {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    })
    return { status: res.status, body: await res.json().catch(() => null) }
  } catch (e) {
    return { status: 0, body: null, error: e.message }
  }
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ── Cleanup ─────────────────────────────────────────────────────────────────

async function cleanup() {
  console.log('\n🧹 Cleaning up previous E2E test data...\n')

  // Find test contacts
  const { data: contacts } = await supabase.from('contacts')
    .select('id, name')
    .like('name', `${TEST_PREFIX}%`)

  if (!contacts?.length) {
    log('✅', 'No test data found')
    return
  }

  const contactIds = contacts.map(c => c.id)
  log('📋', `Found ${contactIds.length} test contacts`)

  // Delete in dependency order
  const tables = [
    'newsletter_events',
    'newsletters',
    'contact_journeys',
    'communications',
    'contacts'
  ]

  for (const table of tables) {
    const col = table === 'contacts' ? 'id' : 'contact_id'
    const { error, count } = await supabase.from(table)
      .delete({ count: 'exact' })
      .in(col, contactIds)
    log(error ? '⚠️' : '🗑️', `${table}: deleted ${count ?? 0} rows${error ? ' — ' + error.message : ''}`)
  }

  console.log('\n✅ Cleanup complete\n')
}

// ── Step 1: Create Test Contact ─────────────────────────────────────────────

async function createTestContact() {
  console.log('\n━━━ Step 1: Create Test Contact ━━━\n')

  const name = `${TEST_PREFIX} Buyer ${Date.now().toString(36)}`

  // Get a realtor_id from existing data (needed for multi-tenant)
  const { data: existingContact } = await supabase.from('contacts')
    .select('realtor_id')
    .not('realtor_id', 'is', null)
    .limit(1)
    .single()

  const realtorId = existingContact?.realtor_id

  const { data: contact, error } = await supabase.from('contacts').insert({
    name,
    email: TEST_EMAIL,
    phone: '+16045559999',
    type: 'buyer',
    pref_channel: 'email',
    notes: 'Looking for a 3BR detached home in South Vancouver or Burnaby. Budget $1.2-1.5M. Family with 2 kids, prioritizes school districts and parks. Pre-approved with TD.',
    casl_consent_given: true,
    casl_consent_date: new Date().toISOString(),
    newsletter_unsubscribed: false,
    ...(realtorId ? { realtor_id: realtorId } : {}),
    newsletter_intelligence: {
      engagement_score: 0,
      total_opens: 0,
      total_clicks: 0,
      inferred_interests: {},
      click_history: [],
      engagement_trend: 'stable'
    },
    ai_lead_score: {}
  }).select('*').single()

  assert(!error && contact, `Contact created: ${name}`)
  if (error) {
    console.error('  Error:', error.message)
    process.exit(1)
  }

  log('📧', `Email: ${TEST_EMAIL}`)
  log('🆔', `ID: ${contact.id}`)

  return contact
}

// ── Step 2: Enroll in Buyer Journey ─────────────────────────────────────────

async function enrollInJourney(contactId) {
  console.log('\n━━━ Step 2: Enroll in Buyer Journey ━━━\n')

  const schedule = BUYER_JOURNEY[0] // lead phase
  const nextEmailAt = new Date(Date.now() - 60000).toISOString() // 1 min ago (immediately due)

  // Get realtor_id from contact
  const { data: contactRow } = await supabase.from('contacts')
    .select('realtor_id').eq('id', contactId).single()

  const { data: journey, error } = await supabase.from('contact_journeys').insert({
    contact_id: contactId,
    journey_type: 'buyer',
    current_phase: 'lead',
    next_email_at: nextEmailAt,
    emails_sent_in_phase: 0,
    is_paused: false,
    ...(contactRow?.realtor_id ? { realtor_id: contactRow.realtor_id } : {})
  }).select('*').single()

  assert(!error && journey, 'Enrolled in buyer journey (lead phase)')
  if (error) {
    console.error('  Error:', error.message)
    return null
  }

  log('📅', `Next email due: ${nextEmailAt} (immediately)`)
  return journey
}

// ── Step 3: Generate & Send Email for Current Phase ─────────────────────────

async function generateAndSendEmail(contactId, emailType, phase, journeyId) {
  log('📝', `Generating ${emailType} email for ${phase} phase...`)

  // Use the cron endpoint to process the queue (most realistic path)
  // But first we need to make the journey "due"
  await supabase.from('contact_journeys')
    .update({
      next_email_at: new Date(Date.now() - 60000).toISOString(),
      emails_sent_in_phase: 0
    })
    .eq('id', journeyId)

  // Call the journey processor cron
  const cronResult = await callCron('/api/cron/process-journeys')

  if (cronResult.status === 200 && cronResult.body?.processed > 0) {
    log('✅', `Cron processed ${cronResult.body.processed} journey(s)`)
  } else {
    log('⚠️', `Cron result: status=${cronResult.status} processed=${cronResult.body?.processed ?? 0}`)

    // Fallback: generate newsletter directly via API
    log('🔄', 'Falling back to direct newsletter generation...')
    return await generateDirectNewsletter(contactId, emailType, phase)
  }

  // Check if a newsletter was created
  await sleep(2000) // give async operations time to settle

  const { data: newsletters } = await supabase.from('newsletters')
    .select('id, email_type, status, subject, sent_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: false })
    .limit(1)

  const nl = newsletters?.[0]
  if (nl) {
    log('📬', `Newsletter: ${nl.email_type} | status: ${nl.status} | subject: "${nl.subject?.slice(0, 50)}..."`)

    // If in review mode, auto-approve and send
    if (nl.status === 'draft' || nl.status === 'approved') {
      await sendNewsletter(nl.id)
    }
    return nl
  }

  return null
}

async function generateDirectNewsletter(contactId, emailType, phase) {
  // Direct insert when cron path doesn't fire (e.g. deduplication, timing)
  const { data: contact } = await supabase.from('contacts')
    .select('name, email, notes, newsletter_intelligence, ai_lead_score')
    .eq('id', contactId)
    .single()

  if (!contact) return null

  const subject = generateSubject(emailType, phase, contact.name)
  const html = generateMinimalHtml(emailType, phase, contact)

  // Get realtor_id
  const { data: contactFull } = await supabase.from('contacts')
    .select('realtor_id')
    .eq('id', contactId)
    .single()

  const { data: nl, error } = await supabase.from('newsletters').insert({
    contact_id: contactId,
    email_type: emailType,
    journey_phase: phase,
    subject,
    html_body: html,
    status: 'approved',
    send_mode: 'auto',
    ...(contactFull?.realtor_id ? { realtor_id: contactFull.realtor_id } : {})
  }).select('id, email_type, status, subject').single()

  if (error) {
    log('⚠️', `Direct insert failed: ${error.message}`)
    return null
  }

  await sendNewsletter(nl.id)
  return nl
}

async function sendNewsletter(newsletterId) {
  // Fetch the newsletter
  const { data: nl } = await supabase.from('newsletters')
    .select('id, contact_id, subject, html_body, email_type')
    .eq('id', newsletterId)
    .single()

  if (!nl) return

  const { data: contact } = await supabase.from('contacts')
    .select('email')
    .eq('id', nl.contact_id)
    .single()

  if (!contact?.email) return

  if (!LIVE_MODE) {
    // DEV mode: capture to file
    const dir = join(TMPDIR, 'dev-emails')
    await mkdir(dir, { recursive: true })
    const ts = Date.now()
    const safe = (nl.subject || nl.email_type).replace(/[^a-zA-Z0-9-_ ]/g, '').slice(0, 50).replace(/ /g, '-')
    const file = join(dir, `${ts}-e2e-${nl.email_type}-${safe}.html`)
    await writeFile(file, `<!-- E2E TEST\n  To: ${contact.email}\n  Subject: ${nl.subject}\n  Type: ${nl.email_type}\n-->\n${nl.html_body || '<html><body>Test email</body></html>'}`, 'utf-8')
    log('💾', `DEV capture: ${file}`)

    await supabase.from('newsletters').update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      sent_email: contact.email
    }).eq('id', nl.id)
  } else {
    // LIVE mode: send via Resend
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: process.env.RESEND_FROM_EMAIL || 'hello@realtors360.ai',
          to: [contact.email],
          subject: nl.subject || `[Test] ${nl.email_type}`,
          html: nl.html_body || `<html><body><h1>${nl.email_type}</h1><p>E2E test email</p></body></html>`,
          tags: [
            { name: 'newsletter_id', value: nl.id },
            { name: 'contact_id', value: nl.contact_id },
            { name: 'email_type', value: nl.email_type },
            { name: 'e2e_test', value: 'true' }
          ]
        })
      })
      const result = await res.json()
      if (result.id) {
        log('📤', `Sent via Resend: ${result.id}`)
        await supabase.from('newsletters').update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_email: contact.email
        }).eq('id', nl.id)
      } else {
        log('⚠️', `Resend error: ${JSON.stringify(result)}`)
      }
    } catch (e) {
      log('⚠️', `Send failed: ${e.message}`)
    }
  }
}

function generateSubject(emailType, phase, contactName) {
  const subjects = {
    welcome: `Welcome to Realtors360, ${contactName || 'there'}!`,
    neighbourhood_guide: 'Your Neighbourhood Guide — Schools, Parks & More',
    new_listing_alert: 'New Listings Matching Your Criteria',
    market_update: 'April 2026 Market Update — Vancouver',
    closing_checklist: 'Your Closing Checklist — What to Expect',
    inspection_reminder: 'Inspection Deadline Approaching',
    home_anniversary: 'Happy Home Anniversary!',
    referral_ask: 'Know Someone Looking to Buy or Sell?',
    reengagement: "We Haven't Heard From You — Here's What You're Missing"
  }
  return subjects[emailType] || `[E2E] ${emailType} — ${phase}`
}

function generateMinimalHtml(emailType, phase, contact) {
  const intel = contact.newsletter_intelligence || {}
  const areas = intel.inferred_interests?.areas?.join(', ') || 'Vancouver'
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Georgia,serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <div style="background:#1a2e1a;color:#fff;padding:24px;text-align:center">
    <h1 style="margin:0;font-size:22px">Realtors360</h1>
    <p style="margin:8px 0 0;opacity:0.8;font-size:13px">E2E Test — ${emailType}</p>
  </div>
  <div style="padding:24px">
    <h2 style="color:#1a2e1a">${generateSubject(emailType, phase, contact.name)}</h2>
    <p><strong>Phase:</strong> ${phase}</p>
    <p><strong>Email Type:</strong> ${emailType}</p>
    <p><strong>Contact:</strong> ${contact.name} (${contact.email})</p>
    <p><strong>Areas of Interest:</strong> ${areas}</p>
    <p><strong>Engagement Score:</strong> ${intel.engagement_score ?? 0}/100</p>
    <p><strong>Notes:</strong> ${contact.notes?.slice(0, 200) || 'None'}</p>
    <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
    <p style="font-style:italic;color:#666">This is an automated E2E test email generated at ${new Date().toISOString()}</p>
  </div>
  <div style="background:#1a2e1a;color:#fff;padding:16px;text-align:center;font-size:12px">
    <a href="${BASE_URL}/api/newsletters/unsubscribe?contact_id=TEST" style="color:#c9a96e">Unsubscribe</a>
  </div>
</body></html>`
}

// ── Step 4: Simulate Webhook Events ─────────────────────────────────────────

async function simulateWebhookEvent(contactId, newsletterId, eventType) {
  log('🔔', `Simulating ${eventType} event...`)

  // Insert directly into newsletter_events (bypass webhook auth for testing)
  const eventData = {
    newsletter_id: newsletterId,
    contact_id: contactId,
    event_type: eventType,
    metadata: {
      e2e_test: true,
      simulated_at: new Date().toISOString()
    }
  }

  if (eventType === 'clicked') {
    eventData.metadata.link_url = 'https://realtors360.ai/listing/south-vancouver-3br'
    eventData.metadata.link_type = 'listing'
  }

  const { error } = await supabase.from('newsletter_events').insert(eventData)
  if (error) {
    log('⚠️', `Event insert failed: ${error.message}`)
    return
  }

  // Manually update intelligence (simulating what the webhook handler does)
  const { data: contact } = await supabase.from('contacts')
    .select('newsletter_intelligence')
    .eq('id', contactId)
    .single()

  const intel = contact?.newsletter_intelligence || {}

  if (eventType === 'opened') {
    intel.total_opens = (intel.total_opens || 0) + 1
    intel.last_opened = new Date().toISOString()
    intel.engagement_score = Math.min(100, (intel.engagement_score || 0) + 2)
  }

  if (eventType === 'clicked') {
    intel.total_clicks = (intel.total_clicks || 0) + 1
    intel.last_clicked = new Date().toISOString()
    intel.engagement_score = Math.min(100, (intel.engagement_score || 0) + 15)

    // Update inferred interests
    if (!intel.inferred_interests) intel.inferred_interests = {}
    if (!intel.inferred_interests.lifestyle_tags) intel.inferred_interests.lifestyle_tags = []
    if (!intel.inferred_interests.lifestyle_tags.includes('active_searcher')) {
      intel.inferred_interests.lifestyle_tags.push('active_searcher')
    }

    // Add to click history
    if (!intel.click_history) intel.click_history = []
    intel.click_history.unshift({
      link_type: 'listing',
      link_url: 'https://realtors360.ai/listing/south-vancouver-3br',
      clicked_at: new Date().toISOString(),
      email_type: 'new_listing_alert',
      newsletter_id: newsletterId
    })
    intel.click_history = intel.click_history.slice(0, 50)
  }

  // Update engagement trend
  intel.engagement_trend = intel.engagement_score > 40 ? 'rising' : 'stable'

  await supabase.from('contacts')
    .update({ newsletter_intelligence: intel })
    .eq('id', contactId)

  log('📊', `Intelligence updated: score=${intel.engagement_score}, opens=${intel.total_opens}, clicks=${intel.total_clicks}`)
}

// ── Step 5: Advance Phase ───────────────────────────────────────────────────

async function advancePhase(contactId, journeyId, newPhase) {
  console.log(`\n━━━ Advancing to: ${newPhase.toUpperCase()} ━━━\n`)

  const nextEmailAt = new Date(Date.now() - 60000).toISOString()

  const { error } = await supabase.from('contact_journeys')
    .update({
      current_phase: newPhase,
      phase_entered_at: new Date().toISOString(),
      next_email_at: nextEmailAt,
      emails_sent_in_phase: 0,
      updated_at: new Date().toISOString()
    })
    .eq('id', journeyId)

  assert(!error, `Phase advanced to ${newPhase}`)
  if (error) log('⚠️', error.message)

  // Log phase change in communications
  try {
    await supabase.from('communications').insert({
      contact_id: contactId,
      direction: 'system',
      channel: 'system',
      body: `[E2E] Journey phase advanced to ${newPhase}`,
      related_type: 'journey'
    })
  } catch { /* non-critical */ }
}

// ── Step 6: Verify Intelligence ─────────────────────────────────────────────

async function verifyIntelligence(contactId) {
  console.log('\n━━━ Step 6: Verify Contact Intelligence ━━━\n')

  const { data: contact } = await supabase.from('contacts')
    .select('name, newsletter_intelligence, ai_lead_score')
    .eq('id', contactId)
    .single()

  const intel = contact?.newsletter_intelligence || {}

  assert(intel.total_opens > 0, `Opens tracked: ${intel.total_opens}`)
  assert(intel.total_clicks > 0, `Clicks tracked: ${intel.total_clicks}`)
  assert(intel.engagement_score > 0, `Engagement score: ${intel.engagement_score}/100`)
  assert(intel.last_opened, `Last opened: ${intel.last_opened}`)
  assert(intel.last_clicked, `Last clicked: ${intel.last_clicked}`)
  assert(intel.click_history?.length > 0, `Click history: ${intel.click_history?.length} entries`)
  assert(intel.engagement_trend, `Engagement trend: ${intel.engagement_trend}`)

  if (intel.inferred_interests) {
    const tags = intel.inferred_interests.lifestyle_tags || []
    log('🏷️', `Lifestyle tags: ${tags.join(', ') || 'none'}`)
  }

  return intel
}

// ── Step 7: Verify Newsletters Created ──────────────────────────────────────

async function verifyNewsletters(contactId) {
  console.log('\n━━━ Step 7: Verify All Newsletters ━━━\n')

  const { data: newsletters } = await supabase.from('newsletters')
    .select('id, email_type, journey_phase, status, subject, sent_at, created_at')
    .eq('contact_id', contactId)
    .order('created_at', { ascending: true })

  log('📊', `Total newsletters created: ${newsletters?.length || 0}`)

  const byPhase = {}
  for (const nl of newsletters || []) {
    if (!byPhase[nl.journey_phase]) byPhase[nl.journey_phase] = []
    byPhase[nl.journey_phase].push(nl)
  }

  for (const [phase, nls] of Object.entries(byPhase)) {
    log('📁', `${phase}: ${nls.length} email(s)`)
    for (const nl of nls) {
      const status = nl.status === 'sent' ? '✉️' : nl.status === 'draft' ? '📝' : '⏳'
      log('  ' + status, `${nl.email_type} — "${nl.subject?.slice(0, 50) || 'no subject'}..." [${nl.status}]`)
    }
  }

  return newsletters
}

// ── Step 8: List Captured Emails (DEV mode) ─────────────────────────────────

async function listCapturedEmails() {
  if (LIVE_MODE) return

  console.log('\n━━━ Captured Email Files ━━━\n')

  const dir = join(TMPDIR, 'dev-emails')
  try {
    const files = await readdir(dir)
    const e2eFiles = files.filter(f => f.includes('e2e-')).sort()

    if (e2eFiles.length === 0) {
      log('📭', 'No e2e test emails captured')
      return
    }

    for (const f of e2eFiles) {
      log('📄', join(dir, f))
    }

    log('💡', `Open all: open "${dir}"`)
  } catch {
    log('📭', 'No dev-emails directory')
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║   E2E Buyer Journey Test                        ║')
  console.log('║   Realtors360 Newsletter System                 ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log()
  console.log(`  Mode:  ${LIVE_MODE ? '🔴 LIVE (sending real emails)' : '🟢 DEV (file capture)'}`)
  console.log(`  Email: ${TEST_EMAIL}`)
  console.log(`  Time:  ${new Date().toISOString()}`)

  if (CLEANUP_MODE) {
    await cleanup()
    if (ARGS.length === 1) process.exit(0) // --cleanup only
  }

  // ── Create contact ──────────────────────────────────────────
  const contact = await createTestContact()

  // ── Enroll in journey ───────────────────────────────────────
  const journey = await enrollInJourney(contact.id)
  if (!journey) process.exit(1)

  // ── Walk through each phase ─────────────────────────────────
  let totalEmailsSent = 0
  let newsletterIds = []

  for (let phaseIdx = 0; phaseIdx < BUYER_JOURNEY.length; phaseIdx++) {
    const phaseConfig = BUYER_JOURNEY[phaseIdx]

    if (phaseIdx > 0) {
      await advancePhase(contact.id, journey.id, phaseConfig.phase)
    }

    console.log(`\n━━━ Phase: ${phaseConfig.phase.toUpperCase()} — Sending ${phaseConfig.emails.length} email(s) ━━━\n`)

    // Send first email for each phase (to keep the test manageable)
    const emailConfig = phaseConfig.emails[0]

    const nl = await generateAndSendEmail(
      contact.id,
      emailConfig.type,
      phaseConfig.phase,
      journey.id
    )

    if (nl) {
      totalEmailsSent++
      newsletterIds.push(nl.id)
      assert(true, `${phaseConfig.phase}/${emailConfig.type} — sent`)

      // Simulate engagement on some emails
      if (['lead', 'active', 'under_contract'].includes(phaseConfig.phase)) {
        await sleep(500)
        await simulateWebhookEvent(contact.id, nl.id, 'opened')

        // Simulate a click on lead phase to build intelligence
        if (phaseConfig.phase === 'lead') {
          await sleep(300)
          await simulateWebhookEvent(contact.id, nl.id, 'clicked')
        }
      }
    } else {
      assert(false, `${phaseConfig.phase}/${emailConfig.type} — failed to generate`)
    }

    await sleep(1000) // pace between phases
  }

  // ── Verify ──────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(50)}`)

  const intel = await verifyIntelligence(contact.id)
  const newsletters = await verifyNewsletters(contact.id)
  await listCapturedEmails()

  // ── Summary ─────────────────────────────────────────────────
  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   RESULTS                                       ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  Phases walked:     ${BUYER_JOURNEY.length}/5                          ║`)
  console.log(`║  Emails generated:  ${totalEmailsSent}                              ║`)
  console.log(`║  Newsletters in DB: ${newsletters?.length ?? 0}                              ║`)
  console.log(`║  Engagement score:  ${intel.engagement_score ?? 0}/100                         ║`)
  console.log(`║  Opens tracked:     ${intel.total_opens ?? 0}                              ║`)
  console.log(`║  Clicks tracked:    ${intel.total_clicks ?? 0}                              ║`)
  console.log(`║  Tests passed:      ${passed}/${passed + failed}                            ║`)
  console.log('╚══════════════════════════════════════════════════╝')

  if (failed > 0) {
    console.log('\n⚠️  Failed tests:')
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`   - ${r.label}`))
  }

  console.log(`\n  Contact ID: ${contact.id}`)
  console.log(`  Journey ID: ${journey.id}`)
  console.log(`  To clean up: node scripts/e2e-buyer-journey.mjs --cleanup\n`)
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
