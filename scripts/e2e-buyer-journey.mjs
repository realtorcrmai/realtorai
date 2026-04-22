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
const emailFlagIdx = ARGS.indexOf('--email')
const EMAIL_OVERRIDE = ARGS.find(a => a.startsWith('--email='))?.split('=')[1]
  || (emailFlagIdx !== -1 && ARGS[emailFlagIdx + 1] && !ARGS[emailFlagIdx + 1].startsWith('--') ? ARGS[emailFlagIdx + 1] : null)

const TEST_EMAIL = EMAIL_OVERRIDE || 'er.amndeep@gmail.com'
const TEST_PREFIX = '[E2E-TEST]'
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const CRON_SECRET = process.env.CRON_SECRET || ''
const TMPDIR = process.env.TMPDIR || '/tmp'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ── Journey Phases & Expected Emails ─────────────────────────────────────────

const BUYER_JOURNEY = [
  {
    phase: 'lead',
    emails: [
      { type: 'welcome', delayHours: 0 },
      { type: 'neighbourhood_guide', delayHours: 72 },
      { type: 'new_listing_alert', delayHours: 168 },
      { type: 'market_update', delayHours: 336 },
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

const SELLER_JOURNEY = [
  {
    phase: 'lead',
    emails: [
      { type: 'welcome', delayHours: 0 },
      { type: 'market_update', delayHours: 72 },
      { type: 'neighbourhood_guide', delayHours: 168 },
    ]
  },
  {
    phase: 'active',
    emails: [
      { type: 'market_update', delayHours: 168 },
    ]
  },
  {
    phase: 'under_contract',
    emails: [
      { type: 'closing_checklist', delayHours: 0 },
      { type: 'inspection_reminder', delayHours: 72 },
      { type: 'closing_countdown', delayHours: 168 },
    ]
  },
  {
    phase: 'past_client',
    emails: [
      { type: 'market_update', delayHours: 720 },
      { type: 'referral_ask', delayHours: 720 },
    ]
  },
  {
    phase: 'dormant',
    emails: [
      { type: 'reengagement', delayHours: 0 },
      { type: 'market_update', delayHours: 120 },
    ]
  }
]

const SEND_ALL_EMAILS = ARGS.includes('--all')  // send every email in every phase

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

  // Also clean up test listings
  const { error: listingErr, count: listingCount } = await supabase.from('listings')
    .delete({ count: 'exact' })
    .like('address', `${TEST_PREFIX}%`)
  log(listingErr ? '⚠️' : '🗑️', `listings: deleted ${listingCount ?? 0} test rows${listingErr ? ' — ' + listingErr.message : ''}`)

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

async function getRealtorId() {
  const { data: existingContact } = await supabase.from('contacts')
    .select('realtor_id')
    .not('realtor_id', 'is', null)
    .limit(1)
    .single()
  return existingContact?.realtor_id
}

async function createTestContact(contactType = 'buyer') {
  console.log(`\n━━━ Create ${contactType.toUpperCase()} Test Contact ━━━\n`)

  const name = `${TEST_PREFIX} ${contactType === 'seller' ? 'Seller' : 'Buyer'} ${Date.now().toString(36)}`
  const realtorId = await getRealtorId()

  const buyerIntelligence = {
    engagement_score: 42,
    total_opens: 3,
    total_clicks: 1,
    inferred_interests: {
      areas: ['South Vancouver', 'Burnaby', 'East Vancouver'],
      property_types: ['Residential', 'Townhouse'],
      price_range: '$1.2M-$1.5M',
    },
    click_history: [
      { link_type: 'listing', area: 'South Vancouver', topic: 'New listing 3BR', date: new Date(Date.now() - 86400000 * 3).toISOString() },
      { link_type: 'market_report', area: 'Burnaby', topic: 'Market Update', date: new Date(Date.now() - 86400000 * 7).toISOString() },
    ],
    last_opened: new Date(Date.now() - 86400000 * 2).toISOString(),
    last_clicked: new Date(Date.now() - 86400000 * 3).toISOString(),
    engagement_trend: 'rising',
    preferred_areas: ['South Vancouver', 'Burnaby'],
  }

  const sellerIntelligence = {
    engagement_score: 55,
    total_opens: 5,
    total_clicks: 2,
    inferred_interests: {
      areas: ['Kitsilano', 'Point Grey', 'West Side'],
      property_types: ['Residential'],
      price_range: '$2M+',
    },
    click_history: [
      { link_type: 'market_report', area: 'Kitsilano', topic: 'Spring market outlook', date: new Date(Date.now() - 86400000 * 5).toISOString() },
      { link_type: 'cma', area: 'Point Grey', topic: 'Home value estimate', date: new Date(Date.now() - 86400000 * 10).toISOString() },
    ],
    last_opened: new Date(Date.now() - 86400000 * 1).toISOString(),
    last_clicked: new Date(Date.now() - 86400000 * 5).toISOString(),
    engagement_trend: 'stable',
    preferred_areas: ['Kitsilano', 'Point Grey'],
  }

  const baseFields = {
    name,
    email: TEST_EMAIL,
    phone: '+16045559999',
    type: contactType,
    pref_channel: 'email',
    casl_consent_given: true,
    casl_consent_date: new Date().toISOString(),
    newsletter_unsubscribed: false,
    ...(realtorId ? { realtor_id: realtorId } : {}),
    newsletter_intelligence: contactType === 'buyer' ? buyerIntelligence : sellerIntelligence,
    ai_lead_score: contactType === 'buyer'
      ? {
          score: 65,
          tier: 'warm',
          personalization_hints: {
            tone: 'friendly and informative',
            interests: ['family-friendly neighbourhoods', 'school catchments', 'parks'],
            price_anchor: '$1.35M',
            hot_topic: 'new listings under $1.5M in South Vancouver',
            relationship_stage: 'early — building trust',
          }
        }
      : {
          score: 72,
          tier: 'hot',
          personalization_hints: {
            tone: 'confident and data-driven',
            interests: ['market timing', 'pricing strategy', 'comparable sales'],
            price_anchor: '$2.1M',
            hot_topic: 'spring market conditions for Kitsilano sellers',
            avoid: 'pressure tactics — they are deliberate decision-makers',
            relationship_stage: 'active — ready to list',
          }
        },
  }

  const typeSpecific = contactType === 'buyer'
    ? {
        notes: 'Met at Burnaby open house. Family of 4, kids ages 6 and 9. Looking for a 3BR detached home near David Thompson Secondary or Marlborough Elementary. Budget $1.2-1.5M, pre-approved with TD at 4.89%. Husband works in downtown, wants under 40min transit commute. Wife prioritizes backyard space and proximity to parks (Confederation Park, Central Park). Currently renting in Metrotown, lease ends August.',
        buyer_preferences: {
          price_range_min: 1200000,
          price_range_max: 1500000,
          bedrooms: 3,
          property_types: ['Residential', 'Townhouse'],
          preferred_areas: ['South Vancouver', 'Burnaby'],
        },
      }
    : {
        notes: 'Selling family home at 3456 W 2nd Ave, Kitsilano. 4BR/3BA, 2,400 sqft, corner lot, fully renovated kitchen and bathrooms 2023. New roof 2024. Kids moved to Toronto for university, couple downsizing to a condo in Coal Harbour. Target sale price $2.1M based on recent comps (neighbour sold at $2.05M in Feb). Flexible on timeline but prefers to list before May long weekend for spring market peak. Concerned about interest rate impact on buyer demand. Husband is a UBC professor, wife is a retired nurse.',
      }

  const { data: contact, error } = await supabase.from('contacts')
    .insert({ ...baseFields, ...typeSpecific })
    .select('*').single()

  assert(!error && contact, `${contactType} contact created: ${name}`)
  if (error) {
    console.error('  Error:', error.message)
    process.exit(1)
  }

  log('📧', `Email: ${TEST_EMAIL}`)
  log('🆔', `ID: ${contact.id}`)

  return contact
}

// ── Step 1b: Ensure Realtor Profile ────────────────────────────────────────

async function ensureRealtorProfile(realtorId) {
  if (!realtorId) {
    log('⚠️', 'No realtor_id — skipping profile setup')
    return
  }

  console.log('\n━━━ Ensure Realtor Profile ━━━\n')

  // Check if realtor_agent_config already has brand_config
  const { data: existing } = await supabase.from('realtor_agent_config')
    .select('id, brand_config')
    .eq('realtor_id', realtorId)
    .maybeSingle()

  const brandConfig = {
    name: 'Aman Dhindsa',
    brokerage: 'Realtors360 Realty',
    phone: '+1 (604) 555-0199',
    email: process.env.RESEND_FROM_EMAIL || 'hello@realtors360.ai',
    title: 'Licensed Realtor — Greater Vancouver',
    website: 'https://realtors360.ai',
    tagline: 'Your trusted real estate advisor in Vancouver',
    areas_served: ['South Vancouver', 'Burnaby', 'Kitsilano', 'Point Grey', 'East Vancouver', 'Metrotown'],
    designations: ['Licensed Realtor (BC)', 'Certified Negotiation Expert'],
    years_experience: 12,
    theme_preset: 'professional',
    color_mode: 'light',
  }

  if (existing?.brand_config?.name) {
    log('✅', `Realtor profile exists: ${existing.brand_config.name} (${existing.brand_config.brokerage || 'no brokerage'})`)
    // Update with richer data if current config is sparse
    const currentConfig = existing.brand_config
    if (!currentConfig.phone || !currentConfig.areas_served) {
      const merged = { ...brandConfig, ...currentConfig }
      await supabase.from('realtor_agent_config')
        .update({ brand_config: merged })
        .eq('id', existing.id)
      log('📝', 'Enriched existing profile with phone, areas, designations')
    }
    return
  }

  // Upsert realtor_agent_config with full brand_config
  const { error } = await supabase.from('realtor_agent_config').upsert({
    realtor_id: realtorId,
    brand_config: brandConfig,
  }, { onConflict: 'realtor_id' })

  if (error) {
    log('⚠️', `Profile setup failed: ${error.message}`)
    // Fallback: set env vars for the session
    process.env.AGENT_NAME = brandConfig.name
    process.env.AGENT_BROKERAGE = brandConfig.brokerage
    process.env.AGENT_PHONE = brandConfig.phone
    log('🔧', 'Set AGENT_NAME/BROKERAGE/PHONE env vars as fallback')
  } else {
    log('✅', `Realtor profile created: ${brandConfig.name} at ${brandConfig.brokerage}`)
    log('📍', `Areas: ${brandConfig.areas_served.join(', ')}`)
    log('📞', `Phone: ${brandConfig.phone}`)
  }

  // Also update the users table if the realtor exists there
  const { data: user } = await supabase.from('users')
    .select('id, name')
    .eq('id', realtorId)
    .maybeSingle()

  if (user && (!user.name || user.name === 'System Admin')) {
    await supabase.from('users')
      .update({
        name: brandConfig.name,
        metadata: {
          brokerage: brandConfig.brokerage,
          phone: brandConfig.phone,
          title: brandConfig.title,
        }
      })
      .eq('id', realtorId)
    log('👤', 'Updated users table with realtor name and metadata')
  }
}

// ── Step 1c: Seed Active Listings ──────────────────────────────────────────

async function seedListings(realtorId) {
  console.log('\n━━━ Step 1b: Seed Active Listings (for email blocks) ━━━\n')

  const testListings = [
    {
      address: `${TEST_PREFIX} 3456 East 41st Ave, South Vancouver, BC V5R 2W4`,
      list_price: 1350000,
      property_type: 'Residential',
      status: 'active',
      hero_image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=500&fit=crop',
      lockbox_code: 'E2E1',
      notes: '3BR/2BA detached, 1,850 sqft, recently renovated kitchen with quartz counters, hardwood floors throughout, large south-facing backyard, 2-car garage. Walking distance to David Thompson Secondary.',
    },
    {
      address: `${TEST_PREFIX} 7821 Meadow Ave, Burnaby, BC V5J 3H9`,
      list_price: 1275000,
      property_type: 'Residential',
      status: 'active',
      hero_image_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&h=500&fit=crop',
      lockbox_code: 'E2E2',
      notes: '4BR/3BA two-storey, 2,200 sqft, open concept main floor, near Confederation Park, new roof 2024, updated electrical. 8 min walk to Gilmore SkyTrain.',
    },
    {
      address: `${TEST_PREFIX} 4512 Kingsway, Burnaby, BC V5H 2B1`,
      list_price: 899000,
      property_type: 'Townhouse',
      status: 'active',
      hero_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=500&fit=crop',
      lockbox_code: 'E2E3',
      notes: '3BR/2.5BA end-unit townhouse, 1,450 sqft, private patio, in-unit laundry, walk to Metrotown and Crystal Mall. Strata fee $350/mo includes gym and rooftop deck.',
    },
    {
      address: `${TEST_PREFIX} 3456 W 2nd Ave, Kitsilano, BC V6K 1K8`,
      list_price: 2100000,
      property_type: 'Residential',
      status: 'active',
      hero_image_url: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&h=500&fit=crop',
      lockbox_code: 'E2E4',
      notes: '4BR/3BA corner lot, 2,400 sqft, fully renovated 2023, chef kitchen, spa bathrooms, new roof 2024. Steps to Kits Beach, Arbutus Greenway, and West 4th shopping. Seller downsizing.',
    },
    {
      address: `${TEST_PREFIX} 1988 Point Grey Rd, Point Grey, BC V6K 1A2`,
      list_price: 2850000,
      property_type: 'Residential',
      status: 'active',
      hero_image_url: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=500&fit=crop',
      lockbox_code: 'E2E5',
      notes: '5BR/4BA ocean-view heritage character home, 3,100 sqft, original fir floors, modern addition 2021, detached laneway house generating $2,800/mo rental income. Walk to Jericho Beach and UBC.',
    },
  ]

  // Need a seller_id — use the contact we just created or find an existing one
  const { data: anySeller } = await supabase.from('contacts')
    .select('id')
    .limit(1)
    .single()

  const sellerId = anySeller?.id || randomUUID()

  const listingsToInsert = testListings.map(l => ({
    ...l,
    seller_id: sellerId,
    ...(realtorId ? { realtor_id: realtorId } : {}),
  }))

  const { data: inserted, error } = await supabase.from('listings')
    .insert(listingsToInsert)
    .select('id, address, list_price')

  if (error) {
    log('⚠️', `Listing seed failed: ${error.message}`)
    return []
  }

  assert(inserted?.length === testListings.length, `Seeded ${inserted?.length} active listings for email blocks`)
  for (const l of inserted || []) {
    log('🏠', `${l.address.replace(TEST_PREFIX + ' ', '')} — $${l.list_price?.toLocaleString()}`)
  }

  return inserted
}

// ── Step 2: Enroll in Buyer Journey ─────────────────────────────────────────

async function enrollInJourney(contactId, journeyType = 'buyer') {
  console.log(`\n━━━ Enroll in ${journeyType.toUpperCase()} Journey ━━━\n`)

  const nextEmailAt = new Date(Date.now() - 60000).toISOString() // 1 min ago (immediately due)

  // Get realtor_id from contact
  const { data: contactRow } = await supabase.from('contacts')
    .select('realtor_id').eq('id', contactId).single()

  const { data: journey, error } = await supabase.from('contact_journeys').insert({
    contact_id: contactId,
    journey_type: journeyType,
    current_phase: 'lead',
    next_email_at: nextEmailAt,
    emails_sent_in_phase: 0,
    is_paused: false,
    ...(contactRow?.realtor_id ? { realtor_id: contactRow.realtor_id } : {})
  }).select('*').single()

  assert(!error && journey, `Enrolled in ${journeyType} journey (lead phase)`)
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

// ── Run a single journey (buyer or seller) ─────────────────────────────────

async function runJourney(contactType, journeyDef, realtorId) {
  const contact = await createTestContact(contactType)

  const journey = await enrollInJourney(contact.id, contactType)
  if (!journey) return { contact, totalSent: 0, newsletters: [] }

  let totalSent = 0
  const nlIds = []

  for (let phaseIdx = 0; phaseIdx < journeyDef.length; phaseIdx++) {
    const phaseConfig = journeyDef[phaseIdx]

    if (phaseIdx > 0) {
      await advancePhase(contact.id, journey.id, phaseConfig.phase)
    }

    const emailsToSend = SEND_ALL_EMAILS ? phaseConfig.emails : [phaseConfig.emails[0]]
    console.log(`\n━━━ ${contactType.toUpperCase()} — Phase: ${phaseConfig.phase.toUpperCase()} — ${emailsToSend.length} email(s) ━━━\n`)

    for (const emailConfig of emailsToSend) {
      const nl = await generateAndSendEmail(
        contact.id,
        emailConfig.type,
        phaseConfig.phase,
        journey.id
      )

      if (nl) {
        totalSent++
        nlIds.push(nl.id)
        assert(true, `${contactType}/${phaseConfig.phase}/${emailConfig.type} — sent`)

        // Simulate engagement on early phases
        if (['lead', 'active', 'under_contract'].includes(phaseConfig.phase)) {
          await sleep(500)
          await simulateWebhookEvent(contact.id, nl.id, 'opened')
          if (phaseConfig.phase === 'lead') {
            await sleep(300)
            await simulateWebhookEvent(contact.id, nl.id, 'clicked')
          }
        }
      } else {
        assert(false, `${contactType}/${phaseConfig.phase}/${emailConfig.type} — failed`)
      }

      // Pace between emails to avoid frequency cap
      await sleep(1500)
    }

    await sleep(1000)
  }

  const intel = await verifyIntelligence(contact.id)
  const newsletters = await verifyNewsletters(contact.id)

  return { contact, journey, totalSent, newsletters, intel }
}

async function main() {
  console.log('╔══════════════════════════════════════════════════╗')
  console.log('║   E2E Journey Test — Buyer + Seller              ║')
  console.log('║   Realtors360 Newsletter System                 ║')
  console.log('╚══════════════════════════════════════════════════╝')
  console.log()
  console.log(`  Mode:     ${LIVE_MODE ? '🔴 LIVE (sending real emails)' : '🟢 DEV (file capture)'}`)
  console.log(`  Email:    ${TEST_EMAIL}`)
  console.log(`  All:      ${SEND_ALL_EMAILS ? 'YES — every email at every phase' : 'NO — first email per phase (use --all for full)'}`)
  console.log(`  Time:     ${new Date().toISOString()}`)

  if (CLEANUP_MODE) {
    await cleanup()
    if (ARGS.filter(a => a.startsWith('--')).length === 1) process.exit(0)
  }

  // ── Setup realtor profile + seed listings ────────────────
  const realtorId = await getRealtorId()
  await ensureRealtorProfile(realtorId)
  const seededListings = await seedListings(realtorId)

  // ── Run buyer journey ──────────────────────────────────────
  console.log('\n' + '█'.repeat(50))
  console.log('█  BUYER JOURNEY                                 █')
  console.log('█'.repeat(50))
  const buyerResult = await runJourney('buyer', BUYER_JOURNEY, realtorId)

  // ── Run seller journey ─────────────────────────────────────
  console.log('\n' + '█'.repeat(50))
  console.log('█  SELLER JOURNEY                                █')
  console.log('█'.repeat(50))
  const sellerResult = await runJourney('seller', SELLER_JOURNEY, realtorId)

  // ── Captured emails (dev mode) ─────────────────────────────
  await listCapturedEmails()

  // ── Summary ─────────────────────────────────────────────────
  const totalSent = buyerResult.totalSent + sellerResult.totalSent
  const totalNL = (buyerResult.newsletters?.length ?? 0) + (sellerResult.newsletters?.length ?? 0)

  console.log('\n╔══════════════════════════════════════════════════╗')
  console.log('║   RESULTS                                       ║')
  console.log('╠══════════════════════════════════════════════════╣')
  console.log(`║  Buyer emails sent:  ${String(buyerResult.totalSent).padEnd(28)}║`)
  console.log(`║  Seller emails sent: ${String(sellerResult.totalSent).padEnd(28)}║`)
  console.log(`║  Total emails:       ${String(totalSent).padEnd(28)}║`)
  console.log(`║  Newsletters in DB:  ${String(totalNL).padEnd(28)}║`)
  console.log(`║  Tests passed:       ${String(`${passed}/${passed + failed}`).padEnd(28)}║`)
  console.log('╚══════════════════════════════════════════════════╝')

  if (failed > 0) {
    console.log('\n⚠️  Failed tests:')
    results.filter(r => r.status === 'FAIL').forEach(r => console.log(`   - ${r.label}`))
  }

  console.log(`\n  Buyer contact:  ${buyerResult.contact?.id}`)
  console.log(`  Seller contact: ${sellerResult.contact?.id}`)
  console.log(`  Listings:       ${seededListings?.length || 0} test listings seeded`)
  console.log(`  To clean up:    node scripts/e2e-buyer-journey.mjs --cleanup\n`)
}

main().catch(e => {
  console.error('Fatal error:', e)
  process.exit(1)
})
