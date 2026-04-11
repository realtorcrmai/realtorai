/**
 * Complete demo seed — fills in everything the newsletter agent needs
 * to generate rich, photo-heavy, personalized emails.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const REALTOR = 'e044c0c6-5523-49bc-a7e4-9fc93bfa8c3a';

// ═══════════════════════════════════════════════
// Listing photos (Unsplash — free, no auth needed)
// ═══════════════════════════════════════════════
const PHOTOS = {
  luxury_exterior: [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop',
  ],
  condo_interior: [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&h=800&fit=crop',
  ],
  kitchen: [
    'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1200&h=800&fit=crop',
  ],
  bathroom: [
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1620626011761-996317b8d101?w=1200&h=800&fit=crop',
  ],
  view: [
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&h=800&fit=crop',
    'https://images.unsplash.com/photo-1559511260-66a654ae982a?w=1200&h=800&fit=crop',
  ],
};

async function main() {
  console.log('=== Seeding complete demo data ===\n');

  // ── 1. Update active listings with photos + MLS remarks ──
  console.log('1. Updating listings with photos + remarks...');
  const { data: listings } = await db.from('listings').select('id, address, list_price, property_type, status').eq('realtor_id', REALTOR).eq('status', 'active');

  const listingUpdates = [
    {
      match: 'Dunbar',
      hero: PHOTOS.luxury_exterior[0],
      photos: [PHOTOS.luxury_exterior[0], PHOTOS.condo_interior[0], PHOTOS.kitchen[0], PHOTOS.bathroom[0], PHOTOS.view[0]],
      remarks: 'Stunning West Side family home on a quiet tree-lined street. This beautifully maintained 4-bedroom residence features hardwood floors throughout, a gourmet kitchen with Wolf and Sub-Zero appliances, and an expansive south-facing backyard. Walking distance to Dunbar Village shops, Lord Byng Secondary, and Pacific Spirit Park.',
      beds: 4, baths: 3, sqft: '2,850', year: 1948,
      openHouseDate: 'Saturday, April 19th', openHouseTime: '2:00 PM – 4:00 PM',
    },
    {
      match: 'Hornby',
      hero: PHOTOS.condo_interior[1],
      photos: [PHOTOS.condo_interior[1], PHOTOS.kitchen[1], PHOTOS.bathroom[1], PHOTOS.view[1], PHOTOS.luxury_exterior[1]],
      remarks: 'Luxurious Yaletown penthouse with panoramic False Creek and mountain views. Floor-to-ceiling windows flood this 2-bed, 2-bath corner unit with natural light. Features include Italian marble counters, Miele appliances, in-suite laundry, and a private balcony perfect for entertaining. Steps to the Seawall, Yaletown restaurants, and Canada Line.',
      beds: 2, baths: 2, sqft: '1,180', year: 2018,
      openHouseDate: 'Sunday, April 20th', openHouseTime: '1:00 PM – 3:00 PM',
    },
    {
      match: 'W 12th',
      hero: PHOTOS.luxury_exterior[2],
      photos: [PHOTOS.luxury_exterior[2], PHOTOS.condo_interior[2], PHOTOS.kitchen[0], PHOTOS.view[0]],
      remarks: 'Bright and modern 1-bedroom in the heart of Fairview. Recently renovated with quartz countertops, new flooring, and updated fixtures. This well-managed building offers a gym, rooftop deck with city views, and bike storage. Perfect for first-time buyers or investors. Walk score 95 — steps to Broadway-City Hall Station.',
      beds: 1, baths: 1, sqft: '620', year: 2015,
    },
    {
      match: 'Point Grey',
      hero: PHOTOS.luxury_exterior[1],
      photos: [PHOTOS.luxury_exterior[1], PHOTOS.condo_interior[0], PHOTOS.kitchen[1], PHOTOS.bathroom[0], PHOTOS.view[1], PHOTOS.luxury_exterior[2]],
      remarks: 'Exceptional Point Grey estate on a 66x130 lot with breathtaking ocean and mountain views. This 5-bedroom architectural masterpiece features a grand foyer, chef\'s kitchen, home theatre, wine cellar, and heated outdoor pool. Separate guest suite above the triple garage. Minutes to UBC, Spanish Banks, and West Point Grey Village.',
      beds: 5, baths: 6, sqft: '5,200', year: 2019,
      openHouseDate: 'Saturday, April 26th', openHouseTime: '2:00 PM – 4:00 PM',
    },
    {
      match: 'E 1st',
      hero: PHOTOS.condo_interior[2],
      photos: [PHOTOS.condo_interior[2], PHOTOS.kitchen[1], PHOTOS.view[0]],
      remarks: 'Charming 2-bedroom ground-floor unit in a character conversion building. Features original fir floors, 9-foot ceilings, updated kitchen, and a private patio garden. In-suite laundry, one parking stall, and storage locker included. Excellent location near Commercial Drive cafes, Grandview Park, and SkyTrain.',
      beds: 2, baths: 1, sqft: '890', year: 1928,
    },
    {
      match: 'Renfrew',
      hero: PHOTOS.luxury_exterior[0],
      photos: [PHOTOS.luxury_exterior[0], PHOTOS.condo_interior[1], PHOTOS.kitchen[0], PHOTOS.bathroom[1]],
      remarks: 'Solid 3-bedroom bungalow on a quiet Renfrew-Collingwood street. Updated electrical and plumbing, new roof (2023), and a legal 1-bedroom suite generating $1,800/month rental income. Large 33x122 lot with lane access — potential for laneway home. Close to Renfrew Station, Renfrew Community Centre, and Nanaimo shops.',
      beds: 3, baths: 2, sqft: '1,450', year: 1952,
    },
  ];

  let updated = 0;
  for (const listing of listings || []) {
    const update = listingUpdates.find(u => listing.address?.includes(u.match));
    if (update) {
      await db.from('listings').update({
        hero_image_url: update.hero,
        mls_photos: update.photos,
        mls_remarks: update.remarks,
        notes: update.remarks,
      }).eq('id', listing.id);
      updated++;
      console.log(`  ✓ ${listing.address} — ${update.photos.length} photos`);
    }
  }
  console.log(`  Updated ${updated} listings\n`);

  // ── 2. Seed realtor_agent_config ──
  console.log('2. Seeding realtor agent config...');
  await db.from('realtor_agent_config').upsert({
    realtor_id: REALTOR,
    default_send_day: 'tuesday',
    default_send_hour: 9,
    max_emails_per_contact_per_week: 3,
    sending_enabled: true,
    brand_config: {
      name: 'Kunal Dhindsa',
      brokerage: 'Realtors360',
      phone: '604-555-0123',
      email: 'hello@realtors360.ai',
      title: 'Licensed REALTOR',
    },
    writing_style_rules: [
      'Use contact first name, never full name',
      'Keep emails under 100 words',
      'Always mention the specific neighbourhood',
      'Canadian spelling: neighbourhood, favourite, colour',
      'End with a question to invite reply',
      'No exclamation marks in subject lines',
    ],
    content_rankings: [
      { type: 'listing_alert', effectiveness: 0.72 },
      { type: 'market_update', effectiveness: 0.58 },
      { type: 'neighbourhood_guide', effectiveness: 0.45 },
      { type: 'just_sold', effectiveness: 0.41 },
    ],
    learning_confidence: 'medium',
    total_emails_analyzed: 84,
  }, { onConflict: 'realtor_id' });
  console.log('  ✓ Agent config created\n');

  // ── 3. Seed saved searches for contacts ──
  console.log('3. Seeding saved searches...');
  const { data: buyers } = await db.from('contacts').select('id, name')
    .eq('realtor_id', REALTOR).eq('type', 'buyer').eq('casl_consent_given', true)
    .not('email', 'is', null).limit(6);

  const searches = [
    { name: 'West End Condos', criteria: { min_price: 600000, max_price: 1000000, beds_min: 1, areas: ['West End', 'Coal Harbour'], prop_types: ['Condo/Apartment'] } },
    { name: 'East Van Family Homes', criteria: { min_price: 800000, max_price: 1500000, beds_min: 3, areas: ['Hastings-Sunrise', 'Grandview-Woodland', 'Renfrew-Collingwood'], prop_types: ['Residential'] } },
    { name: 'Yaletown Luxury', criteria: { min_price: 1500000, max_price: 3000000, beds_min: 2, areas: ['Yaletown', 'Downtown'], prop_types: ['Condo/Apartment'] } },
    { name: 'Point Grey Detached', criteria: { min_price: 2000000, max_price: 5000000, beds_min: 4, areas: ['Point Grey', 'Dunbar'], prop_types: ['Residential'] } },
    { name: 'Investment Condos', criteria: { min_price: 400000, max_price: 700000, beds_min: 1, areas: ['Burnaby', 'Surrey', 'New Westminster'], prop_types: ['Condo/Apartment'] } },
    { name: 'Kitsilano Townhomes', criteria: { min_price: 900000, max_price: 1600000, beds_min: 2, areas: ['Kitsilano', 'Fairview'], prop_types: ['Townhouse'] } },
  ];

  for (let i = 0; i < Math.min(buyers?.length || 0, searches.length); i++) {
    await db.from('saved_searches').upsert({
      realtor_id: REALTOR,
      contact_id: buyers[i].id,
      name: searches[i].name,
      criteria: searches[i].criteria,
      enabled: true,
    }, { onConflict: 'id' });
    console.log(`  ✓ ${buyers[i].name} → "${searches[i].name}"`);
  }
  console.log();

  // ── 4. Seed trust levels for engaged contacts ──
  console.log('4. Seeding trust levels...');
  const { data: engagedContacts } = await db.from('contacts').select('id, name')
    .eq('realtor_id', REALTOR).eq('casl_consent_given', true)
    .not('email', 'is', null).limit(20);

  for (let i = 0; i < (engagedContacts?.length || 0); i++) {
    const c = engagedContacts[i];
    // Distribute: 40% L0, 30% L1, 20% L2, 10% L3
    let level, positive, negative;
    if (i < 8) { level = 0; positive = i; negative = 0; }
    else if (i < 14) { level = 1; positive = 3 + i; negative = 0; }
    else if (i < 18) { level = 2; positive = 10 + i; negative = 1; }
    else { level = 3; positive = 20 + i; negative = 0; }

    await db.from('contact_trust_levels').upsert({
      realtor_id: REALTOR,
      contact_id: c.id,
      level,
      positive_signals: positive,
      negative_signals: negative,
      last_promoted_at: level > 0 ? new Date().toISOString() : null,
    }, { onConflict: 'contact_id' });
  }
  console.log(`  ✓ ${engagedContacts?.length} trust levels seeded (L0:8, L1:6, L2:4, L3:2)\n`);

  // ── 5. Seed newsletter intelligence for top contacts ──
  console.log('5. Seeding newsletter intelligence...');
  const topContacts = (engagedContacts || []).slice(8); // L1+ contacts

  for (let i = 0; i < topContacts.length; i++) {
    const c = topContacts[i];
    const opens = 5 + Math.floor(Math.random() * 20);
    const clicks = 2 + Math.floor(Math.random() * 10);

    await db.from('contacts').update({
      newsletter_intelligence: {
        total_opens: opens,
        total_clicks: clicks,
        last_opened: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
        last_clicked: new Date(Date.now() - Math.random() * 14 * 86400000).toISOString(),
        engagement_score: Math.min(100, opens * 2 + clicks * 3 + 15),
        engagement_trend: ['accelerating', 'stable', 'stable', 'declining'][i % 4],
        content_preferences: {
          listing_alert: { sent: 5, opened: 3, clicked: 2 },
          market_update: { sent: 4, opened: 2, clicked: 1 },
          neighbourhood_guide: { sent: 2, opened: 1, clicked: 0 },
        },
        inferred_interests: {
          areas: ['West End', 'Kitsilano', 'Yaletown'].slice(0, 1 + (i % 3)),
          property_types: ['Condo/Apartment', 'Townhouse'].slice(0, 1 + (i % 2)),
          lifestyle_tags: ['active_searcher', 'family', 'investor'].slice(0, 1 + (i % 3)),
        },
        click_history: [
          { link_type: 'listing', link_url: 'https://realtors360.ai/listing/1', clicked_at: new Date().toISOString() },
          { link_type: 'market_stats', link_url: 'https://realtors360.ai/market', clicked_at: new Date().toISOString() },
        ],
        content_preference: i % 2 === 0 ? 'data_driven' : 'lifestyle',
        last_intelligence_update: new Date().toISOString(),
      },
    }).eq('id', c.id);
    console.log(`  ✓ ${c.name} — score: ${Math.min(100, opens * 2 + clicks * 3 + 15)}, opens: ${opens}, clicks: ${clicks}`);
  }
  console.log();

  // ── 6. Seed sample newsletters (sent history) ──
  console.log('6. Seeding sent newsletter history...');
  const emailTypes = ['listing_alert', 'market_update', 'just_sold', 'neighbourhood_guide', 'welcome', 'birthday'];
  const sentContacts = (engagedContacts || []).slice(0, 12);

  for (let i = 0; i < sentContacts.length; i++) {
    for (let j = 0; j < 3; j++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const sentAt = new Date(Date.now() - daysAgo * 86400000).toISOString();
      const emailType = emailTypes[(i + j) % emailTypes.length];

      await db.from('newsletters').insert({
        contact_id: sentContacts[i].id,
        realtor_id: REALTOR,
        subject: `${emailType.replace(/_/g, ' ')} for ${sentContacts[i].name}`,
        email_type: emailType,
        status: j === 2 && i > 8 ? 'failed' : 'sent',
        html_body: '<p>Demo email</p>',
        sent_at: sentAt,
        send_mode: 'agent_auto',
        ai_context: { source: 'seed_data' },
      });
    }
  }
  console.log(`  ✓ ${sentContacts.length * 3} newsletter records seeded\n`);

  // ── 7. Seed newsletter events (opens/clicks) ──
  console.log('7. Seeding newsletter events...');
  const { data: newsletters } = await db.from('newsletters').select('id, contact_id, email_type')
    .eq('realtor_id', REALTOR).eq('status', 'sent').limit(20);

  let eventCount = 0;
  for (const nl of newsletters || []) {
    // 70% chance of open
    if (Math.random() < 0.7) {
      await db.from('newsletter_events').insert({
        newsletter_id: nl.id,
        contact_id: nl.contact_id,
        event_type: 'opened',
        metadata: { email_type: nl.email_type },
      });
      eventCount++;
    }
    // 30% chance of click
    if (Math.random() < 0.3) {
      await db.from('newsletter_events').insert({
        newsletter_id: nl.id,
        contact_id: nl.contact_id,
        event_type: 'clicked',
        link_url: 'https://realtors360.ai/listing/demo',
        link_type: 'listing',
        metadata: { email_type: nl.email_type, click_classification: 'listing', score_impact: 15 },
      });
      eventCount++;
    }
  }
  console.log(`  ✓ ${eventCount} newsletter events seeded\n`);

  // ── 8. Seed email event rules (all types) ──
  console.log('8. Seeding email event rules...');
  const rules = [
    { event_type: 'listing_matched_search', email_type: 'listing_alert', send_mode: 'auto', cap: 5, hours: 4 },
    { event_type: 'listing_price_dropped', email_type: 'price_drop', send_mode: 'auto', cap: 3, hours: 12 },
    { event_type: 'listing_sold', email_type: 'just_sold', send_mode: 'review', cap: 2, hours: 24 },
    { event_type: 'showing_confirmed', email_type: 'showing_confirmed', send_mode: 'auto', cap: 5, hours: 1 },
    { event_type: 'contact_birthday', email_type: 'birthday', send_mode: 'auto', cap: 1, hours: 168 },
  ];

  for (const r of rules) {
    await db.from('email_event_rules').upsert({
      realtor_id: REALTOR,
      event_type: r.event_type,
      email_type: r.email_type,
      template_id: 'basic',
      send_mode: r.send_mode,
      frequency_cap_per_week: r.cap,
      min_hours_between_sends: r.hours,
      enabled: true,
      priority: 50,
    }, { onConflict: 'realtor_id,event_type,email_type' });
    console.log(`  ✓ ${r.event_type} → ${r.email_type} (${r.send_mode})`);
  }

  console.log('\n=== SEED COMPLETE ===');
  console.log('Listings: photos + MLS remarks added to active listings');
  console.log('Agent config: brand, voice rules, content rankings');
  console.log('Saved searches: 6 buyer search profiles');
  console.log('Trust levels: 20 contacts (L0:8, L1:6, L2:4, L3:2)');
  console.log('Newsletter intelligence: 12 contacts with engagement data');
  console.log('Newsletter history: 36 sent emails');
  console.log('Newsletter events: opens + clicks');
  console.log('Event rules: 5 event→email mappings');
}

main().catch(console.error);
