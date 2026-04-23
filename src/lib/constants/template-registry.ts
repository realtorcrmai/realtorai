/**
 * Template Registry — central mapping from emailType → metadata + sample data.
 *
 * ALL emails are rendered via assembleEmail() in email-blocks.ts (the block system).
 * React Email components exist but are NOT used by the main send pipeline.
 * The gallery previews must match what contacts actually receive.
 *
 * The `slug` field links to `newsletter_templates.slug` for future delivery history and editing.
 */

import type { RealtorBranding } from "@/emails/BaseLayout";

export interface TemplateEntry {
  slug: string;
  displayName: string;
  description: string;
  icon: string;
  category: "journey" | "event" | "greeting";
  sampleSubject: string;
  /**
   * Block system key used by assembleEmail(). Maps to TEMPLATE_BLOCKS in email-blocks.ts.
   * See newsletters.ts lines 136-159 for the emailType → blockType mapping.
   */
  blockType: string;
  sampleData: (branding: RealtorBranding) => Record<string, unknown>;
}

function agentFromBranding(branding: RealtorBranding) {
  return {
    name: branding.name || "Your Name",
    brokerage: branding.brokerage || "",
    phone: branding.phone || "",
    email: branding.email || "",
    title: branding.title || "REALTOR\u00ae",
    initials: (branding.name || "R")[0],
    brandColor: branding.accentColor || "#1a1a1a",
    headshotUrl: branding.headshotUrl || undefined,
    logoUrl: branding.logoUrl || undefined,
    socialLinks: branding.socialLinks || undefined,
  };
}

/** Common fields injected into every template's data for CASL footer + unsubscribe */
function commonFields(branding: RealtorBranding) {
  return {
    unsubscribeUrl: "#unsubscribe-preview",
    physicalAddress: branding.physicalAddress || "123 Main St, Vancouver BC V6B 1A1",
  };
}

