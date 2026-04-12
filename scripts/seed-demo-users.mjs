/**
 * Seed demo data for Sarah, Mike, and Priya demo accounts.
 * Creates listings (with hero images), showings, newsletters, and communications.
 * Idempotent — checks if listings already exist before seeding.
 */
import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";

const envContent = readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key, { auth: { persistSession: false } });

// ── Unsplash images for listings ──
const IMAGES = {
  condo1: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&h=800&fit=crop",
  condo2: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&h=800&fit=crop",
  condo3: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&h=800&fit=crop",
  townhouse1: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&h=800&fit=crop",
  townhouse2: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&h=800&fit=crop",
  detached1: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=800&fit=crop",
  detached2: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1200&h=800&fit=crop",
  detached3: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1200&h=800&fit=crop",
  luxury1: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1200&h=800&fit=crop",
  luxury2: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&h=800&fit=crop",
  interior1: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=1200&h=800&fit=crop",
  interior2: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1200&h=800&fit=crop",
  interior3: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1200&h=800&fit=crop",
  kitchen1: "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=1200&h=800&fit=crop",
  bathroom1: "https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=1200&h=800&fit=crop",
};

// ── Demo user IDs ──
const USERS = {
  sarah: { id: "b0000000-0000-0000-0000-000000000002", name: "Sarah Chen" },
  mike: { id: "c0000000-0000-0000-0000-000000000003", name: "Mike Johnson" },
  priya: { id: "d0000000-0000-0000-0000-000000000004", name: "Priya Patel" },
};

// ── Sarah's listings (Studio plan — luxury focus) ──
const SARAH_LISTINGS = [
  {
    address: "3402 Point Grey Road, Vancouver, BC V6R 1A5",
    status: "active", list_price: 3250000, property_type: "Residential", prop_type: "detached",
    mls_number: "V4100001", commission_rate: 2.5, lockbox_code: "8891",
    hero_image_url: IMAGES.luxury1,
    mls_photos: [IMAGES.luxury1, IMAGES.interior1, IMAGES.kitchen1, IMAGES.bathroom1],
    notes: "Waterfront Point Grey estate with panoramic ocean views. 5BR/4BA, chef's kitchen, heated pool, triple garage. Walk to Jericho Beach.",
    mls_remarks: "Rare waterfront Point Grey estate with unobstructed ocean & mountain views. This 5-bed, 4-bath masterpiece features floor-to-ceiling windows, a chef's kitchen with Miele appliances, heated infinity pool, and landscaped gardens. Steps to Jericho Beach.",
    showing_window_start: "10:00:00", showing_window_end: "18:00:00",
    current_phase: 7, mls_status: "active",
  },
  {
    address: "1501 West 6th Avenue #802, Vancouver, BC V6J 1R1",
    status: "active", list_price: 1150000, property_type: "Condo/Apartment", prop_type: "condo",
    mls_number: "V4100002", commission_rate: 2.5, lockbox_code: "3345",
    hero_image_url: IMAGES.condo1,
    mls_photos: [IMAGES.condo1, IMAGES.interior2, IMAGES.kitchen1],
    notes: "Luxury penthouse in Fairview with city views. 2BR/2BA, 1,100 sqft, floor-to-ceiling windows, rooftop access.",
    mls_remarks: "Stunning 8th-floor penthouse in Fairview Slopes with sweeping city and mountain views. Open-concept 2BR/2BA with engineered hardwood, quartz counters, and private rooftop deck. Walk score 95.",
    showing_window_start: "09:00:00", showing_window_end: "20:00:00",
    current_phase: 5, mls_status: "pending",
  },
  {
    address: "4788 Blenheim Street, Vancouver, BC V6L 3A5",
    status: "pending", list_price: 2450000, property_type: "Residential", prop_type: "detached",
    mls_number: "V4100003", commission_rate: 3.0, lockbox_code: "7712",
    hero_image_url: IMAGES.detached1,
    mls_photos: [IMAGES.detached1, IMAGES.interior3, IMAGES.kitchen1, IMAGES.bathroom1],
    notes: "Dunbar character home, fully renovated 2023. 4BR/3BA, laneway house for rental income. Subject removal pending.",
    mls_remarks: "Beautifully renovated 1928 Dunbar character home with modern updates throughout. 4BR/3BA main home plus legal laneway suite generating $2,400/mo income. South-facing backyard with mature landscaping.",
    showing_window_start: "10:00:00", showing_window_end: "17:00:00",
    current_phase: 6, mls_status: "pending",
  },
  {
    address: "1233 West Cordova Street #3101, Vancouver, BC V6C 3R1",
    status: "sold", list_price: 1850000, sold_price: 1820000, property_type: "Condo/Apartment", prop_type: "condo",
    mls_number: "V4100004", commission_rate: 2.5,
    hero_image_url: IMAGES.condo2,
    mls_photos: [IMAGES.condo2, IMAGES.interior1],
    notes: "Coal Harbour luxury 2BR+den sold $30K under asking. 31st floor, water views. Closed March 2026.",
    mls_remarks: "Prestigious Coal Harbour living at its finest. 31st-floor corner unit with floor-to-ceiling windows, 180-degree water views, and premium finishes throughout.",
    current_phase: 8, mls_status: "sold",
    closing_date: "2026-03-15",
  },
];

