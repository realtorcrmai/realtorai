/**
 * Luxury Listings Seed Script
 *
 * Run: node --env-file=.env.local scripts/seed-luxury-listings.mjs
 *
 * Creates 20 luxury listings with high-quality Unsplash photos:
 *   - 10 BC Canada (Vancouver, Whistler, Victoria, Kelowna)
 *   - 10 Seattle US (Mercer Island, Bellevue, Capitol Hill, Queen Anne)
 *
 * Creates seller contacts first, then links listings to them.
 * Idempotent: clears previous luxury seed data before inserting.
 *
 * All demo contacts use phone prefix +1604555 for easy cleanup.
 * Listings are marked with `is_sample = false` so they persist.
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("   Run with:  node --env-file=.env.local scripts/seed-luxury-listings.mjs");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── All demo accounts ──────────────
const DEMO_EMAILS = [
  "demo@realestatecrm.com",      // Kunal (Pro)
  "sarah@realtors360.com",       // Sarah (Studio)
  "mike@realtors360.com",        // Mike (Pro)
  "priya@realtors360.com",       // Priya (Free)
];

async function getDemoRealtors() {
  const { data } = await supabase
    .from("users")
    .select("id, email, name")
    .in("email", DEMO_EMAILS);
  if (!data?.length) {
    console.error("❌ No demo users found");
    process.exit(1);
  }
  return data;
}

// ── Seller contacts for the listings ──────────────
const H = "https://images.unsplash.com/photo-"; // headshot base
const F = "?w=400&h=400&fit=crop&crop=face&q=90"; // face-crop params
const SELLERS = [
  // BC sellers
  { name: "Catherine Beaumont", phone: "+16045558001", email: "c.beaumont@demo.com", type: "seller", notes: "West Vancouver homeowner. Relocating to Victoria.", photo: `${H}1573496359142-b8d87734a5a2${F}` },
  { name: "Harrison Wolfe", phone: "+16045558002", email: "h.wolfe@demo.com", type: "seller", notes: "North Vancouver property owner. Downsizing.", photo: `${H}1562788869-4ed32648eb72${F}` },
  { name: "Margaret Liu", phone: "+16045558003", email: "m.liu@demo.com", type: "seller", notes: "Point Grey estate. Family moving to London.", photo: `${H}1573497019940-1c28c88b4f3e${F}` },
  { name: "Robert Ashford", phone: "+16045558004", email: "r.ashford@demo.com", type: "seller", notes: "Whistler vacation property. Selling investment.", photo: `${H}1600878459138-e1123b37cb30${F}` },
  { name: "Diana Sinclair", phone: "+16045558005", email: "d.sinclair@demo.com", type: "seller", notes: "Victoria oceanfront. Estate sale.", photo: `${H}1550525811-e5869dd03032${F}` },
  { name: "Vincent Okonkwo", phone: "+16045558006", email: "v.okonkwo@demo.com", type: "seller", notes: "Kelowna lakefront. Relocating to Vancouver.", photo: `${H}1507003211169-0a1dd7228f2d${F}` },
  { name: "Evelyn Crawford", phone: "+16045558007", email: "e.crawford@demo.com", type: "seller", notes: "British Properties estate. Moving abroad.", photo: `${H}1611432579699-484f7990b127${F}` },
  { name: "Philip Nakamura", phone: "+16045558008", email: "p.nakamura@demo.com", type: "seller", notes: "Caulfeild Cove. Downsizing to condo.", photo: `${H}1542190891-2093d38760f2${F}` },
  { name: "Sarah Whitfield", phone: "+16045558009", email: "s.whitfield@demo.com", type: "seller", notes: "Tsawwassen beachfront. Retiring.", photo: `${H}1628890923662-2cb23c2e0cfe${F}` },
  { name: "James Thornton", phone: "+16045558010", email: "j.thornton@demo.com", type: "seller", notes: "West Vancouver penthouse. Upgrading.", photo: `${H}1556157382-97eda2d62296${F}` },
  // Seattle sellers
  { name: "Alexandra Mercer", phone: "+16045558011", email: "a.mercer@demo.com", type: "seller", notes: "Mercer Island waterfront. Relocating to San Francisco.", photo: `${H}1544005313-94ddf0286df2${F}` },
  { name: "William Prescott III", phone: "+16045558012", email: "w.prescott@demo.com", type: "seller", notes: "Broadmoor estate. Downsizing after retirement.", photo: `${H}1560250097-0b93528c311a${F}` },
  { name: "Jennifer Castellano", phone: "+16045558013", email: "j.castellano@demo.com", type: "seller", notes: "Magnolia craftsman. Moving to Portland.", photo: `${H}1508214751196-bcfd4ca60f91${F}` },
  { name: "Richard Bellevue", phone: "+16045558014", email: "r.bellevue@demo.com", type: "seller", notes: "Bridle Trails new construction. Builder sale.", photo: `${H}1547425260-76bcadfb4f2c${F}` },
  { name: "Nicole Park", phone: "+16045558015", email: "n.park@demo.com", type: "seller", notes: "Capitol Hill townhome. Upgrading to house.", photo: `${H}1580489944761-15a19d654956${F}` },
  { name: "Edward Quinn", phone: "+16045558016", email: "e.quinn@demo.com", type: "seller", notes: "Queen Anne Victorian. Estate sale.", photo: `${H}1618077360395-f3068be8e001${F}` },
  { name: "Sophia Eastman", phone: "+16045558017", email: "s.eastman@demo.com", type: "seller", notes: "Mercer Island east shore. Moving to Bellevue.", photo: `${H}1592621385645-e41659e8aabe${F}` },
  { name: "Andrew Madison", phone: "+16045558018", email: "a.madison@demo.com", type: "seller", notes: "Madison Park mid-century. Relocating to LA.", photo: `${H}1633332755192-727a05c4013d${F}` },
  { name: "Lisa Somerset", phone: "+16045558019", email: "l.somerset@demo.com", type: "seller", notes: "Bellevue Somerset. Empty nesters downsizing.", photo: `${H}1594744803329-e58b31de8bf5${F}` },
  { name: "Daniel Lakewood", phone: "+16045558020", email: "d.lakewood@demo.com", type: "seller", notes: "Madison Park condo. Investment sale.", photo: `${H}1566492031773-4f4e44671857${F}` },
];

// ── Listing data (index matches SELLERS array) ──────────────
const LISTINGS = [
  // ── BC Canada (10) ──────────────
  {
    address: "4821 Belmont Avenue, West Vancouver, BC V7V 1A3",
    lockbox_code: "4821",
    status: "active",
    mls_number: "R2901234",
    list_price: 8950000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=80",
    notes: "Stunning contemporary West Vancouver estate with floor-to-ceiling windows framing panoramic ocean and city views. Features include a chef's kitchen with Miele appliances, heated infinity pool, and triple-car garage. Minutes to Lighthouse Park and Dundarave Village.",
    showing_window_start: "10:00",
    showing_window_end: "18:00",
  },
  {
    address: "1295 Marine Drive, North Vancouver, BC V7P 1T2",
    lockbox_code: "1295",
    status: "active",
    mls_number: "R2901235",
    list_price: 4875000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80",
    notes: "Beautifully designed North Shore home blending West Coast modern with natural stone and cedar accents. Open-concept main floor with 12-foot ceilings, custom millwork, and seamless indoor-outdoor living. Private backyard with mature landscaping and mountain backdrop.",
    showing_window_start: "10:00",
    showing_window_end: "17:00",
  },
  {
    address: "3740 Point Grey Road, Vancouver, BC V6R 1B3",
    lockbox_code: "3740",
    status: "active",
    mls_number: "R2901236",
    list_price: 12500000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1920&q=80",
    notes: "Exceptional waterfront estate on prestigious Point Grey Road with 75 feet of ocean frontage. Architecturally significant residence featuring a grand foyer, formal dining for 14, wine cellar, home theatre, and direct beach access. Unobstructed views of English Bay and the North Shore mountains.",
    showing_window_start: "11:00",
    showing_window_end: "17:00",
  },
  {
    address: "8520 Mountainview Lane, Whistler, BC V8E 0C4",
    lockbox_code: "8520",
    status: "active",
    mls_number: "R2901237",
    list_price: 6750000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1542718610-a1d656d1884c?w=1920&q=80",
    notes: "Spectacular mountain chalet in Whistler's Upper Village with ski-in/ski-out access. Handcrafted timber-frame construction with soaring vaulted ceilings, stone fireplace, heated outdoor terrace, and private hot tub overlooking Blackcomb Mountain.",
    showing_window_start: "10:00",
    showing_window_end: "16:00",
  },
  {
    address: "2180 Dallas Road, Victoria, BC V8R 1A7",
    lockbox_code: "2180",
    status: "active",
    mls_number: "R2901238",
    list_price: 5200000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=80",
    notes: "Elegant oceanfront residence along Victoria's iconic Dallas Road with 180-degree views of the Juan de Fuca Strait and Olympic Mountains. Modern renovation preserves original character while adding a gourmet kitchen, spa-inspired ensuite, and landscaped garden.",
    showing_window_start: "10:00",
    showing_window_end: "17:00",
  },
  {
    address: "4650 Lakeshore Drive, Kelowna, BC V1W 3H6",
    lockbox_code: "4650",
    status: "active",
    mls_number: "R2901239",
    list_price: 3950000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=1920&q=80",
    notes: "Lakefront luxury on Okanagan Lake with private dock and 100 feet of beach frontage. Contemporary design with walls of glass, gourmet kitchen with waterfall island, temperature-controlled wine room, and resort-style outdoor entertaining area with infinity pool.",
    showing_window_start: "10:00",
    showing_window_end: "18:00",
  },
  {
    address: "725 Eyremount Drive, West Vancouver, BC V7S 2A5",
    lockbox_code: "0725",
    status: "pending",
    mls_number: "R2901240",
    list_price: 15900000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=1920&q=80",
    notes: "Ultra-luxury gated estate on a 22,000 sq ft lot in the British Properties. Grand entry with double-height ceiling, ballroom-scale great room, professional gym, indoor pool and spa, six-car collector's garage, and separate guest pavilion. Sweeping city, ocean, and island views.",
    showing_window_start: "11:00",
    showing_window_end: "16:00",
  },
  {
    address: "1810 Caulfeild Cove Trail, West Vancouver, BC V7W 1G3",
    lockbox_code: "1810",
    status: "active",
    mls_number: "R2901241",
    list_price: 7250000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=1920&q=80",
    notes: "Architecturally striking West Coast contemporary nestled among old-growth trees on a private cul-de-sac. Dramatic cantilevered design with floor-to-ceiling glazing, natural stone feature walls, and seamless connection to a wraparound terrace.",
    showing_window_start: "10:00",
    showing_window_end: "17:00",
  },
  {
    address: "560 Tsawwassen Beach Road, Tsawwassen, BC V4M 2H1",
    lockbox_code: "0560",
    status: "active",
    mls_number: "R2901242",
    list_price: 3200000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1600573472592-401b489a3cdc?w=1920&q=80",
    notes: "Beautifully renovated beachfront property with panoramic views of Boundary Bay and the Gulf Islands. Light-filled interiors with white oak flooring, quartz countertops, and designer fixtures. Expansive deck perfect for sunset entertaining with direct beach access.",
    showing_window_start: "10:00",
    showing_window_end: "18:00",
  },
  {
    address: "2305 Queens Avenue, West Vancouver, BC V7V 2Y8",
    lockbox_code: "2305",
    status: "sold",
    mls_number: "R2901243",
    list_price: 2800000,
    property_type: "Condo/Apartment",
    hero_image_url: "https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=1920&q=80",
    notes: "Sophisticated penthouse suite in a boutique West Vancouver building with concierge service. Premium finishes including Italian porcelain tile, custom cabinetry, and integrated smart home system. Two covered parking stalls and access to rooftop terrace.",
    showing_window_start: "10:00",
    showing_window_end: "17:00",
  },

  // ── Seattle US (10) ──────────────
  {
    address: "4512 92nd Avenue SE, Mercer Island, WA 98040",
    lockbox_code: "4512",
    status: "active",
    mls_number: "NW2401001",
    list_price: 5750000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=80",
    notes: "Magnificent Mercer Island waterfront estate with 85 feet of Lake Washington shoreline. Walls of glass capturing sunrise views, chef's kitchen with Sub-Zero and Wolf appliances, private dock with covered boat lift, and resort-caliber outdoor entertaining space.",
    showing_window_start: "10:00",
    showing_window_end: "18:00",
  },
  {
    address: "1823 Broadmoor Drive E, Seattle, WA 98112",
    lockbox_code: "1823",
    status: "active",
    mls_number: "NW2401002",
    list_price: 4950000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=1920&q=80",
    notes: "Stately Broadmoor residence behind the gatehouse on a beautifully landscaped half-acre lot. Classic Georgian architecture with modern updates including gourmet kitchen, home office suite, and finished lower level. Golf course and clubhouse membership included.",
    showing_window_start: "10:00",
    showing_window_end: "17:00",
  },
  {
    address: "3407 W McGraw Street, Seattle, WA 98199",
    lockbox_code: "3407",
    status: "active",
    mls_number: "NW2401003",
    list_price: 3850000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=1920&q=80",
    notes: "Completely reimagined Magnolia craftsman with Puget Sound and Olympic Mountain views. Thoughtful blend of vintage character and contemporary luxury: original fir floors, custom built-ins, and a new open-concept great room. Detached ADU above the garage.",
    showing_window_start: "10:00",
    showing_window_end: "17:00",
  },
  {
    address: "10240 NE 24th Street, Bellevue, WA 98004",
    lockbox_code: "1024",
    status: "active",
    mls_number: "NW2401004",
    list_price: 6200000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=1920&q=80",
    notes: "New-construction Bellevue estate in the coveted Bridle Trails neighborhood. European-inspired design with imported stone, walnut hardwood, and soaring coffered ceilings. Primary suite with dual walk-in closets, spa bath, and private balcony. Outdoor kitchen and heated pool.",
    showing_window_start: "10:00",
    showing_window_end: "18:00",
  },
  {
    address: "935 Harvard Avenue E, Seattle, WA 98102",
    lockbox_code: "0935",
    status: "active",
    mls_number: "NW2401005",
    list_price: 1850000,
    property_type: "Townhouse",
    hero_image_url: "https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=1920&q=80",
    notes: "Sleek Capitol Hill townhome with rooftop deck offering Space Needle and Lake Union views. Modern industrial design with exposed concrete, steel railings, and floor-to-ceiling windows. European kitchen with waterfall quartz island and two-car tandem garage.",
    showing_window_start: "10:00",
    showing_window_end: "18:00",
  },
  {
    address: "714 W Highland Drive, Seattle, WA 98119",
    lockbox_code: "0714",
    status: "active",
    mls_number: "NW2401006",
    list_price: 4100000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=1920&q=80",
    notes: "Impeccably restored Queen Anne Victorian perched on the south slope with sweeping downtown skyline and Elliott Bay views. Period details preserved: original pocket doors, stained glass, ornamental plasterwork. Updated systems, new chef's kitchen, and terraced English garden.",
    showing_window_start: "11:00",
    showing_window_end: "17:00",
  },
  {
    address: "6815 SE 75th Place, Mercer Island, WA 98040",
    lockbox_code: "6815",
    status: "pending",
    mls_number: "NW2401007",
    list_price: 7800000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1600607687644-c7171b42498f?w=1920&q=80",
    notes: "Architectural masterpiece on Mercer Island's coveted east shore with 120 feet of private waterfront. Dramatic double-height living room with 20-foot windows, temperature-controlled wine vault, home theatre with 4K projection, and a detached pool house.",
    showing_window_start: "11:00",
    showing_window_end: "16:00",
  },
  {
    address: "2290 Parkside Drive E, Seattle, WA 98112",
    lockbox_code: "2290",
    status: "active",
    mls_number: "NW2401008",
    list_price: 3450000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?w=1920&q=80",
    notes: "Pristine mid-century modern gem in Madison Park with peek-a-boo lake views. Recently refreshed with respect for the original post-and-beam architecture: walnut paneling, clerestory windows, and open-plan living. Japanese-inspired garden and covered patio.",
    showing_window_start: "10:00",
    showing_window_end: "17:00",
  },
  {
    address: "15620 SE 56th Street, Bellevue, WA 98006",
    lockbox_code: "1562",
    status: "active",
    mls_number: "NW2401009",
    list_price: 4500000,
    property_type: "Residential",
    hero_image_url: "https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=1920&q=80",
    notes: "Newly built Northwest contemporary in Bellevue's Somerset neighborhood with commanding Cascades views. Open floor plan with white oak floors, quartz throughout, and La Cantina bi-fold doors to a covered terrace. Fully finished lower level with separate entrance.",
    showing_window_start: "10:00",
    showing_window_end: "18:00",
  },
  {
    address: "4019 E Madison Street, Seattle, WA 98112",
    lockbox_code: "4019",
    status: "sold",
    mls_number: "NW2401010",
    list_price: 1650000,
    property_type: "Condo/Apartment",
    hero_image_url: "https://images.unsplash.com/photo-1600573472591-ee6b68d14c68?w=1920&q=80",
    notes: "Boutique Madison Park condominium with unobstructed Lake Washington and Bellevue skyline views. Designer finishes including wide-plank European oak, Calacatta marble, and custom Italian cabinetry. Building amenities include concierge, rooftop terrace, and EV charging.",
    showing_window_start: "10:00",
    showing_window_end: "17:00",
  },
];

// ── Photo gallery per listing (4 interior/outdoor shots per listing) ──
// Each array index matches LISTINGS index. Photos are style-matched to the exterior.
const U = "https://images.unsplash.com/photo-"; // Unsplash base
const PHOTOS = [
  // BC-01: modern white contemporary
  [{ role:"living", id:"1600210492493-0946911123ea" }, { role:"kitchen", id:"1600566752229-250ed79470f8" }, { role:"bedroom", id:"1600607687644-c7171b42498f" }, { role:"outdoor", id:"1613977257363-707ba9348227" }],
  // BC-02: warm modern stone/wood
  [{ role:"living", id:"1600585154084-4e5fe7c39198" }, { role:"kitchen", id:"1600585152220-90363fe7e115" }, { role:"bedroom", id:"1600573472591-ee6b68d14c68" }, { role:"outdoor", id:"1600047509782-20d39509f26d" }],
  // BC-03: dark cedar contemporary
  [{ role:"living", id:"1600607687920-4e2a09cf159d" }, { role:"kitchen", id:"1600566752229-250ed79470f8" }, { role:"bedroom", id:"1616594039964-ae9021a400a0" }, { role:"outdoor", id:"1600585153490-76fb20a32601" }],
  // BC-04: mountain chalet
  [{ role:"living", id:"1600210492486-724fe5c67fb0" }, { role:"kitchen", id:"1556909172-54557c7e4fb7" }, { role:"bedroom", id:"1522771739844-6a9f6d5f14af" }, { role:"outdoor", id:"1560184897-ae75f418493e" }],
  // BC-05: elegant modern white
  [{ role:"living", id:"1600585152915-d208bec867a1" }, { role:"kitchen", id:"1600585152220-90363fe7e115" }, { role:"bedroom", id:"1600607687644-c7171b42498f" }, { role:"outdoor", id:"1600573472550-8090b5e0745e" }],
  // BC-06: modern glass
  [{ role:"living", id:"1600566753086-00f18fb6b3ea" }, { role:"kitchen", id:"1600566752229-250ed79470f8" }, { role:"bedroom", id:"1600573472591-ee6b68d14c68" }, { role:"outdoor", id:"1600573472550-8090b5e0745e" }],
  // BC-07: luxury white estate
  [{ role:"living", id:"1600607687920-4e2a09cf159d" }, { role:"kitchen", id:"1600585152220-90363fe7e115" }, { role:"bedroom", id:"1616594039964-ae9021a400a0" }, { role:"outdoor", id:"1600585153490-76fb20a32601" }],
  // BC-08: traditional craftsman
  [{ role:"living", id:"1616486338812-3dadae4b4ace" }, { role:"kitchen", id:"1556909172-54557c7e4fb7" }, { role:"bedroom", id:"1540518614846-7eded433c457" }, { role:"outdoor", id:"1560184897-ae75f418493e" }],
  // BC-09: clean modern light
  [{ role:"living", id:"1600210492493-0946911123ea" }, { role:"kitchen", id:"1600566752229-250ed79470f8" }, { role:"bedroom", id:"1600607687644-c7171b42498f" }, { role:"outdoor", id:"1613977257363-707ba9348227" }],
  // BC-10: modern minimalist
  [{ role:"living", id:"1600585152915-d208bec867a1" }, { role:"kitchen", id:"1600585152220-90363fe7e115" }, { role:"bedroom", id:"1600573472591-ee6b68d14c68" }, { role:"outdoor", id:"1600573472550-8090b5e0745e" }],
  // SEA-01: white colonial with pool
  [{ role:"living", id:"1560448204-e02f11c3d0e2" }, { role:"kitchen", id:"1507089947368-19c1da9775ae" }, { role:"bedroom", id:"1540518614846-7eded433c457" }, { role:"outdoor", id:"1613977257363-707ba9348227" }],
  // SEA-02: traditional
  [{ role:"living", id:"1505691938895-1758d7feb511" }, { role:"kitchen", id:"1507089947368-19c1da9775ae" }, { role:"bedroom", id:"1522771739844-6a9f6d5f14af" }, { role:"outdoor", id:"1560184897-ae75f418493e" }],
  // SEA-03: craftsman
  [{ role:"living", id:"1616486338812-3dadae4b4ace" }, { role:"kitchen", id:"1556909172-54557c7e4fb7" }, { role:"bedroom", id:"1560185893-a55cbc8c57e8" }, { role:"outdoor", id:"1600047509782-20d39509f26d" }],
  // SEA-04: European modern with pool
  [{ role:"living", id:"1600585154084-4e5fe7c39198" }, { role:"kitchen", id:"1600585152220-90363fe7e115" }, { role:"bedroom", id:"1600607687644-c7171b42498f" }, { role:"outdoor", id:"1600573472550-8090b5e0745e" }],
  // SEA-05: modern industrial
  [{ role:"living", id:"1600121848594-d8644e57abab" }, { role:"kitchen", id:"1560440021-33f9b867899d" }, { role:"bedroom", id:"1616594039964-ae9021a400a0" }, { role:"outdoor", id:"1600585153490-76fb20a32601" }],
  // SEA-06: cedar craftsman
  [{ role:"living", id:"1600210492486-724fe5c67fb0" }, { role:"kitchen", id:"1556909172-54557c7e4fb7" }, { role:"bedroom", id:"1560185893-a55cbc8c57e8" }, { role:"outdoor", id:"1600047509782-20d39509f26d" }],
  // SEA-07: modern white
  [{ role:"living", id:"1600566753086-00f18fb6b3ea" }, { role:"kitchen", id:"1600566752229-250ed79470f8" }, { role:"bedroom", id:"1600573472591-ee6b68d14c68" }, { role:"outdoor", id:"1600573472550-8090b5e0745e" }],
  // SEA-08: mid-century modern
  [{ role:"living", id:"1600210492493-0946911123ea" }, { role:"kitchen", id:"1560440021-33f9b867899d" }, { role:"bedroom", id:"1522771739844-6a9f6d5f14af" }, { role:"outdoor", id:"1600047509782-20d39509f26d" }],
  // SEA-09: northwest contemporary
  [{ role:"living", id:"1600585152915-d208bec867a1" }, { role:"kitchen", id:"1600566752229-250ed79470f8" }, { role:"bedroom", id:"1616594039964-ae9021a400a0" }, { role:"outdoor", id:"1613977257363-707ba9348227" }],
  // SEA-10: modern minimalist condo
  [{ role:"living", id:"1600607687920-4e2a09cf159d" }, { role:"kitchen", id:"1600585152220-90363fe7e115" }, { role:"bedroom", id:"1600607687644-c7171b42498f" }, { role:"outdoor", id:"1600585153490-76fb20a32601" }],
];

const ROLE_CAPTIONS = {
  exterior: "Front Exterior",
  living: "Living Room",
  kitchen: "Kitchen",
  bedroom: "Primary Bedroom",
  outdoor: "Outdoor Living",
};

// ── Seed one realtor ──────────────
async function seedForRealtor(realtorId, realtorName) {
  console.log(`\n━━━ ${realtorName} (${realtorId.slice(0,8)}…) ━━━`);

  // Clean up previous data
  const luxuryMlsNumbers = LISTINGS.map((l) => l.mls_number);
  const { data: existingListings } = await supabase
    .from("listings")
    .select("id")
    .eq("realtor_id", realtorId)
    .in("mls_number", luxuryMlsNumbers);

  if (existingListings?.length) {
    const listingIds = existingListings.map((l) => l.id);
    await supabase.from("listing_photos").delete().in("listing_id", listingIds);
    await supabase.from("appointments").delete().in("listing_id", listingIds);
    await supabase.from("listings").delete().in("id", listingIds);
  }

  const luxuryPhones = SELLERS.map((s) => s.phone);
  await supabase.from("contacts").delete().eq("realtor_id", realtorId).in("phone", luxuryPhones);

  // Create seller contacts
  const contactInserts = SELLERS.map((s) => ({
    realtor_id: realtorId,
    name: s.name,
    phone: s.phone,
    email: s.email,
    type: s.type,
    pref_channel: "email",
    notes: s.notes,
    lead_status: "qualified",
    source: "Referral",
    photo_url: s.photo,
  }));

  const { data: contacts, error: contactError } = await supabase
    .from("contacts")
    .insert(contactInserts)
    .select("id, name");

  if (contactError) {
    console.error(`   ❌ Contacts failed: ${contactError.message}`);
    return;
  }

  // Create listings
  const listingInserts = LISTINGS.map((l, i) => ({
    realtor_id: realtorId,
    seller_id: contacts[i].id,
    address: l.address,
    lockbox_code: l.lockbox_code,
    status: l.status,
    mls_number: l.mls_number,
    list_price: l.list_price,
    property_type: l.property_type,
    hero_image_url: l.hero_image_url,
    notes: l.notes,
    showing_window_start: l.showing_window_start,
    showing_window_end: l.showing_window_end,
  }));

  const { data: listings, error: listingError } = await supabase
    .from("listings")
    .insert(listingInserts)
    .select("id, address, list_price, status");

  if (listingError) {
    console.error(`   ❌ Listings failed: ${listingError.message}`);
    return;
  }

  // Seed photos (5 per listing)
  const photoInserts = [];
  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];
    const heroUrl = LISTINGS[i].hero_image_url;

    photoInserts.push({
      listing_id: listing.id,
      realtor_id: realtorId,
      photo_url: `${heroUrl}`,
      role: "exterior",
      sort_order: 0,
      caption: ROLE_CAPTIONS.exterior,
    });

    const interiorPhotos = PHOTOS[i];
    for (let j = 0; j < interiorPhotos.length; j++) {
      const p = interiorPhotos[j];
      photoInserts.push({
        listing_id: listing.id,
        realtor_id: realtorId,
        photo_url: `${U}${p.id}?w=1920&q=80`,
        role: p.role,
        sort_order: j + 1,
        caption: ROLE_CAPTIONS[p.role] || p.role,
      });
    }
  }

  const { error: photoError } = await supabase
    .from("listing_photos")
    .insert(photoInserts);

  if (photoError) {
    console.error(`   ❌ Photos failed: ${photoError.message}`);
    return;
  }

  const totalValue = listings.reduce((sum, l) => sum + Number(l.list_price), 0);
  console.log(`   ✅ ${contacts.length} contacts · ${listings.length} listings · ${photoInserts.length} photos · $${(totalValue / 1000000).toFixed(1)}M`);
}

// ── Main ──────────────
async function seed() {
  const realtors = await getDemoRealtors();
  console.log(`\n🏠 Seeding luxury listings for ${realtors.length} demo accounts\n`);

  for (const r of realtors) {
    await seedForRealtor(r.id, r.name);
  }

  console.log(`\n✅ All ${realtors.length} demo accounts seeded with luxury listings!\n`);
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
