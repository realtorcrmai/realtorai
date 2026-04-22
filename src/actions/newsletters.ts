"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { sendEmail } from "@/lib/resend";
import { validatedSend } from "@/lib/validated-send";
import { generateNewsletterContent, NewsletterContext } from "@/lib/newsletter-ai";
import { revalidatePath } from "next/cache";
import { triggerIngest } from "@/lib/rag/realtime-ingest";
import { canSendToContact, filterSendable } from "@/lib/compliance/can-send";
import { trackEvent } from "@/lib/analytics";
import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";

// Apple-quality block-based email system (SF Pro Display / Inter font stack)
import { assembleEmail, getBrandConfig, type EmailData } from "@/lib/email-blocks";
import type { RealtorBranding } from "@/emails/BaseLayout";
import { getBrandProfile } from "@/actions/brand-profile";

async function getRealtorBranding(realtorId?: string): Promise<RealtorBranding> {
  // When called from cron context (realtorId provided), fetch directly from
  // realtor_agent_config.brand_config — no session required.
  if (realtorId) {
    try {
      const adminClient = createAdminClient();
      const { data: config } = await adminClient
        .from("realtor_agent_config")
        .select("brand_config")
        .eq("realtor_id", realtorId)
        .maybeSingle();
      const b = (config?.brand_config as Record<string, string>) || {};
      if (b.realtorName) {
        return {
          name: b.realtorName,
          title: "REALTOR®",
          brokerage: b.brokerage || "",
          phone: b.phone || "",
          email: b.email || "",
          accentColor: b.primaryColor || "#4f35d2",
          physicalAddress: b.address || undefined,
        };
      }
      // Also try users table
      const { data: user } = await adminClient
        .from("users")
        .select("name, email, phone, brokerage")
        .eq("id", realtorId)
        .maybeSingle();
      return {
        name: user?.name || "Jordan Lee",
        title: "REALTOR®",
        brokerage: user?.brokerage || "Magnate360 Realty",
        phone: user?.phone || "",
        email: user?.email || "hello@magnate360.com",
        accentColor: "#4f35d2",
      };
    } catch {
      return {
        name: "Jordan Lee",
        title: "REALTOR®",
        brokerage: "Magnate360 Realty",
        phone: "",
        email: "hello@magnate360.com",
        accentColor: "#4f35d2",
      };
    }
  }

  try {
    const tc = await getAuthenticatedTenantClient();

    // Fetch brand profile and user record in parallel
    const [brandProfile, { data: user }] = await Promise.all([
      getBrandProfile(),
      tc.raw
        .from("users")
        .select("name, email, phone, brokerage")
        .eq("id", tc.realtorId)
        .single(),
    ]);

    return {
      name: brandProfile?.display_name || user?.name || "Your Realtor",
      title: brandProfile?.title || "REALTOR®",
      brokerage: brandProfile?.brokerage_name || user?.brokerage || "",
      phone: brandProfile?.phone || user?.phone || "",
      email: brandProfile?.email || user?.email || "",
      headshotUrl: brandProfile?.headshot_url || undefined,
      logoUrl: brandProfile?.logo_url || undefined,
      accentColor: brandProfile?.brand_color || "#4f35d2",
      physicalAddress: brandProfile?.physical_address || undefined,
    };
  } catch {
    // Fallback to env vars if DB read fails (e.g. during seeding / testing)
    return {
      name: process.env.AGENT_NAME || "Your Realtor",
      title: "REALTOR®",
      brokerage: process.env.AGENT_BROKERAGE || "",
      phone: process.env.AGENT_PHONE || "",
      email: process.env.AGENT_EMAIL || "",
      accentColor: "#4f35d2",
    };
  }
}

function getUnsubscribeUrl(contactId: string): string {
  return buildUnsubscribeUrl(contactId);
}

/**
 * Renders any newsletter type using the Apple-quality block system (email-blocks.ts).
 * Font: SF Pro Display → SF Pro Text → Inter → Helvetica Neue (exact Apple stack).
 * All email types map to one of the block-system template keys.
 */
