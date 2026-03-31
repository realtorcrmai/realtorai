# ListingFlow Sites — AI Website Generation Platform

### Architecture

**Pre-built components + Claude Agent SDK + Cloudflare Pages**

```
listingflow-sites (Admin Panel) → listingflow-agent (Cloud Agent) → Cloudflare Pages (Static Sites)
                                         ↕
                                   Supabase (Data) + Claude API (Anthropic)
```

The platform generates unique realtor websites automatically:
1. Realtor clicks **"Generate My Website"** in the admin panel
2. **Cloud agent** autonomously searches for top realtor sites in the agent's market, scrapes 3-5 for design inspiration (hidden from user)
3. Agent generates **3 site config JSONs** — each a different style (dark luxury, light modern, bold warm) — by blending scraped design patterns with the realtor's content
4. **Pre-built React components** (`listingflow-sites/src/components/sections/`) render each config into static HTML
5. All 3 variants deploy to **Cloudflare Pages** as preview URLs
6. **Playwright** screenshots each variant at desktop + mobile
7. Realtor sees **3 preview cards** with screenshots — picks their favorite
8. Selected variant promoted to **production** → live URL

### Section Components (9 sections, theme-driven)

Same components render all 3 style variants — the difference is the theme config (colors, fonts), not different code.

| Section | Description |
|---------|-------------|
| Nav | Transparent over hero, sticky on scroll, logo + links |
| Hero | Full-screen image with dark overlay + headline |
| About | Two-column: headshot left, bio + credentials right |
| Stats | 3-column metrics (homes sold, volume, experience) |
| Testimonials | Quote cards with client name + role |
| Listings | Property card grid (photo, address, price, beds/baths) |
| CTA | Full-width banner with button |
| Contact | Simple form: name, email, phone, message |
| Footer | Multi-column: contact info, nav links, areas served |

### 3 Style Presets

| Style | Vibe | Example |
|-------|------|---------|
| Dark Luxury | mikemarfori.com inspired | Black bg, gold accent, Playfair Display |
| Light Modern | Clean, airy | White bg, navy accent, DM Sans |
| Bold & Warm | Energetic, approachable | Cream bg, terracotta accent, Bricolage Grotesque |

### Agent Service

- **Location:** `listingflow-agent/` (separate package in monorepo root)
- **Stack:** Node.js + Express + Anthropic SDK + Playwright
- **API:**
  - `POST /api/generate` — start generation (kicks off autonomous agent)
  - `GET /api/generations/:id` — poll status + get variants with screenshots
  - `POST /api/variants/:id/approve` — promote variant to production
- **Deployment:** Railway or Fly.io (Dockerized)
- **Agent tools:** search (web), scrape (reference sites), crm-data (Supabase), config (Claude generates 3 JSONs), render (ReactDOMServer → HTML), deploy (Cloudflare API), screenshot (Playwright)

### Database Tables (Sites)

| Table | Purpose |
|-------|---------|
| `realtor_sites` | Agent profile, branding, contact info |
| `site_generations` | Generation runs (status, reference scrapes) |
| `site_variants` | 3 variants per generation (config, preview URL, screenshots) |
| `site_pages` | Custom pages |
| `testimonials` | Client testimonials |
| `site_leads` | Contact form submissions |
| `site_media` | Uploaded photos/videos |

### Site Config JSON

Agent generates 3 of these (one per style):
```json
{
  "theme": {
    "colors": { "bg": "#000", "text": "#fff", "accent": "#c9a96e", "muted": "#acacac" },
    "fonts": { "heading": "Playfair Display", "body": "Inter" }
  },
  "nav": { "logo_url": "...", "links": ["About", "Listings", "Contact"] },
  "hero": { "images": ["url1"], "headline": "...", "subheadline": "..." },
  "about": { "headshot_url": "...", "name": "...", "bio": "...", "credentials": ["..."] },
  "stats": { "items": [{ "number": "500+", "label": "Homes Sold" }] },
  "testimonials": { "items": [{ "quote": "...", "name": "...", "role": "Seller" }] },
  "listings": { "items": [{ "photo": "...", "address": "...", "price": "$899,000", "beds": 3, "baths": 2 }] },
  "cta": { "headline": "...", "button_text": "Contact Me", "button_link": "#contact" },
  "contact": { "lead_endpoint": "https://..." },
  "footer": { "phone": "...", "email": "...", "address": "...", "areas": ["Vancouver", "Surrey"] }
}
```

### Environment Variables (Sites)

```
CLOUDFLARE_API_TOKEN=          # Pages API access
CLOUDFLARE_ACCOUNT_ID=         # Account ID
AGENT_SERVICE_URL=             # URL of deployed agent service (e.g. https://lf-agent.fly.dev)
ANTHROPIC_API_KEY=             # For agent service
```
