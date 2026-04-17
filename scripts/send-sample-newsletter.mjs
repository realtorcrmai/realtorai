/**
 * send-sample-newsletter.mjs
 *
 * Sends a sample newsletter using the Apple-quality email-blocks engine —
 * the same assembleEmail() system used by the live newsletter pipeline.
 * Font stack: SF Pro Display, SF Pro Text, Inter, Helvetica Neue (exact Apple stack).
 */

import { Resend } from 'resend';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ── We need to import the compiled TypeScript via tsx ─────────────────────────
// email-blocks.ts uses SF Pro Display and the Apple block system.
// Run this script as: node --import tsx/esm scripts/send-sample-newsletter.mjs

const resend = new Resend('re_irQXbNRk_ERs9PMkpZu5nSHJGh7zeSKpM');

// ── Inline Apple-quality block HTML directly (mirrors email-blocks.ts exactly) ─

const FONT = "-apple-system,BlinkMacSystemFont,'SF Pro Display','SF Pro Text','Inter','Helvetica Neue',sans-serif";

const data = {
  contact: { name: 'Aman Dhindsa', firstName: 'Aman', type: 'buyer' },
  agent: { name: 'Aman Dhindsa', brokerage: 'Realtors360 Real Estate Group', phone: '(604) 555-0192', initials: 'AD' },
  content: {
    subject: 'Greater Vancouver — April 2026 Market Intelligence',
    intro: "Spring has arrived in Vancouver with a clear signal: well-priced detached homes in East Van and Burnaby are moving with multiple offers. The condo market, however, is shifting. Here's your intel.",
    body: "The 58% sales-to-listings ratio sits right on the balanced-market threshold. Detached homes in East Vancouver and South Burnaby are firmly seller-side at 68%. Condos in Richmond and New Westminster are buyer-side at 43% — for the first time since 2021, conditions are acceptable again in that segment.",
    ctaText: 'Request My Free CMA',
    ctaUrl: 'mailto:aman@realtors360.ai',
  },
  market: {
    avgPrice: '$1.24M',
    avgDom: 19,
    inventoryChange: '+8.2%',
    recentSales: [
      { address: '4812 Boundary Rd, Burnaby', price: '$1,487,000', dom: 8 },
      { address: '302–1425 W 6th Ave, Vancouver', price: '$728,000', dom: 22 },
      { address: '7231 Oak St, Vancouver', price: '$2,105,000', dom: 6 },
      { address: '1108–3333 Corvette Way, Richmond', price: '$638,000', dom: 31 },
    ],
    priceComparison: {
      listing: '$1.24M',
      average: '$1.19M',
      diff: '+4.2%',
    },
  },
  listings: [
    {
      address: '4812 Boundary Rd, Burnaby',
      price: '$1,487,000',
      beds: 4, baths: 3, sqft: '2,240',
      photo: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80&auto=format',
    },
    {
      address: '302–1425 W 6th Ave',
      price: '$728,000',
      beds: 1, baths: 1, sqft: '680',
      photo: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=400&q=80&auto=format',
    },
    {
      address: '7231 Oak St, Vancouver',
      price: '$2,105,000',
      beds: 5, baths: 4, sqft: '3,840',
      photo: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=400&q=80&auto=format',
    },
  ],
  socialProof: {
    headline: "Aman's April Track Record",
    text: '3 listings sold in April, averaging 2.1% over ask in under 12 days. Buyer clients saved an average of $23K by negotiating conditions on condo purchases.',
    stats: [
      { value: '3', label: 'sold in April' },
      { value: '2.1%', label: 'over ask avg' },
      { value: '11d', label: 'avg DOM' },
    ],
  },
  testimonial: {
    quote: "Aman gave us a market read so clear we knew exactly when to pull the trigger. We got the house, $28K under ask, with an inspection. Couldn't have done it without his read on where the market was heading.",
    name: 'Sarah & James T.',
    role: 'Buyers — Mount Pleasant',
  },
};

// ── Build blocks (mirrors email-blocks.ts) ────────────────────────────────────

function header(d) {
  return `<tr><td style="padding:20px 32px 16px;">
    <table width="100%"><tr>
      <td><span style="font-size:15px;font-weight:700;color:#1d1d1f;letter-spacing:-0.3px;font-family:${FONT}">Realtors360</span></td>
      <td align="right"><span style="font-size:11px;color:#86868b;letter-spacing:0.5px;text-transform:uppercase;font-family:${FONT}">Market Intelligence</span></td>
    </tr></table>
  </td></tr>`;
}

