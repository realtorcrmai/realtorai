/**
 * Email Builder — Assembles email HTML from modular blocks
 *
 * Uses the same design patterns as the React Email blocks but outputs
 * raw HTML strings (server-action compatible, no JSX rendering needed).
 *
 * Brand config applied to all emails. CASL/CAN-SPAM compliant footer always included.
 */

type BrandConfig = {
  primaryColor?: string;
  accentColor?: string;
  logoText?: string;
  realtorName?: string;
  realtorTitle?: string;
  brokerage?: string;
  phone?: string;
  website?: string;
  address?: string;
};

const DEFAULT_BRAND: BrandConfig = {
  primaryColor: "#4f35d2",
  accentColor: "#6c4fe6",
  logoText: "ListingFlow",
  realtorName: "Your Realtor",
  realtorTitle: "REALTOR®",
  brokerage: "",
  phone: "",
  website: "",
  address: "",
};

/**
 * Build a complete email from blocks.
 */
export function buildEmail(options: {
  brand?: Partial<BrandConfig>;
  firstName: string;
  intro: string;
  bullets?: string[];
  ctaText?: string;
  ctaUrl?: string;
  listings?: Array<{
    address: string;
    price: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    photoUrl?: string;
  }>;
  stats?: Array<{ value: string; label: string; change?: string }>;
  signoff?: string;
  contactId?: string;
}): string {
  const b = { ...DEFAULT_BRAND, ...options.brand };
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const unsubUrl = `${appUrl}/api/newsletters/unsubscribe${options.contactId ? `?id=${options.contactId}` : ""}`;

  let body = "";

  // Intro text
  body += `<p style="font-size:16px;color:#1a1535;margin:0 0 12px;font-family:system-ui,-apple-system,sans-serif;">Hi ${options.firstName},</p>`;
  body += `<p style="font-size:15px;color:#3a3a5c;line-height:1.6;margin:0 0 16px;font-family:system-ui,-apple-system,sans-serif;">${options.intro}</p>`;

  // Bullets
  if (options.bullets && options.bullets.length > 0) {
    body += `<div style="background:#f6f5ff;border-radius:10px;padding:16px 20px;margin:0 0 20px;">`;
    for (const bullet of options.bullets) {
      body += `<div style="font-size:14px;color:#1a1535;margin:0 0 8px;font-family:system-ui,-apple-system,sans-serif;">&#10003; <strong>${bullet}</strong></div>`;
    }
    body += `</div>`;
  }

  // Stats (3-column)
  if (options.stats && options.stats.length > 0) {
    body += `<table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;"><tr>`;
    for (const stat of options.stats.slice(0, 3)) {
      body += `<td width="30%" style="text-align:center;padding:14px 8px;background:#f6f5ff;border-radius:10px;">`;
      body += `<div style="font-size:24px;font-weight:700;color:#1a1535;margin:0;font-family:system-ui,sans-serif;">${stat.value}</div>`;
      body += `<div style="font-size:11px;color:#6b6b8d;margin:4px 0 0;text-transform:uppercase;letter-spacing:0.5px;font-family:system-ui,sans-serif;">${stat.label}</div>`;
      if (stat.change) {
        const color = stat.change.startsWith("+") ? "#059669" : "#dc2626";
        body += `<div style="font-size:12px;font-weight:600;color:${color};margin:2px 0 0;font-family:system-ui,sans-serif;">${stat.change}</div>`;
      }
      body += `</td><td width="3%"></td>`;
    }
    body += `</tr></table>`;
  }

  // Listing cards
  if (options.listings && options.listings.length > 0) {
    for (const listing of options.listings) {
      body += `<div style="border:1px solid #e8e5f5;border-radius:10px;overflow:hidden;margin-bottom:12px;">`;
      if (listing.photoUrl) {
        body += `<img src="${listing.photoUrl}" alt="${listing.address}" width="100%" style="display:block;width:100%;height:auto;" />`;
      }
      body += `<div style="padding:12px 16px;">`;
      body += `<div style="font-size:15px;font-weight:600;color:#1a1535;margin:0 0 2px;font-family:system-ui,sans-serif;">${listing.address}</div>`;
      body += `<div style="font-size:18px;font-weight:700;color:${b.primaryColor};margin:0 0 4px;font-family:system-ui,sans-serif;">${listing.price}</div>`;
      const details = [
        listing.beds ? `${listing.beds} BD` : null,
        listing.baths ? `${listing.baths} BA` : null,
        listing.sqft ? `${listing.sqft.toLocaleString()} sqft` : null,
      ].filter(Boolean).join(" · ");
      if (details) {
        body += `<div style="font-size:13px;color:#6b6b8d;margin:0;font-family:system-ui,sans-serif;">${details}</div>`;
      }
      body += `</div></div>`;
    }
  }

  // CTA button
  if (options.ctaText) {
    body += `<div style="text-align:center;margin:20px 0;">`;
    body += `<a href="${options.ctaUrl || "#"}" style="display:inline-block;background:linear-gradient(135deg,${b.primaryColor},${b.accentColor});color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;font-family:system-ui,-apple-system,sans-serif;">${options.ctaText}</a>`;
    body += `</div>`;
  }

  // Signoff
  body += `<p style="font-size:15px;color:#3a3a5c;margin:24px 0 0;font-family:system-ui,-apple-system,sans-serif;">${options.signoff || "Best regards,"}<br><strong>${b.realtorName}</strong>`;
  if (b.realtorTitle) body += `<br><span style="font-size:13px;color:#6b6b8d;">${b.realtorTitle}${b.brokerage ? ` · ${b.brokerage}` : ""}</span>`;
  if (b.phone) body += `<br><span style="font-size:13px;color:#6b6b8d;">${b.phone}</span>`;
  body += `</p>`;

  // Wrap in full email template
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light dark"><style>@media(prefers-color-scheme:dark){.email-bg{background:#1a1535!important}.email-card{background:#2a2555!important}}</style></head><body style="margin:0;padding:20px 0;background:#f6f5ff;font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;" class="email-bg">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(79,53,210,0.06);" class="email-card">
<div style="padding:28px 32px 20px;text-align:center;"><h1 style="font-size:22px;font-weight:700;color:${b.primaryColor};margin:0;">${b.logoText}</h1></div>
<div style="padding:0 32px 24px;">${body}</div>
<hr style="border-color:#e8e5f5;margin:0;">
<div style="padding:16px 32px 24px;text-align:center;">
${b.brokerage ? `<p style="font-size:12px;color:#6b6b8d;margin:0 0 2px;font-family:system-ui,sans-serif;">${b.realtorName} · ${b.brokerage}</p>` : ""}
${b.address ? `<p style="font-size:11px;color:#a0a0b0;margin:0 0 8px;font-family:system-ui,sans-serif;">${b.address}</p>` : ""}
<p style="font-size:11px;color:#a0a0b0;margin:0;font-family:system-ui,sans-serif;"><a href="${unsubUrl}" style="color:#a0a0b0;text-decoration:underline;">Unsubscribe</a></p>
</div></div></body></html>`;
}

/**
 * Build a welcome email for a new contact.
 */
export function buildWelcomeEmail(options: {
  firstName: string;
  contactType: "buyer" | "seller";
  area?: string;
  budget?: string;
  brand?: Partial<BrandConfig>;
  contactId?: string;
}): { subject: string; html: string } {
  const isBuyer = options.contactType === "buyer";
  const area = options.area || "Vancouver";

  const subject = isBuyer
    ? `Welcome ${options.firstName}! Let's Find Your Dream Home`
    : `Welcome ${options.firstName}! Let's Get Your Home Sold`;

  const intro = isBuyer
    ? `Welcome! I'm excited to help you find your perfect home${area !== "Vancouver" ? ` in ${area}` : ""}. ${options.budget ? `With your budget of ${options.budget}, there are some great options available right now.` : "Let me know your preferences and I'll start matching you with properties."}`
    : `Welcome! I'm looking forward to helping you sell your property${area !== "Vancouver" ? ` in ${area}` : ""}. I'll prepare a comprehensive market analysis so we can price it right and get you the best result.`;

  const bullets = isBuyer
    ? [
        "New listing alerts matching your criteria",
        `Market updates for ${area}`,
        "Neighbourhood guides — schools, amenities, lifestyle",
        "Expert advice throughout your buying journey",
      ]
    : [
        "Free market analysis of your property",
        "Marketing plan to maximize exposure",
        "Weekly updates on showings and feedback",
        "Expert negotiation to get you the best price",
      ];

  const html = buildEmail({
    brand: options.brand,
    firstName: options.firstName,
    intro,
    bullets,
    ctaText: isBuyer ? "View Available Listings" : "Get Your Free CMA",
    ctaUrl: "#",
    contactId: options.contactId,
  });

  return { subject, html };
}