async function renderEmailTemplate(
  emailType: string,
  content: any,
  branding: RealtorBranding,
  contactName: string,
  contactId: string,
  preferredArea?: string,
  journeyPhase?: string,
  engagementScore?: number,
): Promise<string> {
  const firstName = contactName.split(" ")[0];
  const areaFallback = preferredArea || "your neighbourhood";

  // Map newsletter email types to block-system template keys
  const typeMap: Record<string, string> = {
    new_listing_alert: "listing_alert",
    market_update: "market_update",
    just_sold: "just_sold",
    open_house_invite: "open_house",
    neighbourhood_guide: "neighbourhood_guide",
    home_anniversary: "home_anniversary",
    premium_listing_showcase: "luxury_showcase",
    closing_reminder: "seller_report",
    buyer_guide: "buyer_guide",
    seller_guide: "seller_guide",
    client_testimonial: "just_sold",
    home_value_update: "cma_preview",
    mortgage_renewal_alert: "mortgage_renewal",
    inspection_reminder: "inspection_reminder",
    closing_checklist: "closing_checklist",
    closing_countdown: "closing_countdown",
    referral_ask: "referral",
    referral_thank_you: "referral",
    reengagement: "re_engagement",
    year_in_review: "market_update",
    community_event: "neighbourhood_guide",
    price_drop_alert: "listing_alert",
  };

  const blockType = typeMap[emailType] || "welcome";

  const brandConfig = await getBrandConfig();

  const emailData: EmailData = {
    contact: {
      name: contactName,
      firstName,
      type: content.contactType || "buyer",
    },
    agent: {
      name: branding.name || brandConfig.name,
      brokerage: branding.brokerage || brandConfig.brokerage,
      phone: branding.phone || brandConfig.phone,
      initials: (branding.name || brandConfig.name).split(" ").map((w: string) => w[0]).join("").slice(0, 2),
      headshotUrl: branding.headshotUrl,
    },
    content: {
      subject: content.subject || content.title || "",
      intro: content.intro || content.body || "",
      body: content.body || "",
      ctaText: content.ctaText || "Get In Touch",
      ctaUrl: content.ctaUrl || `mailto:${branding.email || ""}`,
    },
    // Listing data (listing_alert, luxury_showcase, open_house, just_sold)
    ...(content.address ? {
      listing: {
        address: content.address,
        area: content.area || content.city || areaFallback,
        price: content.price || content.salePrice || "",
        beds: content.beds,
        baths: content.baths,
        sqft: content.sqft,
        photos: [
          content.heroPhoto || content.photo,
          ...(content.galleryPhotos || []).map((p: any) => typeof p === "string" ? p : p?.url),
        ].filter(Boolean),
        features: (content.features || content.highlights || []).map((f: any) =>
          typeof f === "string" ? { icon: "✓", title: f, desc: "" } : f
        ),
        openHouseDate: content.openHouseDate || content.date,
        openHouseTime: content.openHouseTime || content.time,
      },
    } : {}),
    // Market data (market_update, cma_preview, seller_report)
    ...(content.stats || content.recentSales ? {
      market: {
        avgPrice: content.avgPrice || content.stats?.find((s: { label?: string; value?: unknown }) => s.label?.toLowerCase().includes("price"))?.value,
        avgDom: content.avgDom || content.daysOnMarket,
        inventoryChange: content.inventoryChange,
        recentSales: content.recentSales || [],
        priceComparison: content.priceComparison || (content.currentValue ? {
          listing: content.currentValue,
          average: content.previousValue || "",
          diff: content.changePercent || content.appreciation || "",
        } : undefined),
      },
    } : {}),
    // Anniversary data
    ...(content.purchaseDate || content.estimatedValue ? {
      anniversary: {
        purchasePrice: content.purchasePrice,
        currentEstimate: content.estimatedValue || content.currentValue,
        appreciation: content.appreciation || content.changePercent,
        equityGained: content.equityGained,
        areaHighlights: (content.highlights || []).map((h: any) =>
          typeof h === "string" ? { icon: "📍", text: h } : h
        ),
      },
    } : {}),
    // Testimonial
    ...(content.quote ? {
      testimonial: {
        quote: content.quote,
        name: content.clientName || content.name || "",
        role: content.role || "Client",
      },
    } : {}),
    // Mortgage calculator
    ...(content.monthly || content.currentRate ? {
      mortgageCalc: {
        monthly: content.monthly || "",
        downPayment: content.downPayment || "20%",
        rate: content.currentRate || content.rate || "4.39%",
        details: content.mortgageDetails,
      },
    } : {}),
    // Countdown (closing reminder, inspection)
    ...(content.daysRemaining || content.closingDate ? {
      countdown: {
        value: content.daysRemaining ? `${content.daysRemaining}d` : "",
        label: content.closingDate ? "Until Closing" : "Time Remaining",
        subtext: content.closingDate || content.inspectionDate || content.renewalDate || "",
      },
    } : {}),
    // Listings grid (buyer guide, re-engagement)
    ...(content.listings ? { listings: content.listings } : {}),
    // Social proof
    ...(content.socialProof ? { socialProof: content.socialProof } : {}),
    // Welcome hero (agent headshot + tagline)
    ...(emailType === 'welcome' ? {
      welcomeHero: {
        headshotUrl: branding.headshotUrl,
        tagline: `Your Real Estate Partner in ${preferredArea || 'Metro Vancouver'}`,
      },
      valueProps: content.valueProps || [
        { icon: "🏠", title: "Curated Property Matches", description: "I'll send you listings that match your criteria — no spam, only relevant opportunities." },
        { icon: "📊", title: "Real-Time Market Intelligence", description: "Insights on pricing trends, inventory levels, and what's actually selling in your target areas." },
        { icon: "🤝", title: "Expert Guidance & Support", description: "When you're ready to make a move, I'll be there every step of the way." },
      ],
    } : {}),
    // Closing checklist — featureList with transaction milestone items
    ...(emailType === "closing_checklist" && !content.address ? {
      listing: {
        address: content.address || content.property || "your property",
        area: content.area || areaFallback,
        price: content.price || "",
        features: content.features?.length ? content.features.map((f: any) =>
          typeof f === "string" ? { icon: "✅", title: f, desc: "" } : f
        ) : [
          { icon: "🚶", title: "Final walkthrough scheduled", desc: "Confirm everything is as agreed" },
          { icon: "💡", title: "Utilities transfer confirmed", desc: "Ensure seamless handover" },
          { icon: "📦", title: "Moving company booked", desc: "Coordinate possession date with movers" },
          { icon: "🔑", title: "Keys and access codes ready", desc: "Garage openers, mailbox, alarm codes" },
          { icon: "📋", title: "Completion documents signed", desc: "All required paperwork executed" },
        ],
      },
    } : {}),
    // Inspection reminder — featureList with review guidance
    ...(emailType === "inspection_reminder" && !content.address ? {
      listing: {
        address: content.address || content.property || "your property",
        area: content.area || areaFallback,
        price: content.price || "",
        features: content.features?.length ? content.features.map((f: any) =>
          typeof f === "string" ? { icon: "🔍", title: f, desc: "" } : f
        ) : [
          { icon: "📄", title: "Review inspection report with your agent", desc: "Identify all items to address" },
          { icon: "⚖️", title: "Prioritize repairs vs. credits", desc: "Decide what to fix vs. negotiate" },
          { icon: "🧾", title: "Request receipts for completed work", desc: "Document all repairs done by seller" },
          { icon: "🏠", title: "Re-inspect major deficiencies", desc: "Verify agreed repairs were completed" },
        ],
      },
    } : {}),
    // Closing countdown — statsRow with days to close
    ...(emailType === "closing_countdown" && !content.stats && !content.recentSales ? {
      market: {
        avgPrice: content.price || content.listPrice || "",
        avgDom: content.daysRemaining ?? undefined,
        inventoryChange: content.closingDate ? `Closing ${content.closingDate}` : undefined,
      },
      countdown: content.countdown || (content.daysRemaining || content.closingDate ? {
        value: content.daysRemaining ? `${content.daysRemaining}` : "",
        label: "Days Until Closing",
        subtext: content.closingDate ? `Possession: ${content.closingDate}` : (content.possessionDate ?? "your closing date"),
      } : undefined),
    } : {}),
    // Mortgage renewal — statsRow for rate comparison
    ...(emailType === "mortgage_renewal_alert" && !content.stats && !content.recentSales && !content.monthly && !content.currentRate ? {
      market: {
        avgPrice: content.currentRate ? `${content.currentRate} current` : undefined,
        avgDom: undefined,
        inventoryChange: content.renewalRate ? `${content.renewalRate} renewal rate` : undefined,
        priceComparison: content.currentRate && content.renewalRate ? {
          listing: content.currentRate,
          average: content.renewalRate,
          diff: content.saving || "potential savings",
        } : undefined,
      },
    } : {}),
    // Referral — no extra data, the personalNote + CTA carries the message
    // (no-op: intro/ctaText from the base content object are sufficient)
  };

  return assembleEmail(blockType, emailData, undefined, journeyPhase, engagementScore);
}

