/**
 * Test All Email Templates — Sends every email type to your inbox
 *
 * Run: npx tsx scripts/test-all-emails.tsx
 *
 * Renders all 6 React Email templates with realistic Vancouver real estate
 * data and sends them via Resend to amandhindsa@outlook.com
 */

import { Resend } from "resend";
import { render } from "@react-email/components";
import { NewListingAlert } from "../src/emails/NewListingAlert";
import { MarketUpdate } from "../src/emails/MarketUpdate";
import { JustSold } from "../src/emails/JustSold";
import { OpenHouseInvite } from "../src/emails/OpenHouseInvite";
import { NeighbourhoodGuide } from "../src/emails/NeighbourhoodGuide";
import { HomeAnniversary } from "../src/emails/HomeAnniversary";
import type { RealtorBranding } from "../src/emails/BaseLayout";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const TO_EMAIL = "amandhindsa@outlook.com";

if (!RESEND_API_KEY) {
  console.error("Missing RESEND_API_KEY");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);

const branding: RealtorBranding = {
  name: "Kunal Dhindsa",
  title: "REALTOR\u00AE",
  brokerage: "RE/MAX City Realty",
  phone: "604-555-0123",
  email: "kunal@remax.ca",
  accentColor: "#4f35d2",
};

const unsubscribeUrl = "http://localhost:3000/api/newsletters/unsubscribe?id=test";

// ── Email 1: New Listing Alert ──
async function sendNewListingAlert() {
  const element = NewListingAlert({
    branding,
    recipientName: "Aman",
    area: "Kitsilano",
    intro: "I just found 3 new properties that match your criteria perfectly. The Kitsilano market is moving fast this spring — similar homes sold within 9 days last month. Here are my top picks for you:",
    listings: [
      {
        photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=300&fit=crop",
        address: "2847 W 4th Ave, Kitsilano",
        price: "$1,289,000",
        beds: 3,
        baths: 2,
        sqft: "1,840 sqft",
        listingUrl: "https://example.com/listing/1",
      },
      {
        photo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=300&fit=crop",
        address: "1923 Bayswater St, Kitsilano",
        price: "$1,195,000",
        beds: 3,
        baths: 2,
        sqft: "1,620 sqft",
        listingUrl: "https://example.com/listing/2",
      },
      {
        photo: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=300&fit=crop",
        address: "3015 W 3rd Ave, Kitsilano",
        price: "$1,375,000",
        beds: 4,
        baths: 3,
        sqft: "2,100 sqft",
        listingUrl: "https://example.com/listing/3",
      },
    ],
    ctaText: "Book a Showing",
    ctaUrl: "https://example.com/book",
    unsubscribeUrl,
  } as any);

  const html = await render(element);
  return sendEmail("[1/6] New Listing Alert — 3 Homes in Kitsilano", html);
}

// ── Email 2: Market Update ──
async function sendMarketUpdate() {
  const element = MarketUpdate({
    branding,
    recipientName: "Aman",
    area: "Vancouver Westside",
    month: "April 2026",
    intro: "Spring has arrived and the Vancouver Westside market is heating up. Here's your monthly snapshot with everything you need to know about pricing, inventory, and recent sales in your target area.",
    stats: [
      { label: "Avg Price", value: "$1.42M", change: "+3.2%" },
      { label: "New Listings", value: "247", change: "+12%" },
      { label: "Days on Market", value: "11", change: "-2 days" },
    ],
    recentSales: [
      { address: "2234 W 7th Ave, Kitsilano", price: "$1,320,000", daysOnMarket: 8 },
      { address: "1867 W 12th Ave, Point Grey", price: "$1,485,000", daysOnMarket: 14 },
      { address: "3401 W 1st Ave, Kitsilano", price: "$1,195,000", daysOnMarket: 6 },
      { address: "2089 Balaclava St, Kitsilano", price: "$1,375,000", daysOnMarket: 11 },
    ],
    commentary: "Buyer competition is moderate — multiple offers on about 35% of listings, down from 52% in March. This is your window. Properties priced under $1.3M in Kits are still going fast, but the $1.3-1.5M range has more breathing room. I'd recommend acting quickly on anything that checks your boxes.",
    ctaText: "Get Your Home's Value",
    ctaUrl: "https://example.com/valuation",
    unsubscribeUrl,
  } as any);

  const html = await render(element);
  return sendEmail("[2/6] Vancouver Westside Market Update — April 2026", html);
}

