/**
 * Test AI-Generated Email — Full pipeline: Claude generates content → React Email renders → Resend delivers
 *
 * Run: npx tsx --env-file=.env.local scripts/test-ai-email.tsx
 */

import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";
import { render } from "@react-email/components";
import { NewListingAlert } from "../src/emails/NewListingAlert";
import { MarketUpdate } from "../src/emails/MarketUpdate";
import { JustSold } from "../src/emails/JustSold";
import { OpenHouseInvite } from "../src/emails/OpenHouseInvite";
import { NeighbourhoodGuide } from "../src/emails/NeighbourhoodGuide";
import { HomeAnniversary } from "../src/emails/HomeAnniversary";
import type { RealtorBranding } from "../src/emails/BaseLayout";
import { z } from "zod";

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY!;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";
const TO_EMAIL = "amandhindsa@outlook.com";

const resend = new Resend(RESEND_API_KEY);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const branding: RealtorBranding = {
  name: "Kunal Dhindsa",
  title: "REALTOR\u00AE",
  brokerage: "RE/MAX City Realty",
  phone: "604-555-0123",
  email: "kunal@remax.ca",
  accentColor: "#4f35d2",
};

const unsubscribeUrl = "http://localhost:3000/api/newsletters/unsubscribe?id=test";

// ── The exact same schema the production system uses ──
const GeneratedContentSchema = z.object({
  subject: z.string().min(1).max(120),
  intro: z.string().min(1),
  body: z.string().min(1),
  ctaText: z.string().default("Learn More"),
  highlights: z.array(z.string()).optional(),
  stats: z.array(z.object({
    label: z.string(),
    value: z.string(),
    change: z.string().optional(),
  })).optional(),
  tips: z.array(z.string()).optional(),
  funFact: z.string().optional(),
  area: z.string().optional(),
  address: z.string().optional(),
  salePrice: z.string().optional(),
  daysOnMarket: z.number().optional(),
  estimatedValue: z.string().optional(),
  appreciation: z.string().optional(),
  years: z.number().optional(),
  recentSales: z.array(z.object({
    address: z.string(),
    price: z.string(),
    daysOnMarket: z.number(),
  })).optional(),
  reasoning: z.string().optional(),
});