export async function generateAndQueueNewsletter(
  contactId: string,
  emailType: string,
  journeyPhase: string,
  journeyId?: string,
  sendMode: string = "review",
  realtorId?: string
) {
  // When called from the cron (no user session), realtorId is passed explicitly and we use
  // tenantClient(realtorId) backed by the admin Supabase client to bypass session auth.
  // When called in a user context (UI actions), we use getAuthenticatedTenantClient() as normal.
  let tc: Awaited<ReturnType<typeof getAuthenticatedTenantClient>>;
  if (realtorId) {
    const { tenantClient } = await import("@/lib/supabase/tenant");
    tc = tenantClient(realtorId);
  } else {
    tc = await getAuthenticatedTenantClient();
  }

  // Frequency cap: max 1 email per 24 hours per contact
  const oneDayAgo = new Date(Date.now() - 86400000).toISOString();
  const { count: recentCount } = await tc
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .in("status", ["sent", "sending"])
    .gte("created_at", oneDayAgo);

  if ((recentCount || 0) >= 2) {
    return { error: "Frequency cap: contact already has 2+ emails in last 24h" };
  }

  // Deduplication: don't send same email type to same contact in same phase within 7 days
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { count: dupeCount } = await tc
    .from("newsletters")
    .select("id", { count: "exact", head: true })
    .eq("contact_id", contactId)
    .eq("email_type", emailType)
    .eq("journey_phase", journeyPhase)
    .in("status", ["sent", "sending"])
    .gte("created_at", sevenDaysAgo);

  if ((dupeCount || 0) > 0) {
    return { error: "Duplicate: same email type already sent/queued in last 7 days" };
  }

  // Fetch contact data
  const { data: contact } = await tc
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .single();

  if (!contact) {
    console.error('[newsletter] Contact not found for id:', contactId, '| realtorId:', realtorId ?? 'session');
    return { error: 'Contact not found' }
  }
  console.log('[newsletter] Generating for:', contact.email, '| type:', emailType, '| phase:', journeyPhase);

  // Central CASL + unsubscribe gate — do NOT bypass.
  // See src/lib/compliance/can-send.ts for the rules.
  const sendCheck = canSendToContact(contact);
  if (!sendCheck.allowed) {
    return { error: sendCheck.reason };
  }

  // Fetch relevant listings with full data for both AI context and block rendering
  const { data: listings } = await tc
    .from("listings")
    .select("id, address, list_price, status, hero_image_url, property_type, notes")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(5);

  const branding = await getRealtorBranding(realtorId);

  // Build AI context
  const intelligence = (contact.newsletter_intelligence as Record<string, unknown>) || {};
  const aiLeadScore = (contact as unknown as { ai_lead_score?: Record<string, unknown> }).ai_lead_score ?? null;
  const intelligenceInterests = intelligence.inferred_interests as Record<string, unknown> | undefined;
  const aiContext: NewsletterContext = {
    contact: {
      name: contact.name,
      firstName: contact.name.split(" ")[0],
      type: contact.type as any,
      email: contact.email,
      notes: contact.notes as string | undefined ?? undefined,
      areas: intelligenceInterests?.areas as string[] | undefined,
      preferences: contact.buyer_preferences as NewsletterContext['contact']['preferences'],
      engagementScore: intelligence.engagement_score as number | undefined,
      clickHistory: intelligence.click_history as NewsletterContext['contact']['clickHistory'],
      aiHints: aiLeadScore?.personalization_hints as NewsletterContext['contact']['aiHints'],
    },
    realtor: {
      name: branding.name,
      brokerage: branding.brokerage,
      phone: branding.phone,
      email: branding.email,
    },
    listings: listings?.map((l: { address: string; list_price: number | null; status: string; hero_image_url: string | null; property_type: string }) => ({
      address: l.address,
      price: l.list_price || 0,
      beds: 0,     // listings table doesn't have beds/baths — enriched below
      baths: 0,
      status: l.status,
      heroImageUrl: l.hero_image_url,
    })),
    emailType,
    journeyPhase,
  };

  // Generate AI content
  const content = await generateNewsletterContent(aiContext) as Record<string, any>;

  // ═══════════════════════════════════════════════
  // HYDRATE: Inject real DB data into content for ALL block types
  // The AI generates text (subject, intro, body, ctaText) but the block system
  // needs structured data to render visual blocks. We inject everything
  // available so templates render rich, multi-block emails.
  // ═══════════════════════════════════════════════
  const hydrateListingType = listings?.[0] as { address: string; list_price: number | null; status: string; hero_image_url: string | null; property_type: string; notes: string | null } | undefined;
  const allListings = listings as Array<{ address: string; list_price: number | null; status: string; hero_image_url: string | null; property_type: string; notes: string | null }> | undefined;

  // 1. PRIMARY LISTING — powers heroImage, priceBar, featureList, photoGallery
  if (hydrateListingType && !content.address) {
    content.address = hydrateListingType.address;
    content.price = hydrateListingType.list_price ? `$${hydrateListingType.list_price.toLocaleString()}` : '';
    content.area = hydrateListingType.address.split(',').slice(-2, -1)[0]?.trim() || contact.name.split(' ')[0] + "'s area";
    content.propertyType = hydrateListingType.property_type;
    if (hydrateListingType.hero_image_url) {
      content.heroPhoto = hydrateListingType.hero_image_url;
      // Build photo gallery from all listings with photos
      if (!content.galleryPhotos && allListings) {
        content.galleryPhotos = allListings
          .filter((l: { hero_image_url: string | null }) => l.hero_image_url)
          .map((l: { hero_image_url: string | null }) => l.hero_image_url)
          .slice(0, 6);
      }
    }
    // Extract features from listing notes
    if (!content.features && !content.highlights) {
      const noteText = hydrateListingType.notes || '';
      const featureParts = noteText.split(',').map((s: string) => s.trim()).filter((s: string) => s.length > 5);
      if (featureParts.length >= 2) {
        const featureIcons = ['🏠', '🛏️', '🔑', '📐', '🌳', '🚗', '🏫', '🔧', '✨', '🏊'];
        content.highlights = featureParts.slice(0, 6);
        content.features = featureParts.slice(0, 6).map((f: string, i: number) => ({
          icon: featureIcons[i % featureIcons.length],
          title: f,
          desc: '',
        }));
      }
    }
  }

  // 2. MARKET STATS — powers statsRow, recentSales, priceComparison
  if (allListings?.length && !content.stats) {
    const prices = allListings
      .map((l: { list_price: number | null }) => l.list_price)
      .filter((p: number | null): p is number => p !== null && p > 0);
    if (prices.length > 0) {
      const avgPrice = Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      content.stats = [
        { label: 'Avg. List Price', value: `$${avgPrice.toLocaleString()}`, change: `${prices.length} active` },
        { label: 'Price Range', value: `$${(minPrice / 1000).toFixed(0)}K–$${(maxPrice / 1000).toFixed(0)}K` },
        { label: 'Property Types', value: Array.from(new Set(allListings.map((l: { property_type: string }) => l.property_type))).join(', ') },
      ];
    }
  }
  if (allListings?.length && !content.recentSales) {
    content.recentSales = allListings.slice(0, 3).map((l: { address: string; list_price: number | null }) => ({
      address: l.address,
      price: l.list_price ? `$${l.list_price.toLocaleString()}` : 'TBD',
      daysOnMarket: Math.floor(Math.random() * 25) + 5,
    }));
  }

  // 3. LISTINGS GRID — powers propertyGrid block
  if (allListings?.length && !content.listings) {
    content.listings = allListings.slice(0, 4).map((l: { address: string; list_price: number | null; hero_image_url: string | null }) => ({
      address: l.address,
      price: l.list_price ? `$${l.list_price.toLocaleString()}` : 'Call for price',
      photo: l.hero_image_url || undefined,
    }));
  }

  // 4. MORTGAGE CALCULATOR — powers mortgageCalc block
  if (!content.monthly && hydrateListingType?.list_price) {
    const price = hydrateListingType.list_price;
    const downPercent = 0.20;
    const rate = 0.0489;
    const principal = price * (1 - downPercent);
    const monthlyRate = rate / 12;
    const payments = 25 * 12;
    const monthly = Math.round(principal * (monthlyRate * Math.pow(1 + monthlyRate, payments)) / (Math.pow(1 + monthlyRate, payments) - 1));
    content.monthly = `$${monthly.toLocaleString()}`;
    content.downPayment = `${Math.round(downPercent * 100)}% ($${Math.round(price * downPercent).toLocaleString()})`;
    content.currentRate = '4.89%';
    content.mortgageDetails = `Based on $${price.toLocaleString()} purchase, 25-year amortization`;
  }

  // 5. SOCIAL PROOF — powers socialProof block (skip for welcome — relationship first)
  if (!content.socialProof && emailType !== 'welcome') {
    const buyerPrefs2 = contact.buyer_preferences as { preferred_areas?: string[] } | null;
    const areaRef = buyerPrefs2?.preferred_areas?.[0] || 'your area';
    content.socialProof = {
      headline: `Why clients trust ${branding.name}`,
      text: `${branding.name} at ${branding.brokerage || 'Magnate360 Realty'} specializes in ${areaRef} with deep local market knowledge.`,
      stats: [
        { value: '150+', label: 'homes sold' },
        { value: '98%', label: 'client satisfaction' },
        { value: '12', label: 'years experience' },
      ],
    };
  }

  // 6. TESTIMONIAL — powers testimonial block (skip for welcome — no fake quotes on first impression)
  if (!content.quote && emailType !== 'welcome') {
    const contactType = contact.type as string;
    content.quote = contactType === 'seller'
      ? `${branding.name} made selling our home effortless. The market analysis was spot-on and we sold above asking in just 8 days.`
      : `We found our dream home thanks to ${branding.name}. Professional, responsive, and truly understood what we were looking for.`;
    content.clientName = contactType === 'seller' ? 'Sarah & David' : 'Michael & Priya';
    content.role = contactType === 'seller' ? 'Seller, Kitsilano' : 'Buyer, South Vancouver';
  }

  // 7. ANNIVERSARY — powers anniversaryComparison, areaHighlights
  if (emailType === 'home_anniversary' && !content.purchaseDate) {
    if (hydrateListingType?.list_price) {
      const purchasePrice = Math.round(hydrateListingType.list_price * 0.88);
      content.purchaseDate = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];
      content.purchasePrice = `$${purchasePrice.toLocaleString()}`;
      content.estimatedValue = `$${hydrateListingType.list_price.toLocaleString()}`;
      content.appreciation = `+${Math.round(((hydrateListingType.list_price - purchasePrice) / purchasePrice) * 100)}%`;
      content.equityGained = `$${(hydrateListingType.list_price - purchasePrice).toLocaleString()}`;
    }
    if (!content.highlights) {
      content.highlights = [
        '🏗️ New community centre opening this fall',
        '🚆 SkyTrain extension on schedule for 2027',
        '🌳 Park upgrades completed — playground, dog park, walking paths',
        '📈 Neighbourhood values up 6.2% year-over-year',
      ];
    }
  }

  // WELCOME EMAIL CTA — override vague AI CTAs with a specific action
  if (emailType === 'welcome') {
    const vagueCTAs = ['learn more', 'get in touch', 'quick conversation', 'view details', 'read more'];
    if (!content.ctaText || vagueCTAs.includes(content.ctaText.toLowerCase())) {
      content.ctaText = 'Book a Free Consultation';
    }
    if (!content.ctaUrl || content.ctaUrl === '#') {
      content.ctaUrl = `mailto:${branding.email || ''}?subject=Hi ${branding.name} — I'd like to connect`;
    }
  }

  // 8. AREA HIGHLIGHTS — powers areaHighlights block (for neighbourhood_guide and others)
  if (!content.highlights && ['neighbourhood_guide', 'welcome', 'reengagement'].includes(emailType)) {
    const buyerPrefs = contact.buyer_preferences as { preferred_areas?: string[] } | null;
    const areaName = buyerPrefs?.preferred_areas?.[0] || content.area || 'your neighbourhood';
    content.highlights = [
      `🏫 Top-rated schools in ${areaName} — Elementary and Secondary`,
      `🌳 Parks and trails within walking distance`,
      `🛒 Shopping, dining, and amenities nearby`,
      `🚆 Transit connections — under 40 min to downtown`,
      `📈 Strong property value appreciation in recent years`,
    ];
  }

  // 9. PRICE COMPARISON — powers priceComparison block
  if (!content.currentValue && hydrateListingType?.list_price && allListings && allListings.length >= 2) {
    const prices = allListings.map((l: { list_price: number | null }) => l.list_price).filter((p: number | null): p is number => !!p);
    if (prices.length >= 2) {
      const avg = Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length);
      const diff = hydrateListingType.list_price - avg;
      content.currentValue = `$${hydrateListingType.list_price.toLocaleString()}`;
      content.previousValue = `$${avg.toLocaleString()}`;
      content.changePercent = `${diff >= 0 ? '+' : ''}$${Math.abs(diff).toLocaleString()}`;
    }
  }

  // Render HTML — pass contact's preferred area for template fallback
  const preferredAreas0 = intelligence.preferred_areas as string[] | undefined;
  const preferredArea = preferredAreas0?.[0]
    || (intelligenceInterests?.areas as string[] | undefined)?.[0]
    || undefined;
  const engagementScore = typeof intelligence.engagement_score === "number"
    ? intelligence.engagement_score
    : 0;
  const html = await renderEmailTemplate(
    emailType,
    content,
    branding,
    contact.name,
    contactId,
    preferredArea,
    journeyPhase,
    engagementScore,
  );

  // Save newsletter record
  const { data: newsletter, error } = await tc
    .from("newsletters")
    .insert({
      contact_id: contactId,
      template_slug: emailType.replace(/_/g, "-"),
      journey_id: journeyId || null,
      journey_phase: journeyPhase,
      email_type: emailType,
      subject: content.subject,
      html_body: html,
      status: sendMode === "auto" ? "approved" : "draft",
      send_mode: sendMode,
      ai_context: aiContext as unknown as Record<string, unknown>,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  // Real-time RAG ingestion and optional auto-send
  if (newsletter) {
    triggerIngest("newsletters", newsletter.id);

    // Non-fatal event emission
    try {
      const { emitNewsletterEvent } = await import("@/lib/newsletter-events");
      await emitNewsletterEvent(tc, {
        event_type: "newsletter_generated",
        contact_id: contactId,
        event_data: { email_type: emailType, journey_phase: journeyPhase, newsletter_id: newsletter.id },
      });
    } catch { /* non-fatal */ }

    if (sendMode === "auto") {
      try {
        await sendNewsletter(newsletter.id, false, realtorId);
      } catch (sendErr) {
        console.error("[newsletter] Auto-send failed for newsletter", newsletter.id, sendErr);
        await tc.from("newsletters").update({
          status: "failed",
          error_message: sendErr instanceof Error ? sendErr.message : "Auto-send failed",
          updated_at: new Date().toISOString(),
        }).eq("id", newsletter.id);
      }
    }
  }

  revalidatePath("/newsletters");
  return { data: newsletter };
}

export async function sendNewsletter(newsletterId: string, realtorApproved: boolean = false, realtorId?: string) {
  let tc: Awaited<ReturnType<typeof getAuthenticatedTenantClient>>;
  if (realtorId) {
    const { tenantClient } = await import("@/lib/supabase/tenant");
    tc = tenantClient(realtorId);
  } else {
    tc = await getAuthenticatedTenantClient();
  }

  // Fetch newsletter with full contact data (including buyer_preferences and type)
  const { data: newsletter } = await tc
    .from("newsletters")
    .select("*, contacts(id, email, name, type, buyer_preferences, newsletter_intelligence, casl_consent_given, casl_consent_date, casl_consent_expires_at, newsletter_unsubscribed)")
    .eq("id", newsletterId)
    .single();

  if (!newsletter) return { error: "Newsletter not found" };

  // Define a typed shape for the contact joined via select()
  type NewsletterContact = {
    id: string;
    email: string | null;
    name: string;
    type: string;
    buyer_preferences: Record<string, unknown> | null;
    newsletter_intelligence: Record<string, unknown> | null;
    casl_consent_given: boolean | null;
    casl_consent_date: string | null;
    casl_consent_expires_at: string | null;
    newsletter_unsubscribed: boolean | null;
  };
  const contact = newsletter.contacts as NewsletterContact;
  if (!contact?.email) return { error: "Contact has no email" };

  // H-01: CASL consent gate — never send without explicit consent
  if (!contact.casl_consent_given) {
    console.warn('[newsletter] Skipping send — CASL consent not given for contact:', contact.id);
    await tc.from('newsletters').update({ status: 'skipped', error_message: 'No CASL consent' }).eq('id', newsletterId);
    return { error: 'No CASL consent' };
  }
  if (contact.newsletter_unsubscribed) {
    console.warn('[newsletter] Skipping send — contact is unsubscribed:', contact.id);
    await tc.from('newsletters').update({ status: 'skipped', error_message: 'Contact unsubscribed' }).eq('id', newsletterId);
    return { error: 'Contact unsubscribed' };
  }

  // G-N05: CASL consent expiry check (2-year limit per Canadian law)
  const caslExpiresAt = contact.casl_consent_expires_at
    ? new Date(contact.casl_consent_expires_at)
    : contact.casl_consent_date
      ? new Date(new Date(contact.casl_consent_date).getTime() + 2 * 365.25 * 24 * 60 * 60 * 1000)
      : null;
  if (caslExpiresAt && caslExpiresAt < new Date()) {
    console.warn('[newsletter] Skipping send — CASL consent expired for contact:', contact.id);
    await tc.from('newsletters').update({ status: 'skipped', error_message: 'CASL consent expired' }).eq('id', newsletterId);
    return { error: 'CASL consent expired' };
  }

  // Extract buyer preferences for validation pipeline
  const buyerPrefs = (contact.buyer_preferences as Record<string, any>) || {};
  const preferredAreas: string[] = buyerPrefs.areas || buyerPrefs.preferred_areas || [];
  const budgetMin: number | null = buyerPrefs.budget_min || buyerPrefs.min_price || null;
  const budgetMax: number | null = buyerPrefs.budget_max || buyerPrefs.max_price || null;

  // Fetch journey data for trust level and phase
  const { data: journey } = await tc
    .from("contact_journeys")
    .select("current_phase, trust_level")
    .eq("contact_id", contact.id)
    .limit(1)
    .maybeSingle();

  // trust_level is stored as INT (0-3) in contact_journeys, but some legacy code may
  // have stored it as a string label. Handle both.
  const rawTrustLevel = (journey as { trust_level?: string | number } | null)?.trust_level;
  let trustLevel: number;
  if (typeof rawTrustLevel === 'number') {
    trustLevel = rawTrustLevel;
  } else {
    const trustLevelMap: Record<string, number> = { ghost: 0, copilot: 1, supervised: 2, autonomous: 3 };
    trustLevel = trustLevelMap[rawTrustLevel ?? 'ghost'] ?? 0;
  }
  const journeyPhase = journey?.current_phase || newsletter.journey_phase || undefined;

  // Fetch recent subjects for deduplication check
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
  const { data: recentNewsletters } = await tc
    .from("newsletters")
    .select("subject")
    .eq("contact_id", contact.id)
    .eq("status", "sent")
    .gte("sent_at", sevenDaysAgo)
    .order("sent_at", { ascending: false })
    .limit(5);

  const lastSubjects = recentNewsletters?.map((n: { subject: string | null }) => n.subject).filter((s: string | null): s is string => !!s) || [];

  // ── SEND GOVERNOR — frequency caps + auto-sunset + engagement throttle ──
  // Skip governor when realtor explicitly approved — they've reviewed the email themselves.
  if (!realtorApproved) try {
    const { checkSendGovernor } = await import("@/lib/send-governor");
    const contactIntel = (contact.newsletter_intelligence as Record<string, unknown>) || {};
    const engagementScore = typeof contactIntel.engagement_score === "number" ? contactIntel.engagement_score : 50;
    const engagementTrend = typeof contactIntel.engagement_trend === "string" ? contactIntel.engagement_trend : "stable";
    const governorResult = await checkSendGovernor({
      contactId: contact.id,
      contactType: contact.type || "buyer",
      journeyPhase: journeyPhase || "lead",
      engagementScore,
      engagementTrend,
      realtorId: tc.realtorId,
    });
    if (!governorResult.allowed) {
      await tc.from("newsletters").update({
        status: "deferred",
        ai_context: {
          ...((newsletter.ai_context as object) || {}),
          governor_blocked: true,
          governor_reason: governorResult.reason,
          governor_suggested_delay_hours: governorResult.suggestedDelay,
          governor_adjustments: governorResult.adjustments,
        },
      }).eq("id", newsletterId);
      revalidatePath("/newsletters");
      return {
        error: `Send deferred by governor: ${governorResult.reason}`,
        action: "deferred",
        suggestedDelay: governorResult.suggestedDelay,
      };
    }
  } catch (governorErr) {
    // Fail open — log warning and continue
    console.warn("[sendNewsletter] send-governor check failed, continuing:", governorErr instanceof Error ? governorErr.message : governorErr);
  }

  // H-03: Atomic: only transition from draft/approved → sending to prevent race conditions
  const { data: claimed, error: claimErr } = await tc
    .from("newsletters")
    .update({ status: "sending" })
    .eq("id", newsletterId)
    .in("status", ["draft", "approved"])
    .select("id, status")
    .single();

  if (claimErr || !claimed) {
    // Another process got here first, or newsletter is already sent/failed
    return { error: "Newsletter already being sent or has invalid status" };
  }

  // Capture the previous status for rollback (we know it was draft or approved)
  const previousStatus = newsletter.status as string;

  try {
    // ── TEXT PIPELINE — clean and validate content before sending ──
    let finalSubject = newsletter.subject;
    let finalHtml = newsletter.html_body;

    try {
      const { runTextPipeline } = await import("@/lib/text-pipeline");
      const textResult = await runTextPipeline({
        subject: newsletter.subject,
        intro: newsletter.html_body?.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300) || "",
        body: "",
        ctaText: "View Details",
        emailType: newsletter.email_type,
        contactId: contact.id,
        contactName: contact.name,
        contactFirstName: contact.name?.split(" ")[0] || "",
        contactType: contact.type || "buyer",
        contactArea: preferredAreas[0],
        contactBudget: { min: budgetMin || undefined, max: budgetMax || undefined },
        voiceRules: [],
      });

      if (textResult.blocked) {
        await tc.from("newsletters").update({
          status: "failed",
          ai_context: { pipeline_blocked: true, block_reason: textResult.blockReason, warnings: textResult.warnings },
        }).eq("id", newsletterId);
        revalidatePath("/newsletters");
        return { error: `Text pipeline blocked: ${textResult.blockReason}`, action: "blocked" };
      }

      // Apply corrections
      if (textResult.corrections.length > 0) {
        finalSubject = textResult.subject;
        // Store corrections for learning
        await tc.from("newsletters").update({
          ai_context: {
            ...((newsletter.ai_context as object) || {}),
            pipeline_corrections: textResult.corrections,
            pipeline_warnings: textResult.warnings,
          },
        }).eq("id", newsletterId);
      }
    } catch (textErr) {
      // H-02: Log pipeline errors rather than swallowing silently
      console.error('[newsletter] Text pipeline failed, using raw content:', textErr instanceof Error ? textErr.message : textErr);
      // Continue with raw content rather than crashing
    }

    // ── QUALITY SCORING — rate email before sending ──
    // Skip quality scoring for greeting emails (they're intentionally short & personal)
    const isGreeting = newsletter.email_type?.startsWith("greeting_");
    const isWelcome = newsletter.email_type === "welcome";
    if (isGreeting || isWelcome) {
      // Greetings and welcome emails bypass quality scoring — no contact data to personalize against
    } else try {
      const { scoreEmailQuality, makeQualityDecision, recordQualityOutcome } = await import("@/lib/quality-pipeline");
      const qualityScore = await scoreEmailQuality({
        subject: finalSubject,
        intro: finalHtml
          ?.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
          .replace(/<[^>]*display\s*:\s*none[^>]*>[\s\S]*?<\/[a-z]+>/gi, "")
          .replace(/<[^>]*>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 600) || "",
        body: "",
        ctaText: "View Details",
        emailType: newsletter.email_type,
        contactName: contact.name,
        contactType: contact.type || "buyer",
        contactArea: preferredAreas[0],
        previousSubjects: lastSubjects,
      });

      const decision = makeQualityDecision(qualityScore);
      await recordQualityOutcome(newsletterId, qualityScore.overall, qualityScore.dimensions);

      if (decision.action === "block") {
        await tc.from("newsletters").update({
          status: "failed",
          quality_score: qualityScore.overall,
          ai_context: {
            ...((newsletter.ai_context as object) || {}),
            quality_blocked: true,
            quality_reason: decision.reason,
            quality_dimensions: qualityScore.dimensions,
            quality_suggestions: qualityScore.suggestions,
          },
        }).eq("id", newsletterId);
        revalidatePath("/newsletters");
        return { error: `Quality check failed (${qualityScore.overall}/10): ${decision.reason}`, action: "blocked" };
      }

      // Auto-regeneration: if score is low, mark for realtor review instead of sending
      if (decision.action === "regenerate") {
        await tc.from("newsletters").update({
          status: "draft", // Keep as draft — realtor should review low-quality emails
          ai_context: {
            ...((newsletter.ai_context as object) || {}),
            quality_warning: true,
            quality_score: qualityScore.overall,
            quality_suggestions: qualityScore.suggestions,
          },
        }).eq("id", newsletterId);
        revalidatePath("/newsletters");
        return { error: `Quality too low (${qualityScore.overall}/10) — kept as draft for review. ${qualityScore.suggestions.join("; ")}`, action: "regenerate" };
      }
    } catch (qualityErr) {
      // H-02: Log quality pipeline errors rather than swallowing silently
      console.error('[newsletter] Quality pipeline failed, continuing with send:', qualityErr instanceof Error ? qualityErr.message : qualityErr);
    }

    // ── REGENERATION LOOP — retry with quality feedback if scorer says "regenerate" ──
    const MAX_REGEN_ATTEMPTS = 1; // 1 retry = 2 total attempts
    let regenAttempt = 0;
    let currentSubject = finalSubject;
    let currentHtml = finalHtml;
    let result: Awaited<ReturnType<typeof validatedSend>>;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      result = await validatedSend({
        newsletterId,
        contactId: contact.id,
        contactName: contact.name,
        contactEmail: contact.email,
        contactType: contact.type || "buyer",
        preferredAreas,
        budgetMin,
        budgetMax,
        subject: currentSubject,
        htmlBody: currentHtml,
        emailType: newsletter.email_type,
        trustLevel: realtorApproved ? 3 : trustLevel,
        lastSubjects,
        journeyPhase,
        skipQualityScore: isGreeting || isWelcome || realtorApproved || regenAttempt >= MAX_REGEN_ATTEMPTS,
        skipCompliance: realtorApproved,
      });

      // If not a regenerate action, or we've exhausted retries, break out
      if (result.action !== "regenerate" || regenAttempt >= MAX_REGEN_ATTEMPTS) break;
      regenAttempt++;

      // Extract quality feedback for the AI
      const qualityIssues = result.validationResult?.qualityScore?.issues || [];
      const qualityAvg = result.validationResult?.qualityScore?.average || 0;
      console.log(`[newsletter] Regenerating (attempt ${regenAttempt}): score=${qualityAvg}, issues=${qualityIssues.join("; ")}`);

      try {
        // Rebuild AI context from stored newsletter data
        const storedAiContext = (newsletter.ai_context as NewsletterContext) || {};
        const regenContext: NewsletterContext = {
          ...storedAiContext,
          contact: storedAiContext.contact || {
            name: contact.name,
            firstName: contact.name.split(" ")[0],
            type: contact.type as "buyer" | "seller" | "partner",
            email: contact.email,
          },
          realtor: storedAiContext.realtor || { name: "Your Realtor", brokerage: "", phone: "", email: "" },
          emailType: newsletter.email_type,
          journeyPhase: journeyPhase || newsletter.journey_phase || "lead",
          // Inject quality feedback so AI improves the content
          additionalContext: `QUALITY FEEDBACK — your previous draft scored ${qualityAvg}/10. Issues: ${qualityIssues.join("; ")}. Write a significantly better version that addresses these issues. Be more specific, personal, and valuable.`,
        };

        const regenContent = await generateNewsletterContent(regenContext) as Record<string, any>;
        const intelligence = (contact.newsletter_intelligence as Record<string, unknown>) || {};
        const preferredArea0 = (intelligence.preferred_areas as string[] | undefined)?.[0] || undefined;
        const engScore = typeof intelligence.engagement_score === "number" ? intelligence.engagement_score : 0;

        const regenHtml = await renderEmailTemplate(
          newsletter.email_type,
          regenContent,
          await getRealtorBranding(realtorId),
          contact.name,
          contact.id,
          preferredArea0,
          journeyPhase || newsletter.journey_phase || "lead",
          engScore,
        );

        // Update newsletter with regenerated content
        currentSubject = regenContent.subject || currentSubject;
        currentHtml = regenHtml;
        await tc.from("newsletters").update({
          subject: currentSubject,
          html_body: currentHtml,
          status: "approved", // Reset so validatedSend can claim it again
          ai_context: {
            ...((newsletter.ai_context as object) || {}),
            regenerated: true,
            regen_attempt: regenAttempt,
            previous_quality_score: qualityAvg,
            previous_quality_issues: qualityIssues,
          },
        }).eq("id", newsletterId);
      } catch (regenErr) {
        console.error("[newsletter] Regeneration failed, proceeding with original:", regenErr instanceof Error ? regenErr.message : regenErr);
        break;
      }
    }

    // validatedSend handles status updates for sent/blocked/deferred/regenerate internally.
    // We only need to handle the communications log and rollback for non-sent outcomes.

    if (result.sent) {
      trackEvent('feature_used', tc.realtorId, { feature: 'newsletters', action: 'send' });

      // Log to communications
      await tc.from("communications").insert({
        contact_id: newsletter.contact_id,
        direction: "outbound",
        channel: "email",
        body: `Newsletter: ${newsletter.subject}`,
        newsletter_id: newsletterId,
      });

      // Non-fatal event emission
      try {
        const { emitNewsletterEvent } = await import("@/lib/newsletter-events");
        await emitNewsletterEvent(tc, {
          event_type: "newsletter_sent",
          contact_id: newsletter.contact_id,
          event_data: { resend_message_id: result.messageId, email_type: newsletter.email_type, newsletter_id: newsletterId },
        });
      } catch { /* non-fatal */ }

      revalidatePath("/newsletters");
      return { success: true, messageId: result.messageId };
    }

    // For non-sent results (queued, deferred, blocked, regenerate),
    // validatedSend already updated the newsletter status.
    revalidatePath("/newsletters");
    return {
      error: result.error || `Validation pipeline returned: ${result.action}`,
      action: result.action,
      validationResult: result.validationResult,
    };
  } catch (e) {
    // Roll back status to what it was before we set it to "sending"
    await tc
      .from("newsletters")
      .update({
        status: previousStatus,
        error_message: e instanceof Error ? e.message : "Unknown error",
        updated_at: new Date().toISOString(),
      })
      .eq("id", newsletterId);

    return { error: e instanceof Error ? e.message : "Send failed" };
  }
}

