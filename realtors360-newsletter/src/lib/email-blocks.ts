/**
 * Email Block System — Luxury Real Estate Email Builder
 *
 * Design language: Engel & Volkers / Sotheby's inspired.
 * Photo-first, serif + sans-serif pairing, generous whitespace,
 * white backgrounds, minimal CTAs, pipe-separated specs.
 *
 * Each block is a function returning an HTML table-row string.
 * Templates are assembled by selecting blocks based on email type + available data.
 *
 * Usage:
 *   const html = assembleEmail("listing_alert", { listing, contact, agent, content });
 */

import { supabase } from './supabase.js';
import { config } from '../config.js';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type EmailData = {
  contact: { name: string; firstName: string; type: string };
  agent: {
    name: string; brokerage: string; phone: string; email?: string;
    title?: string; photoUrl?: string; initials?: string;
    instagram?: string; linkedin?: string; facebook?: string;
    brokerageAddress?: string;
  };
  content: { subject: string; intro: string; body: string; ctaText: string; ctaUrl?: string };
  unsubscribeUrl?: string;
  privacyUrl?: string;
  logoUrl?: string;
  tagLine?: string;
  listing?: {
    address: string; area: string; price: string | number;
    beds?: number; baths?: number; sqft?: string; year?: number;
    photos?: string[]; features?: { icon: string; title: string; desc: string }[];
    openHouseDate?: string; openHouseTime?: string;
    previousPrice?: string | number;
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
};

type BlockFn = (data: EmailData) => string;

// ═══════════════════════════════════════════════
// DESIGN TOKENS
// ═══════════════════════════════════════════════

// Apple design language: SF Pro, extreme whitespace, dark-on-light, blue accents
const SERIF = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const SANS = "'SF Pro Text', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif";
const CLR = {
  text: '#1d1d1f',       // Apple primary text
  muted: '#6e6e73',      // Apple secondary text
  light: '#86868b',      // Apple tertiary text
  border: '#d2d2d7',     // Apple separator
  bg: '#ffffff',          // White
  frame: '#ffffff',       // No frame — pure white like apple.com
  cream: '#fbfbfd',       // Apple off-white for cards
  dark: '#000000',        // Pure black for hero overlays
  accent: '#0071e3',      // Apple blue
  surfaceGrey: '#f5f5f7', // Apple light grey surface
};

// ═══════════════════════════════════════════════
// HELPER — format price
// ═══════════════════════════════════════════════

function fmtPrice(p: string | number | undefined): string {
  if (!p) return '';
  if (typeof p === 'number') return `$${p.toLocaleString('en-US')}`;
  return p.startsWith('$') ? p : `$${p}`;
}

// ═══════════════════════════════════════════════
// BLOCKS
// ═══════════════════════════════════════════════

const blocks: Record<string, BlockFn> = {

  // ── 1. Brand Header — minimal Apple nav style ──────────────────
  brandHeader: (d) => {
    const tag = d.tagLine || (
      d.listing ? 'New Listing' :
      d.market ? 'Market Update' :
      d.anniversary ? 'Home Anniversary' :
      'Update'
    );
    return `
    <tr><td style="padding:20px 48px;background:${CLR.surfaceGrey};" class="mobile-pad">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="vertical-align:middle;">
          ${d.logoUrl
            ? `<img src="${d.logoUrl}" alt="${d.agent.name}" height="20" style="display:block;height:20px;width:auto;opacity:0.8;">`
            : `<span style="font-family:${SANS};font-size:14px;font-weight:600;color:${CLR.text};letter-spacing:-0.2px;">${d.agent.name}</span>`
          }
        </td>
        <td align="right" style="vertical-align:middle;">
          <span style="font-family:${SANS};font-size:12px;font-weight:400;color:${CLR.accent};">${tag}</span>
        </td>
      </tr></table>
    </td></tr>`;
  },

  // ── 2. Hero — full-bleed with dark gradient overlay + text (Apple iPhone style) ──
  luxuryHero: (d) => {
    const photo = d.listing?.photos?.[0];
    if (!photo) return '';
    const title = d.listing?.address || d.content.subject;
    const area = d.listing?.area || '';
    return `
    <tr><td style="padding:0;line-height:0;font-size:0;position:relative;">
      <div style="position:relative;background:#000;">
        <img src="${photo}" alt="${title}" width="660" style="display:block;width:100%;height:auto;border:0;opacity:0.85;" class="mobile-img">
        <div style="position:absolute;bottom:0;left:0;right:0;padding:48px 48px 44px;background:linear-gradient(0deg,rgba(0,0,0,0.7) 0%,transparent 100%);">
          <p style="font-family:${SANS};font-size:12px;font-weight:500;color:rgba(255,255,255,0.7);letter-spacing:1px;text-transform:uppercase;margin:0;">${area}</p>
          <h1 style="font-family:${SERIF};font-size:36px;font-weight:600;color:#ffffff;margin:8px 0 0;line-height:1.15;letter-spacing:-0.5px;">${title}</h1>
        </div>
      </div>
    </td></tr>`;
  },

  // ── 3. Title — huge centered Apple-style ──────────────────
  serifTitle: (d) => {
    const title = d.listing?.address || d.content.subject;
    const subtitle = d.listing?.area || d.content.intro;
    return `
    <tr><td style="padding:56px 48px 0;text-align:center;" class="mobile-pad">
      <h1 style="font-family:${SERIF};font-size:40px;font-weight:600;color:${CLR.text};margin:0;line-height:1.15;letter-spacing:-0.8px;" class="mobile-title">${title}</h1>
      ${subtitle ? `<p style="font-family:${SANS};font-size:17px;font-weight:400;color:${CLR.muted};margin:16px 0 0;line-height:1.5;">${subtitle}</p>` : ''}
    </td></tr>`;
  },

  // ── 4. Specs — Apple's clean metric style ─────────────────
  specsBar: (d) => {
    if (!d.listing) return '';
    const items: Array<{ val: string; label: string }> = [];
    if (d.listing.beds != null) items.push({ val: String(d.listing.beds), label: 'Bedrooms' });
    if (d.listing.baths != null) items.push({ val: String(d.listing.baths), label: 'Bathrooms' });
    if (d.listing.sqft) items.push({ val: d.listing.sqft, label: 'Sq. Ft.' });
    if (d.listing.year) items.push({ val: String(d.listing.year), label: 'Year Built' });
    if (!items.length) return '';
    return `
    <tr><td style="padding:40px 48px 0;" class="mobile-pad">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${items.map((item, i) => `
          ${i > 0 ? `<td width="1" style="background:${CLR.border};"></td>` : ''}
          <td style="text-align:center;padding:0 16px;">
            <p style="font-family:${SERIF};font-size:28px;font-weight:600;color:${CLR.text};margin:0;letter-spacing:-0.5px;" class="mobile-price">${item.val}</p>
            <p style="font-family:${SANS};font-size:11px;font-weight:400;color:${CLR.light};margin:6px 0 0;letter-spacing:0.5px;">${item.label}</p>
          </td>
        `).join('')}
      </tr></table>
    </td></tr>`;
  },

  // ── 5. Price — large centered with Apple blue accent ──────
  priceDisplay: (d) => {
    if (!d.listing?.price) return '';
    const price = fmtPrice(d.listing.price);
    const prev = d.listing.previousPrice ? fmtPrice(d.listing.previousPrice) : '';
    return `
    <tr><td style="padding:36px 48px 0;text-align:center;" class="mobile-pad">
      ${prev ? `<p style="font-family:${SANS};font-size:14px;color:${CLR.light};margin:0 0 8px;text-decoration:line-through;">${prev}</p>` : ''}
      <p style="font-family:${SERIF};font-size:32px;font-weight:600;color:${CLR.text};margin:0;letter-spacing:-0.5px;" class="mobile-price">${price}</p>
      <p style="font-family:${SANS};font-size:12px;color:${CLR.muted};margin:8px 0 0;letter-spacing:0.3px;">List Price</p>
    </td></tr>`;
  },

  // ── 6. Description — Apple body copy style ────────────────
  description: (d) => {
    const text = d.content.body || d.content.intro;
    if (!text) return '';
    return `
    <tr><td style="padding:36px 56px 0;" class="mobile-pad">
      <p style="font-family:${SANS};font-size:17px;font-weight:400;color:${CLR.text};line-height:1.65;margin:0;text-align:center;letter-spacing:-0.1px;">${text}</p>
    </td></tr>`;
  },

  // ── 7. Open House Card — Apple surface grey ──────────────
  openHouseCard: (d) => {
    if (!d.listing?.openHouseDate) return '';
    return `
    <tr><td style="padding:40px 48px 0;" class="mobile-pad">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${CLR.surfaceGrey};border-radius:18px;"><tr>
        <td style="padding:40px 44px;text-align:center;" class="mobile-oh-pad">
          <p style="font-family:${SANS};font-size:12px;font-weight:600;color:${CLR.accent};letter-spacing:0.5px;text-transform:uppercase;margin:0;">Open House</p>
          <p style="font-family:${SERIF};font-size:24px;font-weight:600;color:${CLR.text};margin:16px 0 0;line-height:1.3;letter-spacing:-0.3px;">${d.listing.openHouseDate}</p>
          ${d.listing.openHouseTime ? `<p style="font-family:${SANS};font-size:17px;font-weight:400;color:${CLR.muted};margin:8px 0 0;">${d.listing.openHouseTime}</p>` : ''}
          ${d.listing.address ? `<p style="font-family:${SANS};font-size:14px;font-weight:400;color:${CLR.light};margin:14px 0 0;">${d.listing.address}</p>` : ''}
        </td>
      </tr></table>
    </td></tr>`;
  },

  // ── 8. Photo Stack ───────────────────────────
  photoStack: (d) => {
    const photos = d.listing?.photos;
    if (!photos || photos.length < 2) return '';
    return photos.slice(1, 5).map((photo, i) => `
    <tr><td style="padding:${i === 0 ? '24px' : '4px'} 0 0;line-height:0;font-size:0;">
      <img src="${photo}" alt="Property photo ${i + 2}" width="660" style="display:block;width:100%;height:auto;border:0;">
    </td></tr>`).join('');
  },

  // ── 9. Two Column Photos ─────────────────────
  twoColumnPhotos: (d) => {
    const photos = d.listing?.photos;
    if (!photos || photos.length < 2) return '';
    const p1 = photos[photos.length >= 3 ? 1 : 0];
    const p2 = photos[photos.length >= 3 ? 2 : 1];
    return `
    <tr><td style="padding:24px 0 0;line-height:0;font-size:0;">
      <!--[if mso]><table width="660" cellpadding="0" cellspacing="0"><tr><td width="328" valign="top"><![endif]-->
      <div style="display:inline-block;width:49.7%;vertical-align:top;">
        <img src="${p1}" alt="Photo" width="328" style="display:block;width:100%;height:auto;border:0;">
      </div>
      <!--[if mso]></td><td width="4"></td><td width="328" valign="top"><![endif]-->
      <div style="display:inline-block;width:0.6%;"></div>
      <div style="display:inline-block;width:49.7%;vertical-align:top;">
        <img src="${p2}" alt="Photo" width="328" style="display:block;width:100%;height:auto;border:0;">
      </div>
      <!--[if mso]></td></tr></table><![endif]-->
    </td></tr>`;
  },

  // ── 10. Agent Profile ────────────────────────
  agentProfile: (d) => {
    const initials = d.agent.initials || d.agent.name.split(' ').map(n => n[0]).join('').slice(0, 2);
    return `
    <tr><td style="padding:48px 48px 0;text-align:center;" class="mobile-pad mobile-agent-pad">
      <div style="border-top:1px solid ${CLR.border};padding-top:36px;"></div>
      ${d.agent.photoUrl
        ? `<img src="${d.agent.photoUrl}" alt="${d.agent.name}" width="64" height="64" style="display:inline-block;width:64px;height:64px;border-radius:50%;object-fit:cover;">`
        : `<div style="display:inline-block;width:64px;height:64px;border-radius:50%;background:${CLR.surfaceGrey};text-align:center;line-height:64px;color:${CLR.text};font-family:${SANS};font-size:22px;font-weight:600;">${initials}</div>`
      }
      <p style="font-family:${SANS};font-size:17px;font-weight:600;color:${CLR.text};margin:14px 0 0;">${d.agent.name}</p>
      ${d.agent.title ? `<p style="font-family:${SANS};font-size:14px;font-weight:400;color:${CLR.muted};margin:4px 0 0;">${d.agent.title} · ${d.agent.brokerage}</p>` : `<p style="font-family:${SANS};font-size:14px;font-weight:400;color:${CLR.muted};margin:4px 0 0;">${d.agent.brokerage}</p>`}
      <p style="font-family:${SANS};font-size:14px;margin:12px 0 0;">
        <a href="tel:${d.agent.phone}" style="color:${CLR.accent};text-decoration:none;">${d.agent.phone}</a>
        ${d.agent.email ? ` &nbsp;&middot;&nbsp; <a href="mailto:${d.agent.email}" style="color:${CLR.accent};text-decoration:none;">${d.agent.email}</a>` : ''}
      </p>
    </td></tr>`;
  },

  // ── 11. View Listing CTA — Apple text link style ──────────
  viewListingCta: (d) => `
    <tr><td style="padding:36px 48px 0;text-align:center;" class="mobile-pad">
      <a href="${d.content.ctaUrl || '#'}" style="font-family:${SANS};font-size:17px;font-weight:400;color:${CLR.accent};text-decoration:none;">View listing &rsaquo;</a>
    </td></tr>`,

  // ── 12. Button — Apple pill shape ────────────────────
  luxuryButton: (d) => `
    <tr><td style="padding:40px 48px 0;text-align:center;" class="mobile-pad">
      <!--[if mso]><v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${d.content.ctaUrl || '#'}" style="height:48px;v-text-anchor:middle;width:240px;" arcsize="50%" fill="true" stroke="false"><v:fill type="tile" color="${CLR.accent}" /><v:textbox inset="0,0,0,0"><center style="color:#ffffff;font-family:${SANS};font-size:15px;font-weight:500;">${d.content.ctaText}</center></v:textbox></v:roundrect><![endif]-->
      <!--[if !mso]><!-->
      <a href="${d.content.ctaUrl || '#'}" style="display:inline-block;background:${CLR.accent};color:#ffffff;padding:14px 44px;border-radius:980px;font-family:${SANS};font-size:15px;font-weight:500;text-decoration:none;letter-spacing:-0.1px;mso-hide:all;">${d.content.ctaText}</a>
      <!--<![endif]-->
    </td></tr>`,

  // ── 13. Social Links ─────────────────────────
  socialLinks: (d) => {
    const links: string[] = [];
    if (d.agent.instagram) links.push(`<a href="${d.agent.instagram}" style="color:${CLR.light};text-decoration:none;font-size:13px;font-weight:500;">Instagram</a>`);
    if (d.agent.linkedin) links.push(`<a href="${d.agent.linkedin}" style="color:${CLR.light};text-decoration:none;font-size:13px;font-weight:500;">LinkedIn</a>`);
    if (d.agent.facebook) links.push(`<a href="${d.agent.facebook}" style="color:${CLR.light};text-decoration:none;font-size:13px;font-weight:500;">Facebook</a>`);
    if (!links.length) return '';
    return `
    <tr><td style="padding:20px 40px 0;text-align:center;" class="mobile-pad">
      <p style="font-family:${SANS};margin:0;">${links.join(' &nbsp;&middot;&nbsp; ')}</p>
    </td></tr>`;
  },

  // ── 14. Compliance Footer ────────────────────
  complianceFooter: (d) => `
    <tr><td style="padding:36px 48px 44px;text-align:center;border-top:1px solid" class="mobile-footer ${CLR.border};margin-top:24px;">
      <p style="font-family:${SANS};font-size:12px;color:${CLR.muted};margin:0;line-height:1.7;">
        ${d.agent.name} &middot; ${d.agent.brokerage}
        ${d.agent.brokerageAddress ? `<br>${d.agent.brokerageAddress}` : ''}
      </p>
      <p style="font-family:${SANS};font-size:11px;color:${CLR.light};margin:12px 0 0;line-height:1.7;">
        <a href="${d.unsubscribeUrl || '{{unsubscribe_url}}'}" style="color:${CLR.light};text-decoration:underline;">Unsubscribe</a>
        &nbsp;&middot;&nbsp;
        <a href="${d.privacyUrl || '#'}" style="color:${CLR.light};text-decoration:underline;">Privacy Policy</a>
      </p>
      <p style="font-family:${SANS};font-size:10px;color:#b0b0b0;margin:12px 0 0;line-height:1.6;">
        Not intended to solicit properties currently listed for sale or buyers under contract.
        If you have an existing relationship with another real estate professional, this is not intended as a solicitation.
      </p>
    </td></tr>`,

  // ── 15. Market Stats Grid ────────────────────
  marketStatsGrid: (d) => {
    if (!d.market) return '';
    const stats = [
      { value: d.market.avgPrice || '--', label: 'Avg. Price' },
      { value: d.market.avgDom != null ? `${d.market.avgDom}` : '--', label: 'Days on Market' },
      { value: d.market.inventoryChange || '--', label: 'Inventory' },
    ];
    return `
    <tr><td style="padding:24px 40px 0;" class="mobile-pad">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        ${stats.map((s, i) => `
          ${i > 0 ? '<td width="1" style="background:' + CLR.border + ';"></td>' : ''}
          <td style="text-align:center;padding:16px 8px;">
            <p style="font-family:${SERIF};font-size:28px;font-weight:400;color:${CLR.text};margin:0;letter-spacing:-0.5px;">${s.value}</p>
            <p style="font-family:${SANS};font-size:10px;font-weight:600;color:${CLR.light};letter-spacing:2px;text-transform:uppercase;margin:6px 0 0;">${s.label}</p>
          </td>
        `).join('')}
      </tr></table>
    </td></tr>`;
  },

  // ── 16. Recent Sales Table ───────────────────
  recentSalesTable: (d) => {
    const sales = d.market?.recentSales;
    if (!sales?.length) return '';
    return `
    <tr><td style="padding:24px 40px 0;" class="mobile-pad">
      <p style="font-family:${SANS};font-size:10px;font-weight:600;color:${CLR.light};letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Recent Sales</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr style="border-bottom:1px solid ${CLR.border};">
          <td style="padding:8px 0;font-family:${SANS};font-size:10px;font-weight:600;color:${CLR.light};letter-spacing:1.5px;text-transform:uppercase;">Address</td>
          <td style="padding:8px 0;font-family:${SANS};font-size:10px;font-weight:600;color:${CLR.light};letter-spacing:1.5px;text-transform:uppercase;text-align:right;">Price</td>
          <td style="padding:8px 0;font-family:${SANS};font-size:10px;font-weight:600;color:${CLR.light};letter-spacing:1.5px;text-transform:uppercase;text-align:right;width:60px;">DOM</td>
        </tr>
        ${sales.map(s => `
        <tr style="border-bottom:1px solid ${CLR.frame};">
          <td style="padding:10px 0;font-family:${SANS};font-size:14px;color:${CLR.text};">${s.address}</td>
          <td style="padding:10px 0;font-family:${SANS};font-size:14px;font-weight:600;color:${CLR.text};text-align:right;">${s.price}</td>
          <td style="padding:10px 0;font-family:${SANS};font-size:13px;color:${CLR.muted};text-align:right;">${s.dom}d</td>
        </tr>`).join('')}
      </table>
    </td></tr>`;
  },

  // ── 17. Testimonial Block ────────────────────
  testimonialBlock: (d) => {
    const t = d.testimonial;
    if (!t) return '';
    return `
    <tr><td style="padding:28px 40px 0;text-align:center;" class="mobile-pad">
      <p style="font-family:${SERIF};font-size:20px;font-style:italic;font-weight:400;color:${CLR.text};line-height:1.6;margin:0;">&ldquo;${t.quote}&rdquo;</p>
      <p style="font-family:${SANS};font-size:13px;font-weight:600;color:${CLR.text};margin:16px 0 0;">${t.name}</p>
      ${t.role ? `<p style="font-family:${SANS};font-size:12px;color:${CLR.muted};margin:2px 0 0;">${t.role}</p>` : ''}
    </td></tr>`;
  },

  // ── 18. Anniversary Value ────────────────────
  anniversaryValue: (d) => {
    if (!d.anniversary) return '';
    return `
    <tr><td style="padding:24px 40px 0;" class="mobile-pad">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:${CLR.frame};"><tr>
        <td style="padding:24px;text-align:center;">
          <table width="100%" cellpadding="0" cellspacing="0"><tr>
            <td style="text-align:center;width:40%;">
              <p style="font-family:${SANS};font-size:10px;font-weight:600;color:${CLR.light};letter-spacing:2px;text-transform:uppercase;margin:0;">You Paid</p>
              <p style="font-family:${SERIF};font-size:24px;font-weight:400;color:${CLR.text};margin:6px 0 0;">${d.anniversary.purchasePrice || '--'}</p>
            </td>
            <td style="text-align:center;width:20%;">
              <p style="font-family:${SERIF};font-size:28px;color:${CLR.light};margin:0;">&rarr;</p>
            </td>
            <td style="text-align:center;width:40%;">
              <p style="font-family:${SANS};font-size:10px;font-weight:600;color:${CLR.light};letter-spacing:2px;text-transform:uppercase;margin:0;">Now Worth</p>
              <p style="font-family:${SERIF};font-size:24px;font-weight:400;color:${CLR.text};margin:6px 0 0;">${d.anniversary.currentEstimate || '--'}</p>
              ${d.anniversary.appreciation ? `<p style="font-family:${SANS};font-size:13px;font-weight:600;color:#2d8a4e;margin:4px 0 0;">+${d.anniversary.appreciation}</p>` : ''}
            </td>
          </tr></table>
        </td>
      </tr></table>
    </td></tr>`;
  },

  // ── 19. Neighbourhood Highlights ─────────────
  neighbourhoodHighlights: (d) => {
    const highlights = d.anniversary?.areaHighlights || d.listing?.features;
    if (!highlights?.length) return '';
    return `
    <tr><td style="padding:24px 40px 0;" class="mobile-pad">
      <p style="font-family:${SANS};font-size:10px;font-weight:600;color:${CLR.light};letter-spacing:2px;text-transform:uppercase;margin:0 0 16px;">Neighbourhood Highlights</p>
      ${highlights.map(h => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;"><tr>
        <td width="32" style="vertical-align:top;padding-top:2px;">
          <span style="font-size:16px;">${'icon' in h ? h.icon : ''}</span>
        </td>
        <td style="padding-left:8px;">
          <p style="font-family:${SANS};font-size:14px;color:${CLR.text};line-height:1.5;margin:0;">${'text' in h ? h.text : ('title' in h ? h.title : '')}</p>
          ${'desc' in h && h.desc ? `<p style="font-family:${SANS};font-size:13px;color:${CLR.muted};margin:2px 0 0;">${h.desc}</p>` : ''}
        </td>
      </tr></table>`).join('')}
    </td></tr>`;
  },

  // ── 20. Birthday Celebration ─────────────────
  birthdayCelebration: (d) => `
    <tr><td style="padding:40px 40px 0;text-align:center;" class="mobile-pad">
      <p style="font-family:${SERIF};font-size:32px;font-weight:400;color:${CLR.text};margin:0;line-height:1.3;">Happy Birthday,<br>${d.contact.firstName}!</p>
    </td></tr>`,

  // ── 21. Divider Line ─────────────────────────
  dividerLine: () => `
    <tr><td style="padding:24px 40px 0;" class="mobile-pad">
      <div style="border-bottom:1px solid ${CLR.border};"></div>
    </td></tr>`,

  // ── 22. Spacer ───────────────────────────────
  spacer: () => `
    <tr><td style="padding:12px 0;font-size:0;line-height:0;">&nbsp;</td></tr>`,
};

// ═══════════════════════════════════════════════
// TEMPLATE DEFINITIONS — which blocks for each email type
// ═══════════════════════════════════════════════

const TEMPLATE_BLOCKS: Record<string, string[]> = {
  luxury_listing: [
    'brandHeader', 'luxuryHero', 'serifTitle', 'specsBar', 'priceDisplay',
    'description', 'openHouseCard', 'dividerLine', 'photoStack',
    'viewListingCta', 'dividerLine', 'agentProfile', 'socialLinks', 'complianceFooter',
  ],
  listing_alert: [
    'brandHeader', 'luxuryHero', 'serifTitle', 'specsBar', 'priceDisplay',
    'description', 'luxuryButton', 'agentProfile', 'complianceFooter',
  ],
  market_update: [
    'brandHeader', 'serifTitle', 'description', 'marketStatsGrid',
    'recentSalesTable', 'dividerLine', 'description', 'luxuryButton',
    'agentProfile', 'complianceFooter',
  ],
  just_sold: [
    'brandHeader', 'luxuryHero', 'serifTitle', 'specsBar', 'priceDisplay',
    'description', 'testimonialBlock', 'dividerLine', 'agentProfile', 'complianceFooter',
  ],
  birthday: [
    'brandHeader', 'birthdayCelebration', 'description', 'dividerLine',
    'agentProfile', 'complianceFooter',
  ],
  home_anniversary: [
    'brandHeader', 'serifTitle', 'description', 'anniversaryValue',
    'neighbourhoodHighlights', 'luxuryButton', 'agentProfile', 'complianceFooter',
  ],
  open_house: [
    'brandHeader', 'luxuryHero', 'serifTitle', 'specsBar', 'priceDisplay',
    'openHouseCard', 'description', 'twoColumnPhotos', 'viewListingCta',
    'agentProfile', 'complianceFooter',
  ],
  price_drop: [
    'brandHeader', 'luxuryHero', 'serifTitle', 'specsBar', 'priceDisplay',
    'description', 'luxuryButton', 'agentProfile', 'complianceFooter',
  ],
  neighbourhood_guide: [
    'brandHeader', 'serifTitle', 'description', 'neighbourhoodHighlights',
    'twoColumnPhotos', 'luxuryButton', 'agentProfile', 'complianceFooter',
  ],
  showing_confirmed: [
    'brandHeader', 'serifTitle', 'openHouseCard', 'description',
    'luxuryButton', 'agentProfile', 'complianceFooter',
  ],
  welcome: [
    'brandHeader', 'serifTitle', 'description', 'marketStatsGrid',
    'luxuryButton', 'socialLinks', 'agentProfile', 'complianceFooter',
  ],
  re_engagement: [
    'brandHeader', 'serifTitle', 'description', 'marketStatsGrid',
    'luxuryButton', 'agentProfile', 'complianceFooter',
  ],
  seller_report: [
    'brandHeader', 'serifTitle', 'marketStatsGrid', 'recentSalesTable',
    'description', 'luxuryButton', 'agentProfile', 'complianceFooter',
  ],
  cma_preview: [
    'brandHeader', 'serifTitle', 'description', 'marketStatsGrid',
    'recentSalesTable', 'testimonialBlock', 'luxuryButton',
    'agentProfile', 'complianceFooter',
  ],
};

// ═══════════════════════════════════════════════
// ASSEMBLER — builds full email HTML from blocks
// ═══════════════════════════════════════════════

export function assembleEmail(emailType: string, data: EmailData): string {
  const blockList = TEMPLATE_BLOCKS[emailType] || TEMPLATE_BLOCKS.welcome;

  const renderedBlocks = blockList
    .map(blockName => {
      const fn = blocks[blockName];
      return fn ? fn(data) : '';
    })
    .filter(Boolean)
    .join('\n');

  const preheader = `${data.content.subject} — ${data.content.intro.slice(0, 80)}`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${data.content.subject}</title>
<!--[if mso]>
<noscript><xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml></noscript>
<![endif]-->
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  /* Reset */
  body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
  table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
  img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
  body{margin:0;padding:0;width:100%!important;-webkit-font-smoothing:antialiased}

  /* Dark mode */
  @media(prefers-color-scheme:dark){
    .email-outer{background:#1a1a1a!important}
    .email-inner{background:#222222!important}
    .dm-text{color:#e0e0e0!important}
    .dm-muted{color:#999999!important}
    .dm-border{border-color:#333333!important}
    .dm-bg{background:#2a2a2a!important}
  }
  :root[data-ogsc] .email-outer{background:#1a1a1a!important}
  :root[data-ogsc] .email-inner{background:#222222!important}

  /* Mobile — responsive overrides */
  @media only screen and (max-width:680px){
    .email-inner{width:100%!important;min-width:100%!important}
    .mobile-pad{padding-left:20px!important;padding-right:20px!important}
    .mobile-pad-sm{padding-left:16px!important;padding-right:16px!important}
    .mobile-full{padding-left:0!important;padding-right:0!important}
    .mobile-stack{display:block!important;width:100%!important}
    .mobile-hide{display:none!important}
    .mobile-title{font-size:22px!important}
    .mobile-price{font-size:20px!important}
    .mobile-specs{font-size:9px!important;letter-spacing:2px!important}
    .mobile-desc{font-size:14px!important;line-height:1.7!important}
    .mobile-img{width:100%!important;height:auto!important}
    .mobile-agent-pad{padding-left:20px!important;padding-right:20px!important}
    .mobile-oh-pad{padding:24px 20px!important}
    .mobile-footer{padding:24px 20px 32px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${CLR.frame};font-family:${SANS};" class="email-outer">
<!-- Preheader (hidden) -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:${CLR.frame};">${preheader}${'&zwnj;&nbsp;'.repeat(20)}</div>
<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${CLR.frame};" class="email-outer">
<tr><td align="center" style="padding:0;">
<!--[if mso]><table role="presentation" width="660" cellpadding="0" cellspacing="0" align="center"><tr><td><![endif]-->
<table role="presentation" width="660" cellpadding="0" cellspacing="0" style="max-width:660px;width:100%;background:${CLR.bg};" class="email-inner">
${renderedBlocks}
</table>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
</table>
</body>
</html>`;
}

