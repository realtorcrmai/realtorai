/**
 * Email Block System — Apple-quality modular email builder
 *
 * Each block is a function that returns an HTML string.
 * Templates are assembled by picking blocks based on email type + available data.
 * Journey-aware: pass journeyPhase to select the right block layout per lifecycle stage.
 *
 * Usage:
 *   const html = assembleEmail("listing_alert", data);
 *   const html = assembleEmail("listing_alert", data, undefined, "active", 85); // journey-aware + high-intent banner
 */

import { THEMES, getDefaultTheme, EmailTheme } from "./email-design-tokens";

// ═══════════════════════════════════════════════
// XSS ESCAPE HELPER
// ═══════════════════════════════════════════════

/** Escape user-controlled strings before interpolating into HTML. */
function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Convert markdown bold (**text**) to HTML <strong> tags. Must run AFTER esc(). */
function mdBold(s: string): string {
  return s.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
}

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type EmailData = {
  contact: { name: string; firstName: string; type: string };
  agent: { name: string; brokerage: string; phone: string; email?: string; title?: string; initials?: string; headshotUrl?: string; brandColor?: string; socialLinks?: { instagram?: string; facebook?: string; linkedin?: string } };
  content: { subject: string; intro: string; body: string; ctaText: string; ctaUrl?: string };
  unsubscribeUrl?: string;
  physicalAddress?: string;
  listing?: {
    address: string; area: string; price: string | number;
    beds?: number; baths?: number; sqft?: string; year?: number;
    photos?: string[]; features?: { icon: string; title: string; desc: string }[];
    openHouseDate?: string; openHouseTime?: string;
  };
  listings?: { address: string; price: string | number; beds?: number; baths?: number; sqft?: string; photo?: string }[];
  market?: {
    avgPrice?: string; avgDom?: number; inventoryChange?: string;
    recentSales?: { address: string; price: string; dom: number }[];
    priceComparison?: { listing: string; average: string; diff: string };
  };
  anniversary?: {
    purchasePrice?: string; currentEstimate?: string; appreciation?: string; equityGained?: string;
    areaHighlights?: { icon: string; text: string }[];
  };
  testimonial?: { quote: string; name: string; role?: string };
  mortgageCalc?: { monthly: string; downPayment?: string; rate?: string; details?: string };
  countdown?: { value: string; label?: string; subtext?: string };
  mapPreview?: { imageUrl: string; caption?: string };
  videoThumbnail?: { thumbnailUrl: string; videoUrl?: string };
  socialProof?: { headline?: string; text: string; stats?: { value: string; label: string }[] };
  welcomeHero?: { headshotUrl?: string; tagline?: string };
  valueProps?: Array<{ icon: string; title: string; description: string }>;
};

type Branding = { name: string; brokerage?: string; phone?: string; initials?: string };
type BlockFn = (data: EmailData, branding?: Branding) => string;

// ═══════════════════════════════════════════════
// SHARED STYLES
// ═══════════════════════════════════════════════

const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Inter','Helvetica Neue',sans-serif";

// ═══════════════════════════════════════════════
// BLOCKS
// ═══════════════════════════════════════════════