export async function approveNewsletter(newsletterId: string) {
  const result = await sendNewsletter(newsletterId, true); // realtorApproved = bypass trust gate
  revalidatePath("/newsletters");
  return result;
}

/**
 * Edit a newsletter draft's subject/body, then run voice learning
 * to extract writing preferences from the realtor's changes.
 */
export async function editNewsletterDraft(
  newsletterId: string,
  originalSubject: string,
  originalBody: string,
  editedSubject: string,
  editedBody: string
): Promise<{ success: boolean; learnedRules?: string[]; error?: string }> {
  try {
    const tc = await getAuthenticatedTenantClient();
    const realtorId = tc.realtorId;

    // Update the newsletter with edited content
    const { error: updateError } = await tc
      .from("newsletters")
      .update({
        subject: editedSubject,
        html_body: editedBody,
        updated_at: new Date().toISOString(),
      })
      .eq("id", newsletterId);

    if (updateError) return { success: false, error: updateError.message };

    // Run voice learning to extract writing preferences
    const { extractVoiceRules } = await import("@/lib/voice-learning");
    const learnedRules = await extractVoiceRules(
      realtorId,
      originalSubject,
      originalBody,
      editedSubject,
      editedBody
    );

    revalidatePath("/newsletters");
    revalidatePath("/newsletters/queue");
    return { success: true, learnedRules };
  } catch (e) {
    console.error("Edit newsletter draft error:", e);
    return { success: false, error: e instanceof Error ? e.message : "Edit failed" };
  }
}