/**
 * Build a listing alert email.
 */
export function buildListingAlertEmail(options: {
  firstName: string;
  intro: string;
  listings: Array<{
    address: string;
    price: string;
    beds?: number;
    baths?: number;
    sqft?: number;
    photoUrl?: string;
  }>;
  brand?: Partial<BrandConfig>;
  contactId?: string;
}): { html: string } {
  const html = buildEmail({
    brand: options.brand,
    firstName: options.firstName,
    intro: options.intro,
    listings: options.listings,
    ctaText: "View All Listings",
    ctaUrl: "#",
    contactId: options.contactId,
  });

  return { html };
}

/**
 * Build a market update email.
 */
export function buildMarketUpdateEmail(options: {
  firstName: string;
  area: string;
  intro: string;
  stats: Array<{ value: string; label: string; change?: string }>;
  recentSales?: Array<{ address: string; price: string }>;
  brand?: Partial<BrandConfig>;
  contactId?: string;
}): { html: string } {
  const html = buildEmail({
    brand: options.brand,
    firstName: options.firstName,
    intro: options.intro,
    stats: options.stats,
    listings: options.recentSales?.map((s) => ({ address: s.address, price: s.price })),
    ctaText: "Full Market Report",
    ctaUrl: "#",
    contactId: options.contactId,
  });

  return { html };
}