// ── Mike's listings (Pro plan — residential mix) ──
const MIKE_LISTINGS = [
  {
    address: "15230 Thrift Avenue, White Rock, BC V4B 2L4",
    status: "active", list_price: 1650000, property_type: "Residential", prop_type: "detached",
    mls_number: "V4200001", commission_rate: 2.5, lockbox_code: "5523",
    hero_image_url: IMAGES.detached2,
    mls_photos: [IMAGES.detached2, IMAGES.interior2, IMAGES.kitchen1, IMAGES.bathroom1],
    notes: "Ocean view White Rock home, 3 blocks from the beach. 4BR/3BA, updated kitchen, large deck.",
    mls_remarks: "Stunning ocean-view White Rock residence just 3 blocks from the promenade. This 4BR/3BA home features a completely renovated kitchen, expansive wraparound deck, and peek-a-boo views of Semiahmoo Bay.",
    showing_window_start: "10:00:00", showing_window_end: "18:00:00",
    current_phase: 4, mls_status: "pending",
  },
  {
    address: "6888 Southpoint Drive #1205, Burnaby, BC V3N 5E3",
    status: "active", list_price: 620000, property_type: "Condo/Apartment", prop_type: "condo",
    mls_number: "V4200002", commission_rate: 2.5, lockbox_code: "9981",
    hero_image_url: IMAGES.condo3,
    mls_photos: [IMAGES.condo3, IMAGES.interior3],
    notes: "Highgate condo, 2BR/2BA, mountain views, steps to skytrain. Great investment property.",
    mls_remarks: "Bright 12th-floor Highgate condo with mountain views. 2BR/2BA, in-suite laundry, 1 parking + 1 storage. Steps to Edmonds SkyTrain and Highgate Village shopping.",
    showing_window_start: "09:00:00", showing_window_end: "20:00:00",
    current_phase: 3, mls_status: "pending",
  },
  {
    address: "7234 132nd Street, Surrey, BC V3W 4M3",
    status: "active", list_price: 899000, property_type: "Townhouse", prop_type: "townhouse",
    mls_number: "V4200003", commission_rate: 2.5, lockbox_code: "4467",
    hero_image_url: IMAGES.townhouse1,
    mls_photos: [IMAGES.townhouse1, IMAGES.interior1, IMAGES.kitchen1],
    notes: "End-unit townhouse in Newton. 3BR/2.5BA, fenced yard, double garage. Family-friendly complex.",
    mls_remarks: "Spacious end-unit townhouse in sought-after Newton complex. 3BR/2.5BA with private fenced yard, double tandem garage, and recent updates including new flooring and fresh paint throughout.",
    showing_window_start: "10:00:00", showing_window_end: "19:00:00",
    current_phase: 2, mls_status: "pending",
  },
  {
    address: "4521 Hastings Street, Burnaby, BC V5C 2K3",
    status: "sold", list_price: 785000, sold_price: 810000, property_type: "Townhouse", prop_type: "townhouse",
    mls_number: "V4200004", commission_rate: 2.5,
    hero_image_url: IMAGES.townhouse2,
    mls_photos: [IMAGES.townhouse2, IMAGES.interior2],
    notes: "Heights townhouse sold $25K OVER asking! Multiple offers. Closed Feb 2026.",
    mls_remarks: "Move-in ready Heights townhouse with mountain views. 3BR/2BA, updated kitchen with quartz counters, private patio, and 2-car garage. Walk to Heights shopping and transit.",
    current_phase: 8, mls_status: "sold",
    closing_date: "2026-02-28",
  },
  {
    address: "10123 King George Blvd #405, Surrey, BC V3T 2W1",
    status: "conditional", list_price: 480000, property_type: "Condo/Apartment", prop_type: "condo",
    mls_number: "V4200005", commission_rate: 2.5,
    hero_image_url: IMAGES.condo1,
    mls_photos: [IMAGES.condo1],
    notes: "Whalley condo, subject to financing. Buyer pre-approved, removal date April 20.",
    mls_remarks: "Centrally located 1BR+den condo in Whalley. Steps to King George SkyTrain. Open-concept layout with laminate floors, S/S appliances, and in-suite laundry.",
    current_phase: 6, mls_status: "pending",
  },
];