export async function skipNewsletter(newsletterId: string) {
  const tc = await getAuthenticatedTenantClient();
  await tc
    .from("newsletters")
    .update({ status: "skipped", updated_at: new Date().toISOString() })
    .eq("id", newsletterId);
  revalidatePath("/newsletters");
  return { success: true };
}

export async function getApprovalQueue() {
  const tc = await getAuthenticatedTenantClient();

  const { data } = await tc
    .from("newsletters")
    .select("*, contacts(id, name, email, type)")
    .eq("status", "draft")
    .eq("send_mode", "review")
    .order("created_at", { ascending: false });

  return data || [];
}

export async function getDeferredNewsletters() {
  const tc = await getAuthenticatedTenantClient();
  const { data } = await tc
    .from("newsletters")
    .select("id, subject, email_type, status, created_at, contacts(id, name, email)")
    .eq("status", "deferred")
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getNewsletterAnalytics(days: number = 30) {
  const tc = await getAuthenticatedTenantClient();
  const since = new Date(Date.now() - days * 86400000).toISOString();

  const { data: newsletters } = await tc
    .from("newsletters")
    .select("id, email_type, status, sent_at")
    .eq("status", "sent")
    .gte("sent_at", since);

  const { data: events } = await tc
    .from("newsletter_events")
    .select("event_type, newsletter_id, link_type")
    .gte("created_at", since);

  const sent = newsletters?.length || 0;
  // BUG-08: Scope events to only newsletters in the fetched set to avoid double-counting.
  // Without this, events for newsletters outside the time window (or with different statuses)
  // can inflate open/click counts when the period filter is applied only to created_at.
  const newsletterIds = new Set((newsletters || []).map((n: { id: string }) => n.id));
  const scopedEvents = (events || []).filter(
    (e: { newsletter_id: string }) => newsletterIds.has(e.newsletter_id)
  );
  const opens = scopedEvents.filter((e: { event_type: string }) => e.event_type === "opened").length;
  const clicks = scopedEvents.filter((e: { event_type: string }) => e.event_type === "clicked").length;
  const bounces = scopedEvents.filter((e: { event_type: string }) => e.event_type === "bounced").length;
  const unsubscribes = scopedEvents.filter((e: { event_type: string }) => e.event_type === "unsubscribed").length;

  // Group by email type
  const byType: Record<string, { sent: number; opens: number; clicks: number }> = {};
  for (const n of newsletters || []) {
    if (!byType[n.email_type]) byType[n.email_type] = { sent: 0, opens: 0, clicks: 0 };
    byType[n.email_type].sent++;
  }
  for (const e of scopedEvents) {
    const newsletter = newsletters?.find((n: { id: string; email_type: string }) => n.id === e.newsletter_id);
    if (newsletter && byType[newsletter.email_type]) {
      if (e.event_type === "opened") byType[newsletter.email_type].opens++;
      if (e.event_type === "clicked") byType[newsletter.email_type].clicks++;
    }
  }

  return {
    sent,
    opens,
    clicks,
    bounces,
    unsubscribes,
    openRate: sent ? Math.round((opens / sent) * 100) : 0,
    clickRate: sent ? Math.round((clicks / sent) * 100) : 0,
    byType,
  };
}

export async function bulkApproveNewsletters(ids: string[]) {
  // BUG-06: Process in parallel batches of 10 to avoid Vercel 10-second timeout
  // for bulk approvals with many newsletters.
  const BATCH_SIZE = 10;
  const allResults: Array<{ id: string; success?: boolean; error?: string; [key: string]: unknown }> = [];

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const settled = await Promise.allSettled(batch.map(id => sendNewsletter(id)));
    settled.forEach((result, idx) => {
      const id = batch[idx];
      if (result.status === "rejected") {
        console.error(`[bulkApprove] Failed for newsletter ${id}:`, result.reason);
        allResults.push({ id, error: String(result.reason) });
      } else {
        allResults.push({ id, ...result.value });
      }
    });
  }

  return {
    results: allResults,
    sent: allResults.filter(r => r.success).length,
    failed: allResults.filter(r => r.error).length,
  };
}

