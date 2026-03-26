import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/templates/preview?template=listing_alert
 * Apple-quality rendered HTML email templates for preview.
 */
export async function GET(request: NextRequest) {
  const template = request.nextUrl.searchParams.get("template") || "listing_alert";

  const S = {
    address: "3456 W 4th Avenue",
    area: "Kitsilano, Vancouver",
    price: "$1,290,000",
    beds: 3, baths: 2, sqft: "1,847", year: 2019,
    photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=600&fit=crop&q=90",
    photos: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=580&h=380&fit=crop&q=85",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=580&h=380&fit=crop&q=85",
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=580&h=380&fit=crop&q=85",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=580&h=380&fit=crop&q=85",
    ],
    features: [
      { icon: "🏡", title: "Ground Floor Living", desc: "Private fenced patio with south-facing exposure" },
      { icon: "🎓", title: "Kits Elementary", desc: "4-minute walk, French Immersion available" },
      { icon: "✨", title: "Premium Finishes", desc: "Sub-Zero, Wolf, Bosch — engineered hardwood throughout" },
    ],
    openHouse: "Saturday, March 29",
    openHouseTime: "2:00 – 4:00 PM",
    agent: { name: "Kunal", brokerage: "RE/MAX City Realty", phone: "604-555-0123" },
  };

  const templates: Record<string, string> = {
    listing_alert: listingAlert(S),
    luxury_showcase: luxuryShowcase(S),
    open_house: openHouseInvite(S),
  };

  return new NextResponse(templates[template] || templates.listing_alert, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

type S = typeof import("./route").GET extends (r: any) => any ? any : any;

// ═══════════════════════════════════════════════════════════
// TEMPLATE 1: LISTING ALERT — Clean, modern, Apple-inspired
// ═══════════════════════════════════════════════════════════
function listingAlert(s: any) {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  @media(prefers-color-scheme:dark){
    .email-body{background:#111!important}
    .email-card{background:#1c1c1e!important}
    .t-primary{color:#f5f5f7!important}
    .t-secondary{color:#a1a1a6!important}
    .t-accent{color:#bf5af2!important}
    .bg-subtle{background:#2c2c2e!important}
    .border-subtle{border-color:#38383a!important}
  }
  @media(max-width:600px){
    .photo-grid td{display:block!important;width:100%!important;padding:2px 0!important}
    .spec-grid td{display:block!important;width:100%!important;padding:8px 0!important;text-align:left!important}
    .hero-text{font-size:28px!important}
    .content-pad{padding:0 20px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:'Inter',-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;" class="email-body">

<!-- Preheader -->
<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f5f5f7;">
  Just listed in ${s.area} — ${s.beds}BD/${s.baths}BA, ${s.sqft} sqft, ${s.price}. View photos and details inside.
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;" class="email-body">
<tr><td align="center" style="padding:24px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" class="email-card">

  <!-- Logo Bar -->
  <tr><td style="padding:20px 32px 16px;">
    <table width="100%"><tr>
      <td><span style="font-size:15px;font-weight:700;color:#1d1d1f;letter-spacing:-0.3px;" class="t-primary">ListingFlow</span></td>
      <td align="right"><span style="font-size:11px;color:#86868b;letter-spacing:0.5px;text-transform:uppercase;" class="t-secondary">New Listing</span></td>
    </tr></table>
  </td></tr>

  <!-- Hero Image -->
  <tr><td style="padding:0 16px;">
    <div style="border-radius:16px;overflow:hidden;position:relative;">
      <img src="${s.photo}" alt="${s.address}" width="568" style="display:block;width:100%;height:auto;">
      <div style="position:absolute;bottom:0;left:0;right:0;padding:32px 28px 24px;background:linear-gradient(0deg,rgba(0,0,0,0.65) 0%,transparent 100%);">
        <div style="font-size:13px;color:rgba(255,255,255,0.7);font-weight:500;letter-spacing:1.5px;text-transform:uppercase;">Just Listed</div>
        <div style="font-size:32px;font-weight:700;color:#ffffff;margin-top:4px;letter-spacing:-0.5px;line-height:1.1;" class="hero-text">${s.address}</div>
        <div style="font-size:15px;color:rgba(255,255,255,0.8);margin-top:6px;font-weight:400;">${s.area}</div>
      </div>
    </div>
  </td></tr>

  <!-- Price + Specs Bar -->
  <tr><td style="padding:20px 32px 0;" class="content-pad">
    <table width="100%" cellpadding="0" cellspacing="0" class="spec-grid">
      <tr>
        <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;" class="bg-subtle">
          <div style="font-size:28px;font-weight:800;color:#1d1d1f;letter-spacing:-1px;" class="t-primary">${s.price}</div>
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;" class="t-secondary">List Price</div>
        </td>
        <td width="12"></td>
        <td style="text-align:center;padding:16px;background:#f5f5f7;border-radius:12px;" class="bg-subtle">
          <div style="font-size:22px;font-weight:700;color:#1d1d1f;" class="t-primary">${s.beds}<span style="font-size:13px;color:#86868b;font-weight:500;"> bd</span> &nbsp;${s.baths}<span style="font-size:13px;color:#86868b;font-weight:500;"> ba</span></div>
          <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:1px;margin-top:4px;" class="t-secondary">${s.sqft} sqft · ${s.year}</div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Personal Message -->
  <tr><td style="padding:24px 32px 0;" class="content-pad">
    <p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:0;font-weight:400;" class="t-primary">
      This ground floor unit just hit the market — and it's something special. A private south-facing patio,
      2019 construction with premium finishes, and steps to Kits Beach. Priced <strong>4% below</strong> the
      Kitsilano average, it won't last long.
    </p>
  </td></tr>

  <!-- Features -->
  <tr><td style="padding:24px 32px 0;" class="content-pad">
    ${s.features.map((f: any) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
      <tr>
        <td width="44" style="vertical-align:top;padding-top:2px;">
          <div style="width:36px;height:36px;background:#f5f5f7;border-radius:10px;text-align:center;line-height:36px;font-size:16px;" class="bg-subtle">${f.icon}</div>
        </td>
        <td style="padding-left:12px;vertical-align:top;">
          <div style="font-size:14px;font-weight:600;color:#1d1d1f;" class="t-primary">${f.title}</div>
          <div style="font-size:13px;color:#86868b;margin-top:1px;" class="t-secondary">${f.desc}</div>
        </td>
      </tr>
    </table>`).join("")}
  </td></tr>

  <!-- Photo Grid -->
  <tr><td style="padding:24px 16px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" class="photo-grid">
      <tr>
        <td width="49%" style="padding:4px;"><img src="${s.photos[0]}" width="100%" style="display:block;border-radius:12px;"></td>
        <td width="2%"></td>
        <td width="49%" style="padding:4px;"><img src="${s.photos[1]}" width="100%" style="display:block;border-radius:12px;"></td>
      </tr>
      <tr>
        <td width="49%" style="padding:4px;"><img src="${s.photos[2]}" width="100%" style="display:block;border-radius:12px;"></td>
        <td width="2%"></td>
        <td width="49%" style="padding:4px;"><img src="${s.photos[3]}" width="100%" style="display:block;border-radius:12px;"></td>
      </tr>
    </table>
  </td></tr>

  <!-- Open House -->
  <tr><td style="padding:24px 32px 0;" class="content-pad">
    <div style="background:linear-gradient(135deg,#f5f0ff,#fef3f2);border-radius:14px;padding:20px;text-align:center;border:1px solid rgba(128,90,213,0.1);">
      <div style="font-size:11px;color:#86868b;text-transform:uppercase;letter-spacing:2px;font-weight:600;">Open House</div>
      <div style="font-size:20px;font-weight:700;color:#1d1d1f;margin-top:6px;" class="t-primary">${s.openHouse}</div>
      <div style="font-size:16px;color:#6e6e73;margin-top:2px;">${s.openHouseTime}</div>
    </div>
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:28px 32px 0;text-align:center;" class="content-pad">
    <a href="#" style="display:inline-block;background:#1d1d1f;color:#ffffff;padding:16px 48px;border-radius:980px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:-0.2px;">Schedule a Viewing</a>
  </td></tr>

  <!-- Signature -->
  <tr><td style="padding:32px 32px 0;" class="content-pad">
    <table width="100%" style="border-top:1px solid #e5e5ea;padding-top:20px;" class="border-subtle">
      <tr>
        <td width="48" style="vertical-align:top;">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#5856d6,#ff6b6b);text-align:center;line-height:44px;color:#fff;font-weight:700;font-size:17px;">K</div>
        </td>
        <td style="padding-left:14px;vertical-align:top;">
          <div style="font-size:15px;font-weight:600;color:#1d1d1f;" class="t-primary">${s.agent.name}</div>
          <div style="font-size:13px;color:#86868b;" class="t-secondary">${s.agent.brokerage}</div>
          <div style="font-size:13px;margin-top:2px;"><a href="tel:${s.agent.phone}" style="color:#5856d6;text-decoration:none;font-weight:500;" class="t-accent">${s.agent.phone}</a></div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 32px 20px;text-align:center;">
    <p style="font-size:11px;color:#86868b;margin:0;line-height:1.6;" class="t-secondary">
      ${s.agent.name} · ${s.agent.brokerage}<br>
      123 W 4th Avenue, Vancouver, BC V6K 1R4<br>
      <a href="#" style="color:#86868b;text-decoration:underline;">Unsubscribe</a> · <a href="#" style="color:#86868b;text-decoration:underline;">Privacy</a>
    </p>
  </td></tr>

</table>

</td></tr>
</table>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE 2: LUXURY SHOWCASE — Dark, editorial, Sotheby's-level
// ═══════════════════════════════════════════════════════════
function luxuryShowcase(s: any) {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap');
  @media(max-width:600px){
    .photo-grid td{display:block!important;width:100%!important;padding:2px 0!important}
    .hero-title{font-size:32px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Inter',-apple-system,sans-serif;">

<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#0a0a0a;">
  Exclusive: ${s.address}, ${s.area} — ${s.price}. A rare opportunity in one of Vancouver's most coveted neighbourhoods.
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">
<tr><td align="center" style="padding:0;">

<table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">

  <!-- Header -->
  <tr><td style="padding:32px 40px 24px;">
    <table width="100%"><tr>
      <td><span style="font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#c4a35a;letter-spacing:3px;font-weight:500;">LISTINGFLOW</span></td>
      <td align="right"><span style="font-size:10px;color:#555;letter-spacing:3px;text-transform:uppercase;">Exclusive Listing</span></td>
    </tr></table>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#333,transparent);"></div></td></tr>

  <!-- Hero -->
  <tr><td style="padding:24px 0 0;">
    <img src="${s.photo}" alt="${s.address}" width="600" style="display:block;width:100%;height:auto;">
  </td></tr>

  <!-- Title Block -->
  <tr><td style="padding:40px 40px 0;">
    <div style="font-size:11px;color:#c4a35a;letter-spacing:4px;text-transform:uppercase;font-weight:500;">Presented by ${s.agent.name}</div>
    <div style="font-family:'Playfair Display',Georgia,serif;font-size:42px;font-weight:400;color:#ffffff;margin-top:12px;line-height:1.1;letter-spacing:-0.5px;" class="hero-title">${s.address}</div>
    <div style="font-size:15px;color:#888;margin-top:8px;font-weight:300;">${s.area}</div>
  </td></tr>

  <!-- Price -->
  <tr><td style="padding:32px 40px 0;">
    <table width="100%"><tr>
      <td>
        <div style="font-family:'Playfair Display',Georgia,serif;font-size:36px;color:#c4a35a;font-weight:400;letter-spacing:1px;">${s.price}</div>
      </td>
      <td align="right" style="vertical-align:bottom;">
        <div style="font-size:14px;color:#666;font-weight:300;">${s.beds} Bedrooms · ${s.baths} Bathrooms · ${s.sqft} sq ft</div>
      </td>
    </tr></table>
    <div style="height:1px;background:#222;margin-top:24px;"></div>
  </td></tr>

  <!-- Description -->
  <tr><td style="padding:28px 40px 0;">
    <p style="font-size:15px;color:#aaa;line-height:1.8;margin:0;font-weight:300;">
      An exceptional residence in the heart of Kitsilano. This ground-floor sanctuary offers the rare combination
      of contemporary design and effortless indoor-outdoor living — a private, south-facing garden patio frames
      views of mature landscaping, while floor-to-ceiling windows flood the interior with natural light.
    </p>
    <p style="font-size:15px;color:#aaa;line-height:1.8;margin:20px 0 0;font-weight:300;">
      Every detail has been considered: Sub-Zero refrigeration, a Wolf gas range, wide-plank engineered hardwood,
      and a spa-inspired ensuite. Steps from Kitsilano Beach, Waterfront Park, and the city's finest dining.
    </p>
  </td></tr>

  <!-- Photo Grid -->
  <tr><td style="padding:32px 20px 0;">
    <table width="100%" cellpadding="0" cellspacing="0" class="photo-grid">
      <tr>
        <td width="49%" style="padding:4px;"><img src="${s.photos[0]}" width="100%" style="display:block;border-radius:4px;"></td>
        <td width="2%"></td>
        <td width="49%" style="padding:4px;"><img src="${s.photos[1]}" width="100%" style="display:block;border-radius:4px;"></td>
      </tr>
      <tr>
        <td width="49%" style="padding:4px;"><img src="${s.photos[2]}" width="100%" style="display:block;border-radius:4px;"></td>
        <td width="2%"></td>
        <td width="49%" style="padding:4px;"><img src="${s.photos[3]}" width="100%" style="display:block;border-radius:4px;"></td>
      </tr>
    </table>
  </td></tr>

  <!-- Features -->
  <tr><td style="padding:32px 40px 0;">
    ${s.features.map((f: any) => `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td width="3" style="vertical-align:top;padding-top:4px;"><div style="width:3px;height:32px;background:#c4a35a;border-radius:2px;"></div></td>
        <td style="padding-left:16px;">
          <div style="font-size:14px;font-weight:500;color:#fff;">${f.title}</div>
          <div style="font-size:13px;color:#666;margin-top:2px;font-weight:300;">${f.desc}</div>
        </td>
      </tr>
    </table>`).join("")}
  </td></tr>

  <!-- CTA -->
  <tr><td style="padding:36px 40px 0;text-align:center;">
    <a href="#" style="display:inline-block;color:#c4a35a;padding:16px 52px;border:1px solid #c4a35a;text-decoration:none;font-size:12px;font-weight:500;letter-spacing:3px;text-transform:uppercase;">Request Private Viewing</a>
  </td></tr>

  <!-- Divider -->
  <tr><td style="padding:36px 40px 0;"><div style="height:1px;background:linear-gradient(90deg,transparent,#333,transparent);"></div></td></tr>

  <!-- Signature -->
  <tr><td style="padding:24px 40px;text-align:center;">
    <div style="font-size:14px;color:#888;font-weight:400;">${s.agent.name}</div>
    <div style="font-size:12px;color:#555;margin-top:2px;">${s.agent.brokerage} · <a href="tel:${s.agent.phone}" style="color:#c4a35a;text-decoration:none;">${s.agent.phone}</a></div>
    <div style="margin-top:16px;font-size:10px;color:#444;">
      <a href="#" style="color:#444;text-decoration:underline;">Unsubscribe</a> · <a href="#" style="color:#444;text-decoration:underline;">Privacy</a>
    </div>
  </td></tr>

</table>

</td></tr>
</table>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════
// TEMPLATE 3: OPEN HOUSE INVITE — Event-focused, energetic
// ═══════════════════════════════════════════════════════════
function openHouseInvite(s: any) {
  return `<!DOCTYPE html><html><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light dark">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  @media(prefers-color-scheme:dark){
    .email-body{background:#111!important}
    .email-card{background:#1c1c1e!important}
    .t-primary{color:#f5f5f7!important}
    .bg-subtle{background:#2c2c2e!important}
  }
  @media(max-width:600px){
    .hero-date{font-size:36px!important}
    .content-pad{padding:0 20px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:'Inter',-apple-system,sans-serif;" class="email-body">

<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f5f5f7;">
  You're invited: Open house at ${s.address} on ${s.openHouse}, ${s.openHouseTime}. ${s.price}.
</div>

<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;" class="email-body">
<tr><td align="center" style="padding:24px 16px;">

<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);" class="email-card">

  <!-- Event Header — Bold gradient -->
  <tr><td>
    <div style="background:linear-gradient(135deg,#5856d6 0%,#af52de 50%,#ff6b6b 100%);padding:40px 32px;text-align:center;">
      <div style="font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:3px;text-transform:uppercase;font-weight:500;">You're Invited</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.85);margin-top:8px;font-weight:400;">Open House</div>
      <div style="font-size:48px;font-weight:800;color:#ffffff;margin-top:8px;letter-spacing:-1px;line-height:1;" class="hero-date">${s.openHouse}</div>
      <div style="font-size:20px;color:rgba(255,255,255,0.9);margin-top:8px;font-weight:500;">${s.openHouseTime}</div>
      <div style="font-size:14px;color:rgba(255,255,255,0.7);margin-top:12px;font-weight:400;">${s.address}, ${s.area}</div>
    </div>
  </td></tr>

  <!-- Property Image -->
  <tr><td style="padding:16px 16px 0;">
    <img src="${s.photo}" alt="${s.address}" width="568" style="display:block;width:100%;height:auto;border-radius:16px;">
  </td></tr>

  <!-- Price + Specs -->
  <tr><td style="padding:20px 32px 0;" class="content-pad">
    <div style="background:#f5f5f7;border-radius:14px;padding:20px;text-align:center;" class="bg-subtle">
      <div style="font-size:32px;font-weight:800;color:#1d1d1f;letter-spacing:-1px;" class="t-primary">${s.price}</div>
      <div style="font-size:14px;color:#86868b;margin-top:4px;">${s.beds} BD · ${s.baths} BA · ${s.sqft} sqft · Built ${s.year}</div>
    </div>
  </td></tr>

  <!-- Message -->
  <tr><td style="padding:24px 32px 0;" class="content-pad">
    <p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:0;" class="t-primary">
      Join us for an exclusive first look at this stunning Kitsilano property. Walk through sun-drenched
      rooms, step out onto the private patio, and explore the neighbourhood — all before it hits the
      broader market.
    </p>
    <p style="font-size:15px;color:#1d1d1f;line-height:1.65;margin:16px 0 0;" class="t-primary">
      Refreshments will be provided. Your clients and colleagues are welcome.
    </p>
  </td></tr>

  <!-- Features -->
  <tr><td style="padding:24px 32px 0;" class="content-pad">
    ${s.features.map((f: any) => `
    <div style="display:flex;align-items:center;padding:10px 14px;background:#f0fdf4;border-radius:10px;margin-bottom:6px;">
      <span style="font-size:16px;margin-right:10px;">${f.icon}</span>
      <div>
        <span style="font-size:13px;font-weight:600;color:#15803d;">${f.title}</span>
        <span style="font-size:12px;color:#86868b;margin-left:6px;">${f.desc}</span>
      </div>
    </div>`).join("")}
  </td></tr>

  <!-- RSVP Button -->
  <tr><td style="padding:28px 32px 0;text-align:center;" class="content-pad">
    <a href="#" style="display:inline-block;background:linear-gradient(135deg,#5856d6,#af52de);color:#ffffff;padding:16px 48px;border-radius:980px;text-decoration:none;font-weight:600;font-size:15px;letter-spacing:-0.2px;box-shadow:0 4px 16px rgba(88,86,214,0.3);">RSVP — I'll Be There</a>
    <div style="margin-top:12px;">
      <a href="#" style="font-size:13px;color:#5856d6;text-decoration:none;font-weight:500;">Add to Calendar</a>
      <span style="color:#d1d1d6;margin:0 8px;">·</span>
      <a href="#" style="font-size:13px;color:#5856d6;text-decoration:none;font-weight:500;">Get Directions</a>
    </div>
  </td></tr>

  <!-- Signature -->
  <tr><td style="padding:32px 32px 0;" class="content-pad">
    <table width="100%" style="border-top:1px solid #e5e5ea;padding-top:20px;">
      <tr>
        <td width="48" style="vertical-align:top;">
          <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#5856d6,#ff6b6b);text-align:center;line-height:44px;color:#fff;font-weight:700;font-size:17px;">K</div>
        </td>
        <td style="padding-left:14px;">
          <div style="font-size:15px;font-weight:600;color:#1d1d1f;" class="t-primary">${s.agent.name}</div>
          <div style="font-size:13px;color:#86868b;">${s.agent.brokerage}</div>
          <div style="font-size:13px;"><a href="tel:${s.agent.phone}" style="color:#5856d6;text-decoration:none;font-weight:500;">${s.agent.phone}</a></div>
        </td>
      </tr>
    </table>
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:24px 32px 20px;text-align:center;">
    <p style="font-size:11px;color:#86868b;margin:0;line-height:1.6;">
      ${s.agent.name} · ${s.agent.brokerage} · Vancouver, BC<br>
      <a href="#" style="color:#86868b;text-decoration:underline;">Unsubscribe</a> · <a href="#" style="color:#86868b;text-decoration:underline;">Privacy</a>
    </p>
  </td></tr>

</table>

</td></tr>
</table>
</body></html>`;
}