// ── Email 3: Just Sold ──
async function sendJustSold() {
  const element = JustSold({
    branding,
    recipientName: "Aman",
    address: "4521 W 10th Ave, Point Grey",
    salePrice: "$1,680,000",
    daysOnMarket: 7,
    photo: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&h=300&fit=crop",
    message: "Another one off the market! This gorgeous Point Grey character home sold $30,000 over asking in just 7 days. The sellers chose a strategic pricing approach and it paid off with multiple offers. If you're thinking about what your home could be worth in this market, I'd love to run the numbers for you — no obligation.",
    ctaText: "What's Your Home Worth?",
    ctaUrl: "https://example.com/valuation",
    unsubscribeUrl,
  } as any);

  const html = await render(element);
  return sendEmail("[3/6] Just Sold: 4521 W 10th Ave for $1,680,000", html);
}

// ── Email 4: Open House Invite ──
async function sendOpenHouseInvite() {
  const element = OpenHouseInvite({
    branding,
    recipientName: "Aman",
    address: "2847 W 4th Ave, Kitsilano",
    price: "$1,289,000",
    date: "Saturday, April 12, 2026",
    time: "2:00 PM — 4:00 PM",
    photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=300&fit=crop",
    description: "You mentioned wanting a 3-bedroom in Kits near schools — this one just hit the market and I think it's exactly what you've been looking for. Bright, renovated kitchen, south-facing backyard, and a 5-minute walk to Kits Elementary. Come see it before it gets multiple offers.",
    features: [
      "3 bedrooms, 2 bathrooms, 1,840 sqft",
      "Renovated chef's kitchen with quartz counters",
      "South-facing backyard with mature landscaping",
      "5 min walk to Kitsilano Beach & schools",
      "New roof (2024) and updated electrical",
      "Detached garage + laneway potential",
    ],
    rsvpUrl: "https://example.com/rsvp",
    unsubscribeUrl,
  } as any);

  const html = await render(element);
  return sendEmail("[4/6] Open House: 2847 W 4th Ave, Kitsilano — Sat Apr 12", html);
}

// ── Email 5: Neighbourhood Guide ──
async function sendNeighbourhoodGuide() {
  const element = NeighbourhoodGuide({
    branding,
    recipientName: "Aman",
    area: "Kitsilano",
    intro: "Welcome to Kitsilano — one of Vancouver's most sought-after neighbourhoods! Whether you're drawn by the beaches, the schools, or the village atmosphere, here's your insider guide to what makes Kits special.",
    highlights: [
      {
        category: "Schools & Family",
        items: [
          "Kitsilano Elementary — top-rated public school, French immersion",
          "Lord Byng Secondary — IB programme, strong athletics",
          "West Point Grey Academy — private K-12 option",
          "Vanier Park playground — huge play area with splash pad",
        ],
      },
      {
        category: "Food & Drink",
        items: [
          "AnnaLena — award-winning Canadian fine dining on W 1st",
          "Maenam — best Thai in Vancouver, always packed",
          "49th Parallel Coffee — the local favourite on W 4th",
          "Naam Restaurant — iconic vegetarian since 1968",
        ],
      },
      {
        category: "Parks & Outdoors",
        items: [
          "Kitsilano Beach — saltwater pool, volleyball, stunning sunsets",
          "Vanier Park — home to Museum of Vancouver & Space Centre",
          "Jericho Beach — quieter, dog-friendly, sailing club",
          "Arbutus Greenway — cycling & walking trail through the neighbourhood",
        ],
      },
      {
        category: "Transit & Commute",
        items: [
          "15 min to downtown via #2 bus or bike along the seawall",
          "Broadway-City Hall SkyTrain station 10 min by bus",
          "Arbutus Greenway bike lane for car-free commuting",
        ],
      },
    ],
    funFact: "Kitsilano gets its name from Chief August Jack Khahtsahlano of the Squamish Nation. The area was originally a Squamish village called Sen\u0301a\u0301kw, one of the oldest continuously inhabited places in North America.",
    ctaText: "Explore Homes in Kitsilano",
    ctaUrl: "https://example.com/kitsilano-homes",
    unsubscribeUrl,
  } as any);

  const html = await render(element);
  return sendEmail("[5/6] Your Kitsilano Neighbourhood Guide", html);
}

