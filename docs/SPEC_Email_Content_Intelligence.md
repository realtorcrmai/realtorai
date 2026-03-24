# Email Content Intelligence — Complete Specification

## Overview

This spec defines how the AI generates competitive, personalized email content for each prospect, experiments with different approaches, learns from outcomes, and uses live market data. It also covers the modular email design system and per-realtor branding.

**Full details in memory:** `project_email_content_intelligence.md`

---

## Part 1: Content Generation Pipeline

### Context Assembly (Before Claude Generates)

For each email, the system assembles a context package:

```json
{
  "contact": {
    "name": "Sarah Chen",
    "budget": [800000, 950000],
    "areas": ["Kitsilano", "Point Grey"],
    "property_type": ["condo", "townhouse"],
    "beds": 2,
    "click_history": "last 10 clicks with categories",
    "content_preference": "data_driven",
    "objections": ["thinks Kits is too expensive"],
    "context_notes": "2 kids, Kits Elementary catchment, lease July 31",
    "last_5_subjects": ["Weekly roundup", "New on W 4th", "..."],
    "engagement": { "score": 72, "trend": "accelerating", "speed_min": 5 }
  },
  "market": {
    "new_listings": [
      { "address": "3456 W 4th Ave", "price": 1290000, "beds": 3,
        "match_score": 94, "why_match": "area + beds + price in range" }
    ],
    "price_changes": [
      { "address": "2845 Vine St", "old": 1350000, "new": 1295000,
        "contact_clicked_before": true }
    ],
    "recent_sales": [
      { "address": "1204 W 4th", "sold": 1150000, "dom": 8 }
    ],
    "snapshot": {
      "area": "Kitsilano", "avg_price_3br": 1285000,
      "avg_dom": 12, "inventory_change": "+8%",
      "trend": "balanced, slight buyer advantage"
    }
  },
  "realtor": {
    "name": "Amanda",
    "voice_rules": ["no exclamation marks", "use street addresses"],
    "value_props": ["15 years Kits specialist", "200+ homes sold"],
    "recent_win": "Just sold 1204 W 4th for $1.15M — 3 days"
  },
  "strategy": {
    "email_type": "listing_alert",
    "goal": "get Sarah to book a showing",
    "urgency_factors": ["DOM avg 12 days", "spring market", "lease July"],
    "avoid": ["market updates", "generic area descriptions"],
    "experiment": { "type": "subject_line", "variant": "data-lead" }
  }
}
```

### 6 Content Angles

1. **Personalized Comparisons** — references listings they clicked before
2. **Data-Driven Urgency** — real numbers (DOM, price vs average), no hype
3. **Insider Knowledge** — realtor's own recent transactions as proof
4. **Anticipatory Content** — forward-looking (spring inventory predictions)
5. **Objection-Addressing** — reads objection log, addresses naturally
6. **Life-Event Aware** — countdown to deadlines (lease, mortgage renewal)

---

## Part 2: Content Experimentation

### Per-Contact Sequential A/B Testing

Not audience splits. Each contact gets sequential experiments:

```
Email 1: Address-first subject → Opened 3 min, clicked ✅
Email 2: Hook-first subject → Opened 45 min, no click ❌
Email 3: Question subject → Opened 5 min, clicked ✅
Email 4: Data-lead subject → Opened 2 min, clicked 2x ✅✅

LEARNING: Sarah responds to data-lead and address-first subjects.
→ Future: 80% data-lead/address, 20% exploration
```

### Exploration/Exploitation Balance

- **80%:** Use what works for this contact (exploit)
- **20%:** Try something new (explore)
- Without exploration, AI stops learning and misses changing preferences

### Iteration When Content Fails

```
Open rate drops 83% → 40% over 3 emails:
  1. Check frequency → increased to 3/week? → reduce back
  2. Check subject lines → all similar? → try different pattern
  3. Check market → fewer listings this week? → switch content type
  4. Apply fixes → monitor next 2 emails → log what worked
```

### Content Intelligence Schema (per contact)

```json
{
  "content_intelligence": {
    "winning_patterns": {
      "subject_style": "data-lead",
      "content_angle": "comparison",
      "content_length": "short",
      "cta_style": "specific_property"
    },
    "losing_patterns": {
      "subject_style": ["hype", "question"],
      "content_angle": ["generic_market"]
    },
    "exploration_rate": 0.2,
    "experiments_run": 12,
    "fatigue_signals": {
      "subject_repetition_threshold": 3,
      "content_type_max_consecutive": 4
    }
  }
}
```

---

## Part 3: Data Sources