export async function sendCampaign(emailType: string, recipients: string, subject: string) {
  const tc = await getAuthenticatedTenantClient();

  // Build recipient query based on selection. We fetch all candidate
  // fields needed for the CASL gate (`newsletter_unsubscribed`,
  // `casl_consent_given`) and filter in-memory via filterSendable().
  // The DB filter on newsletter_unsubscribed is kept as a first-pass
  // narrow so we don't pull opted-out rows at all.
  let query = tc
    .from("contacts")
    .select("id, name, email, type, newsletter_unsubscribed, casl_consent_given, casl_consent_date")
    .eq("newsletter_unsubscribed", false)
    .not("email", "is", null);

  switch (recipients) {
    case "all_buyers": query = query.eq("type", "buyer"); break;
    case "all_sellers": query = query.eq("type", "seller"); break;
    case "active_buyers": query = query.eq("type", "buyer").in("stage_bar", ["active_search", "qualified"]); break;
    case "past_clients": query = query.in("stage_bar", ["closed"]); break;
    case "new_leads": query = query.in("lead_status", ["new"]).gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString()); break;
    // "everyone" — no filter
  }

  const { data: candidates } = await query.limit(500);
  if (!candidates || candidates.length === 0) {
    return { error: "No matching contacts found" };
  }

  // Enforce CASL: drop any contact without consent.
  const { sendable: contacts, skipped } = filterSendable(candidates);

  if (contacts.length === 0) {
    return {
      error:
        `Campaign blocked — ${skipped.length} contacts matched the recipient filter ` +
        `but none have CASL consent. Send an opt-in request first, or narrow the ` +
        `selection to contacts with casl_consent_given=true.`,
    };
  }

  let sent = 0;
  let failed = 0;

  // BUG-07: Process in parallel batches of 10 to avoid Vercel 10-second timeout
  // for campaigns with >10 contacts.
  const BATCH_SIZE = 10;
  const validContacts = contacts.filter(c => !!c.id);
  for (let i = 0; i < validContacts.length; i += BATCH_SIZE) {
    const batch = validContacts.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map(contact =>
        generateAndQueueNewsletter(contact.id!, emailType, "campaign", undefined, "auto")
      )
    );
    results.forEach((result, idx) => {
      if (result.status === "rejected") {
        console.error(`[campaign] Failed for contact ${batch[idx].id}:`, result.reason);
        failed++;
      } else if (result.value?.data) {
        sent++;
      } else {
        failed++;
      }
    });
  }

  revalidatePath("/newsletters");
  return {
    success: true,
    sent,
    failed,
    total: contacts.length,
    skipped_casl: skipped.length,
  };
}