// ── Email 6: Home Anniversary ──
async function sendHomeAnniversary() {
  const element = HomeAnniversary({
    branding,
    recipientName: "Amanda",
    address: "1456 W 6th Ave, Kitsilano",
    purchaseDate: "April 15, 2025",
    years: 1,
    estimatedValue: "$1,425,000",
    appreciation: "+$87,000 (6.5%)",
    message: "Can you believe it's been a year already? Time flies when you're in a home you love. Great news — your neighbourhood has seen strong appreciation this past year, and your home's estimated value has grown nicely. Here are a few spring maintenance tips to keep everything in top shape.",
    tips: [
      "Clean gutters and downspouts before spring rains",
      "Check smoke detector batteries (spring forward reminder)",
      "Service your HVAC system — schedule annual tune-up",
      "Inspect roof for winter damage — look for missing shingles",
      "Power wash deck and exterior before summer entertaining",
      "Touch up exterior paint where needed — prevents moisture damage",
    ],
    ctaText: "Get a Free Home Valuation",
    ctaUrl: "https://example.com/valuation",
    unsubscribeUrl,
  } as any);

  const html = await render(element);
  return sendEmail("[6/6] Happy 1-Year Home Anniversary, Amanda!", html);
}

// ── Send helper ──
async function sendEmail(subject: string, html: string): Promise<{ subject: string; messageId?: string; error?: string }> {
  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject,
      html,
      headers: {
        "List-Unsubscribe": `<${unsubscribeUrl}>, <mailto:unsubscribe@listingflow.com>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    });

    if (error) {
      return { subject, error: error.message };
    }
    return { subject, messageId: data?.id };
  } catch (e: any) {
    return { subject, error: e.message };
  }
}

// ── Main ──
async function main() {
  console.log("\n" + "=".repeat(60));
  console.log("  REALTORS360 — Email Template Test Suite");
  console.log("  Sending all 6 email types to: " + TO_EMAIL);
  console.log("=".repeat(60) + "\n");

  const senders = [
    { name: "New Listing Alert", fn: sendNewListingAlert },
    { name: "Market Update", fn: sendMarketUpdate },
    { name: "Just Sold", fn: sendJustSold },
    { name: "Open House Invite", fn: sendOpenHouseInvite },
    { name: "Neighbourhood Guide", fn: sendNeighbourhoodGuide },
    { name: "Home Anniversary", fn: sendHomeAnniversary },
  ];

  let sent = 0;
  let failed = 0;

  for (const { name, fn } of senders) {
    process.stdout.write(`  Sending ${name}...`);
    const result = await fn();
    if (result.messageId) {
      console.log(` \u2705 ${result.messageId}`);
      sent++;
    } else {
      console.log(` \u274C ${result.error}`);
      failed++;
    }
    // Small delay between sends to avoid rate limits
    await new Promise((r) => setTimeout(r, 800));
  }

  console.log("\n" + "=".repeat(60));
  console.log(`  RESULTS: ${sent} sent, ${failed} failed`);
  console.log(`  Check inbox: ${TO_EMAIL}`);
  console.log("=".repeat(60) + "\n");
}

main().catch(console.error);