| Data Type | Source | Frequency |
|---|---|---|
| Contact behavior | CRM (newsletter_intelligence) | Every event |
| Active listings | CRM (listings table) | Real-time |
| New MLS listings | MLS API or manual import | Daily |
| Recent sales (comps) | MLS or BC Assessment | Weekly |
| Market stats | Real Estate Board | Monthly |
| Interest rates | Bank of Canada | As announced |
| Days on market | Calculated from own data | Daily |
| Inventory levels | Own data + MLS count | Weekly |
| Neighbourhood info | Google Places, Walk Score | Monthly cache |
| School ratings | Fraser Institute | Annual |
| Realtor's own data | CRM (listings, deals) | Real-time |
| Platform benchmarks | Cross-realtor aggregate | Weekly |

---

## Part 4: Modular Email Block System

### 10 React Email Blocks

| Block | Purpose |
|---|---|
| `HeroImageBlock` | Full-width property image with dark overlay + text |
| `PropertyCardBlock` | Photo + address + price + beds/baths + CTA |
| `StatBoxBlock` | Big number + label + trend arrow (3-column) |
| `SalesTableBlock` | Recent sales rows (address, price, DOM) |
| `TextBlock` | Personal copy, auto-styled with brand fonts |
| `CTAButtonBlock` | Primary action button in accent color |
| `CountdownBlock` | Days/weeks until deadline |
| `HeadshotSignatureBlock` | Realtor photo + name + contact info |
| `SocialLinksBlock` | Instagram/Facebook/LinkedIn icons |
| `UnsubscribeBlock` | CASL-compliant footer with unsubscribe link |

### 5 Template Patterns (assembled from blocks)

| Template | When | Blocks Used |
|---|---|---|
| Hero Property | Single listing focus | Hero + Text + CTA + Signature |
| Card Grid | Multiple listings | Text + 2-3 Cards + CTA + Signature |
| Data Story | Market stats | Text + StatBoxes + SalesTable + CTA + Signature |
| Personal Note | Relationship moment | Text + Signature (no images) |
| Countdown | Time-sensitive | Countdown + Text + CTA + Signature |

AI selects template + blocks based on content type and per-contact engagement data.

---

## Part 5: Per-Realtor Branding

### Brand Config (JSONB in realtor_agent_config)

```json
{
  "brand_config": {
    "logo_url": "https://...",
    "logo_dark_url": "https://...",
    "headshot_url": "https://...",
    "colors": {
      "primary": "#2C3E50",
      "accent": "#E74C3C",
      "background": "#FFFFFF",
      "text": "#333333",
      "muted": "#95A5A6"
    },
    "fonts": {
      "heading": "Playfair Display",
      "body": "Inter"
    },
    "signature_style": "professional",
    "signature": {
      "name": "Amanda Chen",
      "title": "REALTOR®",
      "brokerage": "RE/MAX City Realty",
      "phone": "604-555-0123",
      "website": "amandachen.com"
    },
    "social": {
      "instagram": "@amandachenhomes",
      "facebook": "amandachenrealty"
    }
  }
}
```

### 4 Brand Presets

| Preset | Colors | Font | Vibe |
|---|---|---|---|
| Classic | Navy + Gold | Playfair Display | Traditional, established |
| Modern | White + Slate | Inter / DM Sans | Clean, contemporary |
| Luxury | Black + Gold | Playfair Display | High-end, exclusive |
| Warm | Cream + Terracotta | Bricolage Grotesque | Approachable, friendly |

### Brand Onboarding Wizard (/settings/brand)

4 steps: Basics (name, logo, headshot) → Style (preset or custom colors/fonts) → Signature (4 styles) → Preview (mobile/desktop/dark mode)

### Brand Propagation

Same brand config feeds into: email templates, website generator, PDF reports, social media content, SMS signatures.

---

## Part 6: Mobile-First + Dark Mode

### Mobile Rules
- Max width 600px, single column on mobile
- Body 16px min, headings 22px
- CTA buttons 44px height (thumb-friendly)
- All tap targets 44x44px minimum
- Preheader: first 90 chars visible in inbox

### Dark Mode
- `@media (prefers-color-scheme: dark)` in all templates
- Logo: transparent PNG with dark-mode variant
- CTA buttons: forced accent color (no auto-inversion)
- Images: subtle border to prevent blending into dark bg

### Email Preview in Approval Queue
Three toggle modes: Mobile (375px) / Desktop (600px) / Dark Mode
Realtor sees exactly what recipient sees before approving.

---

## Implementation Order

| Phase | What |
|---|---|
| 1 | Build 10 React Email blocks (modular, composable) |
| 2 | Brand config table + onboarding wizard |
| 3 | Context assembly pipeline (contact + market + realtor data) |
| 4 | Template selection logic (content type + contact preference → template) |
| 5 | Content experimentation engine (sequential A/B per contact) |
| 6 | Preview system (mobile/desktop/dark mode in approval queue) |
| 7 | Market data ingestion (MLS feed, comps, stats) |
| 8 | Brand intelligence (experiment with brand elements) |

---

*Version 1.0 — 2026-03-23*