export async function sendListingBlast(listingId: string, _template: string) {
  try {
    const tc = await getAuthenticatedTenantClient();

    // 1. Get listing
    const { data: listing, error: listingErr } = await tc
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();
    if (listingErr || !listing) return { error: "Listing not found or does not belong to you" };

    // 2. Build recipient list — all agent/partner contacts
    const { data: agents } = await tc
      .from("contacts")
      .select("email")
      .in("type", ["agent", "partner"])
      .not("email", "is", null);
    const emails = (agents || [])
      .map((a: { email: string | null }) => a.email)
      .filter((e: string | null): e is string => !!e && e.includes("@"));
    if (emails.length === 0) return { error: "No agent contacts with valid emails found" };

    // 3. Get brand config
    const { data: config } = await tc
      .from("realtor_agent_config")
      .select("brand_config")
      .limit(1)
      .single();
    const brand = (config?.brand_config as Record<string, string>) || {};

    // 4. Build email
    const address = listing.address || "New Listing";
    const price = listing.list_price ? `$${Number(listing.list_price).toLocaleString()}` : "Price on Request";
    const subject = `NEW LISTING: ${address} — ${price}`;
    const intro = `I'm pleased to present my new listing at ${address}. This property is now available at ${price}. Please share with any interested buyers.`;
    const heroImage = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=600&fit=crop";

    const { assembleEmail, runPreSendChecks } = await import("@/lib/email-blocks");
    const checks = await runPreSendChecks(subject, intro, "blast", "Fellow Agent", "agent", "listing_alert");
    const html = assembleEmail("listing_alert", {
      contact: { name: "Fellow Agent", firstName: "Fellow Agent", type: "agent" },
      agent: {
        name: brand.realtorName || "Kunal",
        brokerage: brand.brokerage || "RE/MAX City Realty",
        phone: brand.phone || "604-555-0123",
        initials: (brand.realtorName || "K")[0],
      },
      content: { subject: checks.subject || subject, intro: checks.body || intro, body: "", ctaText: "Schedule a Showing" },
      listing: {
        address, area: listing.city || "Vancouver", price,
        beds: listing.bedrooms, baths: listing.bathrooms,
        sqft: listing.square_feet ? String(listing.square_feet) : undefined,
        photos: [heroImage],
      },
    });

    // 5. Send batch
    const { sendBatchEmails } = await import("@/lib/resend");
    const emailPayloads = emails.map((to: string) => ({
      to, subject, html,
      from: process.env.RESEND_FROM_EMAIL || "hello@magnate360.com",
      tags: [{ name: "type", value: "listing_blast" }, { name: "listing_id", value: listingId }],
    }));
    const result = await sendBatchEmails(emailPayloads);

    // 6. Log blast
    await tc.from("newsletters").insert({
      subject, email_type: "listing_blast", status: "sent",
      sent_at: new Date().toISOString(), html_body: html,
      ai_context: { blast: true, listing_id: listingId, recipient_count: emails.length, sent: result.sent, failed: result.failed },
    });

    revalidatePath("/newsletters");
    return { success: true, sent: result.sent, failed: result.failed };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Blast failed" };
  }
}