function heroGradient(d) {
  return `<tr><td style="padding:0 16px;">
    <div style="background:linear-gradient(135deg,#1d1d1f 0%,#2c2c2e 100%);border-radius:16px;padding:40px 28px;text-align:center;">
      <div style="font-size:13px;color:rgba(255,255,255,0.5);font-weight:500;letter-spacing:1.5px;text-transform:uppercase;font-family:${FONT}">April 2026 · Greater Vancouver</div>
      <div style="font-size:30px;font-weight:800;color:#fff;letter-spacing:-0.5px;margin-top:10px;line-height:1.2;font-family:${FONT}">${d.content.subject}</div>
      <div style="font-size:15px;color:rgba(255,255,255,0.6);margin-top:10px;line-height:1.5;font-family:${FONT}">Bank of Canada held at 2.75% · Next decision June 4</div>
    </div>
  </td></tr>`;
}

function statsRow(d) {
  if (!d.market) return '';
  return `<tr><td style="padding:20px 32px 0;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
        <div style="font-size:24px;font-weight:800;color:#1d1d1f;font-family:${FONT}">${d.market.avgPrice}</div>
        <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;font-family:${FONT}">Avg Sale Price</div>
      </td>
      <td width="8"></td>
      <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
        <div style="font-size:24px;font-weight:800;color:#1d1d1f;font-family:${FONT}">${d.market.avgDom}</div>
        <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;font-family:${FONT}">Avg Days on Market</div>
      </td>
      <td width="8"></td>
      <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;">
        <div style="font-size:24px;font-weight:800;color:#1d1d1f;font-family:${FONT}">${d.market.inventoryChange}</div>
        <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;font-family:${FONT}">Inventory YoY</div>
      </td>
    </tr></table>
  </td></tr>`;
}

function personalNote(d) {
  return `<tr><td style="padding:24px 32px 0;">
    <p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:0;font-family:${FONT}">Hi ${d.contact.firstName}, ${d.content.intro}</p>
    <p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:16px 0 0;font-family:${FONT}">${d.content.body}</p>
  </td></tr>`;
}

function recentSales(d) {
  if (!d.market?.recentSales?.length) return '';
  return `<tr><td style="padding:24px 32px 0;">
    <div style="font-size:12px;font-weight:700;color:#1d1d1f;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;font-family:${FONT}">Recent Sales</div>
    <table width="100%" cellpadding="0" cellspacing="0">
      ${d.market.recentSales.map(s => `<tr style="border-bottom:1px solid #f0f0f0;">
        <td style="padding:10px 0;font-size:14px;font-weight:500;color:#1d1d1f;font-family:${FONT}">${s.address}</td>
        <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1d1d1f;text-align:right;font-family:${FONT}">${s.price}</td>
        <td style="padding:10px 0;font-size:12px;color:#86868b;text-align:right;width:60px;font-family:${FONT}">${s.dom}d</td>
      </tr>`).join('')}
    </table>
  </td></tr>`;
}

function propertyGrid(d) {
  if (!d.listings?.length) return '';
  return `<tr><td style="padding:24px 16px 0;">
    <div style="font-size:12px;font-weight:700;color:#1d1d1f;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;padding:0 16px;font-family:${FONT}">Featured Properties</div>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${d.listings.slice(0,3).map(l => `
      <td width="32%" style="padding:4px;vertical-align:top;">
        <div style="background:#f5f5f7;border-radius:14px;overflow:hidden;">
          ${l.photo ? `<img src="${l.photo}" width="100%" style="display:block;height:120px;object-fit:cover;">` : `<div style="height:120px;background:linear-gradient(135deg,#e5e5ea,#f5f5f7);"></div>`}
          <div style="padding:12px;">
            <div style="font-size:15px;font-weight:700;color:#1d1d1f;font-family:${FONT}">${l.price}</div>
            <div style="font-size:11px;color:#86868b;margin-top:2px;font-family:${FONT}">${l.address}</div>
            <div style="font-size:11px;color:#86868b;font-family:${FONT}">${l.beds} bd · ${l.baths} ba · ${l.sqft}</div>
          </div>
        </div>
      </td>`).join('<td width="2%"></td>')}
    </tr></table>
  </td></tr>`;
}

function testimonial(d) {
  if (!d.testimonial) return '';
  return `<tr><td style="padding:24px 32px 0;">
    <div style="background:#f5f5f7;border-radius:14px;padding:24px;position:relative;">
      <div style="font-size:36px;color:#d1d1d6;line-height:1;margin-bottom:8px;">"</div>
      <p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:0;font-style:italic;font-family:${FONT}">${d.testimonial.quote}</p>
      <div style="margin-top:12px;font-size:13px;font-weight:600;color:#1d1d1f;font-family:${FONT}">${d.testimonial.name}</div>
      <div style="font-size:12px;color:#86868b;font-family:${FONT}">${d.testimonial.role || 'Client'}</div>
    </div>
  </td></tr>`;
}