// ── Priya's listings (Free plan — starter) ──
const PRIYA_LISTINGS = [
  {
    address: "8891 Lansdowne Road #308, Richmond, BC V6X 3T4",
    status: "active", list_price: 558000, property_type: "Condo/Apartment", prop_type: "condo",
    mls_number: "V4300001", commission_rate: 2.5, lockbox_code: "1134",
    hero_image_url: IMAGES.condo2,
    mls_photos: [IMAGES.condo2, IMAGES.interior1, IMAGES.kitchen1],
    notes: "Richmond Centre area condo. 2BR/1BA, close to shopping and transit. First-time buyer friendly.",
    mls_remarks: "Well-maintained 2BR condo in prime Richmond Centre location. Walking distance to Richmond Centre Mall, Canada Line, and T&T Supermarket. Functional layout with laminate floors and updated bathroom.",
    showing_window_start: "10:00:00", showing_window_end: "19:00:00",
    current_phase: 4, mls_status: "pending",
  },
  {
    address: "12567 72nd Avenue, Surrey, BC V3W 2M5",
    status: "active", list_price: 1350000, property_type: "Residential", prop_type: "detached",
    mls_number: "V4300002", commission_rate: 3.0, lockbox_code: "6678",
    hero_image_url: IMAGES.detached3,
    mls_photos: [IMAGES.detached3, IMAGES.interior3, IMAGES.bathroom1],
    notes: "Large family home in Newton. 6BR/4BA, legal suite, 7,200 sqft lot. Great for multigenerational living.",
    mls_remarks: "Spacious 6BR/4BA Newton family home on generous 7,200 sqft lot. Features legal 2BR basement suite, updated kitchen, and large backyard. Perfect for multigenerational families.",
    showing_window_start: "09:00:00", showing_window_end: "18:00:00",
    current_phase: 1, mls_status: "pending",
  },
  {
    address: "3455 Ascot Place #1802, Vancouver, BC V5R 6B7",
    status: "sold", list_price: 425000, sold_price: 435000, property_type: "Condo/Apartment", prop_type: "condo",
    mls_number: "V4300003", commission_rate: 2.5,
    hero_image_url: IMAGES.condo3,
    mls_photos: [IMAGES.condo3],
    notes: "Collingwood condo sold $10K over asking. Quick sale — 5 days on market.",
    mls_remarks: "Bright 18th-floor Collingwood condo with city views. 1BR/1BA, efficient layout, excellent building amenities including gym, pool, and rooftop deck.",
    current_phase: 8, mls_status: "sold",
    closing_date: "2026-03-20",
  },
];

