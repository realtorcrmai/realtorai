import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://qcohfohjihazivkforsj.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjb2hmb2hqaWhheml2a2ZvcnNqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzI3NjUwNywiZXhwIjoyMDg4ODUyNTA3fQ.uWkkflNhSjJBkLXeP_E3o1NxUVth3vh5Pgujlq1CN6Q"
);

// ─── helpers ───
function uid(prefix, n) {
  const hex = n.toString(16).padStart(4, "0");
  return `${prefix}-0000-0000-0000-00000000${hex}`;
}
function sellerUid(n) { return uid("a0000000", n); }
function buyerUid(n)  { return uid("b0000000", n); }
function partnerUid(n) { return uid("e0000000", n); }
function otherUid(n) { return uid("f0000000", n); }
function listUid(n)   { return uid("c0000000", n); }
function apptUid(n)   { return uid("d0000000", n); }
function householdUid(n) { return uid("11000000", n); }

function randomPhone() {
  return "+1604555" + String(Math.floor(1000 + Math.random() * 8999));
}
function daysAgo(d) {
  const dt = new Date(); dt.setDate(dt.getDate() - Math.max(0, d));
  return dt.toISOString();
}
function daysFromNow(d) {
  const dt = new Date(); dt.setDate(dt.getDate() + d);
  return dt.toISOString();
}
function dateStr(off) {
  const dt = new Date(); dt.setDate(dt.getDate() + off);
  return dt.toISOString().split("T")[0];
}
function email(name) {
  return name.toLowerCase().replace(/[^a-z]/g, ".").replace(/\.+/g, ".").replace(/^\.|\.$/, "") + "@email.com";
}

// ─── nuke ───
async function deleteAll() {
  console.log("🗑️  Dropping ALL data...");
  const tables = [
    "workflow_step_logs", "workflow_enrollments", "workflow_steps", "workflows",
    "message_templates", "agent_notifications", "activity_log",
    "form_submissions", "listing_documents", "communications",
    "appointments", "tasks", "referrals", "contact_documents", "contact_dates",
    "contact_relationships", "media_assets", "prompts",
    "listings", "contacts", "form_templates", "households",
  ];
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error && !error.message.includes("does not exist") && !error.message.includes("relation")) {
      console.error(`  ❌ ${t}: ${error.message}`);
    } else {
      console.log(`  ✅ ${t}`);
    }
  }
}

async function insert(table, rows) {
  if (rows.length === 0) return true;
  for (let i = 0; i < rows.length; i += 50) {
    const chunk = rows.slice(i, i + 50);
    const { error } = await supabase.from(table).insert(chunk);
    if (error) {
      console.error(`  ❌ ${table} (chunk ${i}): ${error.message}`);
      return false;
    }
  }
  console.log(`  ✅ ${table}: ${rows.length} rows`);
  return true;
}

// ═══════════════════════════════════════════════
// SEED
// ═══════════════════════════════════════════════

