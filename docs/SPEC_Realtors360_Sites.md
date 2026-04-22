<!-- Extracted from CLAUDE.md v1 during 2026-04-21 audit. See also: AGENTS.md for policy, CLAUDE.md for agent conventions. -->
<!-- docs-audit: realtors360-agent/** -->

# Realtors360 Sites — AI Website Generation Platform

**Architecture:** `realtors360-sites` (admin panel) → `realtors360-agent/` (Claude Agent SDK + Playwright) → Cloudflare Pages (static sites).

**Flow:** Realtor clicks "Generate My Website" → agent scrapes top realtor sites for inspiration → generates 3 style variants (dark luxury, light modern, bold warm) as config JSONs → pre-built React components render to HTML → deploy to Cloudflare Pages → Playwright screenshots → realtor picks favorite → promote to production.

**Agent service:** `realtors360-agent/` — Node.js + Express + Anthropic SDK. API: `POST /api/generate`, `GET /api/generations/:id`, `POST /api/variants/:id/approve`.

**9 section components** (theme-driven, same code renders all 3 styles): Nav, Hero, About, Stats, Testimonials, Listings, CTA, Contact, Footer.

**Tables:** `realtor_sites`, `site_generations`, `site_variants`, `site_pages`, `testimonials`, `site_leads`, `site_media`.

**Env vars:** `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `AGENT_SERVICE_URL`, `ANTHROPIC_API_KEY`.