// ═══════════════════════════════════════════════
// BRAND CONFIG
// ═══════════════════════════════════════════════

const DEFAULT_BRAND: EmailData['agent'] = {
  name: config.AGENT_NAME || 'Your Agent',
  brokerage: 'RE/MAX City Realty',
  phone: config.AGENT_PHONE || '604-555-0123',
  email: config.AGENT_EMAIL || '',
  initials: (config.AGENT_NAME || 'Y')[0],
};

/**
 * Get brand config from DB or use defaults.
 * Caches for 5 minutes to avoid repeated DB calls.
 */
let brandCache: { data: EmailData['agent']; expires: number } | null = null;

export async function getBrandConfig(): Promise<EmailData['agent']> {
  if (brandCache && Date.now() < brandCache.expires) return brandCache.data;
  try {
    const { data } = await supabase
      .from('realtor_agent_config')
      .select('brand_config')
      .eq('realtor_id', config.DEMO_REALTOR_ID)
      .single();
    if (data?.brand_config) {
      const bc = data.brand_config as Record<string, string>;
      const brand: EmailData['agent'] = {
        name: bc.name || DEFAULT_BRAND.name,
        brokerage: bc.brokerage || DEFAULT_BRAND.brokerage,
        phone: bc.phone || DEFAULT_BRAND.phone,
        email: bc.email || DEFAULT_BRAND.email,
        title: bc.title || '',
        photoUrl: bc.photoUrl || '',
        initials: (bc.name || DEFAULT_BRAND.name).split(' ').map((n: string) => n[0]).join('').slice(0, 2),
        instagram: bc.instagram || '',
        linkedin: bc.linkedin || '',
        facebook: bc.facebook || '',
        brokerageAddress: bc.brokerageAddress || '',
      };
      brandCache = { data: brand, expires: Date.now() + 300000 };
      return brand;
    }
  } catch { /* fall through to default */ }
  return DEFAULT_BRAND;
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
  ctaText: string = 'View Details',
): string {
  return assembleEmail(emailType, {
    contact: { name: contactName, firstName: contactName.split(' ')[0], type: contactType },
    agent: DEFAULT_BRAND,
    content: { subject, intro: bodyText, body: '', ctaText },
  });
}

/**
 * Generate plain text version from HTML for email clients that don't render HTML.
 */
export function generatePlainText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&middot;/g, '.')
    .replace(/&rarr;/g, '->')
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&zwnj;/g, '')
    .replace(/&#\d+;/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
