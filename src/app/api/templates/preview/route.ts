import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/templates/preview?template=listing_alert
 * Returns rendered HTML email for preview in a new tab.
 * Uses sample listing data so the realtor can see the actual design.
 */
export async function GET(request: NextRequest) {
  const template = request.nextUrl.searchParams.get("template") || "listing_alert";

  const SAMPLE = {
    address: "3456 W 4th Avenue",
    area: "Kitsilano, Vancouver",
    price: "$1,290,000",
    beds: 3, baths: 2, sqft: "1,847", year: 2019,
    photo: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1200&h=600&fit=crop",
    photos: [
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=580&h=380&fit=crop",
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=580&h=380&fit=crop",
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=580&h=380&fit=crop",
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=580&h=380&fit=crop",
    ],
    features: ["Ground Floor — Fenced patio, dog-friendly", "Kits Elementary — 4 min walk", "Sub-Zero, Wolf, Bosch appliances"],
    openHouse: "Saturday Mar 29 · 2:00 – 4:00 PM",
  };

  const templates: Record<string, string> = {
    listing_alert: buildListingAlert(SAMPLE),
    luxury_showcase: buildLuxuryShowcase(SAMPLE),
    open_house: buildOpenHouseInvite(SAMPLE),
  };

  const html = templates[template] || templates.listing_alert;

  return new NextResponse(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function wrapper(content: string, bgColor = "#f6f5ff") {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light dark"><style>
@media(prefers-color-scheme:dark){.email-bg{background:#1a1535!important}.email-card{background:#2a2555!important}.t-dark{color:#e8e5f5!important}}
@media(max-width:600px){.photo-grid td{display:block!important;width:100%!important}}
</style></head><body style="margin:0;padding:20px 0;background:${bgColor};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;" class="email-bg">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 20px 60px rgba(79,53,210,0.12);" class="email-card">
${content}
</div>
<div style="text-align:center;padding:20px;"><span style="font-size:11px;color:#a0a0b0;">This is a preview with sample data. Actual emails will use your listing details.</span></div>
</body></html>`;
}

function signature() {
  return `<div style="padding:0 32px 24px;"><hr style="border-color:#e8e5f5;margin:0 0 16px;"><table cellpadding="0" cellspacing="0"><tr>
<td style="vertical-align:top;padding-right:10px;"><div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#4f35d2,#ff5c3a);text-align:center;line-height:40px;color:#fff;font-weight:700;font-size:16px;">K</div></td>
<td><div style="font-size:14px;font-weight:600;">Kunal</div><div style="font-size:12px;color:#6b6b8d;">REALTOR® · RE/MAX City Realty</div><div style="font-size:12px;"><a href="#" style="color:#4f35d2;text-decoration:none;">604-555-0123</a></div></td>
</tr></table></div>
<div style="background:#f8f7ff;padding:12px 32px;text-align:center;border-top:1px solid #f0eef5;">
<p style="font-size:10px;color:#a0a0b0;margin:0;">Kunal · RE/MAX City Realty · 123 W 4th Ave, Vancouver BC · <a href="#" style="color:#a0a0b0;">Unsubscribe</a></p></div>`;
}

type Sample = { address: string; area: string; price: string; beds: number; baths: number; sqft: string; year: number; photo: string; photos: string[]; features: string[]; openHouse: string };

function buildListingAlert(s: Sample) {
  return wrapper(`
<div style="padding:20px 32px;text-align:center;border-bottom:1px solid #f0eef5;"><span style="font-size:20px;font-weight:800;color:#4f35d2;">ListingFlow</span><span style="font-size:12px;color:#a0a0b0;margin-left:8px;">by Kunal</span></div>
<div style="position:relative;"><img src="${s.photo}" alt="Property" width="600" style="display:block;width:100%;height:auto;">
<div style="position:absolute;bottom:0;left:0;right:0;padding:24px 32px;background:linear-gradient(transparent,rgba(0,0,0,0.7));">
<div style="font-size:13px;color:#c9a96e;font-weight:600;letter-spacing:1px;text-transform:uppercase;">New to Market</div>
<div style="font-size:26px;font-weight:800;color:#fff;margin-top:4px;">${s.address}</div>
<div style="font-size:16px;color:#e0e0e0;">${s.area}</div></div></div>
<div style="background:#f8f7ff;padding:16px 32px;border-bottom:1px solid #f0eef5;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="text-align:center;"><div style="font-size:28px;font-weight:800;color:#4f35d2;">${s.price}</div><div style="font-size:11px;color:#6b6b8d;text-transform:uppercase;">List Price</div></td>
<td width="1" style="background:#e8e5f5;"></td>
<td style="text-align:center;"><div style="font-size:20px;font-weight:700;">${s.beds} <span style="font-size:12px;color:#6b6b8d;">BD</span> · ${s.baths} <span style="font-size:12px;color:#6b6b8d;">BA</span></div><div style="font-size:11px;color:#6b6b8d;">${s.sqft} sqft</div></td>
<td width="1" style="background:#e8e5f5;"></td>
<td style="text-align:center;"><div style="font-size:20px;font-weight:700;color:#059669;">${s.year}</div><div style="font-size:11px;color:#6b6b8d;">Built</div></td>
</tr></table></div>
<div style="padding:24px 32px;">
<p style="font-size:15px;color:#3a3a5c;line-height:1.7;" class="t-dark">I'm pleased to share my newest listing in ${s.area.split(",")[0]}. This ground floor unit offers a private fenced south-facing patio, premium Sub-Zero and Wolf appliances, and engineered hardwood throughout.</p>
<p style="font-size:15px;color:#3a3a5c;line-height:1.7;margin-top:12px;" class="t-dark">Priced at <strong>4% below the area average</strong>. Similar units sold within 8-12 days.</p></div>
<div style="padding:0 32px 20px;">${s.features.map(f => `<div style="padding:8px 12px;background:#f0fdf4;border-radius:6px;margin-bottom:4px;font-size:13px;">✓ <strong style="color:#059669;">${f.split("—")[0].trim()}</strong>${f.includes("—") ? " — " + f.split("—")[1].trim() : ""}</div>`).join("")}</div>
<div style="padding:0 32px 20px;"><table width="100%" cellpadding="0" cellspacing="0" class="photo-grid"><tr>
<td width="48%" style="padding:4px;"><img src="${s.photos[0]}" width="100%" style="border-radius:8px;display:block;"></td><td width="4%"></td>
<td width="48%" style="padding:4px;"><img src="${s.photos[1]}" width="100%" style="border-radius:8px;display:block;"></td></tr><tr>
<td width="48%" style="padding:4px;"><img src="${s.photos[2]}" width="100%" style="border-radius:8px;display:block;"></td><td width="4%"></td>
<td width="48%" style="padding:4px;"><img src="${s.photos[3]}" width="100%" style="border-radius:8px;display:block;"></td></tr></table></div>
<div style="padding:0 32px 20px;"><div style="background:#fff8f0;border:1px solid #fde68a;border-radius:8px;padding:12px;text-align:center;">
<div style="font-size:10px;font-weight:700;color:#92400e;text-transform:uppercase;">Open House</div>
<div style="font-size:14px;font-weight:600;margin-top:4px;">${s.openHouse}</div></div></div>
<div style="padding:0 32px 24px;text-align:center;"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#4f35d2,#6c4fe6);color:#fff;padding:16px 48px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 20px rgba(79,53,210,0.3);">Schedule a Private Viewing</a></div>
${signature()}`);
}

function buildLuxuryShowcase(s: Sample) {
  return wrapper(`
<div style="background:#0a0a0a;padding:20px 32px;text-align:center;"><span style="font-size:20px;font-weight:800;color:#c9a96e;letter-spacing:2px;">LISTINGFLOW</span><span style="font-size:11px;color:#666;margin-left:8px;">by Kunal</span></div>
<div style="position:relative;"><img src="${s.photo}" alt="Property" width="600" style="display:block;width:100%;height:auto;">
<div style="position:absolute;bottom:0;left:0;right:0;padding:32px;background:linear-gradient(transparent,rgba(0,0,0,0.85));">
<div style="font-size:11px;color:#c9a96e;font-weight:600;letter-spacing:3px;text-transform:uppercase;">Exclusive · Luxury Living</div>
<div style="font-size:32px;font-weight:300;color:#fff;margin-top:8px;letter-spacing:1px;">${s.address}</div>
<div style="font-size:16px;color:#999;margin-top:4px;">${s.area}</div></div></div>
<div style="background:#111;padding:20px 32px;">
<table width="100%" cellpadding="0" cellspacing="0"><tr>
<td style="text-align:center;"><div style="font-size:32px;font-weight:300;color:#c9a96e;">${s.price}</div></td>
<td width="1" style="background:#333;"></td>
<td style="text-align:center;color:#999;font-size:14px;">${s.beds} Bedrooms · ${s.baths} Bathrooms · ${s.sqft} sq ft</td>
</tr></table></div>
<div style="background:#0a0a0a;padding:32px;">
<p style="font-size:15px;color:#bbb;line-height:1.8;">An exceptional residence in the heart of ${s.area.split(",")[0]}. This property represents the pinnacle of contemporary living — thoughtfully designed spaces, premium materials, and an unparalleled location.</p>
<div style="margin:24px 0;"><table width="100%" cellpadding="0" cellspacing="0" class="photo-grid"><tr>
<td width="48%" style="padding:4px;"><img src="${s.photos[0]}" width="100%" style="border-radius:4px;display:block;"></td><td width="4%"></td>
<td width="48%" style="padding:4px;"><img src="${s.photos[1]}" width="100%" style="border-radius:4px;display:block;"></td></tr><tr>
<td width="48%" style="padding:4px;"><img src="${s.photos[2]}" width="100%" style="border-radius:4px;display:block;"></td><td width="4%"></td>
<td width="48%" style="padding:4px;"><img src="${s.photos[3]}" width="100%" style="border-radius:4px;display:block;"></td></tr></table></div>
<div style="text-align:center;margin:24px 0;"><a href="#" style="display:inline-block;background:transparent;color:#c9a96e;padding:14px 48px;border:1px solid #c9a96e;border-radius:0;text-decoration:none;font-weight:600;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Request a Private Viewing</a></div></div>
<div style="background:#111;padding:20px 32px;text-align:center;">
<p style="font-size:13px;color:#666;margin:0;">Kunal · REALTOR® · RE/MAX City Realty · 604-555-0123</p>
<p style="font-size:10px;color:#444;margin:8px 0 0;"><a href="#" style="color:#444;">Unsubscribe</a></p></div>
`, "#0a0a0a");
}

function buildOpenHouseInvite(s: Sample) {
  return wrapper(`
<div style="padding:20px 32px;text-align:center;border-bottom:1px solid #f0eef5;"><span style="font-size:20px;font-weight:800;color:#4f35d2;">ListingFlow</span></div>
<div style="padding:32px;text-align:center;background:linear-gradient(135deg,#4f35d2 0%,#6c4fe6 100%);">
<div style="font-size:12px;color:rgba(255,255,255,0.7);letter-spacing:2px;text-transform:uppercase;">You're Invited</div>
<div style="font-size:28px;font-weight:800;color:#fff;margin:8px 0;">Open House</div>
<div style="font-size:20px;font-weight:600;color:#fff;">${s.openHouse}</div>
<div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:8px;">${s.address}, ${s.area}</div></div>
<img src="${s.photo}" alt="Property" width="600" style="display:block;width:100%;height:auto;">
<div style="padding:24px 32px;">
<div style="background:#f8f7ff;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
<div style="font-size:28px;font-weight:800;color:#4f35d2;">${s.price}</div>
<div style="font-size:14px;color:#6b6b8d;margin-top:4px;">${s.beds} BD · ${s.baths} BA · ${s.sqft} sqft · Built ${s.year}</div></div>
<p style="font-size:15px;color:#3a3a5c;line-height:1.7;" class="t-dark">Join us for an exclusive viewing of this stunning property. Refreshments will be provided. Your clients are welcome — please RSVP below.</p>
${s.features.map(f => `<div style="padding:8px 12px;background:#f0fdf4;border-radius:6px;margin-top:4px;font-size:13px;">✓ <strong style="color:#059669;">${f.split("—")[0].trim()}</strong></div>`).join("")}
<div style="text-align:center;margin:24px 0;"><a href="#" style="display:inline-block;background:linear-gradient(135deg,#4f35d2,#6c4fe6);color:#fff;padding:16px 48px;border-radius:10px;text-decoration:none;font-weight:700;font-size:16px;box-shadow:0 4px 20px rgba(79,53,210,0.3);">RSVP — I'll Be There</a></div>
<div style="text-align:center;"><a href="#" style="font-size:13px;color:#4f35d2;text-decoration:none;">Add to Calendar</a> · <a href="#" style="font-size:13px;color:#4f35d2;text-decoration:none;">Get Directions</a></div></div>
${signature()}`);
}