async function seed() {
  await deleteAll();
  console.log("\n📦 Seeding ~100 scenarios...\n");

  // ─── SELLERS (30) — spread across all pipeline stages ───
  const sellerDefs = [
    // Stage: closed (6 sellers — sold listing, all done)
    { name: "Margaret Chen",       stage: "closed", lead: "closed", notes: "Downsizing from family home. Sold above asking.", tags: ["past client", "referral"], source: "Referral" },
    { name: "David & Priya Patel", stage: "closed", lead: "closed", notes: "Relocated to Toronto. Smooth closing.", tags: ["past client"], source: "Website" },
    { name: "Robert Yamamoto",     stage: "closed", lead: "closed", notes: "Investment property sold. Great ROI.", tags: ["past client", "investor"], source: "Sphere of Influence" },
    { name: "Elena Petrova",       stage: "closed", lead: "closed", notes: "Condo sold before overseas move. Under deadline.", tags: ["past client"], source: "Referral" },
    { name: "James & Linda Wong",  stage: "closed", lead: "closed", notes: "Upgraded to larger home. Repeat client potential.", tags: ["past client", "repeat client"], source: "Past Client" },
    { name: "Aisha Okafor",        stage: "closed", lead: "closed", notes: "Estate sale completed. Family grateful for guidance.", tags: ["past client"], source: "Referral" },

    // Stage: under_contract (5 sellers — pending listing)
    { name: "Michael Thompson",    stage: "under_contract", lead: "under_contract", notes: "Luxury waterfront. Accepted offer, subject removal pending.", tags: ["vip", "listing active"], source: "Sphere of Influence" },
    { name: "Sarah O'Brien",       stage: "under_contract", lead: "under_contract", notes: "Estate sale. Buyer financing condition outstanding.", tags: ["listing active"], source: "Referral" },
    { name: "Carlos Rivera",       stage: "under_contract", lead: "under_contract", notes: "Investment duplex. Cash buyer, quick close expected.", tags: ["listing active"], source: "Website" },
    { name: "Nadia Kowalski",      stage: "under_contract", lead: "under_contract", notes: "Downsizing condo. Subject to sale of current home.", tags: ["listing active"], source: "Open House" },
    { name: "Frank & Mary Zhang",  stage: "under_contract", lead: "under_contract", notes: "Family home. Multiple offers received.", tags: ["listing active"], source: "Past Client" },

    // Stage: active_listing (7 sellers — active listing on MLS)
    { name: "Thomas Anderson",     stage: "active_listing", lead: "active", notes: "Premium view property. Open house every weekend.", tags: ["listing active", "hot lead"], source: "Website" },
    { name: "Jennifer Martinez",   stage: "active_listing", lead: "active", notes: "Kitsilano townhouse. Strong interest from showings.", tags: ["listing active"], source: "Social Media" },
    { name: "Raj & Sunita Mehta",  stage: "active_listing", lead: "active", notes: "Mount Pleasant condo. Competitive pricing.", tags: ["listing active"], source: "Referral" },
    { name: "Sophie Laurent",      stage: "active_listing", lead: "active", notes: "Dunbar character home. Unique heritage features.", tags: ["listing active"], source: "Sphere of Influence" },
    { name: "Omar Al-Rashid",      stage: "active_listing", lead: "active", notes: "Shaughnessy luxury. Premium marketing package.", tags: ["listing active", "vip"], source: "Referral" },
    { name: "Grace Nakamura",      stage: "active_listing", lead: "active", notes: "Point Grey family home. Near schools.", tags: ["listing active"], source: "Open House" },
    { name: "Liam O'Connor",       stage: "active_listing", lead: "active", notes: "Kerrisdale. Docs done, waiting for MLS submission.", tags: ["listing active"], source: "Website" },

    // Stage: qualified (5 sellers — listed recently, price set, early docs)
    { name: "Fatima Hassan",       stage: "qualified", lead: "qualified", notes: "Marpole condo. CMA done, price agreed. Preparing forms.", tags: ["warm lead"], source: "Social Media" },
    { name: "Derek & Jane Park",   stage: "qualified", lead: "qualified", notes: "South Granville home. Professional photos next week.", tags: ["warm lead"], source: "Referral" },
    { name: "Stephanie Kim",       stage: "qualified", lead: "qualified", notes: "Hastings-Sunrise. Price set, gathering documents.", tags: ["warm lead"], source: "Website" },
    { name: "Marcus Johnson",      stage: "qualified", lead: "qualified", notes: "Grandview cottage. Assessment data pending.", tags: ["warm lead"], source: "Door Knock" },
    { name: "Yuki Tanaka",         stage: "qualified", lead: "qualified", notes: "Strathcona loft. Market analysis in progress.", tags: ["warm lead"], source: "Open House" },

    // Stage: new (4 sellers — just entered, early intake)
    { name: "Kevin Li",            stage: "new", lead: "new", notes: "Gastown condo. Just signed agreement. Very early.", tags: [], source: "Website" },
    { name: "Priya Sharma",        stage: "new", lead: "new", notes: "Yaletown penthouse. Initial consult completed.", tags: [], source: "Cold Call" },
    { name: "Beth Sawyer",         stage: "new", lead: "contacted", notes: "Olympic Village. Gathering property info.", tags: [], source: "Social Media" },
    { name: "Hiroshi Watanabe",    stage: "new", lead: "new", notes: null, tags: [], source: "Website" },

    // Stage: cold (3 sellers — gone quiet, re-engagement)
    { name: "Patrick Murphy",      stage: "cold", lead: "lost", notes: "Was interested in listing but went silent 3 months ago.", tags: ["cold lead"], source: "Sign Call" },
    { name: "Diana Reeves",        stage: "cold", lead: "lost", notes: "Decided to wait. Maybe revisit in spring.", tags: ["cold lead"], source: "Referral" },
    { name: "George Blackwell",    stage: "cold", lead: "lost", notes: "Listed with another agent. Lost deal.", tags: ["cold lead"], source: "Website" },
  ];

  // ─── BUYERS (30) — spread across pipeline stages ───
  const buyerDefs = [
    // closed (5)
    { name: "Thomas & Rachel Kim", stage: "closed", lead: "closed", notes: "Closed on Maple St. Large social network for referrals.", tags: ["past client", "referral"], source: "Referral" },
    { name: "Alex Morgan",         stage: "closed", lead: "closed", notes: "First-time buyer. Closed Jan 2026. Very happy.", tags: ["past client", "first-time buyer"], source: "Open House" },
    { name: "Diana Prince",        stage: "closed", lead: "closed", notes: "Luxury buyer. Purchased waterfront unit.", tags: ["past client", "vip"], source: "Sphere of Influence" },
    { name: "Henry & Claire Wu",   stage: "closed", lead: "closed", notes: "Investor. Purchased rental property in Burnaby.", tags: ["past client", "investor"], source: "Referral" },
    { name: "Sarah Mitchell",      stage: "closed", lead: "closed", notes: "Downsizer from West Van. Happy with condo purchase.", tags: ["past client", "downsizer"], source: "Past Client" },

    // under_contract (4)
    { name: "Jennifer Liu",        stage: "under_contract", lead: "under_contract", notes: "Investor buyer. Cash offer on Oak Ave. Financing condition.", tags: ["investor", "under contract"], source: "Website" },
    { name: "Raj Mehta",           stage: "under_contract", lead: "under_contract", notes: "Under contract on Cedar Drive. Subject removal Mar 28.", tags: ["under contract"], source: "Referral" },
    { name: "Sophie Chen",         stage: "under_contract", lead: "under_contract", notes: "First home. Conditional offer accepted. Very excited.", tags: ["first-time buyer", "under contract"], source: "Social Media" },
    { name: "Eric Johansson",      stage: "under_contract", lead: "under_contract", notes: "Upsizing to 4BR. Offer accepted. Waiting on inspection.", tags: ["upsizer", "under contract"], source: "Referral" },

    // active_search (6)
    { name: "Carlos & Maria Rodriguez", stage: "active_search", lead: "active", notes: "First-time buyers. Pre-approved $750K. Burnaby/New West.", tags: ["first-time buyer", "pre-approved", "hot lead"], source: "Website" },
    { name: "Amanda Foster",       stage: "active_search", lead: "active", notes: "Budget $800K–$950K. East Van. Needs 3BR minimum.", tags: ["pre-approved", "warm lead"], source: "Referral" },
    { name: "Stephanie Park",      stage: "active_search", lead: "active", notes: "Relocating from Calgary. Remote worker, flexible area.", tags: ["relocating", "warm lead"], source: "Website" },
    { name: "Omar Hassan",         stage: "active_search", lead: "active", notes: "Budget $1.2M. Detached with in-law suite.", tags: ["upsizer", "pre-approved"], source: "Referral" },
    { name: "Nathan Brooks",       stage: "active_search", lead: "active", notes: "Investor looking for multi-family. Pre-approved $1.5M.", tags: ["investor", "pre-approved", "hot lead"], source: "Social Media" },
    { name: "Lily Tran",           stage: "active_search", lead: "active", notes: "Young couple. Looking at condos in Metrotown.", tags: ["first-time buyer", "pre-approved"], source: "Google Ads" },

    // qualified (5)
    { name: "Kevin Nakamura",      stage: "qualified", lead: "qualified", notes: "Young professional. Condo under $550K near SkyTrain.", tags: ["first-time buyer", "warm lead"], source: "Website" },
    { name: "Isabella Cruz",       stage: "qualified", lead: "qualified", notes: "Downsizing from house. Low-maintenance condo preferred.", tags: ["downsizer"], source: "Open House" },
    { name: "Mason Lee",           stage: "qualified", lead: "qualified", notes: "Budget $900K. Wants newer construction with EV charging.", tags: ["pre-approved"], source: "Google Ads" },
    { name: "Harper Johnson",      stage: "qualified", lead: "nurturing", notes: "Not ready for 6 months but wants to start looking.", tags: ["cold lead"], source: "Website" },
    { name: "Aiden Patel",         stage: "qualified", lead: "qualified", notes: "Pre-approved $650K. Condo or townhouse. Coquitlam.", tags: ["first-time buyer", "pre-approved"], source: "Realtor.ca" },

    // new (6)
    { name: "Brian Cooper",        stage: "new", lead: "new", notes: null, tags: [], source: "Website" },
    { name: "Natasha Volkov",      stage: "new", lead: "new", notes: null, tags: [], source: "Zillow" },
    { name: "Ethan Wright",        stage: "new", lead: "contacted", notes: "Called back. Seems motivated.", tags: [], source: "Open House" },
    { name: "Zara Ahmed",          stage: "new", lead: "new", notes: null, tags: [], source: "Social Media" },
    { name: "Lucas Schmidt",       stage: "new", lead: "new", notes: null, tags: [], source: "Realtor.ca" },
    { name: "Mia Taylor",          stage: "new", lead: "new", notes: "Just inquired on website. No details yet.", tags: [], source: "Website" },

    // cold (4)
    { name: "Jake Dawson",         stage: "cold", lead: "lost", notes: "Was looking 6 months ago. Went silent.", tags: ["cold lead"], source: "Zillow" },
    { name: "Priya Nair",          stage: "cold", lead: "lost", notes: "Moved overseas temporarily. May return in a year.", tags: ["cold lead"], source: "Referral" },
    { name: "Chris Martin",        stage: "cold", lead: "lost", notes: "Bought with another agent. Lost deal.", tags: ["cold lead"], source: "Open House" },
    { name: "Olivia Grant",        stage: "cold", lead: "lost", notes: "Couldn't get financing approved. On hold.", tags: ["cold lead"], source: "Website" },
  ];

  // ─── PARTNERS (8) ───
  const partnerDefs = [
    { name: "Lisa Chang",       partnerType: "mortgage_broker", company: "Pacific Mortgage Group", title: "Senior Broker", notes: "Handles most of our buyer pre-approvals." },
    { name: "Mark Davidson",     partnerType: "lawyer", company: "Davidson & Associates Law", title: "Real Estate Lawyer", notes: "Preferred conveyancing partner." },
    { name: "Tony Russo",        partnerType: "inspector", company: "ProInspect BC", title: "Certified Inspector", notes: "Thorough reports, available weekends." },
    { name: "Samantha Wells",    partnerType: "agent", company: "RE/MAX Select", title: "Realtor", notes: "Co-listing agent for luxury properties." },
    { name: "Dr. Anita Gupta",   partnerType: "financial_advisor", company: "Wealth Strategies Inc", title: "CFP", notes: "Refers high-net-worth clients." },
    { name: "Rachel Dumont",     partnerType: "mortgage_broker", company: "True North Lending", title: "Mortgage Specialist", notes: "Great with first-time buyers." },
    { name: "James O'Neil",      partnerType: "lawyer", company: "Coastal Law Group", title: "Partner", notes: "Fast turnaround on closings." },
    { name: "Victor Tan",        partnerType: "inspector", company: "SureCheck Inspections", title: "Lead Inspector", notes: "Specializes in older homes." },
  ];

  // ─── OTHER (2) ───
  const otherDefs = [
    { name: "Sandra Williams", notes: "Stager we use for luxury listings." },
    { name: "Mike the Photographer", notes: "Real estate photography & video tours." },
  ];

  const sellers = sellerDefs.map((d, i) => ({
    id: sellerUid(i + 1), name: d.name, phone: randomPhone(), email: email(d.name),
    type: "seller", pref_channel: i % 2 === 0 ? "sms" : "whatsapp",
    notes: d.notes, stage_bar: d.stage, lead_status: d.lead,
    tags: JSON.stringify(d.tags), source: d.source,
    last_activity_date: daysAgo(i * 2),
    seller_preferences: ["qualified", "active_listing", "under_contract", "closed"].includes(d.stage) ? JSON.stringify({
      motivation: ["Downsizing", "Relocating", "Investment sale", "Estate sale", "Upgrading"][i % 5],
      desired_list_price: [750000, 900000, 1200000, 1500000, 2000000][i % 5],
      earliest_list_date: dateStr(-30 + i),
      occupancy: ["vacant", "owner-occupied", "tenant-occupied"][i % 3],
      has_purchase_plan_after_sale: i % 2 === 0,
    }) : null,
  }));

  const buyers = buyerDefs.map((d, i) => ({
    id: buyerUid(i + 1), name: d.name, phone: randomPhone(), email: email(d.name),
    type: "buyer", pref_channel: i % 3 === 0 ? "whatsapp" : "sms",
    notes: d.notes, stage_bar: d.stage, lead_status: d.lead,
    tags: JSON.stringify(d.tags), source: d.source,
    last_activity_date: daysAgo(i * 2),
    buyer_preferences: !["new", "cold"].includes(d.stage) ? JSON.stringify({
      min_price: [400000, 500000, 600000, 700000, 800000][i % 5],
      max_price: [700000, 850000, 950000, 1200000, 1500000][i % 5],
      bedrooms: [1, 2, 3, 3, 4][i % 5],
      bathrooms: [1, 1, 2, 2, 3][i % 5],
      property_type: ["condo", "townhouse", "detached", "detached", "multi-family"][i % 5],
      areas: ["East Vancouver", "Burnaby", "North Vancouver", "West Vancouver", "Downtown"][i % 5],
      financing_status: ["preapproved", "in_progress", "not_started"][i % 3],
      move_timeline: ["0-3 months", "3-6 months", "6-12 months"][i % 3],
      must_haves: ["Parking", "In-suite laundry", "Yard", "Near transit", "EV charging"][i % 5],
    }) : null,
  }));

  const partners = partnerDefs.map((d, i) => ({
    id: partnerUid(i + 1), name: d.name, phone: randomPhone(), email: email(d.name),
    type: "partner", pref_channel: "sms", notes: d.notes,
    partner_type: d.partnerType, company_name: d.company, job_title: d.title,
    partner_active: true, stage_bar: null, lead_status: null,
    last_activity_date: daysAgo(i * 5),
  }));

  const others = otherDefs.map((d, i) => ({
    id: otherUid(i + 1), name: d.name, phone: randomPhone(), email: email(d.name),
    type: "other", pref_channel: "sms", notes: d.notes,
    stage_bar: null, lead_status: null,
    last_activity_date: daysAgo(i * 10),
  }));

  await insert("contacts", [...sellers, ...buyers, ...partners, ...others]);

  // ─── HOUSEHOLDS (8) — group some contacts together ───
  const households = [
    { id: householdUid(1), name: "Patel Family", address: "567 Oak Avenue, Burnaby, BC" },
    { id: householdUid(2), name: "Wong Family", address: "456 Birch Lane, Coquitlam, BC" },
    { id: householdUid(3), name: "Kim Family", address: "1234 Maple Street, Vancouver, BC" },
    { id: householdUid(4), name: "Rodriguez Family", address: "2500 Kingsway, Burnaby, BC" },
    { id: householdUid(5), name: "Mehta Family", address: "9090 Magnolia Cres, Vancouver, BC" },
    { id: householdUid(6), name: "Park Family", address: "6666 Rosemary Dr, Vancouver, BC" },
    { id: householdUid(7), name: "Zhang Family", address: "5050 Alder Ave, Langley, BC" },
    { id: householdUid(8), name: "Wu Family", address: "3400 Marine Drive, Burnaby, BC" },
  ];
  await insert("households", households);

  // Assign household_id to matched contacts
  const householdAssigns = [
    { id: sellerUid(2), household_id: householdUid(1) },   // David & Priya Patel
    { id: sellerUid(5), household_id: householdUid(2) },   // James & Linda Wong
    { id: buyerUid(1), household_id: householdUid(3) },    // Thomas & Rachel Kim
    { id: buyerUid(10), household_id: householdUid(4) },   // Carlos & Maria Rodriguez
    { id: sellerUid(14), household_id: householdUid(5) },  // Raj & Sunita Mehta
    { id: sellerUid(20), household_id: householdUid(6) },  // Derek & Jane Park
    { id: sellerUid(11), household_id: householdUid(7) },  // Frank & Mary Zhang
    { id: buyerUid(4), household_id: householdUid(8) },    // Henry & Claire Wu
  ];
  for (const h of householdAssigns) {
    await supabase.from("contacts").update({ household_id: h.household_id }).eq("id", h.id);
  }
  console.log("  ✅ household assignments: 8 contacts");

  // ─── CONTACT RELATIONSHIPS ───
  const relationships = [
    { contact_a_id: sellerUid(1), contact_b_id: buyerUid(1), relationship_type: "friend", notes: "Margaret referred the Kims" },
    { contact_a_id: sellerUid(7), contact_b_id: partnerUid(2), relationship_type: "colleague", notes: "Mark handles Michael's conveyancing" },
    { contact_a_id: buyerUid(10), contact_b_id: partnerUid(1), relationship_type: "colleague", notes: "Lisa pre-approved the Rodriguez family" },
    { contact_a_id: sellerUid(4), contact_b_id: sellerUid(3), relationship_type: "friend", notes: "Elena and Robert know each other from community events" },
    { contact_a_id: buyerUid(5), contact_b_id: buyerUid(4), relationship_type: "neighbour", notes: "Sarah and the Wus live on same street" },
    { contact_a_id: partnerUid(1), contact_b_id: partnerUid(5), relationship_type: "colleague", notes: "Lisa and Anita cross-refer clients" },
    { contact_a_id: buyerUid(16), contact_b_id: buyerUid(20), relationship_type: "sibling", notes: "Kevin and Aiden are brothers" },
    { contact_a_id: sellerUid(12), contact_b_id: sellerUid(15), relationship_type: "spouse", notes: "Thomas and Jennifer are married" },
  ];
  await insert("contact_relationships", relationships);

  // ─── DEMOGRAPHICS (for some contacts) ───
  const demoUpdates = [
    { id: buyerUid(1), demographics: { age_range: "30-40", income_range: "$150K - $250K", occupation: "Software Engineer", household_size: 3 } },
    { id: buyerUid(2), demographics: { age_range: "25-30", income_range: "$100K - $150K", occupation: "Marketing Manager", household_size: 1 } },
    { id: buyerUid(3), demographics: { age_range: "40-50", income_range: "$500K+", occupation: "Business Owner", household_size: 2 } },
    { id: buyerUid(10), demographics: { age_range: "30-40", income_range: "$100K - $150K", occupation: "Teacher & Nurse", household_size: 4 } },
    { id: sellerUid(1), demographics: { age_range: "60-70", income_range: "$150K - $250K", occupation: "Retired Professor", household_size: 1 } },
    { id: sellerUid(7), demographics: { age_range: "50-60", income_range: "$500K+", occupation: "Entrepreneur", household_size: 3 } },
    { id: sellerUid(16), demographics: { age_range: "40-50", income_range: "$250K - $500K", occupation: "Architect", household_size: 4 } },
    { id: buyerUid(14), demographics: { age_range: "35-45", income_range: "$250K - $500K", occupation: "Real Estate Investor", household_size: 2 } },
  ];
  for (const d of demoUpdates) {
    await supabase.from("contacts").update({ demographics: d.demographics }).eq("id", d.id);
  }
  console.log("  ✅ demographics: 8 contacts");

  // ─── CONTACT DATES ───
  const contactDates = [
    { contact_id: buyerUid(1), label: "Birthday", date: "1990-06-15", recurring: true, event_type: "birthday" },
    { contact_id: buyerUid(1), label: "Closing Anniversary", date: "2026-01-20", recurring: true, event_type: "closing" },
    { contact_id: buyerUid(2), label: "Birthday", date: "1995-03-22", recurring: true, event_type: "birthday" },
    { contact_id: buyerUid(3), label: "Birthday", date: "1980-11-10", recurring: true, event_type: "birthday" },
    { contact_id: sellerUid(1), label: "Birthday", date: "1958-09-05", recurring: true, event_type: "birthday" },
    { contact_id: sellerUid(1), label: "Sale Anniversary", date: "2026-02-10", recurring: true, event_type: "closing" },
    { contact_id: sellerUid(5), label: "Anniversary", date: "2005-08-20", recurring: true, event_type: "anniversary" },
    { contact_id: buyerUid(10), label: "Move-in Date", date: "2026-05-01", recurring: false, event_type: "move_in" },
    { contact_id: sellerUid(7), label: "Birthday", date: "1970-04-18", recurring: true, event_type: "birthday" },
    { contact_id: buyerUid(5), label: "Closing Date", date: "2025-12-15", recurring: true, event_type: "closing" },
    { contact_id: partnerUid(1), label: "Business Anniversary", date: "2015-03-01", recurring: true, event_type: "anniversary" },
    { contact_id: partnerUid(5), label: "Birthday", date: "1975-07-20", recurring: true, event_type: "birthday" },
  ];
  await insert("contact_dates", contactDates);

  // ─── REFERRALS ───
  const referrals = [
    { referred_by_contact_id: sellerUid(1), referred_client_contact_id: buyerUid(1), referral_type: "buyer", status: "closed", referral_fee_percent: 25, referral_date: "2025-12-01" },
    { referred_by_contact_id: partnerUid(5), referred_client_contact_id: buyerUid(3), referral_type: "buyer", status: "closed", referral_fee_percent: 20, referral_date: "2025-11-15" },
    { referred_by_contact_id: partnerUid(1), referred_client_contact_id: buyerUid(10), referral_type: "buyer", status: "accepted", referral_fee_percent: 25, referral_date: "2026-02-01" },
    { referred_by_contact_id: buyerUid(1), referred_client_contact_id: buyerUid(11), referral_type: "buyer", status: "accepted", referral_date: "2026-02-15" },
    { referred_by_contact_id: sellerUid(6), referred_client_contact_id: sellerUid(8), referral_type: "seller", status: "accepted", referral_date: "2026-01-10" },
    { referred_by_contact_id: partnerUid(4), referred_client_contact_id: sellerUid(16), referral_type: "seller", status: "open", referral_date: "2026-03-01" },
    { referred_by_contact_id: partnerUid(6), referred_client_contact_id: buyerUid(16), referral_type: "buyer", status: "open", referral_date: "2026-03-10" },
    { referred_by_contact_id: buyerUid(2), referred_client_contact_id: buyerUid(22), referral_type: "buyer", status: "open", referral_date: "2026-03-15" },
  ];
  await insert("referrals", referrals);

  // Update referred_by_id on some contacts
  const refUpdates = [
    { id: buyerUid(1), referred_by_id: sellerUid(1) },
    { id: buyerUid(3), referred_by_id: partnerUid(5) },
    { id: buyerUid(10), referred_by_id: partnerUid(1) },
    { id: buyerUid(11), referred_by_id: buyerUid(1) },
    { id: sellerUid(8), referred_by_id: sellerUid(6) },
  ];
  for (const r of refUpdates) {
    await supabase.from("contacts").update({ referred_by_id: r.referred_by_id }).eq("id", r.id);
  }
  console.log("  ✅ referred_by_id: 5 contacts");

  // ─── LISTINGS (27) ───
  const addresses = [
    // SOLD (6) — for closed sellers
    "1234 Maple Street, Vancouver, BC V5K 1A1",
    "567 Oak Avenue, Burnaby, BC V5H 2L3",
    "890 Cedar Drive, North Vancouver, BC V7L 4K2",
    "321 Pine Road, Richmond, BC V6Y 3E1",
    "456 Birch Lane, Coquitlam, BC V3K 6R2",
    "789 Willow Way, Surrey, BC V3T 5A8",
    // PENDING (5) — for under_contract sellers
    "1010 Elm Court, West Vancouver, BC V7T 1A1",
    "2020 Ash Street, Vancouver, BC V5Z 3H9",
    "3030 Spruce Boulevard, New Westminster, BC V3L 2X4",
    "4040 Hemlock Drive, Port Moody, BC V3H 4R6",
    "5050 Alder Avenue, Langley, BC V2Y 1M3",
    // ACTIVE + MLS (7) — for active_listing sellers
    "7070 Redwood Terrace, Coal Harbour, Vancouver, BC V6E 4A1",
    "8080 Sequoia Way, Kitsilano, Vancouver, BC V6K 2M5",
    "9090 Magnolia Crescent, Mount Pleasant, Vancouver, BC V5T 1G4",
    "1111 Cherry Blossom Lane, Dunbar, Vancouver, BC V6S 1N3",
    "2222 Laurel Heights, Shaughnessy, Vancouver, BC V6H 3S4",
    "3333 Hawthorn Road, Point Grey, Vancouver, BC V6R 1A2",
    "4444 Ivy Gate, Kerrisdale, Vancouver, BC V6N 1W8",
    // ACTIVE no MLS (5) — for qualified sellers
    "5555 Jasmine Court, Marpole, Vancouver, BC V6P 4T3",
    "6666 Rosemary Drive, South Granville, Vancouver, BC V6H 3E8",
    "7777 Sage Crescent, Hastings-Sunrise, Vancouver, BC V5K 2A9",
    "8888 Thyme Street, Grandview, Vancouver, BC V5L 1G7",
    "9999 Lavender Walk, Strathcona, Vancouver, BC V6A 2C3",
    // ACTIVE no MLS, no price (4) — for new sellers with listing
    "100 Fern Alley, Gastown, Vancouver, BC V6B 1H8",
    "200 Moss Landing, Yaletown, Vancouver, BC V6Z 2R9",
    "300 Clover Field, Olympic Village, Vancouver, BC V5Y 0C5",
    "400 Orchid Terrace, Cambie Village, Vancouver, BC V5Z 3A7",
  ];

  const listings = [];
  const soldPrices = [1314000, 895000, 1675000, 740000, 1005000, 1180000];
  const listPrices = [1289000, 879000, 1650000, 725000, 980000, 1150000,
                      2150000, 925000, 785000, 1340000, 690000,
                      3450000, 1195000, 899000, 1550000, 2875000, 1425000, 1890000,
                      1075000, 2250000, 750000, 620000, 835000,
                      null, null, null, null];

  // Buyer IDs for sold/pending listings
  const soldBuyers = [buyerUid(1), buyerUid(2), buyerUid(3), buyerUid(4), buyerUid(5), null];
  const pendingBuyers = [buyerUid(6), buyerUid(7), buyerUid(8), buyerUid(9), null];

  for (let i = 0; i < addresses.length; i++) {
    const sellerIdx = i + 1;
    let status, mls, price, soldPrice = null, buyerId = null, closingDate = null;
    let commRate = 2.5, commAmt = null;

    if (i < 6) {
      status = "sold"; mls = `V${1000000 + i}`; price = listPrices[i];
      soldPrice = soldPrices[i]; buyerId = soldBuyers[i];
      closingDate = dateStr(-30 + i * 5);
      commAmt = Math.round(soldPrice * 0.025);
    } else if (i < 11) {
      status = "pending"; mls = `V${2000000 + i}`; price = listPrices[i];
      buyerId = pendingBuyers[i - 6];
    } else if (i < 18) {
      status = "active"; mls = `V${3000000 + i}`; price = listPrices[i];
    } else if (i < 23) {
      status = "active"; mls = null; price = listPrices[i];
    } else {
      status = "active"; mls = null; price = null;
    }

    if (i >= 6 && price) commAmt = Math.round(price * 0.025);

    listings.push({
      id: listUid(i + 1), address: addresses[i], seller_id: sellerUid(sellerIdx),
      lockbox_code: `LB-${1000 + i}`, status, mls_number: mls, list_price: price,
      showing_window_start: "10:00", showing_window_end: "18:00",
      notes: `Listing for ${sellerDefs[i]?.name || "seller"}`,
      created_at: daysAgo(90 - i * 3),
      sold_price: soldPrice, buyer_id: buyerId, closing_date: closingDate,
      commission_rate: commRate, commission_amount: commAmt,
    });
  }

  await insert("listings", listings);

  // ─── LISTING DOCUMENTS ───
  const docs = [];
  for (let i = 0; i < 18; i++) {
    const lid = listUid(i + 1);
    docs.push({ listing_id: lid, doc_type: "FINTRAC", file_name: `FINTRAC_${i}.pdf`, file_url: `/docs/fintrac_${i}.pdf` });
    docs.push({ listing_id: lid, doc_type: "DORTS", file_name: `DORTS_${i}.pdf`, file_url: `/docs/dorts_${i}.pdf` });
    docs.push({ listing_id: lid, doc_type: "PDS", file_name: `PDS_${i}.pdf`, file_url: `/docs/pds_${i}.pdf` });
    if (i < 6) docs.push({ listing_id: lid, doc_type: "CONTRACT", file_name: `CONTRACT_${i}.pdf`, file_url: `/docs/contract_${i}.pdf` });
    if (i < 6) docs.push({ listing_id: lid, doc_type: "TITLE", file_name: `TITLE_${i}.pdf`, file_url: `/docs/title_${i}.pdf` });
  }
  for (let i = 18; i < 23; i++) {
    const lid = listUid(i + 1);
    docs.push({ listing_id: lid, doc_type: "FINTRAC", file_name: `FINTRAC_${i}.pdf`, file_url: `/docs/fintrac_${i}.pdf` });
    if (i < 20) docs.push({ listing_id: lid, doc_type: "DORTS", file_name: `DORTS_${i}.pdf`, file_url: `/docs/dorts_${i}.pdf` });
  }
  await insert("listing_documents", docs);

  // ─── APPOINTMENTS (~50) ───
  const appts = [];
  let ai = 1;
  // Sold listings: past confirmed
  for (let i = 0; i < 6; i++) {
    appts.push({ id: apptUid(ai++), listing_id: listUid(i+1), start_time: daysAgo(60-i*5), end_time: daysAgo(60-i*5-0.04), status: "confirmed", buyer_agent_name: buyerDefs[i%10].name, buyer_agent_phone: randomPhone(), twilio_message_sid: `SM_s${i}`, notes: "Buyer very interested. Made offer." });
    appts.push({ id: apptUid(ai++), listing_id: listUid(i+1), start_time: daysAgo(55-i*5), end_time: daysAgo(55-i*5-0.04), status: "confirmed", buyer_agent_name: buyerDefs[(i+3)%10].name, buyer_agent_phone: randomPhone(), twilio_message_sid: `SM_s${i}b`, notes: "Second showing. Brought inspector." });
  }
  // Pending listings: past confirmed
  for (let i = 6; i < 11; i++) {
    appts.push({ id: apptUid(ai++), listing_id: listUid(i+1), start_time: daysAgo(20-(i-6)*2), end_time: daysAgo(20-(i-6)*2-0.04), status: "confirmed", buyer_agent_name: buyerDefs[i%10].name, buyer_agent_phone: randomPhone(), twilio_message_sid: `SM_p${i}`, notes: "Buyer submitted offer." });
  }
  // Active+MLS: variety of statuses
  for (let i = 11; i < 18; i++) {
    appts.push({ id: apptUid(ai++), listing_id: listUid(i+1), start_time: daysAgo(10), end_time: daysAgo(10-0.04), status: "confirmed", buyer_agent_name: buyerDefs[i%10].name, buyer_agent_phone: randomPhone(), twilio_message_sid: `SM_a${i}`, notes: "Interested. Requesting more info." });
    appts.push({ id: apptUid(ai++), listing_id: listUid(i+1), start_time: daysFromNow(3+i), end_time: daysFromNow(3+i+0.04), status: "confirmed", buyer_agent_name: buyerDefs[(i+5)%10].name, buyer_agent_phone: randomPhone(), twilio_message_sid: `SM_a${i}b`, notes: null });
    if (i % 2 === 0) appts.push({ id: apptUid(ai++), listing_id: listUid(i+1), start_time: daysFromNow(7+i), end_time: daysFromNow(7+i+0.04), status: "requested", buyer_agent_name: buyerDefs[(i+7)%20].name, buyer_agent_phone: randomPhone(), twilio_message_sid: `SM_a${i}c`, notes: null });
    if (i % 3 === 0) appts.push({ id: apptUid(ai++), listing_id: listUid(i+1), start_time: daysFromNow(10+i), end_time: daysFromNow(10+i+0.04), status: "requested", buyer_agent_name: buyerDefs[(i+2)%20].name, buyer_agent_phone: randomPhone(), twilio_message_sid: null, notes: null });
    if (i % 4 === 0) appts.push({ id: apptUid(ai++), listing_id: listUid(i+1), start_time: daysAgo(5), end_time: daysAgo(5-0.04), status: "denied", buyer_agent_name: buyerDefs[(i+4)%20].name, buyer_agent_phone: randomPhone(), twilio_message_sid: `SM_a${i}d`, notes: "Seller unavailable." });
    if (i === 14) appts.push({ id: apptUid(ai++), listing_id: listUid(i+1), start_time: daysAgo(3), end_time: daysAgo(3-0.04), status: "cancelled", buyer_agent_name: buyerDefs[6].name, buyer_agent_phone: randomPhone(), twilio_message_sid: `SM_a${i}e`, notes: "Buyer changed mind." });
  }
  await insert("appointments", appts);

  // ─── COMMUNICATIONS (~200) ───
  const comms = [];
  // Sellers
  for (let i = 0; i < sellerDefs.length; i++) {
    const cid = sellerUid(i + 1);
    const ch = i % 2 === 0 ? "sms" : "whatsapp";
    if (sellerDefs[i].stage === "closed") {
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Started listing process for your property.", created_at: daysAgo(85 - i * 3) });
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Great! What do you need from me?", created_at: daysAgo(84 - i * 3) });
      comms.push({ contact_id: cid, direction: "outbound", channel: "email", body: "FINTRAC form and listing agreement sent for e-signature.", created_at: daysAgo(80 - i * 3) });
      comms.push({ contact_id: cid, direction: "inbound", channel: "email", body: "All signed and returned!", created_at: daysAgo(78 - i * 3) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Property is live on MLS! Great interest already.", created_at: daysAgo(60 - i * 3) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Multiple offers received! Let me walk you through them.", created_at: daysAgo(40 - i * 3) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Congratulations — your property has SOLD!", created_at: daysAgo(20 - i * 3) });
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Thank you! Amazing experience.", created_at: daysAgo(19 - i * 3) });
    } else if (sellerDefs[i].stage === "under_contract") {
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Listing agreement sent. Please review and sign.", created_at: daysAgo(50 - (i-6)*3) });
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Signed! When on MLS?", created_at: daysAgo(48 - (i-6)*3) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Live on MLS! Showing requests coming in.", created_at: daysAgo(40 - (i-6)*3) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "We have an offer! Subject to conditions.", created_at: daysAgo(15 - (i-6)) });
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Exciting! Fingers crossed.", created_at: daysAgo(14 - (i-6)) });
    } else if (sellerDefs[i].stage === "active_listing") {
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "CMA report ready. Here's the suggested list price.", created_at: daysAgo(30 - (i-11)*2) });
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Looks good. Let's proceed.", created_at: daysAgo(29 - (i-11)*2) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Listed on MLS! Showing requests coming in.", created_at: daysAgo(20 - (i-11)*2) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Strong interest from recent showings.", created_at: daysAgo(5) });
    } else if (sellerDefs[i].stage === "qualified") {
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Thanks for choosing me. Let's get started on your listing.", created_at: daysAgo(15 - (i-18)) });
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Looking forward to it!", created_at: daysAgo(14 - (i-18)) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Documents being prepared. I'll keep you posted.", created_at: daysAgo(10) });
    } else if (sellerDefs[i].stage === "cold") {
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Hi! Just checking in. Still thinking of selling?", created_at: daysAgo(90) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Sent you a market update for your area.", created_at: daysAgo(60) });
    } else {
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Hi, thinking of selling. Can you help?", created_at: daysAgo(5) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Absolutely! Let's schedule a time to discuss.", created_at: daysAgo(4) });
    }
  }
  // Buyers
  for (let i = 0; i < buyerDefs.length; i++) {
    const cid = buyerUid(i + 1);
    const ch = i % 3 === 0 ? "whatsapp" : "sms";
    if (buyerDefs[i].stage === "closed") {
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Congratulations on your new home!", created_at: daysAgo(30 - i*5) });
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Thank you! We love it.", created_at: daysAgo(29 - i*5) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Don't hesitate to reach out if you need anything!", created_at: daysAgo(28 - i*5) });
      comms.push({ contact_id: cid, direction: "outbound", channel: "email", body: "Here's a move-in checklist and local service recommendations.", created_at: daysAgo(25 - i*5) });
    } else if (buyerDefs[i].stage === "under_contract") {
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Your offer has been accepted! Subject to conditions.", created_at: daysAgo(15) });
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Wonderful! What's next?", created_at: daysAgo(14) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Inspection scheduled. Financing docs being processed.", created_at: daysAgo(10) });
      comms.push({ contact_id: cid, direction: "outbound", channel: "email", body: "Subject removal timeline and next steps attached.", created_at: daysAgo(8) });
    } else if (buyerDefs[i].stage === "active_search") {
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Found some great properties matching your criteria!", created_at: daysAgo(20 - i) });
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "When can we schedule viewings?", created_at: daysAgo(19 - i) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Showings booked for this weekend.", created_at: daysAgo(18 - i) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "How did you like the properties? Any favourites?", created_at: daysAgo(15 - i) });
    } else if (buyerDefs[i].stage === "qualified") {
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Thanks for sharing your criteria. I'll start searching.", created_at: daysAgo(15) });
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Sounds good, looking forward to it.", created_at: daysAgo(14) });
    } else if (buyerDefs[i].stage === "cold") {
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Hi! Haven't heard from you in a while. Still looking?", created_at: daysAgo(80) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Market update: prices have shifted in your area of interest.", created_at: daysAgo(45) });
    } else {
      comms.push({ contact_id: cid, direction: "inbound", channel: ch, body: "Hi, I'm interested in buying.", created_at: daysAgo(3) });
      comms.push({ contact_id: cid, direction: "outbound", channel: ch, body: "Welcome! What's your budget and preferred area?", created_at: daysAgo(2) });
    }
  }
  // Partners
  for (let i = 0; i < partnerDefs.length; i++) {
    comms.push({ contact_id: partnerUid(i + 1), direction: "outbound", channel: "email", body: "Thanks for the referral! I'll take great care of them.", created_at: daysAgo(20 - i * 3) });
    comms.push({ contact_id: partnerUid(i + 1), direction: "inbound", channel: "email", body: "Sounds great. Keep me posted on the progress.", created_at: daysAgo(19 - i * 3) });
  }
  await insert("communications", comms);

  // ─── TASKS (~80) ───
  const taskData = [];
  // Completed for closed sellers
  for (let i = 0; i < 6; i++) {
    taskData.push({ title: `Send FINTRAC — ${sellerDefs[i].name}`, status: "completed", priority: "high", category: "document", due_date: dateStr(-60+i*5), contact_id: sellerUid(i+1), listing_id: listUid(i+1), completed_at: daysAgo(62-i*5) });
    taskData.push({ title: `Close deal — ${addresses[i].split(",")[0]}`, status: "completed", priority: "urgent", category: "closing", due_date: dateStr(-20+i*3), contact_id: sellerUid(i+1), listing_id: listUid(i+1), completed_at: daysAgo(21-i*3) });
  }
  // In-progress for under_contract sellers
  for (let i = 6; i < 11; i++) {
    taskData.push({ title: `Monitor subject removal — ${addresses[i].split(",")[0]}`, status: "in_progress", priority: "urgent", category: "closing", due_date: dateStr(10+(i-6)*3), contact_id: sellerUid(i+1), listing_id: listUid(i+1) });
    taskData.push({ title: `Coordinate inspection — ${addresses[i].split(",")[0]}`, status: "in_progress", priority: "high", category: "inspection", due_date: dateStr(7+(i-6)*2), contact_id: sellerUid(i+1), listing_id: listUid(i+1) });
  }
  // For active listings
  for (let i = 11; i < 18; i++) {
    taskData.push({ title: `Follow up on showings — ${addresses[i].split(",")[0]}`, status: "pending", priority: "medium", category: "follow_up", due_date: dateStr(3+(i-11)), contact_id: sellerUid(i+1), listing_id: listUid(i+1) });
    taskData.push({ title: `Update marketing — ${addresses[i].split(",")[0]}`, status: i%2===0 ? "in_progress" : "pending", priority: "medium", category: "marketing", due_date: dateStr(5+(i-11)), contact_id: sellerUid(i+1), listing_id: listUid(i+1) });
  }
  // For qualified sellers
  for (let i = 18; i < 23; i++) {
    taskData.push({ title: `Complete docs — ${addresses[i].split(",")[0]}`, status: "in_progress", priority: "high", category: "document", due_date: dateStr(5), contact_id: sellerUid(i+1), listing_id: listUid(i+1) });
    taskData.push({ title: `Submit MLS — ${addresses[i].split(",")[0]}`, status: "pending", priority: "high", category: "listing", due_date: dateStr(12), contact_id: sellerUid(i+1), listing_id: listUid(i+1) });
  }
  // For new sellers with listings
  for (let i = 23; i < 27; i++) {
    taskData.push({ title: `Property assessment — ${addresses[i].split(",")[0]}`, status: "pending", priority: "high", category: "listing", due_date: dateStr(10), contact_id: sellerUid(i+1), listing_id: listUid(i+1) });
  }
  // Buyer tasks
  for (let i = 0; i < buyerDefs.length; i++) {
    const s = buyerDefs[i].stage;
    if (s === "cold") {
      taskData.push({ title: `Re-engagement call — ${buyerDefs[i].name}`, status: "pending", priority: "low", category: "follow_up", due_date: dateStr(14 + i), contact_id: buyerUid(i + 1) });
    } else {
      taskData.push({
        title: s === "closed" ? `Post-close follow-up — ${buyerDefs[i].name}` :
               s === "under_contract" ? `Track conditions — ${buyerDefs[i].name}` :
               s === "active_search" ? `Schedule showing — ${buyerDefs[i].name}` :
               s === "qualified" ? `Send property matches — ${buyerDefs[i].name}` :
               `Qualification call — ${buyerDefs[i].name}`,
        status: s === "closed" ? "completed" : s === "under_contract" ? "in_progress" : "pending",
        priority: ["medium", "high", "urgent", "low"][i % 4],
        category: s === "closed" ? "follow_up" : s === "under_contract" ? "closing" : s === "active_search" ? "showing" : "follow_up",
        due_date: dateStr(s === "closed" ? -10 : 5 + i),
        contact_id: buyerUid(i + 1),
        completed_at: s === "closed" ? daysAgo(11) : undefined,
      });
    }
  }
  // Partner tasks
  for (let i = 0; i < 3; i++) {
    taskData.push({ title: `Schedule coffee with ${partnerDefs[i].name}`, status: "pending", priority: "low", category: "follow_up", due_date: dateStr(7 + i * 7), contact_id: partnerUid(i + 1) });
  }
  await insert("tasks", taskData);

  // ─── FORM TEMPLATES ───
  await insert("form_templates", [
    { form_key: "fintrac", form_name: "FINTRAC Individual Identification", organization: "FINTRAC", version: "2024", pdf_url: "/forms/templates/fintrac.pdf", field_mapping: { full_name: "seller_name" }, is_public: true },
    { form_key: "dorts", form_name: "Disclosure of Representation in Trading Services", organization: "BCREA", version: "2024", pdf_url: "/forms/templates/dorts.pdf", field_mapping: { agent_name: "agent_name" }, is_public: true },
    { form_key: "pds", form_name: "Property Disclosure Statement", organization: "BCREA", version: "2024", pdf_url: "/forms/templates/pds.pdf", field_mapping: { seller_name: "seller_name" }, is_public: true },
    { form_key: "mlc", form_name: "Multiple Listing Contract", organization: "BCREA", version: "2024", pdf_url: "/forms/templates/mlc.pdf", field_mapping: { seller_name: "seller_name" }, is_public: true },
    { form_key: "cps", form_name: "Contract of Purchase and Sale", organization: "BCREA", version: "2024", pdf_url: "/forms/templates/cps.pdf", field_mapping: { buyer_name: "buyer_name" }, is_public: true },
  ]);

  // ─── FORM SUBMISSIONS ───
  const subs = [];
  for (let i = 0; i < 18; i++) {
    const lid = listUid(i + 1);
    subs.push({ listing_id: lid, form_key: "fintrac", form_data: { seller_name: sellerDefs[i].name }, status: "completed" });
    subs.push({ listing_id: lid, form_key: "dorts", form_data: { client_name: sellerDefs[i].name }, status: "completed" });
    subs.push({ listing_id: lid, form_key: "pds", form_data: { seller_name: sellerDefs[i].name }, status: "completed" });
    if (i < 6) subs.push({ listing_id: lid, form_key: "mlc", form_data: { seller_name: sellerDefs[i].name }, status: "completed" });
  }
  for (let i = 18; i < 23; i++) {
    const lid = listUid(i + 1);
    subs.push({ listing_id: lid, form_key: "fintrac", form_data: { seller_name: sellerDefs[i].name }, status: "completed" });
    subs.push({ listing_id: lid, form_key: "dorts", form_data: { client_name: sellerDefs[i].name }, status: "draft" });
  }
  await insert("form_submissions", subs);

  // ─── WORKFLOWS (7 drip only — no lifecycle) ───
  const workflows = [
    { slug: "buyer_nurture", name: "Buyer Nurture Plan", description: "7-stage drip for new buyer leads", trigger_type: "lead_status_change", trigger_config: { to_status: "qualified" }, contact_type: "buyer", workflow_type: "drip" },
    { slug: "post_close_buyer", name: "Post-Close Buyer Workflow", description: "Touchpoints from closing through annual follow-up", trigger_type: "listing_status_change", trigger_config: { to_status: "sold" }, contact_type: "buyer", workflow_type: "drip" },
    { slug: "post_close_seller", name: "Post-Close Seller Workflow", description: "Touchpoints from closing through annual follow-up", trigger_type: "listing_status_change", trigger_config: { to_status: "sold" }, contact_type: "seller", workflow_type: "drip" },
    { slug: "lead_reengagement", name: "Lead Re-Engagement", description: "Triggered after 60 days of inactivity", trigger_type: "inactivity", trigger_config: { days: 60 }, contact_type: "any", workflow_type: "drip" },
    { slug: "open_house_followup", name: "Open House / Showing Follow-Up", description: "Immediate to 7-day follow-up after showing", trigger_type: "showing_completed", trigger_config: {}, contact_type: "buyer", workflow_type: "drip" },
    { slug: "speed_to_contact", name: "Lead Speed-to-Contact", description: "0-1 min to 24-hour escalation for new leads", trigger_type: "new_lead", trigger_config: {}, contact_type: "any", workflow_type: "drip" },
    { slug: "referral_partner", name: "Referral Partner Workflow", description: "Ongoing nurture for referral sources", trigger_type: "tag_added", trigger_config: { tag: "referral_partner" }, contact_type: "any", workflow_type: "drip" },
  ];
  await insert("workflows", workflows);

  // Get workflow IDs
  const { data: wfRows } = await supabase.from("workflows").select("id, slug");
  const wfMap = {};
  for (const w of (wfRows ?? [])) wfMap[w.slug] = w.id;

  // ─── MESSAGE TEMPLATES ───
  const templates = [
    { name: "Welcome Buyer", channel: "sms", body: "Hi {{contact_first_name}}, welcome! I'm excited to help you find your perfect home. What's your ideal timeline?", variables: ["contact_first_name"], category: "nurture" },
    { name: "Showing Follow-Up", channel: "sms", body: "Hi {{contact_first_name}}, how did you like {{listing_address}}? Any questions?", variables: ["contact_first_name", "listing_address"], category: "showing" },
    { name: "Post-Close Thank You", channel: "email", subject: "Congratulations on your new home!", body: "Hi {{contact_first_name}}, congratulations on closing! Here's a moving checklist to help.", variables: ["contact_first_name"], category: "post_close" },
    { name: "Re-Engagement Check-In", channel: "sms", body: "Hi {{contact_first_name}}, it's been a while! Still interested in real estate? Happy to catch up.", variables: ["contact_first_name"], category: "reengagement" },
    { name: "Speed-to-Contact SMS", channel: "sms", body: "Hi {{contact_first_name}}, thanks for your inquiry! I'd love to help. Can we chat today?", variables: ["contact_first_name"], category: "speed_to_contact" },
    { name: "Listing Update Seller", channel: "whatsapp", body: "Hi {{contact_first_name}}, your listing at {{listing_address}} has new showing requests!", variables: ["contact_first_name", "listing_address"], category: "nurture" },
    { name: "Post-Close Seller Thank You", channel: "email", subject: "Thank you for trusting us with your sale!", body: "Hi {{contact_first_name}}, congratulations on the successful sale! It was a pleasure working with you.", variables: ["contact_first_name"], category: "post_close" },
    { name: "Open House Thank You", channel: "sms", body: "Hi {{contact_first_name}}, thanks for visiting {{listing_address}} today! Would you like to schedule a private showing?", variables: ["contact_first_name", "listing_address"], category: "showing" },
    { name: "Referral Partner Welcome", channel: "email", subject: "Excited to partner with you!", body: "Hi {{contact_first_name}}, thank you for the partnership. I look forward to working together.", variables: ["contact_first_name"], category: "referral" },
    { name: "Buyer Nurture - Market Update", channel: "email", subject: "Latest market trends in your area", body: "Hi {{contact_first_name}}, here are the latest listings and market trends in your preferred area.", variables: ["contact_first_name"], category: "nurture" },
  ];
  await insert("message_templates", templates);

  // ─── WORKFLOW STEPS (for all 7 workflows) ───
  const { data: tmplRows } = await supabase.from("message_templates").select("id, name");
  const tmplMap = {};
  for (const t of (tmplRows ?? [])) tmplMap[t.name] = t.id;

  const allSteps = [];

  // Speed-to-Contact steps
  if (wfMap["speed_to_contact"]) {
    const wid = wfMap["speed_to_contact"];
    allSteps.push(
      { workflow_id: wid, step_order: 1, name: "Instant auto-text: acknowledge lead", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", template_id: tmplMap["Speed-to-Contact SMS"], exit_on_reply: true },
      { workflow_id: wid, step_order: 2, name: "Alert agent: new lead received", action_type: "auto_alert", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 3, name: "Task: call lead within 5 min", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Call new lead", priority: "urgent", category: "follow_up" } },
      { workflow_id: wid, step_order: 4, name: "Wait 5 minutes", action_type: "wait", delay_value: 5, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 5, name: "Follow-up text if no response", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { workflow_id: wid, step_order: 6, name: "Wait 1 hour", action_type: "wait", delay_value: 1, delay_unit: "hours" },
      { workflow_id: wid, step_order: 7, name: "Email with value offer", action_type: "auto_email", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
    );
  }

  // Buyer Nurture steps
  if (wfMap["buyer_nurture"]) {
    const wid = wfMap["buyer_nurture"];
    allSteps.push(
      { workflow_id: wid, step_order: 1, name: "Welcome email: intro + what to expect", action_type: "auto_email", delay_value: 0, delay_unit: "minutes", template_id: tmplMap["Buyer Nurture - Market Update"] },
      { workflow_id: wid, step_order: 2, name: "Welcome text: confirm preferences", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", template_id: tmplMap["Welcome Buyer"] },
      { workflow_id: wid, step_order: 3, name: "Task: review buyer preferences", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Review buyer preferences", priority: "high", category: "follow_up" } },
      { workflow_id: wid, step_order: 4, name: "Wait 1 day", action_type: "wait", delay_value: 1, delay_unit: "days" },
      { workflow_id: wid, step_order: 5, name: "Email: buying process overview", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 6, name: "Wait 2 days", action_type: "wait", delay_value: 2, delay_unit: "days" },
      { workflow_id: wid, step_order: 7, name: "Text: check-in on listings", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { workflow_id: wid, step_order: 8, name: "Wait 3 days", action_type: "wait", delay_value: 3, delay_unit: "days" },
      { workflow_id: wid, step_order: 9, name: "Task: schedule first showing", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Schedule first showing", priority: "high", category: "showing" } },
    );
  }

  // Post-Close Buyer steps
  if (wfMap["post_close_buyer"]) {
    const wid = wfMap["post_close_buyer"];
    allSteps.push(
      { workflow_id: wid, step_order: 1, name: "Congratulations email", action_type: "auto_email", delay_value: 0, delay_unit: "minutes", template_id: tmplMap["Post-Close Thank You"] },
      { workflow_id: wid, step_order: 2, name: "Congrats text", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 3, name: "Task: send closing gift", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Send closing gift", priority: "high", category: "closing" } },
      { workflow_id: wid, step_order: 4, name: "Wait 3 days", action_type: "wait", delay_value: 3, delay_unit: "days" },
      { workflow_id: wid, step_order: 5, name: "Email: move-in checklist", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 6, name: "Wait 7 days", action_type: "wait", delay_value: 7, delay_unit: "days" },
      { workflow_id: wid, step_order: 7, name: "Text: how is the new home?", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 8, name: "Wait 23 days", action_type: "wait", delay_value: 23, delay_unit: "days" },
      { workflow_id: wid, step_order: 9, name: "Email: 30-day home tips", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 10, name: "Wait 60 days", action_type: "wait", delay_value: 60, delay_unit: "days" },
      { workflow_id: wid, step_order: 11, name: "Email: 90-day referral ask", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
    );
  }

  // Post-Close Seller steps
  if (wfMap["post_close_seller"]) {
    const wid = wfMap["post_close_seller"];
    allSteps.push(
      { workflow_id: wid, step_order: 1, name: "Congratulations on sale email", action_type: "auto_email", delay_value: 0, delay_unit: "minutes", template_id: tmplMap["Post-Close Seller Thank You"] },
      { workflow_id: wid, step_order: 2, name: "Thank you text", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 3, name: "Task: send thank-you gift", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Send thank-you gift", priority: "high", category: "closing" } },
      { workflow_id: wid, step_order: 4, name: "Wait 3 days", action_type: "wait", delay_value: 3, delay_unit: "days" },
      { workflow_id: wid, step_order: 5, name: "Email: next steps + resources", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 6, name: "Wait 7 days", action_type: "wait", delay_value: 7, delay_unit: "days" },
      { workflow_id: wid, step_order: 7, name: "Text: settling in OK?", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 8, name: "Wait 23 days", action_type: "wait", delay_value: 23, delay_unit: "days" },
      { workflow_id: wid, step_order: 9, name: "Email: 30-day referral ask", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 10, name: "Task: request testimonial", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Request Google review", priority: "medium", category: "marketing" } },
    );
  }

  // Lead Re-Engagement steps
  if (wfMap["lead_reengagement"]) {
    const wid = wfMap["lead_reengagement"];
    allSteps.push(
      { workflow_id: wid, step_order: 1, name: "Re-engagement text: still looking?", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", template_id: tmplMap["Re-Engagement Check-In"], exit_on_reply: true },
      { workflow_id: wid, step_order: 2, name: "Alert agent: re-engagement triggered", action_type: "auto_alert", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 3, name: "Wait 2 days", action_type: "wait", delay_value: 2, delay_unit: "days" },
      { workflow_id: wid, step_order: 4, name: "Email: market update + new listings", action_type: "auto_email", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { workflow_id: wid, step_order: 5, name: "Wait 5 days", action_type: "wait", delay_value: 5, delay_unit: "days" },
      { workflow_id: wid, step_order: 6, name: "Task: personal outreach call", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Re-engagement call", priority: "high", category: "follow_up" } },
      { workflow_id: wid, step_order: 7, name: "Wait 7 days", action_type: "wait", delay_value: 7, delay_unit: "days" },
      { workflow_id: wid, step_order: 8, name: "Final text: last check-in", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
    );
  }

  // Open House Follow-Up steps
  if (wfMap["open_house_followup"]) {
    const wid = wfMap["open_house_followup"];
    allSteps.push(
      { workflow_id: wid, step_order: 1, name: "Immediate: thank you text", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", template_id: tmplMap["Open House Thank You"] },
      { workflow_id: wid, step_order: 2, name: "Wait 2 hours", action_type: "wait", delay_value: 2, delay_unit: "hours" },
      { workflow_id: wid, step_order: 3, name: "Email: property details + next steps", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 4, name: "Task: follow-up call next day", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Post-showing follow-up call", priority: "high", category: "showing" } },
      { workflow_id: wid, step_order: 5, name: "Wait 1 day", action_type: "wait", delay_value: 1, delay_unit: "days" },
      { workflow_id: wid, step_order: 6, name: "Text: thoughts on the property?", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes", exit_on_reply: true },
      { workflow_id: wid, step_order: 7, name: "Wait 2 days", action_type: "wait", delay_value: 2, delay_unit: "days" },
      { workflow_id: wid, step_order: 8, name: "Email: similar properties", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
    );
  }

  // Referral Partner steps
  if (wfMap["referral_partner"]) {
    const wid = wfMap["referral_partner"];
    allSteps.push(
      { workflow_id: wid, step_order: 1, name: "Welcome email: thank you for partnership", action_type: "auto_email", delay_value: 0, delay_unit: "minutes", template_id: tmplMap["Referral Partner Welcome"] },
      { workflow_id: wid, step_order: 2, name: "Text: intro + what to expect", action_type: "auto_sms", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 3, name: "Task: add to referral partner list", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Add to referral partner database", priority: "medium", category: "general" } },
      { workflow_id: wid, step_order: 4, name: "Wait 7 days", action_type: "wait", delay_value: 7, delay_unit: "days" },
      { workflow_id: wid, step_order: 5, name: "Email: market update for partners", action_type: "auto_email", delay_value: 0, delay_unit: "minutes" },
      { workflow_id: wid, step_order: 6, name: "Wait 30 days", action_type: "wait", delay_value: 30, delay_unit: "days" },
      { workflow_id: wid, step_order: 7, name: "Task: coffee / lunch check-in", action_type: "manual_task", delay_value: 0, delay_unit: "minutes", task_config: { title: "Schedule referral partner lunch", priority: "medium", category: "follow_up" } },
    );
  }

  await insert("workflow_steps", allSteps);

  // ─── WORKFLOW ENROLLMENTS (comprehensive — every workflow has enrollments) ───
  const enrollments = [];

  // Speed-to-contact: active for new buyers + new sellers
  if (wfMap["speed_to_contact"]) {
    // New buyers (indices 20-25)
    for (let i = 20; i < 26; i++) {
      enrollments.push({ workflow_id: wfMap["speed_to_contact"], contact_id: buyerUid(i+1), status: "active", current_step: [1, 2, 3, 4, 5, 6][i-20], next_run_at: daysFromNow(0), started_at: daysAgo(2) });
    }
    // New sellers (indices 22-25)
    for (let i = 22; i < 26; i++) {
      enrollments.push({ workflow_id: wfMap["speed_to_contact"], contact_id: sellerUid(i+1), status: "active", current_step: [1, 3, 5, 7][(i-22) % 4], next_run_at: daysFromNow(0), started_at: daysAgo(1) });
    }
  }

  // Buyer nurture: active for qualified buyers (indices 15-19)
  if (wfMap["buyer_nurture"]) {
    for (let i = 15; i < 20; i++) {
      enrollments.push({ workflow_id: wfMap["buyer_nurture"], contact_id: buyerUid(i+1), status: "active", current_step: [2, 4, 5, 7, 9][(i-15) % 5], next_run_at: daysFromNow(1), started_at: daysAgo(5 + (i-15)) });
    }
    // Completed nurture for some active_search buyers (they graduated)
    for (let i = 9; i < 15; i++) {
      enrollments.push({ workflow_id: wfMap["buyer_nurture"], contact_id: buyerUid(i+1), status: "completed", current_step: 9, started_at: daysAgo(30 + (i-9)*5), completed_at: daysAgo(10 + (i-9)*2) });
    }
  }

  // Post-close buyer: active/completed for closed buyers
  if (wfMap["post_close_buyer"]) {
    enrollments.push({ workflow_id: wfMap["post_close_buyer"], contact_id: buyerUid(1), status: "completed", current_step: 11, started_at: daysAgo(90), completed_at: daysAgo(5) });
    enrollments.push({ workflow_id: wfMap["post_close_buyer"], contact_id: buyerUid(2), status: "active", current_step: 7, next_run_at: daysFromNow(5), started_at: daysAgo(40) });
    enrollments.push({ workflow_id: wfMap["post_close_buyer"], contact_id: buyerUid(3), status: "active", current_step: 9, next_run_at: daysFromNow(15), started_at: daysAgo(60) });
    enrollments.push({ workflow_id: wfMap["post_close_buyer"], contact_id: buyerUid(4), status: "completed", current_step: 11, started_at: daysAgo(120), completed_at: daysAgo(10) });
    enrollments.push({ workflow_id: wfMap["post_close_buyer"], contact_id: buyerUid(5), status: "active", current_step: 5, next_run_at: daysFromNow(3), started_at: daysAgo(20) });
  }

  // Post-close seller: active/completed for closed sellers
  if (wfMap["post_close_seller"]) {
    for (let i = 0; i < 6; i++) {
      const statuses = ["completed", "completed", "active", "active", "completed", "active"];
      const steps = [10, 10, 7, 5, 10, 9];
      enrollments.push({
        workflow_id: wfMap["post_close_seller"], contact_id: sellerUid(i+1),
        status: statuses[i], current_step: steps[i],
        started_at: daysAgo(60 - i * 5),
        completed_at: statuses[i] === "completed" ? daysAgo(5 + i) : undefined,
        next_run_at: statuses[i] === "active" ? daysFromNow(3 + i) : undefined,
      });
    }
  }

  // Lead re-engagement: active for cold contacts
  if (wfMap["lead_reengagement"]) {
    // Cold sellers
    enrollments.push({ workflow_id: wfMap["lead_reengagement"], contact_id: sellerUid(27), status: "active", current_step: 3, next_run_at: daysFromNow(2), started_at: daysAgo(5) });
    enrollments.push({ workflow_id: wfMap["lead_reengagement"], contact_id: sellerUid(28), status: "active", current_step: 6, next_run_at: daysFromNow(7), started_at: daysAgo(12) });
    enrollments.push({ workflow_id: wfMap["lead_reengagement"], contact_id: sellerUid(29), status: "exited", current_step: 8, started_at: daysAgo(30), exit_reason: "Contact listed with another agent" });
    // Cold buyers
    enrollments.push({ workflow_id: wfMap["lead_reengagement"], contact_id: buyerUid(27), status: "active", current_step: 1, next_run_at: daysFromNow(0), started_at: daysAgo(1) });
    enrollments.push({ workflow_id: wfMap["lead_reengagement"], contact_id: buyerUid(28), status: "active", current_step: 4, next_run_at: daysFromNow(5), started_at: daysAgo(7) });
    enrollments.push({ workflow_id: wfMap["lead_reengagement"], contact_id: buyerUid(29), status: "paused", current_step: 6, started_at: daysAgo(14), exit_reason: "Contact said they'll be back in a year" });
    enrollments.push({ workflow_id: wfMap["lead_reengagement"], contact_id: buyerUid(30), status: "active", current_step: 8, next_run_at: daysFromNow(1), started_at: daysAgo(20) });
  }

  // Open house follow-up: for active_search buyers
  if (wfMap["open_house_followup"]) {
    enrollments.push({ workflow_id: wfMap["open_house_followup"], contact_id: buyerUid(10), status: "active", current_step: 4, next_run_at: daysFromNow(1), started_at: daysAgo(3), listing_id: listUid(12) });
    enrollments.push({ workflow_id: wfMap["open_house_followup"], contact_id: buyerUid(11), status: "active", current_step: 6, next_run_at: daysFromNow(2), started_at: daysAgo(5), listing_id: listUid(13) });
    enrollments.push({ workflow_id: wfMap["open_house_followup"], contact_id: buyerUid(12), status: "completed", current_step: 8, started_at: daysAgo(14), completed_at: daysAgo(5), listing_id: listUid(14) });
    enrollments.push({ workflow_id: wfMap["open_house_followup"], contact_id: buyerUid(13), status: "active", current_step: 2, next_run_at: daysFromNow(0), started_at: daysAgo(1), listing_id: listUid(15) });
    enrollments.push({ workflow_id: wfMap["open_house_followup"], contact_id: buyerUid(14), status: "exited", current_step: 3, started_at: daysAgo(10), exit_reason: "Contact replied — wants to make an offer", listing_id: listUid(16) });
  }

  // Referral partner: for partners
  if (wfMap["referral_partner"]) {
    for (let i = 0; i < partnerDefs.length; i++) {
      const statuses = ["active", "active", "active", "completed", "active", "active", "completed", "active"];
      const steps = [3, 5, 7, 7, 1, 4, 7, 2];
      enrollments.push({
        workflow_id: wfMap["referral_partner"], contact_id: partnerUid(i+1),
        status: statuses[i], current_step: steps[i],
        started_at: daysAgo(60 - i * 7),
        completed_at: statuses[i] === "completed" ? daysAgo(5 + i) : undefined,
        next_run_at: statuses[i] === "active" ? daysFromNow(3 + i * 2) : undefined,
      });
    }
  }

  if (enrollments.length > 0) await insert("workflow_enrollments", enrollments);

  // ─── ACTIVITY LOG ───
  const activities = [];
  // Closed sellers: full journey activities
  for (let i = 0; i < 6; i++) {
    activities.push({ contact_id: sellerUid(i+1), listing_id: listUid(i+1), activity_type: "listing_created", description: `Listing created at ${addresses[i].split(",")[0]}`, created_at: daysAgo(85 - i*3) });
    activities.push({ contact_id: sellerUid(i+1), listing_id: listUid(i+1), activity_type: "document_uploaded", description: "FINTRAC form uploaded", created_at: daysAgo(80 - i*3) });
    activities.push({ contact_id: sellerUid(i+1), listing_id: listUid(i+1), activity_type: "listing_status_changed", description: "Listing went live on MLS", metadata: { from: "draft", to: "active" }, created_at: daysAgo(60 - i*3) });
    activities.push({ contact_id: sellerUid(i+1), listing_id: listUid(i+1), activity_type: "showing_booked", description: "Showing booked", created_at: daysAgo(55 - i*3) });
    activities.push({ contact_id: sellerUid(i+1), listing_id: listUid(i+1), activity_type: "listing_status_changed", description: "Offer accepted — pending", metadata: { from: "active", to: "pending" }, created_at: daysAgo(40 - i*3) });
    activities.push({ contact_id: sellerUid(i+1), listing_id: listUid(i+1), activity_type: "listing_status_changed", description: "Deal closed — SOLD", metadata: { from: "pending", to: "sold" }, created_at: daysAgo(20 - i*3) });
    activities.push({ contact_id: sellerUid(i+1), activity_type: "workflow_enrolled", description: "Enrolled in Post-Close Seller Workflow", created_at: daysAgo(19 - i*3) });
  }
  // Active buyers: showing activities
  for (let i = 9; i < 15; i++) {
    activities.push({ contact_id: buyerUid(i+1), activity_type: "showing_booked", description: `Showing booked for ${buyerDefs[i].name}`, created_at: daysAgo(10 - (i-9)) });
    activities.push({ contact_id: buyerUid(i+1), activity_type: "sms_sent", description: "Automated showing follow-up sent", created_at: daysAgo(9 - (i-9)) });
  }
  // New leads: speed-to-contact activities
  for (let i = 20; i < 26; i++) {
    activities.push({ contact_id: buyerUid(i+1), activity_type: "lead_created", description: `New lead: ${buyerDefs[i].name}`, created_at: daysAgo(2) });
    activities.push({ contact_id: buyerUid(i+1), activity_type: "workflow_enrolled", description: "Auto-enrolled in Speed-to-Contact", created_at: daysAgo(2) });
    activities.push({ contact_id: buyerUid(i+1), activity_type: "sms_sent", description: "Speed-to-contact SMS sent", created_at: daysAgo(2) });
  }
  // Cold leads: re-engagement activities
  for (let i = 26; i < 30; i++) {
    activities.push({ contact_id: buyerUid(i+1), activity_type: "workflow_enrolled", description: "Auto-enrolled in Lead Re-Engagement", created_at: daysAgo(15 - (i-26)*3) });
  }
  // Partner activities
  for (let i = 0; i < partnerDefs.length; i++) {
    activities.push({ contact_id: partnerUid(i+1), activity_type: "workflow_enrolled", description: "Enrolled in Referral Partner Workflow", created_at: daysAgo(60 - i * 7) });
    if (i < 3) activities.push({ contact_id: partnerUid(i+1), activity_type: "email_sent", description: "Welcome email sent", created_at: daysAgo(59 - i * 7) });
  }
  await insert("activity_log", activities);

  // ─── AGENT NOTIFICATIONS ───
  const notifications = [
    { title: "New Lead: Mia Taylor", body: "New buyer lead from Website. Speed-to-contact activated.", type: "urgent", contact_id: buyerUid(26), action_url: `/contacts/${buyerUid(26)}` },
    { title: "New Lead: Lucas Schmidt", body: "New buyer lead from Realtor.ca.", type: "urgent", contact_id: buyerUid(25), action_url: `/contacts/${buyerUid(25)}` },
    { title: "Showing Request", body: "New showing request for 7070 Redwood Terrace", type: "info", listing_id: listUid(12), action_url: `/listings/${listUid(12)}` },
    { title: "Showing Request", body: "New showing request for 2222 Laurel Heights", type: "info", listing_id: listUid(16), action_url: `/listings/${listUid(16)}` },
    { title: "Subject Removal Due", body: "Michael Thompson's deal: subject removal in 5 days", type: "warning", contact_id: sellerUid(7), listing_id: listUid(7), action_url: `/contacts/${sellerUid(7)}` },
    { title: "Re-Engagement Triggered", body: "Jake Dawson inactive for 60+ days. Auto-enrolled in re-engagement.", type: "workflow", contact_id: buyerUid(27), action_url: `/contacts/${buyerUid(27)}` },
    { title: "Re-Engagement Triggered", body: "Patrick Murphy inactive for 60+ days.", type: "workflow", contact_id: sellerUid(27), action_url: `/contacts/${sellerUid(27)}` },
    { title: "Task Overdue", body: "Follow up on showings — 7070 Redwood Terrace is overdue", type: "warning", listing_id: listUid(12), action_url: `/tasks` },
    { title: "Referral Received", body: "Lisa Chang referred Carlos & Maria Rodriguez", type: "info", contact_id: buyerUid(10), action_url: `/contacts/${buyerUid(10)}` },
    { title: "Workflow Completed", body: "Post-Close Buyer Workflow completed for Thomas & Rachel Kim", type: "workflow", contact_id: buyerUid(1), action_url: `/contacts/${buyerUid(1)}`, is_read: true },
    { title: "Milestone: Offer Accepted", body: "Jennifer Liu's offer on Oak Ave has been accepted!", type: "info", contact_id: buyerUid(6), action_url: `/contacts/${buyerUid(6)}`, is_read: true },
    { title: "Document Missing", body: "DORTS still needed for 8888 Thyme Street listing", type: "warning", listing_id: listUid(22), action_url: `/listings/${listUid(22)}` },
  ];
  await insert("agent_notifications", notifications);

  console.log("\n🎉 Seeding complete! ~100 contacts with full pipeline coverage.");
  console.log("  📊 Pipeline distribution:");
  console.log("     Closed: 11 (6 sellers + 5 buyers)");
  console.log("     Under Contract: 9 (5 sellers + 4 buyers)");
  console.log("     Active: 13 (7 sellers + 6 buyers)");
  console.log("     Qualified: 10 (5 sellers + 5 buyers)");
  console.log("     New: 10 (4 sellers + 6 buyers)");
  console.log("     Cold: 7 (3 sellers + 4 buyers)");
  console.log("     Partners: 8, Other: 2");
  console.log("  🔄 Workflow enrollments across all 7 workflows");
}

seed().catch(console.error);