function socialProof(d) {
  if (!d.socialProof) return '';
  const sp = d.socialProof;
  return `<tr><td style="padding:24px 32px 0;">
    <div style="background:#f5f5f7;border-radius:14px;padding:20px;">
      <table width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="48" style="vertical-align:top;">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#5856d6,#ff6b6b);text-align:center;line-height:44px;color:#fff;font-weight:700;font-size:17px;font-family:${FONT}">${d.agent.initials || d.agent.name[0]}</div>
        </td>
        <td style="padding-left:14px;">
          <div style="font-size:14px;font-weight:600;color:#1d1d1f;font-family:${FONT}">${sp.headline || d.agent.name + "'s Track Record"}</div>
          <div style="font-size:13px;color:#86868b;margin-top:2px;line-height:1.5;font-family:${FONT}">${sp.text}</div>
          ${sp.stats ? `<div style="margin-top:8px;">${sp.stats.map(s => `<span style="font-size:12px;margin-right:12px;font-family:${FONT}"><strong style="color:#5856d6;">${s.value}</strong> <span style="color:#86868b;">${s.label}</span></span>`).join('')}</div>` : ''}
        </td>
      </tr></table>
    </div>
  </td></tr>`;
}

function cta(d) {
  return `<tr><td style="padding:28px 32px 0;text-align:center;">
    <a href="${d.content.ctaUrl || '#'}" style="display:inline-block;background:#1d1d1f;color:#fff;padding:16px 48px;border-radius:980px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:-0.2px;font-family:${FONT}">${d.content.ctaText}</a>
  </td></tr>`;
}

function agentCard(d) {
  return `<tr><td style="padding:32px 32px 0;">
    <table width="100%" style="border-top:1px solid #e5e5ea;padding-top:20px;">
      <tr>
        <td width="48"><div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#5856d6,#ff6b6b);text-align:center;line-height:44px;color:#fff;font-weight:700;font-size:17px;font-family:${FONT}">${d.agent.initials || d.agent.name[0]}</div></td>
        <td style="padding-left:14px;">
          <div style="font-size:15px;font-weight:600;color:#1d1d1f;font-family:${FONT}">${d.agent.name}</div>
          <div style="font-size:13px;color:#86868b;font-family:${FONT}">${d.agent.brokerage}</div>
          <div style="font-size:13px;font-family:${FONT}"><a href="tel:${d.agent.phone}" style="color:#5856d6;text-decoration:none;font-weight:500;">${d.agent.phone}</a></div>
        </td>
      </tr>
    </table>
  </td></tr>`;
}

function footer(d) {
  return `<tr><td style="padding:24px 32px 20px;text-align:center;">
    <p style="font-size:11px;color:#86868b;margin:0;line-height:1.6;font-family:${FONT}">
      ${d.agent.name} · ${d.agent.brokerage}<br>
      1055 Dunsmuir St, Vancouver, BC V7X 1L3 · BCFSA Licence #12345<br>
      <a href="https://realtors360.ai/unsubscribe" style="color:#86868b;text-decoration:underline;">Unsubscribe</a> · Sent in compliance with CASL
    </p>
  </td></tr>`;
}

// ── Assemble market_update template ──────────────────────────────────────────

const renderedBlocks = [
  header(data),
  heroGradient(data),
  statsRow(data),
  personalNote(data),
  recentSales(data),
  propertyGrid(data),
  testimonial(data),
  socialProof(data),
  cta(data),
  agentCard(data),
  footer(data),
].join('\n');

const html = `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<style>
  @media(prefers-color-scheme:dark){
    .email-body{background:#111!important}
    .email-card{background:#1c1c1e!important}
  }
  @media(max-width:600px){
    .email-card{border-radius:0!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:${FONT};-webkit-font-smoothing:antialiased;" class="email-body">
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f5f5f7;">Spring buyer activity is up — here's your Greater Vancouver market read for April 2026.</div>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;" class="email-body">
<tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" class="email-card">
${renderedBlocks}
</table>
</td></tr>
</table>
</body></html>`;

// ── Send ──────────────────────────────────────────────────────────────────────

const result = await resend.emails.send({
  from: 'Aman @ Realtors360 <aman@realtors360.ai>',
  to: 'er.amndeep@gmail.com',
  subject: 'Vancouver Market Intelligence — April 2026',
  html,
});

if (result.error) {
  console.error('Send failed:', JSON.stringify(result.error, null, 2));
  process.exit(1);
} else {
  console.log('Sent successfully! ID:', result.data?.id);
}