// ── Buyer agent names for showings ──
const BUYER_AGENTS = [
  { name: "Jennifer Park", phone: "+16045559001", email: "jpark@sutton.demo" },
  { name: "David Rodriguez", phone: "+16045559002", email: "drodriguez@remax.demo" },
  { name: "Amanda Foster", phone: "+16045559003", email: "afoster@royallepage.demo" },
  { name: "Ryan Nakamura", phone: "+16045559004", email: "rnakamura@kw.demo" },
  { name: "Michelle Leung", phone: "+16045559005", email: "mleung@century21.demo" },
  { name: "Brandon Stewart", phone: "+16045559006", email: "bstewart@exp.demo" },
];

async function seedUser(userId, userName, listings, contactNames) {
  // Check idempotency
  const { count } = await supabase.from("listings").select("id", { count: "exact", head: true }).eq("realtor_id", userId);
  if ((count || 0) > 0) {
    console.log(`  ${userName}: already has ${count} listings — skipping`);
    return;
  }

  // Get seller contact IDs
  const { data: contacts } = await supabase.from("contacts").select("id, name, type").eq("realtor_id", userId);
  const sellers = (contacts || []).filter(c => c.type === "seller");
  const buyers = (contacts || []).filter(c => c.type === "buyer");

  // Insert listings
  const listingRows = listings.map((l, i) => ({
    realtor_id: userId,
    seller_id: sellers[i % sellers.length]?.id || null,
    lockbox_code: "0000",
    ...l,
    mls_photos: l.mls_photos || [],
    audit_trail: [],
    disclosures: {},
    inclusions: [],
    exclusions: [],
    rental_equipment: [],
  }));

  const { data: insertedListings, error: listErr } = await supabase
    .from("listings")
    .insert(listingRows)
    .select("id, address, status");

  if (listErr) {
    console.error(`  ${userName} listings error:`, listErr.message);
    return;
  }
  console.log(`  ${userName}: ${insertedListings.length} listings created`);

  // Create showings for active listings
  const activeListings = insertedListings.filter(l => l.status === "active" || l.status === "conditional");
  const now = new Date();
  const showingRows = [];

  for (let i = 0; i < activeListings.length; i++) {
    const listing = activeListings[i];
    // 2 showings per active listing: one past (confirmed), one future (pending)
    const pastDate = new Date(now);
    pastDate.setDate(pastDate.getDate() - (3 + i));
    pastDate.setHours(14 + i, 0, 0, 0);

    const futureDate = new Date(now);
    futureDate.setDate(futureDate.getDate() + (1 + i));
    futureDate.setHours(10 + i, 30, 0, 0);

    const agent1 = BUYER_AGENTS[(i * 2) % BUYER_AGENTS.length];
    const agent2 = BUYER_AGENTS[(i * 2 + 1) % BUYER_AGENTS.length];

    showingRows.push({
      realtor_id: userId,
      listing_id: listing.id,
      buyer_agent_name: agent1.name,
      buyer_agent_phone: agent1.phone,
      buyer_agent_email: agent1.email,
      start_time: pastDate.toISOString(),
      end_time: new Date(pastDate.getTime() + 30 * 60000).toISOString(),
      status: "confirmed",
      notes: "Liked the property. Wants to bring partner for second viewing.",
    });
    showingRows.push({
      realtor_id: userId,
      listing_id: listing.id,
      buyer_agent_name: agent2.name,
      buyer_agent_phone: agent2.phone,
      buyer_agent_email: agent2.email,
      start_time: futureDate.toISOString(),
      end_time: new Date(futureDate.getTime() + 30 * 60000).toISOString(),
      status: "requested",
      notes: "First-time buyer client. Very interested in the area.",
    });
  }

  if (showingRows.length > 0) {
    const { data: showings, error: showErr } = await supabase.from("appointments").insert(showingRows).select("id");
    if (showErr) console.error(`  ${userName} showings error:`, showErr.message);
    else console.log(`  ${userName}: ${showings.length} showings created`);
  }

  // Create newsletters
  const newsletterRows = [];
  if (buyers.length > 0) {
    newsletterRows.push({
      realtor_id: userId,
      contact_id: buyers[0].id,
      email_type: "new_listing_alert",
      subject: `New Listings in Your Area — ${new Date().toLocaleDateString("en-CA", { month: "long", year: "numeric" })}`,
      html_body: `<p>Hi ${buyers[0].name.split(" ")[0]},</p><p>I found some exciting new listings that match your criteria. Let me know if you'd like to schedule viewings!</p>`,
      status: "draft",
      send_mode: "review",
      ai_context: { type: "new_listing_alert", area: "Vancouver" },
    });
  }
  if (buyers.length > 1) {
    newsletterRows.push({
      realtor_id: userId,
      contact_id: buyers[1].id,
      email_type: "market_update",
      subject: "Q1 2026 Market Update — Vancouver Real Estate",
      html_body: `<p>Hi ${buyers[1].name.split(" ")[0]},</p><p>Here's your Q1 2026 market update for Greater Vancouver. The average home price rose 3.2% this quarter with particularly strong demand in the townhouse segment.</p>`,
      status: "sent",
      sent_at: new Date(now.getTime() - 7 * 86400000).toISOString(),
      send_mode: "auto",
      ai_context: { type: "market_update", area: "Vancouver" },
    });
  }

  if (newsletterRows.length > 0) {
    const { data: nls, error: nlErr } = await supabase.from("newsletters").insert(newsletterRows).select("id");
    if (nlErr) console.error(`  ${userName} newsletters error:`, nlErr.message);
    else console.log(`  ${userName}: ${nls.length} newsletters created`);
  }

  // Create some communications
  const commRows = [];
  for (const contact of (contacts || []).slice(0, 3)) {
    commRows.push({
      realtor_id: userId,
      contact_id: contact.id,
      direction: "outbound",
      channel: "email",
      body: `Hi ${contact.name.split(" ")[0]}, just following up on our conversation. I have some new listings that might interest you. Let me know when you're free to chat!`,
      created_at: new Date(now.getTime() - Math.random() * 7 * 86400000).toISOString(),
    });
  }
  if (commRows.length > 0) {
    const { error: commErr } = await supabase.from("communications").insert(commRows);
    if (commErr) console.error(`  ${userName} comms error:`, commErr.message);
    else console.log(`  ${userName}: ${commRows.length} communications created`);
  }
}

async function main() {
  console.log("Seeding demo user data...\n");

  await seedUser(USERS.sarah.id, USERS.sarah.name, SARAH_LISTINGS);
  await seedUser(USERS.mike.id, USERS.mike.name, MIKE_LISTINGS);
  await seedUser(USERS.priya.id, USERS.priya.name, PRIYA_LISTINGS);

  // Final counts
  console.log("\n=== Final Data Counts ===");
  for (const [key, user] of Object.entries(USERS)) {
    const [
      { count: contacts },
      { count: listings },
      { count: showings },
      { count: newsletters },
    ] = await Promise.all([
      supabase.from("contacts").select("id", { count: "exact", head: true }).eq("realtor_id", user.id),
      supabase.from("listings").select("id", { count: "exact", head: true }).eq("realtor_id", user.id),
      supabase.from("appointments").select("id", { count: "exact", head: true }).eq("realtor_id", user.id),
      supabase.from("newsletters").select("id", { count: "exact", head: true }).eq("realtor_id", user.id),
    ]);
    console.log(`${user.name}: ${contacts} contacts | ${listings} listings | ${showings} showings | ${newsletters} newsletters`);
  }

  console.log("\nDone!");
}

main().catch(console.error);
