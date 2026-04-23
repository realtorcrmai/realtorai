/**
 * Template Registry — central mapping from emailType → React Email component + metadata + sample props.
 *
 * Used by the Template Gallery page to render previews with the realtor's actual branding.
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
   * Render mode:
   * - "react-email" — rendered via React Email component (default)
   * - "block-system" — rendered via assembleEmail() from email-blocks.ts
   */
  renderMode?: "react-email" | "block-system";
  sampleProps: (branding: RealtorBranding) => Record<string, unknown>;
}

const UNSUB = "#unsubscribe-preview";

function defaultBranding(branding: RealtorBranding) {
  return {
    branding,
    unsubscribeUrl: UNSUB,
  };
}

export const TEMPLATE_REGISTRY: Record<string, TemplateEntry> = {
  // ── Journey Templates (10) ─────────────────────────────────
  welcome: {
    slug: "welcome",
    displayName: "Welcome Email",
    description: "Personal introduction from you to your new contact. Shows your name, brokerage, value props, and a large headshot signature.",
    icon: "👋",
    category: "journey",
    renderMode: "block-system",
    sampleSubject: "Nice to meet you, Sarah",
    sampleProps: (branding) => ({
      contact: { name: "Sarah Chen", firstName: "Sarah", type: "buyer" },
      agent: {
        name: branding.name || "Your Name",
        brokerage: branding.brokerage || "RE/MAX City Realty",
        phone: branding.phone || "604-555-0123",
        email: branding.email || "",
        initials: (branding.name || "R")[0],
        brandColor: branding.accentColor || "#1a1a1a",
        headshotUrl: branding.headshotUrl || undefined,
      },
      content: {
        subject: "Nice to meet you, Sarah",
        intro: `I'm ${branding.name || "Your Name"} at ${branding.brokerage || "RE/MAX City Realty"}, and I'm looking forward to helping you find the right property. Whether you're just starting to explore or ready to make a move, I'm here to guide you every step of the way.`,
        body: "",
        ctaText: "View Listings in Your Area",
        ctaUrl: "#",
      },
      valueProps: [
        { icon: "🏠", title: "Personalized Property Search", description: "I'll find listings that match your exact criteria — location, budget, and lifestyle." },
        { icon: "📊", title: "Market Intelligence", description: "Weekly updates on prices, trends, and new listings in your target neighbourhoods." },
        { icon: "🤝", title: "Expert Negotiation", description: "From offer strategy to closing, I'll advocate for your best interests at every step." },
      ],
      unsubscribeUrl: "#unsubscribe-preview",
    }),
  },

  neighbourhood_guide: {
    slug: "neighbourhood_guide",
    displayName: "Neighbourhood Guide",
    description: "Area lifestyle guide with local highlights, schools, dining, and transit info.",
    icon: "🏘️",
    category: "journey",
    sampleSubject: "Discover Kitsilano — Your Neighbourhood Guide",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      area: "Kitsilano",
      intro: "Whether you're exploring or already fell in love with the area, here's everything you need to know about one of Vancouver's most desirable neighbourhoods.",
      highlights: [
        { category: "Beaches & Parks", items: ["Kits Beach — Vancouver's favourite urban beach", "Jericho Beach — stunning sunset views", "Vanier Park — home to museums and festivals"] },
        { category: "Dining & Shopping", items: ["4th Ave restaurant row — 50+ restaurants", "West Broadway boutiques & cafés", "Granville Island Public Market (10 min walk)"] },
        { category: "Schools & Families", items: ["Kitsilano Secondary (public)", "St. Augustine's (private)", "Henry Hudson Elementary"] },
        { category: "Transit & Commute", items: ["10 min to downtown via Burrard Bridge", "B-Line express bus on Broadway", "Future Broadway subway station (2027)"] },
      ],
      funFact: "Kitsilano was named after Chief Khahtsahlano of the Squamish Nation. The neighbourhood was Vancouver's hippie hub in the 1960s — today it's one of the city's most sought-after areas.",
      ctaText: "Explore Homes in Kitsilano",
      ctaUrl: "#",
    }),
  },

  new_listing_alert: {
    slug: "new_listing_alert",
    displayName: "New Listing Alert",
    description: "Fresh property listings matching the buyer's preferences.",
    icon: "🏠",
    category: "journey",
    sampleSubject: "3 New Listings in Greater Vancouver — Just for You",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      area: "Greater Vancouver",
      intro: "I just found 3 new properties that match what you're looking for. These are fresh on the market — take a look before they get scooped up!",
      listings: [
        { address: "3456 W 4th Ave, Kitsilano", price: "$899,000", beds: 2, baths: 2 },
        { address: "2845 Vine St, Kitsilano", price: "$1,195,000", beds: 3, baths: 2 },
        { address: "1890 W 1st Ave, False Creek", price: "$749,000", beds: 2, baths: 2 },
      ],
      ctaText: "Book a Showing",
      ctaUrl: "#",
    }),
  },

  market_update: {
    slug: "market_update",
    displayName: "Market Update",
    description: "Monthly market snapshot with stats, recent sales, and expert commentary.",
    icon: "📊",
    category: "journey",
    sampleSubject: "Your Greater Vancouver Market Update",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      area: "Greater Vancouver",
      month: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
      intro: "Here's your monthly snapshot of the Greater Vancouver real estate market. The spring season is heating up with new inventory and strong buyer demand.",
      stats: [
        { label: "Avg Sale Price", value: "$1,125,000", change: "+3.2%" },
        { label: "Days on Market", value: "18", change: "-4 days" },
        { label: "New Listings", value: "1,247", change: "+15%" },
      ],
      recentSales: [
        { address: "2845 W 4th Ave, Kitsilano", price: "$1,195,000", daysOnMarket: 8 },
        { address: "456 Beach Crescent, Yaletown", price: "$875,000", daysOnMarket: 14 },
        { address: "3210 Main St, Mount Pleasant", price: "$949,000", daysOnMarket: 6 },
      ],
      commentary: "Inventory is rising but well-priced homes are still selling fast — especially in Kitsilano, Mount Pleasant, and East Van.",
      ctaText: "Get Your Home's Value",
      ctaUrl: "#",
    }),
  },

  closing_checklist: {
    slug: "closing_checklist",
    displayName: "Closing Checklist",
    description: "Countdown to closing with checklist items and key dates.",
    icon: "✅",
    category: "journey",
    sampleSubject: "Your Closing Checklist — 14 Days to Go",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      address: "3456 W 4th Ave, Kitsilano",
      closingDate: "May 15, 2026",
      daysRemaining: 14,
      checklist: [
        "Confirm mortgage financing approval",
        "Schedule final walkthrough",
        "Arrange home insurance",
        "Set up utilities transfer",
        "Confirm lawyer and notary appointments",
      ],
      message: "We're getting close! Here's your checklist to make sure everything is ready for a smooth closing day.",
      ctaText: "View Closing Details",
      ctaUrl: "#",
    }),
  },

  inspection_reminder: {
    slug: "inspection_reminder",
    displayName: "Inspection Reminder",
    description: "Home inspection scheduling reminder with preparation tips.",
    icon: "🔍",
    category: "journey",
    sampleSubject: "Inspection Reminder — 3456 W 4th Ave",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      address: "3456 W 4th Ave, Kitsilano",
      inspectionDate: "May 3, 2026",
      inspectionTime: "10:00 AM",
      inspectorName: "Pacific Home Inspections",
      preparationTips: [
        "Ensure all areas are accessible",
        "Clear space around HVAC, water heater, and electrical panel",
        "Prepare a list of questions for the inspector",
        "Plan for 2-3 hours on site",
      ],
      message: "Your home inspection is coming up. Here's what to expect and how to prepare.",
      ctaText: "View Inspection Details",
      ctaUrl: "#",
    }),
  },

  closing_countdown: {
    slug: "closing_countdown",
    displayName: "Closing Countdown",
    description: "Final closing countdown for sellers with remaining steps.",
    icon: "⏰",
    category: "journey",
    sampleSubject: "7 Days to Closing — Final Steps",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Linda",
      address: "1250 W 6th Ave, Vancouver",
      closingDate: "May 15, 2026",
      daysRemaining: 7,
      checklist: [
        "Sign final closing documents",
        "Arrange key handover",
        "Cancel or transfer home services",
        "Forward mail to new address",
        "Final meter readings for utilities",
      ],
      message: "Just one week left! Here are the final steps to ensure a smooth closing.",
      ctaText: "View Closing Details",
      ctaUrl: "#",
    }),
  },

  home_anniversary: {
    slug: "home_anniversary",
    displayName: "Home Anniversary",
    description: "Annual homeownership milestone with current value estimate and maintenance tips.",
    icon: "🎂",
    category: "journey",
    sampleSubject: "Happy 1-Year Home Anniversary! 🎉",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      address: "1250 W 6th Ave, Vancouver",
      purchaseDate: "April 2025",
      years: 1,
      estimatedValue: "$985,000",
      appreciation: "+6.8%",
      message: "Can you believe it's been a year already? Time flies when you love where you live! Your home has been a great investment.",
      tips: [
        "Schedule annual HVAC inspection",
        "Clean gutters and downspouts",
        "Check exterior paint and caulking",
        "Test smoke and CO detectors",
        "Review your home insurance coverage",
      ],
      ctaText: "Get an Updated Valuation",
      ctaUrl: "#",
    }),
  },

  referral_ask: {
    slug: "referral_ask",
    displayName: "Referral Ask",
    description: "Gentle referral request for past clients and satisfied contacts.",
    icon: "🤝",
    category: "journey",
    sampleSubject: "Know Someone Looking to Buy or Sell?",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      referredName: "a friend or family member",
      message: "I hope you're enjoying your home! If you know anyone thinking about buying or selling, I'd love to help them with the same care I gave you. A personal referral means the world to me.",
      ctaText: "Refer a Friend",
      ctaUrl: "#",
    }),
  },

  reengagement: {
    slug: "reengagement",
    displayName: "Re-engagement",
    description: "Win-back email for dormant contacts with fresh market data.",
    icon: "🔄",
    category: "journey",
    sampleSubject: "The Market Has Changed — Here's What You Should Know",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Raj",
      area: "Greater Vancouver",
      month: new Date().toLocaleString("en-US", { month: "long", year: "numeric" }),
      intro: "It's been a while! A lot has changed in the market since we last connected. Whether you're still thinking about making a move or just curious, here's a quick update.",
      stats: [
        { label: "Avg Sale Price", value: "$1,125,000", change: "+3.2%" },
        { label: "Days on Market", value: "18", change: "-4 days" },
        { label: "New Listings", value: "1,247", change: "+15%" },
      ],
      recentSales: [
        { address: "2845 W 4th Ave, Kitsilano", price: "$1,195,000", daysOnMarket: 8 },
      ],
      commentary: "The spring market is looking strong. If you've been on the fence, now might be a great time to reconnect.",
      ctaText: "Let's Reconnect",
      ctaUrl: "#",
    }),
  },

  // ── Event-Triggered Templates (10) ─────────────────────────
  just_sold: {
    slug: "just_sold",
    displayName: "Just Sold",
    description: "Sale celebration email showcasing a recently sold property.",
    icon: "🎉",
    category: "event",
    sampleSubject: "Just Sold: 2845 Vine St, Kitsilano — Above Asking!",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      address: "2845 Vine St, Kitsilano",
      salePrice: "$1,215,000",
      daysOnMarket: 12,
      message: "Great news — another home has found its new owner! This one attracted multiple offers and sold above asking. Curious what your home might be worth?",
      ctaText: "What's Your Home Worth?",
      ctaUrl: "#",
    }),
  },

  open_house_invite: {
    slug: "open_house_invite",
    displayName: "Open House Invite",
    description: "Event invitation for upcoming open house with property details.",
    icon: "🏡",
    category: "event",
    sampleSubject: "Open House This Saturday: 3456 W 4th Ave",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      address: "3456 W 4th Ave, Kitsilano",
      price: "$899,000",
      date: "Saturday, May 10, 2026",
      time: "2:00 PM – 4:00 PM",
      description: "You're invited to an exclusive open house! This beautifully updated home features an open-concept layout and a private south-facing patio.",
      features: ["3 bedrooms, 2 bathrooms", "Updated kitchen with quartz counters", "South-facing patio", "Steps to transit and shops"],
      rsvpUrl: "#",
    }),
  },

  price_drop_alert: {
    slug: "price_drop_alert",
    displayName: "Price Drop Alert",
    description: "Notification when a property the contact was interested in drops in price.",
    icon: "📉",
    category: "event",
    sampleSubject: "Price Reduced: 3456 W 4th Ave — Now $849,000",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      address: "3456 W 4th Ave, Kitsilano",
      originalPrice: "$899,000",
      newPrice: "$849,000",
      savings: "$50,000",
      percentOff: "5.6%",
      daysOnMarket: 28,
      message: "A property you viewed just dropped in price. This could be the opportunity you've been waiting for.",
      ctaText: "View Updated Listing",
      ctaUrl: "#",
    }),
  },

  premium_listing: {
    slug: "premium_listing",
    displayName: "Premium Listing Showcase",
    description: "Featured high-value property with photo gallery and detailed features.",
    icon: "💎",
    category: "event",
    sampleSubject: "Exclusive: Stunning Kitsilano Home — $2,195,000",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      address: "4120 W 2nd Ave",
      cityStatePostal: "Kitsilano, Vancouver BC V6K 1K5",
      price: "$2,195,000",
      beds: 4,
      baths: 3,
      sqft: "2,847",
      propertyType: "Detached",
      heroPhoto: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=600&fit=crop&q=90",
      headline: "Modern West Coast Living at Its Finest",
      description: "This stunning 4-bedroom home combines contemporary design with the natural beauty of Kitsilano. Floor-to-ceiling windows, chef's kitchen, and a private rooftop deck with ocean views.",
      features: ["Chef's kitchen with Sub-Zero & Wolf", "Rooftop deck with ocean views", "Heated floors throughout", "EV charging", "Smart home system"],
    }),
  },

  buyer_guide: {
    slug: "buyer_guide",
    displayName: "First-Time Buyer Guide",
    description: "Step-by-step guide for first-time home buyers.",
    icon: "📚",
    category: "event",
    sampleSubject: "Your Step-by-Step Home Buying Guide",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "David",
      title: "Your Home Buying Journey — Step by Step",
      intro: "Buying your first home is exciting! Here's a clear roadmap to help you navigate every step with confidence.",
      steps: [
        { stepNumber: 1, title: "Get Pre-Approved", description: "Talk to a mortgage broker to understand your budget and lock in your rate." },
        { stepNumber: 2, title: "Define Your Must-Haves", description: "List your non-negotiables: neighbourhood, bedrooms, parking, schools." },
        { stepNumber: 3, title: "Start Viewing Homes", description: "I'll set up showings based on your criteria. Most buyers see 5-10 homes before making an offer." },
        { stepNumber: 4, title: "Make an Offer", description: "When you find the one, we'll prepare a competitive offer with the right subjects." },
        { stepNumber: 5, title: "Close the Deal", description: "Inspections, financing, and lawyer — I'll guide you through every step to closing day." },
      ],
      tip: "Tip: Getting pre-approved BEFORE you start viewing puts you in a much stronger position when it's time to make an offer.",
      ctaText: "Book a Free Consultation",
      ctaUrl: "#",
    }),
  },

  community_event: {
    slug: "community_event",
    displayName: "Community Event",
    description: "Local community event invitation or announcement.",
    icon: "🎪",
    category: "event",
    sampleSubject: "You're Invited: Kitsilano Farmers Market Opening",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      eventName: "Kitsilano Farmers Market — Season Opening",
      eventDate: "Saturday, May 17, 2026",
      eventTime: "10:00 AM – 2:00 PM",
      location: "Kitsilano Community Centre, 2690 Larch St",
      description: "The Kits Farmers Market is back for the summer season! Fresh local produce, artisan goods, live music, and community fun.",
      whyAttend: ["Fresh local produce and baked goods", "Artisan crafts and live music", "Kids activities and food trucks", "Meet your neighbours!"],
      ctaText: "Learn More",
      rsvpUrl: "#",
    }),
  },

  client_testimonial: {
    slug: "client_testimonial",
    displayName: "Client Testimonial",
    description: "Social proof from a satisfied client with their review.",
    icon: "⭐",
    category: "event",
    sampleSubject: "What Our Clients Are Saying",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      testimonial: {
        quote: "Working with this team was an absolute dream. They found us the perfect home in Kitsilano within 3 weeks and negotiated $30K under asking. Professional, responsive, and genuinely caring.",
        clientName: "Michael & Jessica Chen",
        clientRole: "First-time buyers, Kitsilano",
      },
      message: "Real stories from real clients. We're proud of every family we've helped find their perfect home.",
      ctaText: "Start Your Journey",
      ctaUrl: "#",
    }),
  },

  home_value_update: {
    slug: "home_value_update",
    displayName: "Home Value Update",
    description: "Property valuation estimate with comparable sales data.",
    icon: "💰",
    category: "event",
    sampleSubject: "Your Home Value Update — Good News!",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Linda",
      address: "1250 W 6th Ave, Vancouver",
      currentValue: "$1,050,000",
      previousValue: "$985,000",
      changeAmount: "+$65,000",
      changePercent: "+6.6%",
      comparables: [
        { address: "1180 W 6th Ave", price: "$1,070,000", sqft: "1,650" },
        { address: "1320 W 7th Ave", price: "$1,025,000", sqft: "1,580" },
        { address: "1450 W 5th Ave", price: "$1,095,000", sqft: "1,720" },
      ],
      message: "Great news — your home's estimated value has increased! Here's a detailed comparison with recent sales in your neighbourhood.",
      ctaText: "Request a Detailed CMA",
      ctaUrl: "#",
    }),
  },

  mortgage_renewal: {
    slug: "mortgage_renewal",
    displayName: "Mortgage Renewal Alert",
    description: "Reminder about upcoming mortgage renewal with current rate comparison.",
    icon: "🏦",
    category: "event",
    sampleSubject: "Your Mortgage Renewal Is Coming Up — 6 Months Away",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "William",
      renewalDate: "October 15, 2026",
      monthsRemaining: 6,
      currentRate: "4.79%",
      marketRate: "4.29%",
      potentialSavings: "$187/month",
      tips: [
        "Start shopping rates 120 days before renewal",
        "Consider a mortgage broker for best rates",
        "Check if your penalty allows early renewal",
        "Review fixed vs variable for your situation",
      ],
      ctaText: "Connect with a Mortgage Specialist",
      ctaUrl: "#",
    }),
  },

  year_in_review: {
    slug: "year_in_review",
    displayName: "Year in Review",
    description: "Annual real estate market summary with key statistics and outlook.",
    icon: "📅",
    category: "event",
    sampleSubject: "2025 Year in Review — Real Estate Highlights",
    sampleProps: (branding) => ({
      ...defaultBranding(branding),
      recipientName: "Sarah",
      year: "2025",
      stats: [
        { label: "Homes Sold", value: "42" },
        { label: "Average Sale Price", value: "$1,180,000" },
        { label: "Average Days on Market", value: "16" },
        { label: "Client Satisfaction", value: "4.9/5" },
      ],
      highlights: [
        "Helped 42 families find their dream homes",
        "Kitsilano was the hottest market — up 8.2%",
        "Average seller got 102% of asking price",
        "Expanded to serve North Vancouver and Burnaby",
      ],
      marketSummary: "2025 was a strong year for Vancouver real estate. Inventory remained tight, pushing prices up 5.4% overall. Kitsilano and Mount Pleasant led the way.",
      outlook: "2026 is looking promising with new transit infrastructure and steady demand. It's a great time to consider your next move.",
      ctaText: "Plan Your 2026 Move",
      ctaUrl: "#",
    }),
  },
};

/**
 * Maps emailType used in JOURNEY_SCHEDULES to the component import name.
 * WelcomeDrip is a special case — it doesn't use BaseLayout.
 */
export const EMAIL_TYPE_TO_COMPONENT: Record<string, string> = {
  welcome: "__block_system__",
  neighbourhood_guide: "NeighbourhoodGuide",
  new_listing_alert: "NewListingAlert",
  market_update: "MarketUpdate",
  closing_checklist: "ClosingReminder",
  inspection_reminder: "InspectionReminder",
  closing_countdown: "ClosingReminder",
  home_anniversary: "HomeAnniversary",
  referral_ask: "ReferralThankYou",
  reengagement: "MarketUpdate",
  just_sold: "JustSold",
  open_house_invite: "OpenHouseInvite",
  price_drop_alert: "PriceDropAlert",
  premium_listing: "PremiumListingShowcase",
  buyer_guide: "BuyerGuide",
  community_event: "CommunityEvent",
  client_testimonial: "ClientTestimonial",
  home_value_update: "HomeValueUpdate",
  mortgage_renewal: "MortgageRenewalAlert",
  year_in_review: "YearInReview",
};