const blocks: Record<string, BlockFn> = {

  header: (d, branding) => `
    <tr><td style="padding:20px 32px 16px;">
      <table width="100%"><tr>
        <td><span style="font-size:15px;font-weight:700;color:#1d1d1f;letter-spacing:-0.3px;">${esc(branding?.name ?? 'Your Agent')}</span></td>
        <td align="right"><span style="font-size:11px;color:#86868b;letter-spacing:0.5px;text-transform:uppercase;">${(d as any)._emailType === "welcome" ? "Welcome" : d.content.subject.includes("Welcome") ? "Welcome" : d.listing ? "New Listing" : "Update"}</span></td>
      </tr></table>
    </td></tr>`,

  luxuryHeader: (d) => {
    const agentName = esc(d.agent.name);
    const brokerage = esc(d.agent.brokerage);
    return `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:32px 48px 24px;text-align:center;border-bottom:1px solid #e8e8e8">
      <p style="font:500 11px/1 -apple-system,sans-serif;letter-spacing:0.12em;text-transform:uppercase;color:#6b6b6b;margin:0">
        ${agentName} &nbsp;&middot;&nbsp; ${brokerage || "Real Estate"}
      </p>
    </td>
  </tr>
</table>`;
  },

  priorityBookingBanner: (d) => {
    const url = d.content.ctaUrl || "#";
    return `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:#1a1a1a;padding:14px 32px;text-align:center">
      <p style="font:600 13px/1 -apple-system,sans-serif;color:#ffffff;margin:0">
        Based on your interest &#8212; <a href="${url}" style="color:#ffffff;text-decoration:underline">book a showing today</a>
      </p>
    </td>
  </tr>
</table>`;
  },

  heroImage: (d) => {
    const photo = d.listing?.photos?.[0];
    if (!photo) return "";
    return `
    <tr><td style="padding:0 16px;">
      <div style="border-radius:16px;overflow:hidden;position:relative;">
        <img src="${photo}" alt="${esc(d.listing?.address)}" width="568" style="display:block;width:100%;height:auto;">
        <div style="position:absolute;bottom:0;left:0;right:0;padding:32px 28px 24px;background:linear-gradient(0deg,rgba(0,0,0,0.65),transparent);">
          <div style="font-size:13px;color:rgba(255,255,255,0.7);font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">Just Listed</div>
          <div style="font-size:32px;font-weight:700;color:#fff;margin-top:4px;letter-spacing:-0.5px;">${esc(d.listing?.address)}</div>
          <div style="font-size:15px;color:rgba(255,255,255,0.8);margin-top:4px;">${esc(d.listing?.area || "")}</div>
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
        <div style="font-size:32px;font-weight:800;color:#fff;letter-spacing:-0.5px;">${esc(d.content.subject)}</div>
        <div style="font-size:15px;color:rgba(255,255,255,0.7);margin-top:8px;">${esc(d.listing?.area || d.contact.firstName + "'s update")}</div>
      </div>
    </td></tr>`;
  },

  priceBar: (d) => {
    if (!d.listing) return "";
    const isLuxury = (d as EmailData & { _theme?: EmailTheme })._theme === "luxury";
    const price =
      typeof d.listing.price === "number"
        ? `$${d.listing.price.toLocaleString()}`
        : d.listing.price;

    if (isLuxury) {
      const metrics = [
        d.listing.beds ? `${d.listing.beds} Beds` : null,
        d.listing.baths ? `${d.listing.baths} Baths` : null,
        d.listing.sqft ? `${Number(d.listing.sqft).toLocaleString()} sq.ft.` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return `
    <tr><td style="padding:0 48px 8px;">
      ${metrics ? `<p style="font:600 11px/1 -apple-system,sans-serif;letter-spacing:0.08em;color:#6b6b6b;text-transform:uppercase;margin:0 0 8px;">${metrics}</p>` : ""}
      ${price ? `<p style="font:700 32px/1.1 -apple-system,sans-serif;color:#1a1a1a;margin:0 0 32px;letter-spacing:-0.5px;">${price}</p>` : ""}
    </td></tr>`;
    }

    // Standard / editorial — widget style
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
      <p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:0;">Hi ${esc(d.contact.firstName)}, ${mdBold(esc(d.content.intro))}</p>
      ${d.content.body ? `<p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:16px 0 0;">${mdBold(esc(d.content.body))}</p>` : ""}
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
          <td style="padding-left:12px;"><div style="font-size:14px;font-weight:600;color:#1d1d1f;">${esc(f.title)}</div><div style="font-size:13px;color:#86868b;margin-top:1px;">${esc(f.desc)}</div></td>
        </tr>
      </table>`).join("")}
    </td></tr>`;
  },

  // G-E09: Photo grid with fixed aspect-ratio enforcement, up to 10 photos, "View all" link
  photoGallery: (d) => {
    const allPhotos: string[] = d.listing?.photos || [];
    const photos = allPhotos.slice(0, 10);
    if (!photos.length) return "";
    const remaining = allPhotos.length - 10;
    const address = d.listing?.address || "property";
    const ctaUrl = d.content.ctaUrl || "#";

    const rows: string[] = [];
    for (let i = 0; i < photos.length; i += 2) {
      const left = photos[i];
      const right = photos[i + 1];
      const escapedAddress = esc(address);
      rows.push(`
    <tr>
      <td width="49%" style="padding:1px;vertical-align:top">
        <img src="${left}" width="285" height="160" alt="Photo ${i + 1} of ${escapedAddress}" style="display:block;width:100%;height:160px;object-fit:cover;border-radius:4px">
      </td>
      <td width="2%"> </td>
      ${right
        ? `<td width="49%" style="padding:1px;vertical-align:top"><img src="${right}" width="285" height="160" alt="Photo ${i + 2} of ${escapedAddress}" style="display:block;width:100%;height:160px;object-fit:cover;border-radius:4px"></td>`
        : `<td width="49%"> </td>`
      }
    </tr>`);
    }

    return `
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px" class="photo-grid">
  <tbody>
    ${rows.join("\n")}
    ${remaining > 0 ? `
    <tr>
      <td colspan="3" style="padding:12px 0 0;text-align:center">
        <a href="${ctaUrl}" style="font:500 13px/1 -apple-system,sans-serif;color:#6b6b6b;text-decoration:none">
          View all ${allPhotos.length} photos &#8594;
        </a>
      </td>
    </tr>` : ""}
  </tbody>
</table>`;
  },

  statsRow: (d) => {
    if (!d.market) return "";
    return `
    <tr><td style="padding:20px 32px 0;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
          <div style="font-size:24px;font-weight:800;color:#1d1d1f;">${esc(d.market.avgPrice) || "—"}</div>
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Avg Price</div>
        </td>
        <td width="8"></td>
        <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
          <div style="font-size:24px;font-weight:800;color:#1d1d1f;">${d.market.avgDom != null ? esc(String(d.market.avgDom)) : "—"}</div>
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;">Avg DOM</div>
        </td>
        <td width="8"></td>
        <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
          <div style="font-size:24px;font-weight:800;color:#1d1d1f;">${esc(d.market.inventoryChange) || "—"}</div>
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
          <td style="padding:10px 0;font-size:14px;font-weight:500;color:#1d1d1f;">${esc(s.address)}</td>
          <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1d1d1f;text-align:right;">${esc(s.price)}</td>
          <td style="padding:10px 0;font-size:12px;color:#86868b;text-align:right;width:60px;">${esc(String(s.dom))}d</td>
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
          <td style="text-align:center;"><div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;">This Listing</div><div style="font-size:22px;font-weight:700;color:#15803d;">${esc(pc.listing)}</div></td>
          <td width="1" style="background:#d1fae5;"></td>
          <td style="text-align:center;"><div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;">Area Average</div><div style="font-size:22px;font-weight:700;color:#1d1d1f;">${esc(pc.average)}</div></td>
          <td width="1" style="background:#d1fae5;"></td>
          <td style="text-align:center;"><div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;">Difference</div><div style="font-size:22px;font-weight:700;color:#15803d;">${esc(pc.diff)}</div></td>
        </tr></table>
      </div>
    </td></tr>`;
  },

  openHouse: (d) => {
    if (!d.listing?.openHouseDate) return "";
    const isLuxury = (d as EmailData & { _theme?: EmailTheme })._theme === "luxury";

    if (isLuxury) {
      return `
    <tr><td style="padding:0 48px 32px;">
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e8e8e8;border-radius:8px;">
        <tr><td style="padding:20px 24px;">
          <p style="font:600 11px/1 -apple-system,sans-serif;letter-spacing:0.08em;color:#6b6b6b;text-transform:uppercase;margin:0 0 10px;">Open House</p>
          <p style="font:400 15px/1.6 -apple-system,sans-serif;color:#1a1a1a;margin:0;">${d.listing.openHouseDate}${d.listing.openHouseTime ? " · " + d.listing.openHouseTime : ""}</p>
        </td></tr>
      </table>
    </td></tr>`;
    }

    // Standard / editorial — gradient pill style
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
          <td style="text-align:center;font-size:24px;color:#15803d;">&#8594;</td>
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
        <tr><td width="36"><div style="width:28px;height:28px;background:#f5f5f7;border-radius:8px;text-align:center;line-height:28px;font-size:14px;">${h.icon}</div></td><td style="padding-left:10px;font-size:13px;color:#1d1d1f;line-height:1.5;">${esc(h.text)}</td></tr>
      </table>`).join("")}
    </td></tr>`;
  },

  propertyGrid: (d) => {
    const listings = d.listings;
    if (!listings?.length) return "";
    return `
    <tr><td style="padding:24px 16px 0;">
      <div style="font-size:12px;font-weight:700;color:#1d1d1f;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding:0 16px;">Matching Properties</div>
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${listings.slice(0, 3).map(l => `
        <td width="${Math.floor(100 / Math.min(listings.length, 3))}%" style="padding:4px;vertical-align:top;">
          <div style="background:#f5f5f7;border-radius:14px;overflow:hidden;">
            ${l.photo ? `<img src="${l.photo}" width="100%" style="display:block;">` : `<div style="height:120px;background:linear-gradient(135deg,#e5e5ea,#f5f5f7);"></div>`}
            <div style="padding:12px;">
              <div style="font-size:16px;font-weight:700;color:#1d1d1f;">${esc(typeof l.price === "number" ? "$" + l.price.toLocaleString() : l.price)}</div>
              <div style="font-size:12px;color:#86868b;margin-top:2px;">${esc(l.address)}</div>
              <div style="font-size:11px;color:#86868b;">${esc(String(l.beds || "—"))} bd · ${esc(String(l.baths || "—"))} ba${l.sqft ? " · " + esc(l.sqft) + " sqft" : ""}</div>
            </div>
          </div>
        </td>`).join('<td width="2%"></td>')}
      </tr></table>
    </td></tr>`;
  },

  testimonial: (d) => {
    const t = d.testimonial;
    if (!t) return "";
    return `
    <tr><td style="padding:24px 32px 0;">
      <div style="background:#f5f5f7;border-radius:14px;padding:24px;position:relative;">
        <div style="font-size:36px;color:#d1d1d6;line-height:1;margin-bottom:8px;">"</div>
        <p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:0;font-style:italic;">${esc(t.quote)}</p>
        <div style="margin-top:12px;font-size:13px;font-weight:600;color:#1d1d1f;">${esc(t.name)}</div>
        <div style="font-size:12px;color:#86868b;">${esc(t.role || "Client")}</div>
      </div>
    </td></tr>`;
  },

  mortgageCalc: (d) => {
    const mc = d.mortgageCalc;
    if (!mc) return "";
    return `
    <tr><td style="padding:24px 32px 0;">
      <div style="background:linear-gradient(135deg,#f5f0ff,#f0f9ff);border-radius:14px;padding:20px;border:1px solid rgba(88,86,214,0.1);">
        <div style="font-size:12px;font-weight:700;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Estimated Monthly Payment</div>
        <div style="font-size:32px;font-weight:800;color:#5856d6;letter-spacing:-1px;">${mc.monthly}</div>
        <div style="font-size:12px;color:#86868b;margin-top:4px;">${mc.details || "Based on 20% down, 5-year fixed rate"}</div>
        <table width="100%" style="margin-top:12px;" cellpadding="0" cellspacing="0"><tr>
          <td style="font-size:12px;color:#86868b;">Down payment: <strong style="color:#1d1d1f;">${mc.downPayment || "20%"}</strong></td>
          <td style="font-size:12px;color:#86868b;text-align:right;">Rate: <strong style="color:#1d1d1f;">${mc.rate || "4.89%"}</strong></td>
        </tr></table>
      </div>
    </td></tr>`;
  },

  countdown: (d) => {
    const cd = d.countdown;
    if (!cd) return "";
    return `
    <tr><td style="padding:24px 32px 0;">
      <div style="background:linear-gradient(135deg,#fef2f2,#fff7ed);border:1px solid #fecaca;border-radius:14px;padding:20px;text-align:center;">
        <div style="font-size:11px;color:#dc2626;text-transform:uppercase;letter-spacing:2px;font-weight:600;">${cd.label || "Time Remaining"}</div>
        <div style="font-size:48px;font-weight:800;color:#dc2626;margin-top:4px;letter-spacing:-2px;">${cd.value}</div>
        <div style="font-size:13px;color:#92400e;margin-top:4px;">${cd.subtext || ""}</div>
      </div>
    </td></tr>`;
  },

  mapPreview: (d) => {
    const mp = d.mapPreview;
    if (!mp?.imageUrl) return "";
    return `
    <tr><td style="padding:24px 16px 0;">
      <div style="border-radius:16px;overflow:hidden;">
        <img src="${mp.imageUrl}" alt="Location map" width="568" style="display:block;width:100%;height:auto;">
      </div>
      ${mp.caption ? `<div style="text-align:center;padding:8px 32px 0;font-size:12px;color:#86868b;">${esc(mp.caption)}</div>` : ""}
    </td></tr>`;
  },

  videoThumbnail: (d) => {
    const vt = d.videoThumbnail;
    if (!vt?.thumbnailUrl) return "";
    return `
    <tr><td style="padding:24px 16px 0;">
      <a href="${vt.videoUrl || "#"}" style="display:block;position:relative;border-radius:16px;overflow:hidden;">
        <img src="${vt.thumbnailUrl}" alt="Property video" width="568" style="display:block;width:100%;height:auto;">
        <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:64px;height:64px;background:rgba(0,0,0,0.7);border-radius:50%;display:flex;align-items:center;justify-content:center;">
          <div style="width:0;height:0;border-top:12px solid transparent;border-bottom:12px solid transparent;border-left:20px solid #fff;margin-left:4px;"></div>
        </div>
        <div style="position:absolute;bottom:12px;left:12px;background:rgba(0,0,0,0.6);border-radius:6px;padding:4px 10px;font-size:11px;color:#fff;font-weight:500;">&#9654; Watch Property Tour</div>
      </a>
    </td></tr>`;
  },

  socialProof: (d) => {
    const sp = d.socialProof;
    if (!sp) return "";
    return `
    <tr><td style="padding:24px 32px 0;">
      <div style="background:#f5f5f7;border-radius:14px;padding:20px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td width="48" style="vertical-align:top;">
            <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#5856d6,#ff6b6b);text-align:center;line-height:44px;color:#fff;font-weight:700;font-size:17px;">${esc(d.agent.initials || d.agent.name[0])}</div>
          </td>
          <td style="padding-left:14px;">
            <div style="font-size:14px;font-weight:600;color:#1d1d1f;">${esc(sp.headline || d.agent.name + "'s Track Record")}</div>
            <div style="font-size:13px;color:#86868b;margin-top:2px;line-height:1.5;">${esc(sp.text)}</div>
            ${sp.stats ? `<div style="margin-top:8px;display:flex;gap:16px;">${sp.stats.map((s: {value:string;label:string}) => `<span style="font-size:12px;"><strong style="color:#5856d6;">${s.value}</strong> <span style="color:#86868b;">${s.label}</span></span>`).join(" · ")}</div>` : ""}
          </td>
        </tr></table>
      </div>
    </td></tr>`;
  },

  welcomeHero: (d) => {
    const agentName = esc(d.agent.name);
    const brokerage = esc(d.agent.brokerage);
    const title = esc(d.agent.title || "REALTOR®");
    const accent = d.agent.brandColor || "#5856d6";
    const headshotUrl = d.welcomeHero?.headshotUrl || d.agent.headshotUrl;
    const initials = esc(d.agent.initials || d.agent.name.split(" ").map(w => w[0]).join("").slice(0, 2));
    const tagline = esc(d.welcomeHero?.tagline || "Your Real Estate Partner");

    const photoHtml = headshotUrl
      ? `<img src="${headshotUrl}" width="280" height="280" alt="${agentName}" style="display:block;width:280px;height:280px;border-radius:16px;object-fit:cover;margin:0 auto;border:3px solid ${accent};">`
      : `<div style="width:280px;height:280px;border-radius:16px;background:linear-gradient(135deg,${accent},#ff6b6b);text-align:center;line-height:280px;color:#fff;font-weight:700;font-size:80px;margin:0 auto;">${initials}</div>`;

    return `
    <tr><td style="padding:0 16px;">
      <div style="background:linear-gradient(135deg,#1d1d1f 0%,#2c2c2e 50%,#3a3a3c 100%);border-radius:16px;padding:48px 28px;text-align:center;">
        ${photoHtml}
        <div style="font-size:26px;font-weight:700;color:#fff;margin-top:20px;letter-spacing:-0.5px;">${agentName}</div>
        <div style="font-size:12px;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-top:6px;font-weight:500;">${title}</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.5);margin-top:4px;">${brokerage}</div>
        <div style="width:50px;height:2px;background:linear-gradient(90deg,${accent},transparent);margin:20px auto;border-radius:1px;"></div>
        <div style="font-size:16px;color:rgba(255,255,255,0.8);font-style:italic;letter-spacing:-0.2px;line-height:1.5;">${tagline}</div>
      </div>
    </td></tr>`;
  },

  valueProps: (d) => {
    const props = d.valueProps;
    if (!props?.length) return "";
    const accent = d.agent.brandColor || "#5856d6";
    const items = props.slice(0, 3);
    return `
    <tr><td style="padding:32px 32px 0;">
      <div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:2px;margin-bottom:20px;">What I'll Do For You</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${items.map((p: { icon: string; title: string; description: string }) => `
        <tr>
          <td width="4" style="background:${accent};border-radius:2px;"></td>
          <td width="56" style="vertical-align:top;padding:12px 0 12px 14px;">
            <div style="width:48px;height:48px;background:${accent}15;border-radius:14px;text-align:center;line-height:48px;font-size:24px;">${p.icon}</div>
          </td>
          <td style="padding:12px 0 12px 12px;vertical-align:top;">
            <div style="font-size:16px;font-weight:600;color:#1d1d1f;letter-spacing:-0.2px;">${esc(p.title)}</div>
            <div style="font-size:13px;color:#86868b;margin-top:4px;line-height:1.6;">${esc(p.description)}</div>
          </td>
        </tr>
        <tr><td colspan="3" style="height:8px;"></td></tr>`).join("")}
      </table>
    </td></tr>`;
  },

  cta: (d) => {
    const theme = (d as EmailData & { _theme?: EmailTheme })._theme ?? "standard";
    const emailType = (d as any)._emailType;
    const accent = d.agent.brandColor || "#5856d6";
    const url = d.content.ctaUrl || "#";
    const text = d.content.ctaText || "Learn More";
    const bgColor = d.agent.brandColor
      ? d.agent.brandColor
      : theme === "luxury" ? "#1a1a1a" : theme === "editorial" ? "#1a2e1a" : "#4f35d2";
    // For welcome emails, use dark text on gold buttons for better contrast
    const textColor = d.agent.brandColor ? "#0a0a0a" : "#ffffff";
    const phone = d.agent.phone;
    return `
    <tr><td style="padding:8px 48px 0;">
      <div style="width:50px;height:1px;background:linear-gradient(90deg,transparent,#e5e5ea,transparent);margin:0 auto 24px;"></div>
    </td></tr>
    <tr><td style="padding:0 48px ${emailType === "welcome" && phone ? "8px" : "40px"};text-align:center;">
      <a href="${url}" class="email-cta-btn" style="display:inline-block;background:${bgColor};color:${textColor};font:600 16px/1 -apple-system,sans-serif;text-decoration:none;padding:18px 44px;border-radius:10px;letter-spacing:0.2px;">
        ${esc(text)}
      </a>
    </td></tr>${emailType === "welcome" && phone ? `
    <tr><td style="padding:8px 48px 32px;text-align:center;">
      <span style="font-size:13px;color:#86868b;">or call </span><a href="tel:${phone}" style="color:${accent};text-decoration:none;font-size:13px;font-weight:600;">${esc(phone)}</a>
    </td></tr>` : ""}`;
  },

  agentCard: (d) => {
    const headshotUrl = d.agent.headshotUrl;
    const accent = d.agent.brandColor || "#5856d6";
    const photoHtml = headshotUrl
      ? `<img src="${headshotUrl}" width="56" height="56" alt="${esc(d.agent.name)}" style="display:block;width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid ${accent};">`
      : `<div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,${accent},#ff6b6b);text-align:center;line-height:56px;color:#fff;font-weight:700;font-size:21px;">${esc(d.agent.initials || d.agent.name[0])}</div>`;
    const socials = d.agent.socialLinks;
    const socialLinks: string[] = [];
    if (socials?.instagram) socialLinks.push(`<a href="${socials.instagram}" style="color:${accent};text-decoration:none;font-size:12px;">Instagram</a>`);
    if (socials?.facebook) socialLinks.push(`<a href="${socials.facebook}" style="color:${accent};text-decoration:none;font-size:12px;">Facebook</a>`);
    if (socials?.linkedin) socialLinks.push(`<a href="${socials.linkedin}" style="color:${accent};text-decoration:none;font-size:12px;">LinkedIn</a>`);
    return `
    <tr><td style="padding:32px 32px 0;">
      <table width="100%" style="border-top:1px solid #e5e5ea;padding-top:24px;">
        <tr>
          <td width="64">${photoHtml}</td>
          <td style="padding-left:16px;">
            <div style="font-size:16px;font-weight:600;color:#1d1d1f;">${esc(d.agent.name)}</div>
            <div style="font-size:13px;color:#86868b;margin-top:2px;">${esc(d.agent.brokerage)}</div>
            <div style="margin-top:6px;">
              <a href="tel:${d.agent.phone}" style="color:${accent};text-decoration:none;font-size:13px;font-weight:500;">${esc(d.agent.phone)}</a>
              ${d.agent.email ? `<span style="color:#d1d1d6;margin:0 6px;">·</span><a href="mailto:${d.agent.email}" style="color:${accent};text-decoration:none;font-size:13px;">${esc(d.agent.email)}</a>` : ""}
            </div>
            ${socialLinks.length ? `<div style="margin-top:6px;">${socialLinks.join(' <span style="color:#d1d1d6;margin:0 4px;">·</span> ')}</div>` : ""}
          </td>
        </tr>
      </table>
    </td></tr>`;
  },

  footer: (d) => `
    <tr><td style="padding:24px 32px 20px;text-align:center;">
      <p style="font-size:11px;color:#86868b;margin:0;line-height:1.6;">
        ${esc(d.agent.name)} · ${esc(d.agent.brokerage)}<br>
        <a href="${d.unsubscribeUrl ?? '#'}" style="color:#86868b;text-decoration:underline;">Unsubscribe</a> · <a href="#" style="color:#86868b;text-decoration:underline;">Privacy</a>
      </p>
      <p style="font-size:11px;color:#999;text-align:center;margin:4px 0 0">
        ${esc(d.physicalAddress ?? 'Please contact us for our mailing address')}
      </p>
    </td></tr>`,
};

// ═══════════════════════════════════════════════
// TEMPLATE DEFINITIONS — journey-aware block layout mapping (G-E05)
//
// Structure: Record<emailType, Record<journeyPhase | "default", string[]>>
// - Each email type has a "default" phase used when no journey phase is known.
// - Phase-specific variants are selected by assembleEmail() when journeyPhase is passed.
// - All existing block lists are preserved under "default" so existing callers are unaffected.
// ═══════════════════════════════════════════════

const TEMPLATE_BLOCKS: Record<string, Record<string, string[]>> = {
  // G-E05: listing_alert — journey-aware variants
  listing_alert: {
    lead:           ["header", "heroImage", "priceBar", "personalNote", "featureList", "photoGallery", "priceComparison", "cta", "agentCard", "footer"],
    active:         ["header", "heroImage", "priceBar", "openHouse", "photoGallery", "personalNote", "cta", "agentCard", "footer"],
    dormant:        ["header", "heroImage", "personalNote", "cta", "agentCard", "footer"],
    under_contract: ["header", "heroImage", "priceBar", "personalNote", "cta", "agentCard", "footer"],
    past_client:    ["header", "heroImage", "priceBar", "personalNote", "priceComparison", "cta", "agentCard", "footer"],
    default:        ["header", "heroImage", "priceBar", "personalNote", "featureList", "photoGallery", "priceComparison", "mortgageCalc", "openHouse", "cta", "agentCard", "footer"],
  },

  // G-E08: luxury_listing — premium template with luxuryHeader block
  luxury_listing: {
    lead:    ["luxuryHeader", "heroImage", "priceBar", "personalNote", "openHouse", "photoGallery", "agentCard", "footer"],
    active:  ["luxuryHeader", "heroImage", "priceBar", "openHouse", "photoGallery", "personalNote", "cta", "agentCard", "footer"],
    dormant: ["luxuryHeader", "heroImage", "personalNote", "cta", "agentCard", "footer"],
    default: ["luxuryHeader", "heroImage", "priceBar", "personalNote", "openHouse", "photoGallery", "agentCard", "footer"],
  },

  // G-E05: market_update — journey-aware variants
  market_update: {
    lead:    ["header", "heroGradient", "personalNote", "statsRow", "recentSales", "cta", "agentCard", "footer"],
    active:  ["header", "heroGradient", "statsRow", "recentSales", "propertyGrid", "cta", "agentCard", "footer"],
    dormant: ["header", "heroGradient", "personalNote", "cta", "agentCard", "footer"],
    default: ["header", "heroGradient", "statsRow", "personalNote", "recentSales", "propertyGrid", "cta", "agentCard", "footer"],
  },

  // G-E05: home_anniversary — journey-aware variants
  home_anniversary: {
    past_client: ["header", "heroGradient", "personalNote", "anniversaryComparison", "areaHighlights", "cta", "agentCard", "footer"],
    default:     ["header", "heroGradient", "personalNote", "anniversaryComparison", "areaHighlights", "cta", "agentCard", "footer"],
  },

  // All templates — comprehensive block lists for rich visual emails
  welcome: {
    default: ["header", "welcomeHero", "personalNote", "valueProps", "areaHighlights", "cta", "agentCard", "footer"],
  },
  neighbourhood_guide: {
    default: ["header", "heroGradient", "heroImage", "personalNote", "areaHighlights", "propertyGrid", "statsRow", "testimonial", "mapPreview", "cta", "agentCard", "footer"],
  },
  just_sold: {
    default: ["header", "heroImage", "priceBar", "personalNote", "priceComparison", "recentSales", "testimonial", "socialProof", "cta", "agentCard", "footer"],
  },
  open_house: {
    default: ["header", "heroGradient", "heroImage", "priceBar", "personalNote", "featureList", "photoGallery", "mapPreview", "openHouse", "mortgageCalc", "cta", "agentCard", "footer"],
  },
  seller_report: {
    default: ["header", "heroGradient", "statsRow", "personalNote", "recentSales", "priceComparison", "countdown", "testimonial", "cta", "agentCard", "footer"],
  },
  cma_preview: {
    default: ["header", "heroGradient", "personalNote", "priceComparison", "statsRow", "recentSales", "socialProof", "cta", "agentCard", "footer"],
  },
  re_engagement: {
    default: ["header", "heroGradient", "heroImage", "personalNote", "statsRow", "recentSales", "propertyGrid", "mortgageCalc", "testimonial", "cta", "agentCard", "footer"],
  },
  luxury_showcase: {
    default: ["header", "heroImage", "priceBar", "personalNote", "featureList", "photoGallery", "videoThumbnail", "mortgageCalc", "testimonial", "cta", "agentCard", "footer"],
  },
  closing_checklist: {
    default: ["header", "heroGradient", "personalNote", "featureList", "countdown", "testimonial", "cta", "agentCard", "footer"],
  },
  inspection_reminder: {
    default: ["header", "heroGradient", "personalNote", "featureList", "countdown", "cta", "agentCard", "footer"],
  },
  closing_countdown: {
    default: ["header", "heroGradient", "personalNote", "countdown", "statsRow", "featureList", "testimonial", "cta", "agentCard", "footer"],
  },
  mortgage_renewal: {
    default: ["header", "heroGradient", "personalNote", "statsRow", "priceComparison", "mortgageCalc", "featureList", "cta", "agentCard", "footer"],
  },
  referral: {
    default: ["header", "heroGradient", "personalNote", "testimonial", "socialProof", "propertyGrid", "cta", "agentCard", "footer"],
  },
  buyer_guide: {
    default: ["header", "heroGradient", "heroImage", "personalNote", "featureList", "propertyGrid", "mortgageCalc", "statsRow", "testimonial", "cta", "agentCard", "footer"],
  },
  seller_guide: {
    default: ["header", "heroGradient", "personalNote", "statsRow", "recentSales", "priceComparison", "featureList", "testimonial", "cta", "agentCard", "footer"],
  },
};

// ═══════════════════════════════════════════════
// BLOCK SELECTION — journey-phase-aware resolver (G-E05)
// ═══════════════════════════════════════════════

/**
 * Returns the block list for a given email type and optional journey phase.
 * Falls back: phase-specific → "default" → first available phase → welcome.default
 */
function getBlockList(emailType: string, journeyPhase?: string): string[] {
  const typeBlocks = TEMPLATE_BLOCKS[emailType];
  if (!typeBlocks) {
    // Unknown type — fall back to welcome
    return TEMPLATE_BLOCKS["welcome"]?.["default"] ?? [];
  }
  // Try phase-specific first, then default, then first value
  return (
    (journeyPhase ? typeBlocks[journeyPhase] : undefined) ??
    typeBlocks["default"] ??
    Object.values(typeBlocks)[0] ??
    []
  );
}

// ═══════════════════════════════════════════════
// ASSEMBLER — builds full email HTML from blocks
// ═══════════════════════════════════════════════

export function assembleEmail(
  emailType: string,
  data: EmailData,
  themeOverride?: EmailTheme,
  journeyPhase?: string,
  engagementScore?: number,
): string {
  // Select block list based on journey phase (G-E05)
  let blockList = getBlockList(emailType, journeyPhase);

  // High-intent banner: prepend for engaged non-seller contacts with a CTA URL (G-E05).
  // Sellers are excluded — "Book a Showing" is irrelevant for contacts selling a property.
  if (
    (engagementScore ?? 0) >= 70 &&
    data.content.ctaUrl &&
    data.contact.type !== "seller"
  ) {
    blockList = ["priorityBookingBanner", ...blockList];
  }

  // Resolve theme — caller override wins, otherwise derive from email type
  const theme: EmailTheme = themeOverride ?? getDefaultTheme(emailType);
  const tokens = THEMES[theme];

  // Merge CASL-required fields into data so footer block can access them.
  // Also inject _theme and _tokens so theme-aware blocks can branch without
  // changing the public BlockFn signature.
  const enrichedData: EmailData = {
    ...data,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...({ _theme: theme, _tokens: tokens, _emailType: emailType } as any),
  };

  // Derive branding from agent field for blocks that need it (e.g. header)
  const branding: Branding = {
    name: data.agent.name,
    brokerage: data.agent.brokerage,
    phone: data.agent.phone,
    initials: data.agent.initials,
  };

  const renderedBlocks = blockList
    .map(blockName => {
      const fn = blocks[blockName];
      return fn ? fn(enrichedData, branding) : "";
    })
    .filter(Boolean)
    .join("\n");

  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<style>
  @media (prefers-color-scheme: dark) {
    .email-body{background:#111!important}
    .email-card{background:#1c1c1e!important}
    .email-cta-btn{background:#ff5c3a!important;color:#ffffff!important}
  }
  @media(max-width:600px){
    .photo-grid td{display:block!important;width:100%!important;padding:2px 0!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:${FONT};-webkit-font-smoothing:antialiased;" class="email-body">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f5f5f7;">${esc(data.content.subject)} — ${esc(data.content.intro.slice(0, 80))}</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;" class="email-body">
<tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" class="email-card">
${renderedBlocks}
</table>
</td></tr>
</table>
</body></html>`;
}

// Default brand config — used only as last-resort fallback
const DEFAULT_BRAND = { name: "Your Realtor", brokerage: "", phone: "", initials: "R" };

/**
 * Get brand config from DB for the authenticated tenant.
 * Queries realtor_agent_config.brand_config first, then users table as fallback.
 * Caches for 5 minutes per realtorId — keyed to prevent cross-tenant leakage.
 */
// H2: Map<realtorId, cached entry> — prevents one tenant's brand leaking to another
const brandCache = new Map<string, { data: typeof DEFAULT_BRAND; expires: number }>();

export async function getBrandConfig(): Promise<typeof DEFAULT_BRAND> {
  try {
    const { getAuthenticatedTenantClient } = await import("@/lib/supabase/tenant");
    const tc = await getAuthenticatedTenantClient();
    const realtorId = tc.realtorId;
    const supabase = tc.raw;

    // H2: Check cache keyed by realtorId
    const cached = brandCache.get(realtorId);
    if (cached && Date.now() < cached.expires) return cached.data;

    // 1. Try realtor_agent_config.brand_config
    const { data: configRow } = await supabase
      .from("realtor_agent_config")
      .select("brand_config")
      .eq("realtor_id", realtorId)
      .maybeSingle();

    if (configRow?.brand_config) {
      const bc = configRow.brand_config as Record<string, string>;
      if (bc.name) {
        const initials = bc.name
          .split(" ")
          .map((w: string) => w[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        const brand = {
          name: bc.name,
          brokerage: bc.brokerage || DEFAULT_BRAND.brokerage,
          phone: bc.phone || DEFAULT_BRAND.phone,
          initials,
        };
        brandCache.set(realtorId, { data: brand, expires: Date.now() + 300000 });
        return brand;
      }
    }

    // 2. Fallback: users table name + email
    const { data: userRow } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", realtorId)
      .maybeSingle();

    if (userRow?.name) {
      const initials = userRow.name
        .split(" ")
        .map((w: string) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      const brand = {
        name: userRow.name,
        brokerage: DEFAULT_BRAND.brokerage,
        phone: DEFAULT_BRAND.phone,
        initials,
      };
      brandCache.set(realtorId, { data: brand, expires: Date.now() + 300000 });
      return brand;
    }
  } catch {
    // Not authenticated or DB unavailable — fall through to DEFAULT_BRAND
  }
  return DEFAULT_BRAND;
}

/**
 * Quick helper — build email with minimal input.
 * Used by seed script and workflow engine.
 */
export async function buildEmailFromType(
  emailType: string,
  contactName: string,
  contactType: string,
  subject: string,
  bodyText: string,
  ctaText: string = "View Details",
): Promise<string> {
  const brand = await getBrandConfig();
  return assembleEmail(emailType, {
    contact: { name: contactName, firstName: contactName.split(" ")[0], type: contactType },
    agent: brand,
    content: { subject, intro: bodyText, body: "", ctaText },
  });
}

/**
 * Run text pipeline + quality scoring on content before rendering.
 * Used by all send paths except sendNewsletter (which has its own pipeline call).
 * Fails silently — never blocks the caller.
 */
export async function runPreSendChecks(
  subject: string,
  body: string,
  contactId: string,
  contactName: string,
  contactType: string,
  emailType: string,
): Promise<{ subject: string; body: string; warnings: string[]; qualityScore?: number }> {
  let warnings: string[] = [];
  let qualityScore: number | undefined;

  // Text pipeline
  try {
    const { runTextPipeline } = await import("@/lib/text-pipeline");
    const result = await runTextPipeline({
      subject,
      intro: body,
      body: "",
      ctaText: "",
      emailType,
      contactId,
      contactName,
      contactFirstName: contactName.split(" ")[0],
      contactType,
    });
    if (result.blocked) {
      console.warn(`[pre-send] Blocked for ${contactName}: ${result.blockReason}`);
    }
    subject = result.subject;
    body = result.intro;
    warnings = result.warnings;
  } catch {}

  // Quality scoring
  try {
    const { scoreEmailQuality } = await import("@/lib/quality-pipeline");
    const score = await scoreEmailQuality({
      subject,
      intro: body,
      body: "",
      ctaText: "",
      emailType,
      contactName,
      contactType,
    });
    qualityScore = score.overall;
    if (score.overall < 4) {
      console.warn(`[pre-send] Low quality (${score.overall}/10) for ${contactName}: ${score.feedback}`);
      warnings.push(`Quality score ${score.overall}/10 — ${score.suggestions.join("; ")}`);
    }
  } catch {}

  return { subject, body, warnings, qualityScore };
}

/**
 * Fix #4: Phase-aware CTA helper.
 * Returns the right call-to-action text and URL based on contact type and journey phase.
 * Callers can override with a custom CTA by passing the `customCTA` parameter.
 */
export function getPhaseAwareCTA(
  contactType: string,
  journeyPhase: string,
  customCTA?: { text: string; url: string }
): { text: string; url: string } {
  if (customCTA) return customCTA;

  const ctaMap: Record<string, Record<string, { text: string; url: string }>> = {
    buyer: {
      lead: { text: "Get Your Free Market Report", url: "#market-report" },
      active: { text: "Book a Private Showing", url: "#book-showing" },
      under_contract: { text: "Track Your Closing Milestones", url: "#closing" },
      past_client: { text: "See What Your Home Is Worth Now", url: "#valuation" },
      dormant: { text: "See What's New in Your Area", url: "#new-listings" },
    },
    seller: {
      lead: { text: "Get Your Free Home Valuation", url: "#valuation" },
      active: { text: "Review Your Marketing Plan", url: "#marketing" },
      under_contract: { text: "View Your Closing Checklist", url: "#closing" },
      past_client: { text: "Track Your Home's Value", url: "#equity" },
      dormant: { text: "See What Homes Are Selling For", url: "#market" },
    },
  };

  return ctaMap[contactType]?.[journeyPhase] ?? { text: "Learn More", url: "#" };
}

/**
 * Generate plain text version from HTML for email clients that don't render HTML.
 */
export function generatePlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/td>/gi, " | ")
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#\d+;/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

