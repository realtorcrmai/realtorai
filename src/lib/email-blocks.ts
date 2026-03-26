/**
 * Email Block System — Apple-quality modular email builder
 *
 * Each block is a function that returns an HTML string.
 * Templates are assembled by picking blocks based on email type + available data.
 *
 * Usage:
 *   const html = assembleEmail("listing_alert", { listing, contact, agent, content });
 */

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type EmailData = {
  contact: { name: string; firstName: string; type: string };
  agent: { name: string; brokerage: string; phone: string; initials?: string };
  content: { subject: string; intro: string; body: string; ctaText: string; ctaUrl?: string };
  listing?: {
    address: string; area: string; price: string | number;
    beds?: number; baths?: number; sqft?: string; year?: number;
    photos?: string[]; features?: { icon: string; title: string; desc: string }[];
    openHouseDate?: string; openHouseTime?: string;
  };
  market?: {
    avgPrice?: string; avgDom?: number; inventoryChange?: string;
    recentSales?: { address: string; price: string; dom: number }[];
    priceComparison?: { listing: string; average: string; diff: string };
  };
  anniversary?: {
    purchasePrice?: string; currentEstimate?: string; appreciation?: string; equityGained?: string;
    areaHighlights?: { icon: string; text: string }[];
  };
};

type BlockFn = (data: EmailData) => string;

// ═══════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════

const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Inter','Helvetica Neue',sans-serif";

// ═══════════════════════════════════════════════
// BLOCKS
// ═══════════════════════════════════════════════