// ── 6 test scenarios: one per email type ──
const scenarios = [
  {
    emailType: "new_listing_alert",
    contactName: "Aman Singh",
    contactType: "buyer" as const,
    journeyPhase: "active",
    areas: ["Kitsilano", "Point Grey"],
    preferences: { price_range_min: 1100000, price_range_max: 1400000, bedrooms: 3, property_types: ["detached", "townhouse"] },
    engagementScore: 72,
    clickHistory: [
      { linkType: "listing", area: "Kitsilano", date: "2026-04-05" },
      { linkType: "mortgage_calc", date: "2026-04-03" },
      { linkType: "listing", area: "Point Grey", date: "2026-04-01" },
    ],
    listings: [
      { address: "2847 W 4th Ave, Kitsilano", price: 1289000, beds: 3, baths: 2, status: "active", daysOnMarket: 3, heroImageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=300&fit=crop" },
      { address: "1923 Bayswater St, Kitsilano", price: 1195000, beds: 3, baths: 2, status: "active", daysOnMarket: 5, heroImageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&h=300&fit=crop" },
      { address: "3015 W 3rd Ave, Kitsilano", price: 1375000, beds: 4, baths: 3, status: "active", daysOnMarket: 1, heroImageUrl: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&h=300&fit=crop" },
    ],
    aiHints: { tone: "enthusiastic but not pushy", interests: ["family homes", "school districts", "outdoor spaces"], price_anchor: "$1.2-1.4M sweet spot", hot_topic: "Kits Elementary catchment", relationship_stage: "active searcher, 3 weeks in" },
  },
  {
    emailType: "market_update",
    contactName: "David Kim",
    contactType: "buyer" as const,
    journeyPhase: "lead",
    areas: ["East Vancouver", "Mount Pleasant"],
    preferences: { price_range_min: 800000, price_range_max: 1000000, bedrooms: 2, property_types: ["townhouse", "condo"] },
    engagementScore: 52,
    clickHistory: [
      { linkType: "market_stats", area: "East Vancouver", date: "2026-04-02" },
    ],
    listings: [
      { address: "1456 E 12th Ave, East Vancouver", price: 879000, beds: 2, baths: 2, status: "active", daysOnMarket: 8 },
      { address: "345 E Broadway, Mount Pleasant", price: 925000, beds: 2, baths: 1, status: "sold", daysOnMarket: 11 },
    ],
    aiHints: { tone: "informative, first-time buyer friendly", interests: ["first-time buyer programs", "transit proximity"], relationship_stage: "early research phase" },
  },
  {
    emailType: "just_sold",
    contactName: "Linda Martinez",
    contactType: "seller" as const,
    journeyPhase: "active",
    areas: ["Dunbar"],
    engagementScore: 70,
    clickHistory: [],
    listings: [
      { address: "4521 W 28th Ave, Dunbar", price: 2150000, beds: 4, baths: 3, status: "sold", daysOnMarket: 7 },
    ],
    aiHints: { tone: "confident, results-oriented", hot_topic: "her Dunbar listing is active — show neighbourhood momentum", relationship_stage: "active seller, 4 weeks listed" },
  },
  {
    emailType: "open_house_invite",
    contactName: "Sarah Chen",
    contactType: "buyer" as const,
    journeyPhase: "active",
    areas: ["Kitsilano", "Point Grey"],
    preferences: { price_range_min: 1100000, price_range_max: 1400000, bedrooms: 3, property_types: ["detached"] },
    engagementScore: 78,
    clickHistory: [
      { linkType: "listing", area: "Kitsilano", date: "2026-04-06" },
      { linkType: "school_info", area: "Kitsilano", date: "2026-04-04" },
    ],
    listings: [
      { address: "2847 W 4th Ave, Kitsilano", price: 1289000, beds: 3, baths: 2, status: "active", daysOnMarket: 3, heroImageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=300&fit=crop" },
    ],
    aiHints: { tone: "warm, family-focused", interests: ["schools", "parks", "family-friendly"], hot_topic: "Open house this Saturday for 2847 W 4th", relationship_stage: "hot buyer, high engagement" },
  },
  {
    emailType: "neighbourhood_guide",
    contactName: "Jessica Liu",
    contactType: "buyer" as const,
    journeyPhase: "lead",
    areas: ["Kitsilano", "West End", "Fairview"],
    preferences: { price_range_min: 1000000, price_range_max: 1300000, bedrooms: 3 },
    engagementScore: 22,
    clickHistory: [],
    listings: [],
    aiHints: { tone: "welcoming, informative, not salesy", interests: ["relocating from Toronto", "school districts", "transit"], relationship_stage: "brand new lead, 2 days old" },
  },
  {
    emailType: "home_anniversary",
    contactName: "Kevin Ng",
    contactType: "buyer" as const,
    journeyPhase: "past_client",
    areas: ["Kitsilano"],
    engagementScore: 48,
    clickHistory: [
      { linkType: "listing", area: "Kitsilano", date: "2026-01-15" },
    ],
    listings: [],
    aiHints: { tone: "warm, celebratory, casual", interests: ["home maintenance", "neighbourhood updates"], relationship_stage: "past client, bought 1 year ago", note: "Bought a 3BR townhouse in Kits for $1,180,000 last April" },
  },
];

// ── Generate content via Claude ──
async function generateContent(scenario: typeof scenarios[0]) {
  const systemPrompt = `You are a real estate email copywriter for ${branding.name} at ${branding.brokerage}.

Write warm, professional, personal emails that feel like they're from a trusted advisor — NOT a marketing machine.

CONTENT BEST PRACTICES (BC real estate):
- Subject: Use [Area] + specific detail. E.g., "3 New Burnaby Townhouses Under $800K"
- Hook: Open with a relevant stat, question, or local event — never "I hope you're well"
- Body: Lead with value (listings, data, tips), then personal note, then CTA
- CTA: One clear action per email. "Book a Showing" not "Learn More"
- Local flavor: Reference specific BC neighborhoods, schools, parks, transit by name
- Length: 150-300 words for market updates, 100-200 for listing alerts

AI PERSONALIZATION HINTS:
${scenario.aiHints?.tone ? `- Tone: ${scenario.aiHints.tone}` : ""}
${scenario.aiHints?.interests ? `- Interests: ${scenario.aiHints.interests.join(", ")}` : ""}
${scenario.aiHints?.price_anchor ? `- Price anchor: ${scenario.aiHints.price_anchor}` : ""}
${scenario.aiHints?.hot_topic ? `- Hot topic: ${scenario.aiHints.hot_topic}` : ""}
${scenario.aiHints?.relationship_stage ? `- Relationship: ${scenario.aiHints.relationship_stage}` : ""}
${scenario.aiHints?.note ? `- Note: ${scenario.aiHints.note}` : ""}

Rules:
- Keep it concise (150-250 words for the body)
- Use the contact's first name naturally
- Reference specific areas, prices, and details from the data
- Sound like a knowledgeable local expert, not a salesperson
- Always respond with valid JSON matching this structure:

{
  "subject": "Email subject line (compelling, under 60 chars)",
  "intro": "Opening 1-2 sentences (personal, relevant)",
  "body": "Main content (2-3 paragraphs, valuable information)",
  "ctaText": "Call-to-action button text (5-7 words)",
  "highlights": ["Optional bullet points"],
  "stats": [{"label": "Stat name", "value": "$X", "change": "+X%"}],
  "tips": ["Optional tips"],
  "funFact": "Optional neighbourhood fact",
  "area": "Primary area name",
  "address": "Property address if applicable",
  "salePrice": "Sale price if just_sold",
  "daysOnMarket": 7,
  "estimatedValue": "Current value if anniversary",
  "appreciation": "+$X (X%)",
  "years": 1,
  "recentSales": [{"address": "...", "price": "$X", "daysOnMarket": 7}],
  "reasoning": "WHY you chose this content angle for this specific contact"
}

Include fields relevant to the email type. Always include reasoning.`;

  const firstName = scenario.contactName.split(" ")[0];
  let userPrompt = `Generate a "${scenario.emailType}" email for:

Contact: ${scenario.contactName} (${scenario.contactType}, ${scenario.journeyPhase} phase)`;

  if (scenario.areas?.length) userPrompt += `\nInterested areas: ${scenario.areas.join(", ")}`;
  if (scenario.preferences) {
    const p = scenario.preferences;
    userPrompt += `\nPreferences: budget $${(p.price_range_min || 0).toLocaleString()}-$${(p.price_range_max || 0).toLocaleString()}, ${p.bedrooms}+ beds, types: ${p.property_types?.join(", ") || "any"}`;
  }
  if (scenario.engagementScore) userPrompt += `\nEngagement score: ${scenario.engagementScore}/100`;
  if (scenario.clickHistory?.length) {
    userPrompt += `\nRecent clicks: ${scenario.clickHistory.map(c => `${c.linkType}${c.area ? ` (${c.area})` : ""}`).join(", ")}`;
  }
  if (scenario.listings?.length) {
    userPrompt += `\n\nRelevant listings:`;
    for (const l of scenario.listings) {
      userPrompt += `\n- ${l.address}: $${l.price.toLocaleString()}, ${l.beds}bd/${l.baths}ba, ${l.status}, ${l.daysOnMarket} DOM`;
    }
  }

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    system: systemPrompt,
    messages: [{ role: "user", content: userPrompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";

  // Parse JSON
  let jsonStr = text;
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();
  else {
    const braceMatch = text.match(/\{[\s\S]*\}/);
    if (braceMatch) jsonStr = braceMatch[0];
  }

  const parsed = JSON.parse(jsonStr);
  return GeneratedContentSchema.parse(parsed);
}

// ── Render template from AI content ──
async function renderTemplate(emailType: string, content: any): Promise<string> {
  const firstName = content._contactFirstName || "Friend";
  const templateProps = { branding, recipientName: firstName, unsubscribeUrl };

  let element: React.ReactElement;

  switch (emailType) {
    case "new_listing_alert":
      element = NewListingAlert({
        ...templateProps,
        area: content.area || "your area",
        intro: content.intro,
        listings: content._listings || [],
        ctaText: content.ctaText,
        ctaUrl: "https://example.com/listings",
      } as any);
      break;
    case "market_update":
      element = MarketUpdate({
        ...templateProps,
        area: content.area || "your area",
        month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
        intro: content.intro,
        stats: content.stats || [],
        recentSales: content.recentSales || [],
        commentary: content.body,
        ctaText: content.ctaText,
        ctaUrl: "https://example.com/market",
      } as any);
      break;
    case "just_sold":
      element = JustSold({
        ...templateProps,
        address: content.address || "",
        salePrice: content.salePrice || "",
        daysOnMarket: content.daysOnMarket || 0,
        photo: "https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=600&h=300&fit=crop",
        message: content.body,
        ctaText: content.ctaText,
        ctaUrl: "https://example.com/valuation",
      } as any);
      break;
    case "open_house_invite":
      element = OpenHouseInvite({
        ...templateProps,
        address: content.address || "2847 W 4th Ave, Kitsilano",
        price: "$1,289,000",
        date: "Saturday, April 12, 2026",
        time: "2:00 PM - 4:00 PM",
        photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&h=300&fit=crop",
        description: content.body,
        features: content.highlights || [],
        rsvpUrl: "https://example.com/rsvp",
      } as any);
      break;
    case "neighbourhood_guide":
      element = NeighbourhoodGuide({
        ...templateProps,
        area: content.area || "your area",
        intro: content.intro,
        highlights: content.highlights?.map((h: string) => ({
          category: "Highlights",
          items: [h],
        })) || [],
        funFact: content.funFact,
        ctaText: content.ctaText,
        ctaUrl: "https://example.com/homes",
      } as any);
      break;
    case "home_anniversary":
      element = HomeAnniversary({
        ...templateProps,
        address: content.address || "1456 W 6th Ave, Kitsilano",
        purchaseDate: "April 15, 2025",
        years: content.years || 1,
        estimatedValue: content.estimatedValue,
        appreciation: content.appreciation,
        message: content.body,
        tips: content.tips || [],
        ctaText: content.ctaText,
        ctaUrl: "https://example.com/valuation",
      } as any);
      break;
    default:
      element = NeighbourhoodGuide({
        ...templateProps,
        area: "",
        intro: content.intro || content.body,
        highlights: [],
        ctaText: content.ctaText,
      } as any);
  }

  return await render(element);
}

// ── Main ──
async function main() {
  console.log("\n" + "=".repeat(65));
  console.log("  REALTORS360 — AI-Generated Email Test (Full Pipeline)");
  console.log("  Claude Sonnet generates content → React Email renders → Resend delivers");
  console.log("  Sending to: " + TO_EMAIL);
  console.log("=".repeat(65) + "\n");

  let sent = 0;
  let failed = 0;

  for (const scenario of scenarios) {
    const label = `${scenario.emailType} → ${scenario.contactName}`;
    process.stdout.write(`  [AI] ${label}...\n`);

    try {
      // Step 1: Claude generates content
      process.stdout.write(`       Generating with Claude Sonnet...`);
      const content = await generateContent(scenario);
      console.log(` done`);
      console.log(`       Subject: "${content.subject}"`);
      if (content.reasoning) {
        console.log(`       AI reasoning: ${content.reasoning.slice(0, 120)}...`);
      }

      // Attach metadata for rendering
      (content as any)._contactFirstName = scenario.contactName.split(" ")[0];
      (content as any)._listings = scenario.listings?.map((l: any) => ({
        photo: l.heroImageUrl,
        address: l.address,
        price: `$${l.price.toLocaleString()}`,
        beds: l.beds,
        baths: l.baths,
        sqft: "",
        listingUrl: "https://example.com/listing",
      }));

      // Step 2: Render React Email template
      process.stdout.write(`       Rendering template...`);
      const html = await renderTemplate(scenario.emailType, content);
      console.log(` done (${html.length.toLocaleString()} chars)`);

      // Step 3: Send via Resend
      process.stdout.write(`       Sending via Resend...`);
      const { data, error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: TO_EMAIL,
        subject: `[AI] ${content.subject}`,
        html,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      if (error) {
        console.log(` \u274C ${error.message}`);
        failed++;
      } else {
        console.log(` \u2705 ${data?.id}`);
        sent++;
      }
    } catch (e: any) {
      console.log(`\n       \u274C Error: ${e.message}`);
      failed++;
    }

    console.log("");
    // Rate limit
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log("=".repeat(65));
  console.log(`  RESULTS: ${sent} AI-generated emails sent, ${failed} failed`);
  console.log(`  Check inbox: ${TO_EMAIL}`);
  console.log(`  Subject prefix: [AI] — these are Claude-written content`);
  console.log("=".repeat(65) + "\n");
}

main().catch(console.error);