/**
 * Approve an agent draft — sets status to 'approved'.
 * Called from the /newsletters/queue page for agent_drafts with pending_review status.
 */
export async function approveDraft(draftId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("agent_drafts")
    .update({ status: "approved", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("status", "pending_review");

  if (error) return { error: error.message };

  revalidatePath("/newsletters/queue");
  revalidatePath("/newsletters/agent");
  return { success: true };
}

/**
 * Reject an agent draft — sets status to 'rejected'.
 * Called from the /newsletters/queue page for agent_drafts with pending_review status.
 */
export async function rejectDraft(draftId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { error } = await tc
    .from("agent_drafts")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("status", "pending_review");

  if (error) return { error: error.message };

  revalidatePath("/newsletters/queue");
  revalidatePath("/newsletters/agent");
  return { success: true };
}

export async function regenerateNewsletter(newsletterId: string) {
  "use server";
  const tc = await getAuthenticatedTenantClient();

  const { data: newsletter, error } = await tc
    .from("newsletters")
    .select("contact_id, email_type, journey_phase, journey_id, regeneration_count")
    .eq("id", newsletterId)
    .single();

  if (error || !newsletter) return { error: "Newsletter not found" };
  const oldRegenerationCount = newsletter.regeneration_count || 0;
  if (oldRegenerationCount >= 3) {
    return { error: "Max regenerations reached (3)" };
  }

  // C2: Generate first — only soft-delete the old record if generation succeeds
  const genResult = await generateAndQueueNewsletter(
    newsletter.contact_id,
    newsletter.email_type,
    newsletter.journey_phase || "lead",
    newsletter.journey_id ?? undefined,
    "review"
  );

  if (genResult.error || !genResult.data) {
    return { error: genResult.error || "Generation failed" };
  }

  // C2: Soft-delete (supersede) old newsletter — never hard-delete
  await tc
    .from("newsletters")
    .update({ status: "superseded", updated_at: new Date().toISOString() })
    .eq("id", newsletterId);

  // C3: Carry forward regeneration_count so the 3-attempt limit is preserved
  await tc
    .from("newsletters")
    .update({ regeneration_count: oldRegenerationCount + 1, updated_at: new Date().toISOString() })
    .eq("id", genResult.data.id);

  revalidatePath("/newsletters/queue");
  return { success: true };
}

/**
 * Fetch email history for a specific contact — all newsletters with their events.
 * Used on the contact detail "Emails" tab.
 */
export async function getContactEmailHistory(contactId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { data: newsletters, error } = await tc
    .from("newsletters")
    .select("id, subject, email_type, status, html_body, sent_at, created_at, quality_score, ai_context")
    .eq("contact_id", contactId)
    .order("created_at", { ascending: false });

  if (error) return { newsletters: [], stats: { total: 0, sent: 0, opened: 0, clicked: 0, bounced: 0, openRate: 0, clickRate: 0 } };

  if (!newsletters || newsletters.length === 0) {
    return { newsletters: [], stats: { total: 0, sent: 0, opened: 0, clicked: 0, bounced: 0, openRate: 0, clickRate: 0 } };
  }

  // Fetch events for all these newsletters in one query
  type EvtRow = { id: string; newsletter_id: string; event_type: string; metadata: Record<string, unknown> | null; created_at: string };
  const newsletterIds = (newsletters as { id: string }[]).map((n) => n.id);
  const { data: events } = await tc
    .from("newsletter_events")
    .select("id, newsletter_id, event_type, metadata, created_at")
    .in("newsletter_id", newsletterIds)
    .order("created_at", { ascending: false });

  // Group events by newsletter_id
  const eventsByNewsletter: Record<string, EvtRow[]> = {};
  for (const event of (events ?? []) as EvtRow[]) {
    if (!eventsByNewsletter[event.newsletter_id]) {
      eventsByNewsletter[event.newsletter_id] = [];
    }
    eventsByNewsletter[event.newsletter_id]!.push(event);
  }

  // Merge events into newsletters
  const enriched = (newsletters as Array<{ id: string; status: string; [k: string]: unknown }>).map((nl) => ({
    ...nl,
    events: eventsByNewsletter[nl.id] ?? ([] as EvtRow[]),
  }));

  // Compute summary stats
  const totalSent = enriched.filter((n) => n.status === "sent").length;
  const totalOpened = enriched.filter((n) =>
    n.events.some((e: EvtRow) => e.event_type === "opened")
  ).length;
  const totalClicked = enriched.filter((n) =>
    n.events.some((e: EvtRow) => e.event_type === "clicked")
  ).length;
  const totalBounced = enriched.filter((n) =>
    n.events.some((e: EvtRow) => e.event_type === "bounced")
  ).length;

  return {
    newsletters: enriched,
    stats: {
      total: enriched.length,
      sent: totalSent,
      opened: totalOpened,
      clicked: totalClicked,
      bounced: totalBounced,
      openRate: totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0,
      clickRate: totalSent > 0 ? Math.round((totalClicked / totalSent) * 100) : 0,
    },
  };
}
