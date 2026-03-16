import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SiteConfig } from "../types.js";

// Import section components
// Note: These are copied/symlinked from listingflow-sites/src/components/sections/
// For now we inline minimal render functions that produce the same HTML

/**
 * Render a SiteConfig into a complete static HTML document.
 */
export function renderSiteToHTML(config: SiteConfig): string {
  const { theme, nav, hero, about, stats, testimonials, listings, cta, contact, footer } = config;
  const { heading, body } = theme.fonts;

  // Google Fonts URL
  const fontsParam = [heading, body]
    .filter((f, i, arr) => arr.indexOf(f) === i)
    .map((f) => f.replace(/ /g, "+"))
    .join("&family=");

  const socialLinksHTML = footer.social_links
    ? Object.entries(footer.social_links)
        .filter(([, url]) => url)
        .map(
          ([platform, url]) =>
            `<a href="${url}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:${theme.colors.muted};text-decoration:none;text-transform:capitalize;letter-spacing:1px">${platform}</a>`
        )
        .join("")
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${about.name} — Real Estate</title>
  <meta name="description" content="${hero.subheadline}" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=${fontsParam}:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body { background: ${theme.colors.bg}; color: ${theme.colors.text}; font-family: '${body}', sans-serif; -webkit-font-smoothing: antialiased; }
    a { transition: opacity 0.3s; }
    a:hover { opacity: 0.8; }
    button:hover { opacity: 0.9; }
    img { max-width: 100%; display: block; }
    input:focus, textarea:focus { border-color: ${theme.colors.accent} !important; outline: none; }
    @media (max-width: 768px) {
      .nav-links { display: none !important; }
      .grid-responsive { grid-template-columns: 1fr !important; }
      .grid-2col { grid-template-columns: 1fr !important; }
      .hero-headline { font-size: 36px !important; }
      .section-title { font-size: 28px !important; }
      .stats-number { font-size: 36px !important; }
      .section { padding: 60px 20px !important; }
      .footer-grid { grid-template-columns: 1fr !important; }
    }
  </style>
</head>
<body>

<!-- NAV -->
<nav style="position:fixed;top:0;left:0;right:0;z-index:50;padding:20px 40px;display:flex;align-items:center;justify-content:space-between;background:rgba(0,0,0,0.3);backdrop-filter:blur(12px)">
  <div style="display:flex;align-items:center;gap:12px">
    ${nav.logo_url ? `<img src="${nav.logo_url}" alt="${about.name}" style="height:36px;object-fit:contain" />` : ""}
    <span style="font-family:'${heading}',serif;font-size:20px;font-weight:600;color:${theme.colors.text};letter-spacing:1px;text-transform:uppercase">${about.name}</span>
  </div>
  <div class="nav-links" style="display:flex;align-items:center;gap:32px">
    ${nav.links.map((l) => `<a href="#${l.toLowerCase()}" style="color:${theme.colors.muted};text-decoration:none;font-size:13px;font-weight:500;letter-spacing:2px;text-transform:uppercase">${l}</a>`).join("")}
  </div>
</nav>

<!-- HERO -->
<section id="home" style="position:relative;height:100vh;min-height:600px;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;background:${theme.colors.bg}">
  ${hero.images[0] ? `<div style="position:absolute;inset:0;background-image:url(${hero.images[0]});background-size:cover;background-position:center;filter:brightness(0.4)"></div>` : ""}
  <div style="position:relative;z-index:1;max-width:800px;padding:0 24px">
    <h1 class="hero-headline" style="font-family:'${heading}',serif;font-size:clamp(36px,6vw,72px);font-weight:300;color:${theme.colors.text};line-height:1.1;margin-bottom:24px;letter-spacing:2px">${hero.headline}</h1>
    <p style="font-size:clamp(14px,2vw,18px);color:${theme.colors.muted};line-height:1.6;max-width:600px;margin:0 auto 40px;letter-spacing:1px">${hero.subheadline}</p>
    <a href="#contact" style="display:inline-block;padding:14px 48px;font-size:12px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:${theme.colors.bg};background:${theme.colors.accent};text-decoration:none">Get In Touch</a>
  </div>
</section>

<!-- ABOUT -->
<section id="about" class="section" style="padding:120px 40px;background:${theme.colors.bg}">
  <div class="grid-responsive" style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:minmax(280px,400px) 1fr;gap:80px;align-items:center">
    <div>
      ${about.headshot_url
        ? `<img src="${about.headshot_url}" alt="${about.name}" style="width:100%;aspect-ratio:3/4;object-fit:cover;filter:grayscale(20%)" />`
        : `<div style="width:100%;aspect-ratio:3/4;background:linear-gradient(135deg,${theme.colors.accent}33,${theme.colors.bg});display:flex;align-items:center;justify-content:center;font-size:64px;color:${theme.colors.accent}">${about.name.charAt(0)}</div>`}
    </div>
    <div>
      <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${theme.colors.accent};margin-bottom:16px;font-weight:600">About</p>
      <h2 class="section-title" style="font-family:'${heading}',serif;font-size:clamp(28px,4vw,42px);font-weight:300;color:${theme.colors.text};margin-bottom:32px;line-height:1.2">${about.name}</h2>
      ${about.title ? `<p style="font-size:16px;color:${theme.colors.accent};margin-bottom:24px;font-weight:500">${about.title}</p>` : ""}
      <p style="font-size:16px;line-height:1.8;color:${theme.colors.muted};margin-bottom:32px">${about.bio}</p>
      ${about.credentials.length
        ? `<div style="display:flex;flex-wrap:wrap;gap:8px">${about.credentials.map((c) => `<span style="padding:6px 16px;font-size:11px;letter-spacing:1px;text-transform:uppercase;border:1px solid ${theme.colors.accent}44;color:${theme.colors.accent}">${c}</span>`).join("")}</div>`
        : ""}
    </div>
  </div>
</section>

<!-- STATS -->
${stats.items.length ? `
<section class="section" style="padding:80px 40px;background:${theme.colors.bg};border-top:1px solid ${theme.colors.text}10;border-bottom:1px solid ${theme.colors.text}10">
  <div style="max-width:1000px;margin:0 auto;display:grid;grid-template-columns:repeat(${Math.min(stats.items.length, 4)},1fr);gap:40px;text-align:center">
    ${stats.items.map((s) => `
    <div>
      <div class="stats-number" style="font-family:'${heading}',serif;font-size:clamp(36px,5vw,56px);font-weight:300;color:${theme.colors.accent};line-height:1;margin-bottom:12px">${s.number}</div>
      <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${theme.colors.muted};font-weight:500">${s.label}</div>
    </div>`).join("")}
  </div>
</section>` : ""}

<!-- LISTINGS -->
${listings.items.length ? `
<section id="listings" class="section" style="padding:120px 40px;background:${theme.colors.bg}">
  <div style="max-width:1200px;margin:0 auto">
    <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${theme.colors.accent};margin-bottom:16px;font-weight:600;text-align:center">Featured Properties</p>
    <h2 class="section-title" style="font-family:'${heading}',serif;font-size:clamp(28px,4vw,42px);font-weight:300;color:${theme.colors.text};text-align:center;margin-bottom:64px">Current Listings</h2>
    <div class="grid-responsive" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:24px">
      ${listings.items.map((l) => `
      <div style="overflow:hidden;border:1px solid ${theme.colors.text}10">
        <div style="aspect-ratio:16/10;overflow:hidden;position:relative">
          ${l.photo
            ? `<img src="${l.photo}" alt="${l.address}" style="width:100%;height:100%;object-fit:cover" />`
            : `<div style="width:100%;height:100%;background:linear-gradient(135deg,${theme.colors.accent}22,${theme.colors.bg});display:flex;align-items:center;justify-content:center;color:${theme.colors.muted};font-size:14px">No Photo</div>`}
          ${l.status ? `<span style="position:absolute;top:12px;left:12px;padding:4px 12px;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:600;background:${theme.colors.accent};color:${theme.colors.bg}">${l.status}</span>` : ""}
        </div>
        <div style="padding:24px">
          <div style="font-family:'${heading}',serif;font-size:22px;font-weight:500;color:${theme.colors.accent};margin-bottom:8px">${l.price}</div>
          <div style="font-size:14px;color:${theme.colors.text};margin-bottom:12px">${l.address}</div>
          <div style="display:flex;gap:20px;font-size:12px;color:${theme.colors.muted};letter-spacing:1px;text-transform:uppercase">
            <span>${l.beds} Beds</span><span>${l.baths} Baths</span>${l.sqft ? `<span>${l.sqft} Sqft</span>` : ""}
          </div>
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>` : ""}

<!-- TESTIMONIALS -->
${testimonials.items.length ? `
<section id="testimonials" class="section" style="padding:120px 40px;background:${theme.colors.bg}">
  <div style="max-width:1100px;margin:0 auto">
    <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${theme.colors.accent};margin-bottom:16px;font-weight:600;text-align:center">Client Reviews</p>
    <h2 class="section-title" style="font-family:'${heading}',serif;font-size:clamp(28px,4vw,42px);font-weight:300;color:${theme.colors.text};text-align:center;margin-bottom:64px">What My Clients Say</h2>
    <div class="grid-responsive" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:32px">
      ${testimonials.items.map((t) => `
      <div style="padding:40px;border:1px solid ${theme.colors.text}10;background:${theme.colors.text}05">
        <div style="font-size:48px;line-height:1;color:${theme.colors.accent};margin-bottom:20px;font-family:Georgia,serif">&ldquo;</div>
        <p style="font-size:15px;line-height:1.8;color:${theme.colors.muted};margin-bottom:24px;font-style:italic">${t.quote}</p>
        <div>
          <div style="font-size:14px;font-weight:600;color:${theme.colors.text}">${t.name}</div>
          <div style="font-size:12px;color:${theme.colors.accent};margin-top:4px">${t.role}</div>
        </div>
      </div>`).join("")}
    </div>
  </div>
</section>` : ""}

<!-- CTA -->
<section class="section" style="padding:100px 40px;background:linear-gradient(135deg,${theme.colors.accent}15,${theme.colors.bg});text-align:center">
  <div style="max-width:700px;margin:0 auto">
    <h2 class="section-title" style="font-family:'${heading}',serif;font-size:clamp(28px,4vw,48px);font-weight:300;color:${theme.colors.text};margin-bottom:40px;line-height:1.2">${cta.headline}</h2>
    <a href="${cta.button_link}" style="display:inline-block;padding:16px 56px;font-size:12px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:${theme.colors.bg};background:${theme.colors.accent};text-decoration:none">${cta.button_text}</a>
  </div>
</section>

<!-- CONTACT -->
<section id="contact" class="section" style="padding:120px 40px;background:${theme.colors.bg}">
  <div style="max-width:600px;margin:0 auto;text-align:center">
    <p style="font-size:12px;letter-spacing:3px;text-transform:uppercase;color:${theme.colors.accent};margin-bottom:16px;font-weight:600">Get In Touch</p>
    <h2 class="section-title" style="font-family:'${heading}',serif;font-size:clamp(28px,4vw,42px);font-weight:300;color:${theme.colors.text};margin-bottom:16px">Contact ${about.name.split(" ")[0]}</h2>
    ${footer.phone ? `<p style="font-size:16px;color:${theme.colors.muted};margin-bottom:48px">${footer.phone} &nbsp;|&nbsp; ${footer.email || ""}</p>` : ""}
    <form action="${contact.lead_endpoint}" method="POST" style="display:flex;flex-direction:column;gap:16px;text-align:left">
      <div class="grid-2col" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
        <input name="name" placeholder="Full Name" required style="width:100%;padding:14px 16px;font-size:14px;color:${theme.colors.text};background:transparent;border:1px solid ${theme.colors.text}20;outline:none;font-family:'${body}',sans-serif" />
        <input name="phone" placeholder="Phone" type="tel" style="width:100%;padding:14px 16px;font-size:14px;color:${theme.colors.text};background:transparent;border:1px solid ${theme.colors.text}20;outline:none;font-family:'${body}',sans-serif" />
      </div>
      <input name="email" placeholder="Email Address" type="email" required style="width:100%;padding:14px 16px;font-size:14px;color:${theme.colors.text};background:transparent;border:1px solid ${theme.colors.text}20;outline:none;font-family:'${body}',sans-serif" />
      <textarea name="message" placeholder="Your Message" rows="5" required style="width:100%;padding:14px 16px;font-size:14px;color:${theme.colors.text};background:transparent;border:1px solid ${theme.colors.text}20;outline:none;resize:vertical;font-family:'${body}',sans-serif"></textarea>
      <button type="submit" style="padding:16px;font-size:12px;font-weight:600;letter-spacing:3px;text-transform:uppercase;color:${theme.colors.bg};background:${theme.colors.accent};border:none;cursor:pointer;font-family:'${body}',sans-serif">Send Message</button>
    </form>
  </div>
</section>

<!-- FOOTER -->
<footer style="padding:80px 40px 40px;background:${theme.colors.bg};border-top:1px solid ${theme.colors.text}10">
  <div class="footer-grid" style="max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr;gap:60px">
    <div>
      <h3 style="font-family:'${heading}',serif;font-size:20px;font-weight:500;color:${theme.colors.text};margin-bottom:16px;letter-spacing:1px;text-transform:uppercase">${about.name}</h3>
      ${about.title ? `<p style="font-size:13px;color:${theme.colors.accent};margin-bottom:16px">${about.title}</p>` : ""}
      ${footer.address ? `<p style="font-size:13px;color:${theme.colors.muted};line-height:1.8">${footer.address}</p>` : ""}
      ${footer.phone ? `<p style="font-size:13px;color:${theme.colors.muted};margin-top:8px">${footer.phone}</p>` : ""}
      ${footer.email ? `<p style="font-size:13px;color:${theme.colors.muted};margin-top:4px">${footer.email}</p>` : ""}
    </div>
    <div>
      <h4 style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${theme.colors.accent};margin-bottom:20px;font-weight:600">Quick Links</h4>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${nav.links.map((l) => `<a href="#${l.toLowerCase()}" style="color:${theme.colors.muted};text-decoration:none;font-size:13px">${l}</a>`).join("")}
      </div>
    </div>
    ${footer.areas.length ? `
    <div>
      <h4 style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:${theme.colors.accent};margin-bottom:20px;font-weight:600">Areas Served</h4>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${footer.areas.map((a) => `<span style="color:${theme.colors.muted};font-size:13px">${a}</span>`).join("")}
      </div>
    </div>` : ""}
  </div>
  <div style="max-width:1100px;margin:60px auto 0;padding-top:24px;border-top:1px solid ${theme.colors.text}10;display:flex;justify-content:space-between;align-items:center">
    <p style="font-size:11px;color:${theme.colors.muted};letter-spacing:1px">&copy; ${new Date().getFullYear()} ${about.name}. All rights reserved.</p>
    ${socialLinksHTML ? `<div style="display:flex;gap:20px">${socialLinksHTML}</div>` : ""}
  </div>
</footer>

</body>
</html>`;
}