const blocks: Record<string, BlockFn> = {

  header: (d) => `
    <tr><td style="padding:20px 32px 16px;">
      <table width="100%"><tr>
        <td><span style="font-size:15px;font-weight:700;color:#1d1d1f;letter-spacing:-0.3px;">ListingFlow</span></td>
        <td align="right"><span style="font-size:11px;color:#86868b;letter-spacing:0.5px;text-transform:uppercase;">${d.content.subject.includes("Welcome") ? "Welcome" : d.listing ? "New Listing" : "Update"}</span></td>
      </tr></table>
    </td></tr>`,

  heroImage: (d) => {
    const photo = d.listing?.photos?.[0];
    if (!photo) return "";
    return `
    <tr><td style="padding:0 16px;">
      <div style="border-radius:16px;overflow:hidden;position:relative;">
        <img src="${photo}" alt="${d.listing?.address}" width="568" style="display:block;width:100%;height:auto;">
        <div style="position:absolute;bottom:0;left:0;right:0;padding:32px 28px 24px;background:linear-gradient(0deg,rgba(0,0,0,0.65),transparent);">
          <div style="font-size:13px;color:rgba(255,255,255,0.7);font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">Just Listed</div>
          <div style="font-size:32px;font-weight:700;color:#fff;margin-top:4px;letter-spacing:-0.5px;">${d.listing?.address}</div>
          <div style="font-size:15px;color:rgba(255,255,255,0.8);margin-top:4px;">${d.listing?.area || ""}</div>
        </div>
      </div>
    </td></tr>`;
  },

  heroGradient: (d) => {
    const isAnniversary = !!d.anniversary;
    const bg = isAnniversary
      ? "linear-gradient(135deg,#5856d6 0%,#af52de 50%,#ff6b6b 100%)"
      : "linear-gradient(135deg,#1d1d1f 0%,#2c2c2e 100%)";
    const emoji = isAnniversary ? '<div style="font-size:48px;margin-bottom:8px;">🎉</div>' : "";
    return `
    <tr><td style="padding:0 16px;">
      <div style="background:${bg};border-radius:16px;padding:40px 28px;text-align:center;">
        ${emoji}
        <div style="font-size:32px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${d.content.subject}</div>
        <div style="font-size:15px;color:rgba(255,255,255,0.7);margin-top:8px;">${d.listing?.area || d.contact.firstName + "'s update"}</div>
      </div>
    </td></tr>`;
  },

  priceBar: (d) => {
    if (!d.listing) return "";
    const price = typeof d.listing.price === "number" ? `$${d.listing.price.toLocaleString()}` : d.listing.price;
    return `
    <tr><td style="padding:20px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
          <div style="font-size:28px;font-weight:800;color:#1d1d1f;letter-spacing:-1px;">${price}</div>
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">List Price</div>
        </td>
        <td width="12"></td>
        <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
          <div style="font-size:22px;font-weight:700;color:#1d1d1f;">${d.listing.beds || "—"}<span style="font-size:13px;color:#86868b;font-weight:500;"> bd</span> · ${d.listing.baths || "—"}<span style="font-size:13px;color:#86868b;font-weight:500;"> ba</span></div>
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">${d.listing.sqft || "—"} sqft${d.listing.year ? " · " + d.listing.year : ""}</div>
        </td>
      </tr></table>
    </td></tr>`;
  },

  personalNote: (d) => `
    <tr><td style="padding:24px 32px 0;">
      <p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:0;">Hi ${d.contact.firstName}, ${d.content.intro}</p>
      ${d.content.body ? `<p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:16px 0 0;">${d.content.body}</p>` : ""}
    </td></tr>`,

  featureList: (d) => {
    const features = d.listing?.features;
    if (!features?.length) return "";
    return `
    <tr><td style="padding:24px 32px 0;">
      ${features.map(f => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr>
          <td width="44" style="vertical-align:top;padding-top:2px;"><div style="width:36px;height:36px;background:#f5f5f7;border-radius:10px;text-align:center;line-height:36px;font-size:16px;">${f.icon}</div></td>
          <td style="padding-left:12px;"><div style="font-size:14px;font-weight:600;color:#1d1d1f;">${f.title}</div><div style="font-size:13px;color:#86868b;margin-top:1px;">${f.desc}</div></td>
        </tr>
      </table>`).join("")}
    </td></tr>`;
  },

  photoGallery: (d) => {
    const photos = d.listing?.photos;
    if (!photos || photos.length < 2) return "";
    const grid = photos.slice(0, 4);
    return `
    <tr><td style="padding:24px 16px 0;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="49%" style="padding:4px;"><img src="${grid[0]}" width="100%" style="display:block;border-radius:12px;"></td>
        <td width="2%"></td>
        <td width="49%" style="padding:4px;"><img src="${grid[1]}" width="100%" style="display:block;border-radius:12px;"></td>
      </tr>${grid.length > 2 ? `<tr>
        <td width="49%" style="padding:4px;"><img src="${grid[2]}" width="100%" style="display:block;border-radius:12px;"></td>
        <td width="2%"></td>
        <td width="49%" style="padding:4px;"><img src="${grid[3] || grid[2]}" width="100%" style="display:block;border-radius:12px;"></td>
      </tr>` : ""}</table>
    </td></tr>`;
  },

  statsRow: (d) => {
    if (!d.market) return "";
    return `
    <tr><td style="padding:20px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
          <div style="font-size:24px;font-weight:800;color:#1d1d1f;">${d.market.avgPrice || "—"}</div>
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Avg Price</div>
        </td>
        <td width="8"></td>
        <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
          <div style="font-size:24px;font-weight:800;color:#1d1d1f;">${d.market.avgDom || "—"}</div>
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Avg DOM</div>
        </td>
        <td width="8"></td>
        <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
          <div style="font-size:24px;font-weight:800;color:#1d1d1f;">${d.market.inventoryChange || "—"}</div>
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Inventory</div>
        </td>
      </tr></table>
    </td></tr>`;
  },

  recentSales: (d) => {
    const sales = d.market?.recentSales;
    if (!sales?.length) return "";
    return `
    <tr><td style="padding:24px 32px 0;">
      <div style="font-size:12px;font-weight:700;color:#1d1d1f;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">Recent Sales</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${sales.map(s => `<tr style="border-bottom:1px solid #f0f0f0;">
          <td style="padding:10px 0;font-size:14px;font-weight:500;color:#1d1d1f;">${s.address}</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1d1d1f;text-align:right;">${s.price}</td>
          <td style="padding:10px 0;font-size:12px;color:#86868b;text-align:right;width:60px;">${s.dom}d</td>
        </tr>`).join("")}
      </table>
    </td></tr>`;
  },

  priceComparison: (d) => {
    const pc = d.market?.priceComparison;
    if (!pc) return "";
    return `
    <tr><td style="padding:24px 32px 0;">
      <div style="background:#f0fdf4;border-radius:14px;padding:16px 20px;">
        <table width="100%"><tr>
          <td style="text-align:center;"><div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;">This Listing</div><div style="font-size:22px;font-weight:700;color:#15803d;">${pc.listing}</div></td>
          <td width="1" style="background:#d1fae5;"></td>
          <td style="text-align:center;"><div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;">Area Average</div><div style="font-size:22px;font-weight:700;color:#1d1d1f;">${pc.average}</div></td>
          <td width="1" style="background:#d1fae5;"></td>
          <td style="text-align:center;"><div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;">Difference</div><div style="font-size:22px;font-weight:700;color:#15803d;">${pc.diff}</div></td>
        </tr></table>
      </div>
    </td></tr>`;
  },

  openHouse: (d) => {
    if (!d.listing?.openHouseDate) return "";
    return `
    <tr><td style="padding:24px 32px 0;">
      <div style="background:linear-gradient(135deg,#f5f0ff,#fef3f2);border-radius:14px;padding:20px;text-align:center;border:1px solid rgba(128,90,213,0.1);">
        <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Open House</div>
        <div style="font-size:20px;font-weight:700;color:#1d1d1f;margin-top:6px;">${d.listing.openHouseDate}</div>
        ${d.listing.openHouseTime ? `<div style="font-size:16px;color:#6e6e73;margin-top:2px;">${d.listing.openHouseTime}</div>` : ""}
      </div>
    </td></tr>`;
  },

  anniversaryComparison: (d) => {
    if (!d.anniversary) return "";
    return `
    <tr><td style="padding:24px 32px 0;">
      <div style="background:#f0fdf4;border-radius:14px;padding:20px;">
        <table width="100%"><tr>
          <td style="text-align:center;"><div style="font-size:11px;color:#86868b;text-transform:uppercase;">You Paid</div><div style="font-size:22px;font-weight:700;color:#1d1d1f;">${d.anniversary.purchasePrice || "—"}</div></td>
          <td style="text-align:center;font-size:24px;color:#15803d;">→</td>
          <td style="text-align:center;"><div style="font-size:11px;color:#86868b;text-transform:uppercase;">Estimated Now</div><div style="font-size:22px;font-weight:700;color:#15803d;">${d.anniversary.currentEstimate || "—"}</div><div style="font-size:11px;color:#15803d;font-weight:600;">${d.anniversary.equityGained ? "+" + d.anniversary.equityGained : ""} (${d.anniversary.appreciation || ""})</div></td>
        </tr></table>
      </div>
    </td></tr>`;
  },

  areaHighlights: (d) => {
    const highlights = d.anniversary?.areaHighlights;
    if (!highlights?.length) return "";
    return `
    <tr><td style="padding:24px 32px 0;">
      <div style="font-size:12px;font-weight:700;color:#1d1d1f;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">What's New in the Area</div>
      ${highlights.map(h => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
        <tr><td width="36"><div style="width:28px;height:28px;background:#f5f5f7;border-radius:8px;text-align:center;line-height:28px;font-size:14px;">${h.icon}</div></td><td style="padding-left:10px;font-size:13px;color:#1d1d1f;line-height:1.5;">${h.text}</td></tr>
      </table>`).join("")}
    </td></tr>`;
  },

  cta: (d) => `
    <tr><td style="padding:28px 32px 0;text-align:center;">
      <a href="${d.content.ctaUrl || "#"}" style="display:inline-block;background:#1d1d1f;color:#fff;padding:16px 48px;border-radius:980px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:-0.2px;">${d.content.ctaText}</a>
    </td></tr>`,

  agentCard: (d) => `
    <tr><td style="padding:32px 32px 0;">
      <table width="100%" style="border-top:1px solid #e5e5ea;padding-top:20px;">
        <tr>
          <td width="48"><div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#5856d6,#ff6b6b);text-align:center;line-height:44px;color:#fff;font-weight:700;font-size:17px;">${d.agent.initials || d.agent.name[0]}</div></td>
          <td style="padding-left:14px;">
            <div style="font-size:15px;font-weight:600;color:#1d1d1f;">${d.agent.name}</div>
            <div style="font-size:13px;color:#86868b;">${d.agent.brokerage}</div>
            <div style="font-size:13px;"><a href="tel:${d.agent.phone}" style="color:#5856d6;text-decoration:none;font-weight:500;">${d.agent.phone}</a></div>
          </td>
        </tr>
      </table>
    </td></tr>`,

  footer: (d) => `
    <tr><td style="padding:24px 32px 20px;text-align:center;">
      <p style="font-size:11px;color:#86868b;margin:0;line-height:1.6;">
        ${d.agent.name} · ${d.agent.brokerage}<br>
        <a href="#" style="color:#86868b;text-decoration:underline;">Unsubscribe</a> · <a href="#" style="color:#86868b;text-decoration:underline;">Privacy</a>
      </p>
    </td></tr>`,
};

// ═══════════════════════════════════════════════
// TEMPLATE DEFINITIONS — which blocks for each email type
// ═══════════════════════════════════════════════

const TEMPLATE_BLOCKS: Record<string, string[]> = {
  listing_alert: ["header", "heroImage", "priceBar", "personalNote", "featureList", "photoGallery", "priceComparison", "openHouse", "cta", "agentCard", "footer"],
  welcome: ["header", "heroGradient", "personalNote", "cta", "agentCard", "footer"],
  market_update: ["header", "heroGradient", "statsRow", "personalNote", "recentSales", "cta", "agentCard", "footer"],
  neighbourhood_guide: ["header", "heroGradient", "personalNote", "areaHighlights", "cta", "agentCard", "footer"],
  home_anniversary: ["header", "heroGradient", "personalNote", "anniversaryComparison", "areaHighlights", "cta", "agentCard", "footer"],
  just_sold: ["header", "heroImage", "priceBar", "personalNote", "cta", "agentCard", "footer"],
  open_house: ["header", "heroGradient", "heroImage", "priceBar", "personalNote", "featureList", "openHouse", "cta", "agentCard", "footer"],
  seller_report: ["header", "heroGradient", "statsRow", "personalNote", "recentSales", "cta", "agentCard", "footer"],
  cma_preview: ["header", "heroGradient", "personalNote", "priceComparison", "recentSales", "cta", "agentCard", "footer"],
  re_engagement: ["header", "heroGradient", "personalNote", "statsRow", "cta", "agentCard", "footer"],
};

// ═══════════════════════════════════════════════
// ASSEMBLER — builds full email HTML from blocks
// ═══════════════════════════════════════════════

export function assembleEmail(emailType: string, data: EmailData): string {
  const blockList = TEMPLATE_BLOCKS[emailType] || TEMPLATE_BLOCKS.welcome;

  const renderedBlocks = blockList
    .map(blockName => {
      const fn = blocks[blockName];
      return fn ? fn(data) : "";
    })
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<style>
  @media(prefers-color-scheme:dark){
    .email-body{background:#111!important}
    .email-card{background:#1c1c1e!important}
  }
  @media(max-width:600px){
    .photo-grid td{display:block!important;width:100%!important;padding:2px 0!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:${FONT};-webkit-font-smoothing:antialiased;" class="email-body">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f5f5f7;">${data.content.subject} — ${data.content.intro.slice(0, 80)}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;" class="email-body">
<tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" class="email-card">
${renderedBlocks}
</table>
</td></tr>
</table>
</body></html>`;
}

/**
 * Quick helper — build email with minimal input.
 * Used by seed script and workflow engine.
 */
export function buildEmailFromType(
  emailType: string,
  contactName: string,
  contactType: string,
  subject: string,
  bodyText: string,
  ctaText: string = "View Details",
): string {
  return assembleEmail(emailType, {
    contact: { name: contactName, firstName: contactName.split(" ")[0], type: contactType },
    agent: { name: "Kunal", brokerage: "RE/MAX City Realty", phone: "604-555-0123", initials: "K" },
    content: { subject, intro: bodyText, body: "", ctaText },
  });
}