export const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {
  // ── Journey Templates (10) ─────────────────────────────────

  welcome: {
    slug: "welcome",
    displayName: "Welcome Email",
    description: "Personal introduction from you. Shows your name, brokerage, value props, and headshot.",
    icon: "👋",
    category: "journey",
    blockType: "welcome",
    sampleSubject: "Nice to meet you, Sarah",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Nice to meet you, Sarah",
        intro: `I'm ${branding.name}${branding.brokerage ? ` at ${branding.brokerage}` : ""}, and I'm looking forward to helping you find the right property. Whether you're just starting to explore or ready to make a move, I'm here to guide you every step of the way.`,
        body: "", ctaText: "View Listings in Your Area", ctaUrl: "#",
      },
      valueProps: [
        { icon: "\u{1F3E0}", title: "Personalized Property Search", description: "I'll find listings that match your exact criteria — location, budget, and lifestyle." },
        { icon: "\u{1F4CA}", title: "Market Intelligence", description: "Weekly updates on prices, trends, and new listings in your target neighbourhoods." },
        { icon: "\u{1F91D}", title: "Expert Negotiation", description: "From offer strategy to closing, I'll advocate for your best interests at every step." },
      ],
      ...commonFields(branding),
    }),
  },

  neighbourhood_guide: {
    slug: "neighbourhood_guide",
    displayName: "Neighbourhood Guide",
    description: "Area lifestyle guide with local highlights, schools, dining, and transit.",
    icon: "\u{1F3D8}\uFE0F",
    category: "journey",
    blockType: "neighbourhood_guide",
    sampleSubject: "Discover Kitsilano — Your Neighbourhood Guide",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Discover Kitsilano",
        intro: "Whether you're exploring or already fell in love with the area, here's everything you need to know about one of Vancouver's most desirable neighbourhoods.",
        body: "", ctaText: "Explore Homes in Kitsilano", ctaUrl: "#",
      },
      listing: { address: "Kitsilano, Vancouver", area: "Kitsilano" },
      listings: [
        { address: "3456 W 4th Ave", price: "$899,000", beds: 2, baths: 2 },
        { address: "2845 Vine St", price: "$1,195,000", beds: 3, baths: 2 },
      ],
      ...commonFields(branding),
    }),
  },

  new_listing_alert: {
    slug: "new_listing_alert",
    displayName: "New Listing Alert",
    description: "Fresh listings matching the buyer's search criteria with photos and details.",
    icon: "\u{1F3E0}",
    category: "journey",
    blockType: "listing_alert",
    sampleSubject: "3 New Listings in Greater Vancouver",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "3 New Listings in Greater Vancouver",
        intro: "I just found 3 new properties that match what you're looking for. These are fresh on the market — take a look before they get scooped up!",
        body: "", ctaText: "Book a Showing", ctaUrl: "#",
      },
      listings: [
        { address: "3456 W 4th Ave, Kitsilano", price: "$899,000", beds: 2, baths: 2 },
        { address: "2845 Vine St, Kitsilano", price: "$1,195,000", beds: 3, baths: 2 },
        { address: "1890 W 1st Ave, False Creek", price: "$749,000", beds: 2, baths: 2 },
      ],
      ...commonFields(branding),
    }),
  },

  market_update: {
    slug: "market_update",
    displayName: "Market Update",
    description: "Monthly market snapshot with stats, recent sales, and expert commentary.",
    icon: "\u{1F4CA}",
    category: "journey",
    blockType: "market_update",
    sampleSubject: "Your Greater Vancouver Market Update",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Your Greater Vancouver Market Update",
        intro: "Here's your monthly snapshot of the Greater Vancouver real estate market. The spring season is heating up with new inventory and strong buyer demand.",
        body: "Inventory is rising but well-priced homes are still selling fast — especially in Kitsilano, Mount Pleasant, and East Van.",
        ctaText: "Get Your Home's Value", ctaUrl: "#",
      },
      market: {
        avgPrice: "$1,125,000", avgDom: 18, inventoryChange: "+15%",
        recentSales: [
          { address: "2845 W 4th Ave, Kitsilano", price: "$1,195,000", dom: 8 },
          { address: "456 Beach Crescent, Yaletown", price: "$875,000", dom: 14 },
          { address: "3210 Main St, Mount Pleasant", price: "$949,000", dom: 6 },
        ],
      },
      ...commonFields(branding),
    }),
  },

  closing_checklist: {
    slug: "closing_checklist",
    displayName: "Closing Checklist",
    description: "Countdown to closing with checklist items and key dates.",
    icon: "\u2705",
    category: "journey",
    blockType: "closing_checklist",
    sampleSubject: "Your Closing Checklist — 14 Days to Go",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Your Closing Checklist — 14 Days to Go",
        intro: "We're getting close! Here's your checklist to make sure everything is ready for a smooth closing day.",
        body: "", ctaText: "View Closing Details", ctaUrl: "#",
        features: [
          "Confirm mortgage financing approval",
          "Schedule final walkthrough",
          "Arrange home insurance",
          "Set up utilities transfer",
          "Confirm lawyer and notary appointments",
        ],
      },
      countdown: { value: "14", label: "days to closing", subtext: "May 15, 2026" },
      ...commonFields(branding),
    }),
  },

  inspection_reminder: {
    slug: "inspection_reminder",
    displayName: "Inspection Reminder",
    description: "Home inspection reminder with preparation tips.",
    icon: "\u{1F50D}",
    category: "journey",
    blockType: "inspection_reminder",
    sampleSubject: "Inspection Reminder — 3456 W 4th Ave",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Inspection Reminder",
        intro: "Your home inspection is coming up. Here's what to expect and how to prepare.",
        body: "", ctaText: "View Inspection Details", ctaUrl: "#",
        features: [
          "Ensure all areas are accessible",
          "Clear space around HVAC, water heater, and electrical panel",
          "Prepare a list of questions for the inspector",
          "Plan for 2-3 hours on site",
        ],
      },
      countdown: { value: "2", label: "days until inspection", subtext: "May 3, 2026 at 10:00 AM" },
      ...commonFields(branding),
    }),
  },

  closing_countdown: {
    slug: "closing_countdown",
    displayName: "Closing Countdown",
    description: "Final closing countdown for sellers with remaining steps.",
    icon: "\u23F0",
    category: "journey",
    blockType: "closing_countdown",
    sampleSubject: "7 Days to Closing — Final Steps",
    sampleData: (branding) => ({
      contact: { name: "Linda Martinez", firstName: "Linda", type: "seller" },
      agent: agentFromBranding(branding),
      content: {
        subject: "7 Days to Closing",
        intro: "Just one week left! Here are the final steps to ensure a smooth closing.",
        body: "", ctaText: "View Closing Details", ctaUrl: "#",
        features: [
          "Sign final closing documents",
          "Arrange key handover",
          "Cancel or transfer home services",
          "Forward mail to new address",
          "Final meter readings for utilities",
        ],
      },
      countdown: { value: "7", label: "days to closing", subtext: "May 15, 2026" },
      market: {
        avgPrice: "$1,125,000", avgDom: 18, inventoryChange: "+15%",
        recentSales: [{ address: "2845 W 4th Ave", price: "$1,195,000", dom: 8 }],
      },
      ...commonFields(branding),
    }),
  },

  home_anniversary: {
    slug: "home_anniversary",
    displayName: "Home Anniversary",
    description: "Annual milestone with current value estimate and maintenance tips.",
    icon: "\u{1F382}",
    category: "journey",
    blockType: "home_anniversary",
    sampleSubject: "Happy 1-Year Home Anniversary!",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Happy 1-Year Home Anniversary!",
        intro: "Can you believe it's been a year already? Time flies when you love where you live! Your home has been a great investment.",
        body: "", ctaText: "Get an Updated Valuation", ctaUrl: "#",
      },
      anniversary: {
        purchasePrice: "$920,000", currentEstimate: "$985,000",
        appreciation: "+6.8%", equityGained: "$65,000",
        areaHighlights: [
          { icon: "\u{1F3D7}\uFE0F", text: "New transit station planned nearby" },
          { icon: "\u{1F333}", text: "Park renovation completed" },
          { icon: "\u{1F4C8}", text: "Neighbourhood prices up 6.8% this year" },
        ],
      },
      ...commonFields(branding),
    }),
  },

  referral_ask: {
    slug: "referral_ask",
    displayName: "Referral Ask",
    description: "Gentle referral request for past clients and satisfied contacts.",
    icon: "\u{1F91D}",
    category: "journey",
    blockType: "referral",
    sampleSubject: "Know Someone Looking to Buy or Sell?",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Know Someone Looking to Buy or Sell?",
        intro: "I hope you're enjoying your home! If you know anyone thinking about buying or selling, I'd love to help them with the same care I gave you. A personal referral means the world to me.",
        body: "", ctaText: "Refer a Friend", ctaUrl: "#",
      },
      testimonial: {
        quote: "Working with this team was an absolute dream. Professional, responsive, and genuinely caring.",
        name: "Michael & Jessica Chen", role: "Past clients",
      },
      socialProof: {
        headline: "Trusted by families across Vancouver",
        text: "42 homes sold in 2025",
        stats: [{ value: "42", label: "Homes Sold" }, { value: "4.9/5", label: "Rating" }],
      },
      ...commonFields(branding),
    }),
  },

  reengagement: {
    slug: "reengagement",
    displayName: "Re-engagement",
    description: "Win-back email for dormant contacts with fresh market data.",
    icon: "\u{1F504}",
    category: "journey",
    blockType: "re_engagement",
    sampleSubject: "The Market Has Changed — Here's What You Should Know",
    sampleData: (branding) => ({
      contact: { name: "Raj Patel", firstName: "Raj", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "The Market Has Changed",
        intro: "It's been a while! A lot has changed in the market since we last connected. Whether you're still thinking about making a move or just curious, here's a quick update.",
        body: "", ctaText: "Let's Reconnect", ctaUrl: "#",
      },
      market: {
        avgPrice: "$1,125,000", avgDom: 18, inventoryChange: "+15%",
        recentSales: [
          { address: "2845 W 4th Ave, Kitsilano", price: "$1,195,000", dom: 8 },
          { address: "456 Beach Crescent, Yaletown", price: "$875,000", dom: 14 },
        ],
      },
      listings: [
        { address: "3456 W 4th Ave, Kitsilano", price: "$899,000", beds: 2, baths: 2 },
      ],
      ...commonFields(branding),
    }),
  },

  // ── Event-Triggered Templates (10) ─────────────────────────

  just_sold: {
    slug: "just_sold",
    displayName: "Just Sold",
    description: "Sale celebration showcasing a recently sold property.",
    icon: "\u{1F389}",
    category: "event",
    blockType: "just_sold",
    sampleSubject: "Just Sold: 2845 Vine St — Above Asking!",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Just Sold: 2845 Vine St — Above Asking!",
        intro: "Great news — another home has found its new owner! This one attracted multiple offers and sold above asking. Curious what your home might be worth?",
        body: "", ctaText: "What's Your Home Worth?", ctaUrl: "#",
      },
      listing: { address: "2845 Vine St, Kitsilano", area: "Kitsilano", price: "$1,215,000" },
      market: {
        priceComparison: { listing: "$1,215,000", average: "$1,125,000", diff: "+$90,000" },
        recentSales: [
          { address: "2845 Vine St, Kitsilano", price: "$1,215,000", dom: 12 },
          { address: "3210 Main St", price: "$949,000", dom: 6 },
        ],
      },
      ...commonFields(branding),
    }),
  },

  open_house_invite: {
    slug: "open_house_invite",
    displayName: "Open House Invite",
    description: "Event invitation with property details and RSVP.",
    icon: "\u{1F3E1}",
    category: "event",
    blockType: "open_house",
    sampleSubject: "Open House This Saturday: 3456 W 4th Ave",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Open House This Saturday",
        intro: "You're invited to an exclusive open house! This beautifully updated home features an open-concept layout and a private south-facing patio.",
        body: "", ctaText: "RSVP Now", ctaUrl: "#",
        features: ["3 bedrooms, 2 bathrooms", "Updated kitchen with quartz counters", "South-facing patio", "Steps to transit and shops"],
      },
      listing: { address: "3456 W 4th Ave, Kitsilano", area: "Kitsilano", price: "$899,000" },
      ...commonFields(branding),
    }),
  },

  price_drop_alert: {
    slug: "price_drop_alert",
    displayName: "Price Drop Alert",
    description: "Notification when a property drops in price.",
    icon: "\u{1F4C9}",
    category: "event",
    blockType: "listing_alert",
    sampleSubject: "Price Reduced: 3456 W 4th Ave — Now $849,000",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Price Reduced: 3456 W 4th Ave",
        intro: "A property you viewed just dropped in price by $50,000. This could be the opportunity you've been waiting for.",
        body: "", ctaText: "View Updated Listing", ctaUrl: "#",
      },
      listing: { address: "3456 W 4th Ave, Kitsilano", area: "Kitsilano", price: "$849,000" },
      listings: [{ address: "3456 W 4th Ave, Kitsilano", price: "$849,000", beds: 2, baths: 2 }],
      ...commonFields(branding),
    }),
  },

  premium_listing: {
    slug: "premium_listing",
    displayName: "Premium Listing Showcase",
    description: "Featured luxury property with photo gallery and details.",
    icon: "\u{1F48E}",
    category: "event",
    blockType: "luxury_showcase",
    sampleSubject: "Exclusive: Stunning Kitsilano Home — $2,195,000",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Exclusive: Stunning Kitsilano Home",
        intro: "This stunning 4-bedroom home combines contemporary design with the natural beauty of Kitsilano. Floor-to-ceiling windows, chef's kitchen, and a private rooftop deck with ocean views.",
        body: "", ctaText: "Schedule a Private Showing", ctaUrl: "#",
        features: ["Chef's kitchen with Sub-Zero & Wolf", "Rooftop deck with ocean views", "Heated floors throughout", "EV charging", "Smart home system"],
      },
      listing: { address: "4120 W 2nd Ave, Kitsilano", area: "Kitsilano", price: "$2,195,000" },
      ...commonFields(branding),
    }),
  },

  buyer_guide: {
    slug: "buyer_guide",
    displayName: "First-Time Buyer Guide",
    description: "Step-by-step guide for first-time home buyers.",
    icon: "\u{1F4DA}",
    category: "event",
    blockType: "buyer_guide",
    sampleSubject: "Your Step-by-Step Home Buying Guide",
    sampleData: (branding) => ({
      contact: { name: "David Kim", firstName: "David", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Your Home Buying Journey",
        intro: "Buying your first home is exciting! Here's a clear roadmap to help you navigate every step with confidence.",
        body: "", ctaText: "Book a Free Consultation", ctaUrl: "#",
        features: [
          "Get pre-approved with a mortgage broker",
          "Define your must-haves: neighbourhood, bedrooms, parking",
          "Start viewing homes — most buyers see 5-10",
          "Make a competitive offer with the right subjects",
          "Close the deal — inspections, financing, lawyer",
        ],
      },
      listings: [
        { address: "3456 W 4th Ave, Kitsilano", price: "$899,000", beds: 2, baths: 2 },
        { address: "2845 Vine St", price: "$1,195,000", beds: 3, baths: 2 },
      ],
      ...commonFields(branding),
    }),
  },

  community_event: {
    slug: "community_event",
    displayName: "Community Event",
    description: "Local community event invitation.",
    icon: "\u{1F3AA}",
    category: "event",
    blockType: "neighbourhood_guide",
    sampleSubject: "You're Invited: Kitsilano Farmers Market",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Kitsilano Farmers Market — Season Opening",
        intro: "The Kits Farmers Market is back for the summer season! Fresh local produce, artisan goods, live music, and community fun.",
        body: "", ctaText: "Learn More", ctaUrl: "#",
      },
      listing: { address: "Kitsilano Community Centre", area: "Kitsilano" },
      ...commonFields(branding),
    }),
  },

  client_testimonial: {
    slug: "client_testimonial",
    displayName: "Client Testimonial",
    description: "Social proof from a satisfied client.",
    icon: "\u2B50",
    category: "event",
    blockType: "just_sold",
    sampleSubject: "What Our Clients Are Saying",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "What Our Clients Are Saying",
        intro: "Real stories from real clients. We're proud of every family we've helped find their perfect home.",
        body: "", ctaText: "Start Your Journey", ctaUrl: "#",
      },
      testimonial: {
        quote: "Working with this team was an absolute dream. They found us the perfect home in Kitsilano within 3 weeks and negotiated $30K under asking.",
        name: "Michael & Jessica Chen", role: "First-time buyers, Kitsilano",
      },
      socialProof: {
        headline: "Trusted by families across Vancouver",
        text: "42 homes sold in 2025",
        stats: [{ value: "42", label: "Homes Sold" }, { value: "4.9/5", label: "Rating" }],
      },
      ...commonFields(branding),
    }),
  },

  home_value_update: {
    slug: "home_value_update",
    displayName: "Home Value Update",
    description: "Property valuation estimate with comparable sales.",
    icon: "\u{1F4B0}",
    category: "event",
    blockType: "market_update",
    sampleSubject: "Your Home Value Update — Good News!",
    sampleData: (branding) => ({
      contact: { name: "Linda Martinez", firstName: "Linda", type: "seller" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Your Home Value Update",
        intro: "Great news — your home's estimated value has increased! Here's a detailed comparison with recent sales in your neighbourhood.",
        body: "", ctaText: "Request a Detailed CMA", ctaUrl: "#",
      },
      market: {
        avgPrice: "$1,050,000", avgDom: 16, inventoryChange: "+8%",
        recentSales: [
          { address: "1180 W 6th Ave", price: "$1,070,000", dom: 12 },
          { address: "1320 W 7th Ave", price: "$1,025,000", dom: 18 },
        ],
        priceComparison: { listing: "$1,050,000", average: "$985,000", diff: "+$65,000" },
      },
      ...commonFields(branding),
    }),
  },

  mortgage_renewal: {
    slug: "mortgage_renewal",
    displayName: "Mortgage Renewal Alert",
    description: "Mortgage renewal reminder with rate comparison.",
    icon: "\u{1F3E6}",
    category: "event",
    blockType: "mortgage_renewal",
    sampleSubject: "Your Mortgage Renewal — 6 Months Away",
    sampleData: (branding) => ({
      contact: { name: "William Hughes", firstName: "William", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "Your Mortgage Renewal Is Coming Up",
        intro: "Your mortgage renewal is 6 months away. Now is a great time to start shopping rates — you could save $187/month.",
        body: "", ctaText: "Connect with a Mortgage Specialist", ctaUrl: "#",
        features: [
          "Start shopping rates 120 days before renewal",
          "Consider a mortgage broker for best rates",
          "Check if your penalty allows early renewal",
          "Review fixed vs variable for your situation",
        ],
      },
      market: {
        avgPrice: "4.29%", avgDom: 0, inventoryChange: "-0.50%",
        priceComparison: { listing: "4.29%", average: "4.79%", diff: "-0.50%" },
      },
      mortgageCalc: { monthly: "$2,847", downPayment: "$190,000", rate: "4.29%", details: "25-year amortization" },
      ...commonFields(branding),
    }),
  },

  year_in_review: {
    slug: "year_in_review",
    displayName: "Year in Review",
    description: "Annual market summary with highlights and outlook.",
    icon: "\u{1F4C5}",
    category: "event",
    blockType: "market_update",
    sampleSubject: "2025 Year in Review — Real Estate Highlights",
    sampleData: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: agentFromBranding(branding),
      content: {
        subject: "2025 Year in Review",
        intro: "2025 was a strong year for Vancouver real estate. Inventory remained tight, pushing prices up 5.4% overall. Kitsilano and Mount Pleasant led the way.",
        body: "2026 is looking promising with new transit infrastructure and steady demand. It's a great time to consider your next move.",
        ctaText: "Plan Your 2026 Move", ctaUrl: "#",
      },
      market: {
        avgPrice: "$1,180,000", avgDom: 16, inventoryChange: "+5.4%",
        recentSales: [
          { address: "Top sale: 4120 W 2nd Ave, Kitsilano", price: "$2,195,000", dom: 8 },
          { address: "Most active: Mount Pleasant", price: "$949,000", dom: 6 },
        ],
      },
      socialProof: {
        headline: "2025 at a glance",
        text: "42 families helped",
        stats: [{ value: "42", label: "Homes Sold" }, { value: "$1.18M", label: "Avg Price" }, { value: "16", label: "Avg Days" }],
      },
      ...commonFields(branding),
    }),
  },
};
