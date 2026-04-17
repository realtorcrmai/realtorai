# PRD — Email Quality & Design Redesign
**Area C: 10 Gaps**  
**Date:** 2026-04-17  
**Reference:** EVVancouver listing email (https://mailchi.mp/evvancouver/1207-1277-nelson-street-6018632)  
**Status:** Approved for Sprint 3–4  
**Parent Plan:** [IMPL_Newsletter_Journey_Email_Gaps_2026_04_17.md](IMPL_Newsletter_Journey_Email_Gaps_2026_04_17.md)

---

## Design Standard

The target is an Apple-like email aesthetic as exemplified by the EVVancouver reference:
- **White space is the primary design element** — generous padding creates breathing room
- **One font family** — system-ui / SF Pro, never mixed with serif
- **Photography does the selling** — minimal copy, maximum imagery
- **Metrics as text** — no colored widget boxes
- **Restrained CTAs** — dark on white or white on dark, no gradients
- **Color used once** — accent on CTA button only
- **Zero emoji in listing emails** — emoji only for casual drip types

---

## G-E01 — Two Competing Design Systems

### Problem
The email system has two visual identities that cannot coexist:
1. **CRM system** (`email-blocks.ts`): Purple `#4f35d2`, system-ui font, widget-style UI
2. **Editorial system** (`blocks/editorial/*.tsx`): Forest green `#1a2e1a`, gold `#c9a96e`, Georgia serif

When both render in the same email pipeline, the result is visually incoherent. Listing emails for luxury properties look like CRM dashboards.

### Acceptance Criteria
- [ ] Single unified design system with a configurable `theme` parameter
- [ ] Three built-in themes: `standard` (current purple CRM), `luxury` (white/charcoal, editorial restraint), `editorial` (forest green + gold for market commentary)
- [ ] Theme is selected per-email-type (default: luxury for listing emails, editorial for market updates, standard for drip sequences)
- [ ] Realtor can override theme per send in their agent config
- [ ] All blocks in `email-blocks.ts` accept a `theme` parameter and render accordingly
- [ ] Editorial blocks in `blocks/editorial/` reference the same token file

### Implementation
See G-E02 for the token file structure. Theme selection happens in `assembleEmail()`:

```typescript
export function assembleEmail(
  emailType: string,
  data: EmailData,
  theme: "standard" | "luxury" | "editorial" = getDefaultTheme(emailType)
): string {
  const tokens = THEMES[theme];
  // Pass tokens to all block renderers
}

function getDefaultTheme(emailType: string): Theme {
  const luxuryTypes = ["listing_alert", "luxury_showcase", "open_house_invite", "price_drop_alert"];
  const editorialTypes = ["market_update", "neighbourhood_guide", "just_sold"];
  if (luxuryTypes.includes(emailType)) return "luxury";
  if (editorialTypes.includes(emailType)) return "editorial";
  return "standard";
}
```

### Effort: 8 hours (depends on G-E02 being done first)

---

## G-E02 — No Design Token File

### Problem
50+ hardcoded hex color values are scattered across `email-blocks.ts` (696 lines). No single source of truth. Colors slightly drift between blocks: `#e8e5f5` vs `#e8e2d5` for the same "border grey" concept. Updating brand colors requires grep-and-replace across the entire file.

### Acceptance Criteria
- [ ] New file `src/lib/email-design-tokens.ts` created as the single source of truth
- [ ] Tokens cover: colors, typography scale, spacing scale, border radius, shadows
- [ ] Three theme objects: `STANDARD_THEME`, `LUXURY_THEME`, `EDITORIAL_THEME`
- [ ] All blocks in `email-blocks.ts` import and use tokens — zero hardcoded hex values in blocks
- [ ] Editorial blocks in `blocks/editorial/` import and use tokens

### Token Structure

```typescript
// src/lib/email-design-tokens.ts

export type Theme = {
  colors: {
    bg: string;               // Page background
    surface: string;          // Card/section background
    surfaceAlt: string;       // Alternating row / secondary surface
    border: string;           // Dividers, card borders
    text: string;             // Primary body text
    textMuted: string;        // Secondary text, captions
    textInverse: string;      // Text on dark backgrounds
    accent: string;           // Brand accent (CTA buttons, links)
    accentHover: string;      // Hover state for accent
    positive: string;         // Price up, good news
    negative: string;         // Price down, alerts
    headerBg: string;         // Email header background
    footerBg: string;         // Footer background
    footerText: string;       // Footer text color
  };
  typography: {
    fontFamily: string;
    fontFamilyHeading: string;  // May differ (serif for editorial)
    sizes: {
      display: string;    // 32px hero display
      h1: string;         // 24px main heading
      h2: string;         // 20px section heading
      h3: string;         // 17px sub-heading
      body: string;       // 15px body text
      small: string;      // 13px captions
      micro: string;      // 11px footer
    };
    lineHeight: {
      tight: string;      // 1.3 headings
      normal: string;     // 1.6 body
      loose: string;      // 1.8 long-form
    };
    weight: {
      normal: string;     // 400
      medium: string;     // 500
      semibold: string;   // 600
      bold: string;       // 700
      heavy: string;      // 800
    };
  };
  spacing: {
    xs: string;    // 4px
    sm: string;    // 8px
    md: string;    // 16px
    lg: string;    // 24px
    xl: string;    // 32px
    xxl: string;   // 48px
    section: string; // 40px between sections
  };
  radius: {
    sm: string;    // 4px
    md: string;    // 8px
    lg: string;    // 12px
    xl: string;    // 16px
    full: string;  // 9999px
  };
  shadow: {
    card: string;  // Box shadow for cards
    sm: string;    // Subtle shadow
  };
};

export const LUXURY_THEME: Theme = {
  colors: {
    bg: "#ffffff",
    surface: "#ffffff",
    surfaceAlt: "#f9f9f9",
    border: "#e8e8e8",
    text: "#1a1a1a",
    textMuted: "#6b6b6b",
    textInverse: "#ffffff",
    accent: "#1a1a1a",           // Dark CTA — premium, not purple
    accentHover: "#333333",
    positive: "#1a6e3c",
    negative: "#b91c1c",
    headerBg: "#ffffff",
    footerBg: "#f5f5f5",
    footerText: "#999999",
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', Arial, sans-serif",
    fontFamilyHeading: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
    sizes: { display: "32px", h1: "24px", h2: "20px", h3: "17px", body: "15px", small: "13px", micro: "11px" },
    lineHeight: { tight: "1.3", normal: "1.6", loose: "1.8" },
    weight: { normal: "400", medium: "500", semibold: "600", bold: "700", heavy: "800" },
  },
  spacing: { xs: "4px", sm: "8px", md: "16px", lg: "24px", xl: "32px", xxl: "48px", section: "40px" },
  radius: { sm: "4px", md: "8px", lg: "12px", xl: "16px", full: "9999px" },
  shadow: {
    card: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    sm: "0 1px 2px rgba(0,0,0,0.05)",
  },
};

export const STANDARD_THEME: Theme = {
  colors: {
    bg: "#f4f2ff",
    surface: "#ffffff",
    surfaceAlt: "#f5f5f7",
    border: "#e8e5f5",
    text: "#1a1535",
    textMuted: "#6b6b8d",
    textInverse: "#ffffff",
    accent: "#4f35d2",
    accentHover: "#3d28a8",
    positive: "#059669",
    negative: "#dc2626",
    headerBg: "#4f35d2",
    footerBg: "#f5f5f7",
    footerText: "#a0a0b0",
  },
  // ... (current values, systematized)
};

export const EDITORIAL_THEME: Theme = {
  colors: {
    bg: "#f9f7f2",
    surface: "#ffffff",
    surfaceAlt: "#f0ebe0",
    border: "#e8e2d5",
    text: "#4a4a3a",
    textMuted: "#6b6b5a",
    textInverse: "#ffffff",
    accent: "#1a2e1a",          // Forest green CTA
    accentHover: "#0f1f0f",
    positive: "#1a6e3c",
    negative: "#b91c1c",
    headerBg: "#1a2e1a",
    footerBg: "#f0ebe0",
    footerText: "#6b6b5a",
  },
  // ... editorial values
};

export const THEMES = {
  standard: STANDARD_THEME,
  luxury: LUXURY_THEME,
  editorial: EDITORIAL_THEME,
};
```

### Effort: 4 hours

---

## G-E03 — No Modular Typography Scale

### Problem
Font sizes jump from 11px to 32px with no modular scale. Georgia serif and system-ui both appear in the same email. No consistent line-height values — many blocks use browser defaults, causing inconsistent rendering across email clients.

### Acceptance Criteria
- [ ] All blocks use typography tokens from `email-design-tokens.ts`
- [ ] Font sizes follow a strict scale: 11, 13, 15, 17, 20, 24, 32px (no values between these)
- [ ] One font family per theme (no mixing)
- [ ] Line heights standardized: 1.3 (headings), 1.6 (body), 1.8 (long-form text)
- [ ] Font weights limited to: 400, 600, 700 (three weights only per theme)
- [ ] Letter spacing: 0.02em on all-caps labels, 0 on body text

### Key changes per block type
| Block | Current | Target |
|-------|---------|--------|
| Hero headline | 28px Georgia bold | 32px system-ui 700 |
| Section heading | 18-22px mixed | 20px system-ui 700 |
| Body paragraph | 14-16px mixed | 15px system-ui 400, line-height 1.6 |
| Stats label | 11-13px mixed | 11px system-ui 600, letter-spacing 0.08em, uppercase |
| Stats value | 20-28px mixed | 24px system-ui 700 |
| Footer | 11-13px mixed | 11px system-ui 400, line-height 1.5 |

### Effort: 3 hours (after G-E02)

---

## G-E04 — No 8px Spacing Grid

### Problem
Padding values used across blocks: 4, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32, 36, 40px — 12 distinct values with no consistent rhythm. Emails feel visually uneven because adjacent sections don't align.

### Acceptance Criteria
- [ ] All padding and margin values use multiples of 8px only: 8, 16, 24, 32, 40, 48px
- [ ] Exception: 4px allowed for fine spacing (icon gaps, badge padding)
- [ ] Section separators: 40px top + bottom padding (not 24px or 32px)
- [ ] Card inner padding: 24px
- [ ] Button padding: 12px top/bottom, 24px left/right
- [ ] All blocks updated to use spacing tokens

### Effort: 3 hours (after G-E02)

---

## G-E05 — Journey Phase Does Not Influence Block Layout

### Problem
Every contact — whether a cold lead or an active buyer who clicked "Book Showing" three times — receives the exact same block composition for a given email type. The AI generates different **text** but the **layout and block selection are static**.

This is a significant missed opportunity. The EVVancouver reference is a pure listing showcase (hero + stats + photos + agent). But for a contact who just clicked "book showing," that layout should include a prominent booking section. For a dormant contact re-engaged, it should be warmer and simpler.

### Phase-to-Layout Mapping Required

| Phase | Email Type | Layout Variant |
|-------|-----------|---------------|
| `lead` | listing_alert | Full showcase: hero + stats + photos + copy + soft CTA |
| `active` | listing_alert | Booking-forward: hero + stats + photos + large booking CTA + open house times |
| `dormant` | listing_alert | Re-engagement: hero + 1 photo + warm personal note + single CTA |
| `past_client` | home_anniversary | Equity-focused: anniversary header + equity comparison + referral ask |
| `under_contract` | closing_checklist | Checklist layout: timeline steps + inspection block + contact block |
| High intent (score ≥ 70) | any | Priority booking prompt pinned to top |

### Acceptance Criteria
- [ ] `assembleEmail()` accepts `journeyPhase` and `engagementScore` parameters
- [ ] Block list selection varies by phase (not just content)
- [ ] `active` phase listing email always includes `openHouse` block if open house data present
- [ ] `dormant` phase listing email uses simplified 3-block layout (hero, note, cta only)
- [ ] `past_client` home anniversary email always includes `anniversaryComparison` + referral CTA
- [ ] High engagement score (≥ 70) injects a "priority" booking banner at the top of any email
- [ ] Block layout changes are documented in the email type configuration object

### Implementation

**`src/lib/email-blocks.ts` — dynamic block selection:**

```typescript
const TEMPLATE_BLOCKS: Record<string, Record<string, string[]>> = {
  listing_alert: {
    lead: ["header", "heroImage", "priceBar", "personalNote", "featureList", "photoGallery", "priceComparison", "cta", "agentCard", "footer"],
    active: ["header", "heroImage", "priceBar", "openHouse", "photoGallery", "personalNote", "cta", "agentCard", "footer"],
    dormant: ["header", "heroImage", "personalNote", "cta", "agentCard", "footer"],
    default: ["header", "heroImage", "priceBar", "personalNote", "photoGallery", "cta", "agentCard", "footer"],
  },
  market_update: {
    lead: ["header", "heroGradient", "personalNote", "statsRow", "recentSales", "cta", "agentCard", "footer"],
    active: ["header", "heroGradient", "statsRow", "recentSales", "propertyGrid", "cta", "agentCard", "footer"],
    dormant: ["header", "heroGradient", "personalNote", "cta", "agentCard", "footer"],
    default: ["header", "heroGradient", "statsRow", "personalNote", "recentSales", "cta", "agentCard", "footer"],
  },
  // ... all other types
};

export function assembleEmail(
  emailType: string,
  data: EmailData,
  theme: Theme = "luxury",
  journeyPhase: string = "lead",
  engagementScore: number = 0
): string {
  const typeBlocks = TEMPLATE_BLOCKS[emailType] ?? TEMPLATE_BLOCKS.welcome;
  const phaseBlocks = typeBlocks[journeyPhase] ?? typeBlocks.default ?? Object.values(typeBlocks)[0];
  
  // High-intent modifier: inject priority booking block at top
  const blockList = engagementScore >= 70 && data.booking_url
    ? ["priorityBookingBanner", ...phaseBlocks]
    : phaseBlocks;
  
  const tokens = THEMES[theme];
  return renderBlocks(blockList, data, tokens);
}
```

### Effort: 8 hours

---

## G-E06 — `priceBar` Block Renders as UI Widgets

### Problem
The `priceBar` block renders beds/baths/sqft/price as colored box cards with grey background fills and border-radius. This looks like a CRM dashboard widget, not a premium real estate email. The EVVancouver reference shows this as clean, editorial text: "BEDS: 2 | BATHS: 3 | HOME SIZE: 1,335 sq.ft." followed by a large price on its own line.

### Current Output (simplified)
```html
<table>
  <tr>
    <td style="background:#f5f5f7; border-radius:8px; padding:12px; text-align:center">
      <div style="font-size:24px; font-weight:700">2</div>
      <div style="font-size:11px; color:#888">BEDS</div>
    </td>
    <td style="background:#f5f5f7; ...">3</div>BATHS</td>
    <td style="background:#f5f5f7; ...">1,335</div>SQ FT</td>
  </tr>
</table>
<div style="font-size:28px; font-weight:700; color:#4f35d2">$2,199,000</div>
```

### Target Output (EVVancouver-style)
```html
<p style="font:600 13px/1 system-ui; letter-spacing:0.06em; color:#6b6b6b; text-transform:uppercase; margin:0 0 8px">
  2 Beds &nbsp;·&nbsp; 3 Baths &nbsp;·&nbsp; 1,335 sq.ft.
</p>
<p style="font:700 32px/1.1 system-ui; color:#1a1a1a; margin:0 0 24px">
  $2,199,000
</p>
```

### Acceptance Criteria
- [ ] `luxury` theme `priceBar`: single line of text metrics, separator dot/pipe, price on next line in large type
- [ ] `standard` theme `priceBar`: can retain the box widget style (appropriate for CRM-style emails)
- [ ] No background fill on metric cells in luxury theme
- [ ] Price in `luxury` theme: 32px, 700 weight, dark charcoal (not accent color)
- [ ] Metrics label: 11px, 600, uppercase, letter-spacing 0.06em, muted color

### Effort: 3 hours

---

## G-E07 — `openHouse` Block Uses Gradient Too Loud for Luxury

### Problem
The `openHouse` block renders with a coral/purple gradient background, large emoji, and bold styling. For a $2M listing email, this creates jarring visual noise. The EVVancouver reference shows open house times as two clean lines of text, possibly in a lightly bordered box.

### Current output
```html
<div style="background:linear-gradient(135deg, #ff5c3a, #4f35d2); border-radius:12px; padding:24px">
  <div style="color:white; font-size:16px">🏠 Open House</div>
  <div style="color:white">Saturday April 19 • 2:00 PM – 4:00 PM</div>
</div>
```

### Target output (luxury theme)
```html
<table style="border:1px solid #e8e8e8; border-radius:8px; width:100%">
  <tr>
    <td style="padding:20px 24px">
      <p style="font:600 11px/1 system-ui; color:#6b6b6b; letter-spacing:0.08em; text-transform:uppercase; margin:0 0 8px">
        Open House
      </p>
      <p style="font:500 15px/1.5 system-ui; color:#1a1a1a; margin:0">
        Saturday, April 19 · 2:00 – 4:00 PM<br>
        Sunday, April 20 · 2:00 – 4:00 PM
      </p>
    </td>
  </tr>
</table>
```

### Acceptance Criteria
- [ ] `luxury` theme: bordered box, no gradient, no emoji, plain text dates/times
- [ ] `standard` theme: can retain gradient (appropriate for drip/nurture emails)
- [ ] Multiple open house slots displayed as separate lines within the same box
- [ ] Box border matches theme border color token

### Effort: 2 hours

---

## G-E08 — No Luxury Listing Template Composition

### Problem
The system has all the building blocks needed to match the EVVancouver reference but no single template that composes them in the right order with the right visual weight. The current `listing_alert` template includes too many blocks (12 blocks including stats boxes, mortgage calculator, price comparison table) — a luxury listing email should be 6–7 blocks maximum.

### Reference Layout (EVVancouver)
```
[Logo / Agent Name — minimal header]
[Hero Image — full width, address overlay]
[Price + Metrics — text-only line]
[Property Description — 2–3 sentences, aspirational]
[Open House — bordered box]
[Photo Gallery — 2-column, 8–10 photos]
[Agent Card — minimal: name, phone, email]
[Footer — 11px, grey, unsubscribe]
```

### Acceptance Criteria
- [ ] New `luxury_listing` template defined in `TEMPLATE_BLOCKS`
- [ ] Template uses exactly 7 blocks in order: header, heroImage, priceBar (luxury), personalNote, openHouse (luxury), photoGallery, agentCard, footer
- [ ] Template uses `LUXURY_THEME` by default
- [ ] Hero image is full-width (no padding on sides)
- [ ] Photo gallery uses 2-column grid with 2px gap (not 8px)
- [ ] Agent card in luxury theme: name + title + phone (no avatar circle, no brokerage box)
- [ ] Maximum 3 sentences in the personal note block
- [ ] Template is selected automatically when: email_type = `listing_alert` AND listing price > $800,000 (configurable threshold)

### New `luxury_listing` email rendering

**`src/lib/email-blocks.ts` — new luxury header block:**
```typescript
function luxuryHeader(data: EmailData, tokens: Theme): string {
  return `
<table width="100%" cellpadding="0" cellspacing="0">
  <tr>
    <td style="padding:32px 48px 24px; text-align:center">
      <p style="font:500 11px/1 ${tokens.typography.fontFamily}; 
                letter-spacing:0.12em; 
                text-transform:uppercase; 
                color:${tokens.colors.textMuted}; 
                margin:0">
        ${data.branding.name} &nbsp;·&nbsp; ${data.branding.brokerage}
      </p>
    </td>
  </tr>
</table>`;
}
```

**Full-bleed hero (no side padding):**
```typescript
function luxuryHero(data: EmailData, tokens: Theme): string {
  if (!data.heroImage) return "";
  return `
<table width="600" cellpadding="0" cellspacing="0">
  <tr>
    <td style="position:relative; padding:0">
      <img src="${data.heroImage}" width="600" alt="${data.address || 'Property'}" 
           style="display:block; width:100%; height:auto; max-height:400px; object-fit:cover">
      <div style="background:linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%); 
                  position:absolute; bottom:0; left:0; right:0; padding:24px 32px">
        <p style="font:700 22px/1.2 ${tokens.typography.fontFamilyHeading}; 
                  color:#ffffff; margin:0">
          ${data.address}
        </p>
      </div>
    </td>
  </tr>
</table>`;
}
```

### Effort: 8 hours

---

## G-E09 — Photo Grid Has No Aspect-Ratio Enforcement

### Problem
The `photoGallery` block renders whatever images are provided at whatever aspect ratios they come in. If listing photos mix portrait and landscape shots, the grid breaks visually — cells have different heights, the layout looks amateurish.

### Acceptance Criteria
- [ ] All photos in the gallery are constrained to 16:9 aspect ratio via `object-fit: cover` and fixed height
- [ ] Desktop: 2 columns, 2px gap, each photo 290px × 163px (16:9 at 290px width)
- [ ] Mobile: 1 column, full width, 200px fixed height
- [ ] If photo fails to load: show a placeholder with the property address initial and the theme's surface color
- [ ] Maximum 10 photos rendered (additional photos linked as "View all [N] photos")
- [ ] Alt text for each photo: "Photo [N] of [address]"

### Implementation

```typescript
function photoGallery(data: EmailData, tokens: Theme): string {
  const photos = (data.photos || []).slice(0, 10);
  if (!photos.length) return "";
  
  const pairs = [];
  for (let i = 0; i < photos.length; i += 2) {
    pairs.push(photos.slice(i, i + 2));
  }
  
  const rows = pairs.map(pair => `
    <tr>
      ${pair.map((src, j) => `
        <td width="48%" style="padding:1px">
          <img src="${src}" 
               width="285" 
               height="160"
               alt="Photo ${pairs.indexOf(pair) * 2 + j + 1} of ${data.address}"
               style="display:block; width:100%; height:160px; object-fit:cover">
        </td>
      `).join('<td width="4%" style="padding:0"> </td>')}
    </tr>`
  ).join("\n");
  
  return `
<table width="100%" cellpadding="0" cellspacing="0" 
       style="padding:0 0 ${tokens.spacing.section}">
  <tr><td style="padding:0 48px">
    <table width="100%" cellpadding="0" cellspacing="0">
      ${rows}
    </table>
  </td></tr>
</table>`;
}
```

### Effort: 3 hours

---

## G-E10 — CTA Button Uses Gradient — Not Premium

### Problem
The current CTA button uses a purple or coral gradient background:
```html
<a style="background:linear-gradient(135deg, #4f35d2, #7c5ffc); border-radius:8px; ...">
  Book a Showing
</a>
```

Premium email marketing (Apple, luxury real estate brands) uses solid, dark buttons with no gradient. The gradient looks like a conversion-optimized SaaS app, not a luxury property email.

### Acceptance Criteria
- [ ] `luxury` theme CTA: solid dark (#1a1a1a) background, white text, 8px radius, no gradient
- [ ] `luxury` theme secondary CTA (if present): transparent, dark border, dark text
- [ ] `standard` theme CTA: can retain accent color solid (no gradient)
- [ ] `editorial` theme CTA: forest green solid, white text
- [ ] Button padding: 14px top/bottom, 28px left/right (generous, tappable)
- [ ] Font: 15px, 600 weight, system-ui, no letter-spacing
- [ ] Width: auto (not full-width) — centered within email, max 240px

### Luxury button target
```html
<a href="{url}" style="
  display:inline-block;
  background:#1a1a1a;
  color:#ffffff;
  font:600 15px/1 system-ui, sans-serif;
  text-decoration:none;
  padding:14px 28px;
  border-radius:8px;
  letter-spacing:0;
">
  Book a Showing
</a>
```

### Effort: 2 hours
