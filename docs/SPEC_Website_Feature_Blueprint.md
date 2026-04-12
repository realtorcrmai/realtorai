<!-- docs-audit: listingflow-sites/** -->
# Website Feature Blueprint — Realtors360 Sites

> Reference specification derived from the 24K Realty website (24krealty.vercel.app).
> Use this as the feature blueprint when generating realtor websites via the Realtors360 Sites module.

---

## 1. Architecture Overview

### Tech Stack
| Layer | Technology | Purpose |
|-------|-----------|---------|
| Framework | Next.js 14 (App Router, SSR/SSG) | SEO, performance, routing |
| Runtime | React 18 | Component architecture |
| Language | TypeScript | Type safety |
| Styling | Tailwind CSS 3.4 + CSS Variables | Utility-first + theming |
| Animation | GSAP 3.14 + ScrollTrigger | Scroll-based animations |
| Smooth Scroll | Lenis 1.3 | Buttery smooth scrolling |
| Transitions | Framer Motion 12 | Page transitions, loading screen |
| Charts | Chart.js 4.5 + react-chartjs-2 | Market data visualization |
| Carousel | Splide.js 4.1 | Image sliders |
| Images | Next/Image | Lazy loading, optimization |
| Fonts | Google Fonts (dynamic loading) | Per-theme typography |
| Deployment | Vercel | Native Next.js hosting |

### Data Architecture
All content lives in **JSON files** — no database required for the website itself. This enables:
- Instant static generation (zero API latency)
- Easy content updates without code changes
- CRM can generate JSON files from its database and deploy automatically

**JSON Data Files:**
| File | Content |
|------|---------|
| `site.json` | Brand name, tagline, description, founded date, founders, services, contact info, social links, nav items |
| `properties.json` | Property listings (id, slug, title, address, neighborhood, city, price, beds/baths/sqft, type, status, images, features, description) |
| `team.json` | Team members (name, title, photo, role, bio, phone, email) |
| `testimonials.json` | Client quotes (id, quote, author, detail) |
| `neighborhoods.json` | Area cards (id, slug, name, description, image, listingCount, avgPrice) |
| `areas.json` | Detailed area guides (hero image, description, highlights, schools, parks, transit, avgPrice, priceRange, primaryType, bestFor) |
| `insights.json` | Blog articles (id, slug, title, excerpt, date, category, image) |
| `reviews.json` | Google reviews (id, name, rating, review, date) |
| `stories.json` | Case studies (id, slug, title, subtitle, image, challenge, solution, result, stats) |
| `market.json` | Market data (overview stats, neighbourhood breakdowns, 12-month price/sales history, mortgage rates, demographics) |
| `pages/home.json` | Homepage section content (hero, intro, properties, neighbourhoods, value pillars, testimonials, insights, contact CTA) |

---

## 2. Theme System (6 Presets)

Every theme defines: **colors** (CSS variables), **fonts** (heading + body from Google Fonts), and **border radius**.

| Theme | Vibe | Background | Accent | Heading Font | Body Font |
|-------|------|-----------|--------|-------------|-----------|
| **Gold** (default) | Warm luxury | Rich Black #0A0A0A | Gold #C5A572 | Cormorant Garamond | Inter |
| **Platinum** | Cool sophistication | #0B0D17 (Navy) | #B8C4D0 (Silver) | Playfair Display | DM Sans |
| **Noir** | Minimal editorial | Pure Black #000 | White #FFF | Bodoni Moda | Inter |
| **Emerald** | Earthy elegance | #0A1A0A (Forest) | #7B9971 (Sage) | Cormorant Garamond | Source Sans 3 |
| **Obsidian** | Modern dark | #0D0A12 (Deep Purple) | #8B7BA8 (Mauve) | Italiana | Poppins |
| **Arctic** | Light/Apple-style | White #FAFAF8 | Blue #0071E3 | Playfair Display | system-ui |

### CSS Variable System
```css
--rich-black       /* Primary dark background */
--near-black       /* Slightly lighter dark */
--dark-charcoal    /* Card backgrounds */
--warm-white       /* Primary text on dark */
--warm-cream       /* Light section backgrounds */
--off-white        /* Subtle backgrounds */
--gold             /* Primary accent */
--gold-hover       /* Accent hover state */
--gold-dark        /* Darker accent variant */
--body-gray        /* Secondary text */
--dark-gray        /* Muted text */
--radius           /* Border radius (0px default, 18px for Arctic) */
```

### Theme Switching
Controlled via `NEXT_PUBLIC_THEME` environment variable. ThemeProvider component:
1. Reads theme config from themes.ts
2. Applies CSS variables to `document.documentElement`
3. Dynamically loads Google Fonts for the theme
4. Adds theme class to `document.body`

---

## 3. Page Structure (18 Routes)

### 3.1 Homepage (`/`)
**13 sections, top to bottom:**

| # | Section | Component | Description |
|---|---------|-----------|-------------|
| 1 | Hero | `HeroSection` | Full-viewport (100vh) image carousel with Ken Burns zoom, heading, subtitle, property search bar, navigation dots, scroll pulse indicator |
| 2 | Intro | `IntroSection` | 2-column: team photo (with gold corner accent) + company story + 3 animated stat counters |
| 3 | Recently Sold | `RecentlySold` | 4 stat cards (properties sold, total volume, avg DOM, % asking) + 4 sold property rows with hover effects |
| 4 | Featured Properties | `FeaturedProperties` | 3-column grid of top property cards with favourite buttons |
| 5 | Neighbourhoods | `NeighborhoodsSection` | Horizontally draggable carousel of neighbourhood cards (340px wide, snap scroll) |
| 6 | Value Proposition | `ValueSection` | 4-column grid: Expertise, Service, Network, Results — each with custom SVG icon |
| 7 | Testimonials | `TestimonialsSection` | Auto-rotating quotes (6s interval) with dot navigation, decorative quotation mark |
| 8 | Google Reviews | `ReviewsSection` | Average rating display + 8 review cards in 4-column grid |
| 9 | Video Testimonials | `VideoTestimonials` | 3-column grid of 9:16 video thumbnails with play button overlay |
| 10 | Awards | `AwardsSection` | 6-column grid of credential/award cards (FVREB, REBGV, BCFSA, etc.) |
| 11 | Market Insights | `InsightsSection` | 3-column grid of blog article cards with hover zoom |
| 12 | Neighbourhood Map | `NeighbourhoodMap` | Custom SVG map with 6 animated location pins + property price pins |
| 13 | Market Ticker | `MarketTicker` | Auto-scrolling horizontal ticker (40s loop) showing 8 market metrics |
| 14 | Instagram Feed | `InstagramFeed` | 6-column image grid linking to Instagram profile |
| 15 | Contact CTA | `ContactCTA` | Full-width background image with "24K" watermark, heading, CTA button |

**SEO:** JSON-LD structured data (RealEstateAgent schema)

### 3.2 Properties (`/properties`)
- **Apple iPhone-style full-viewport panels** — each property fills the entire screen
- Status filter buttons: All, Featured, Reduced, Just Listed, Sold (with count badges)
- Each panel: custom tagline headline, property specs, price, hero image, specs bar
- 4 cycling color themes per property
- Snap-scroll between properties

### 3.3 Property Detail (`/properties/[slug]`)
- Hero gallery (60vh main image)
- Info bar: title, address, currency converter (5 currencies), share buttons, print brochure
- Stats section: beds, baths, sqft, property type
- Description + key features list
- Image gallery with full-screen lightbox (prev/next navigation)
- Recently viewed properties (localStorage tracking)
- Similar properties (3-card grid)
- PropertyViewTracker (silent analytics component)
- Static generation via `generateStaticParams()`

### 3.4 Areas Index (`/areas`)
- 3-column grid of area cards with hero image overlay
- Average price displayed on each card
- Truncated description (120 chars)
- "View Guide" CTA links

### 3.5 Area Detail (`/areas/[slug]`)
- Hero with area image, name, average price
- Quick stats bar: avg price, price range, main property type, best for
- 2-column content: description + highlights (left), schools + parks + transit (right)
- CTA section with "View Properties" and "Contact Agent" buttons

### 3.6 Insights Index (`/insights`)
- Featured article (2-column: large image + title/category/date/excerpt)
- Remaining articles in 3-column grid
- Cards with image zoom on hover, category badges

### 3.7 Insight Detail (`/insights/[slug]`)
- Hero with article image, title, category, date
- Multi-paragraph article content with scroll reveals
- Market snapshot box (4 stats)
- "Discuss with our team" CTA
- Related articles (2-column grid)
- **12 full-length articles** covering: market reports, buying guides, neighbourhood spotlights, SkyTrain impact, first-time buyer programs, selling strategies, property taxes, family neighbourhoods, rental yields, renovations, city comparisons, strata fees

### 3.8 Market Dashboard (`/market`)
- Overview stats bar: avg price (with YoY change), total sales, avg DOM, active listings, sales-to-list ratio
- 3 Chart.js visualizations: 12-month price trends, monthly sales volume, avg price by neighbourhood
- Neighbourhood breakdown table: price, YoY change, $/sqft, DOM, active, sold, market condition badge
- Mortgage rates section: variable, 1yr, 3yr, 5yr fixed

### 3.9 Neighbourhood Comparison (`/market/compare`)
- Neighbourhood selector (toggle up to 3)
- Market data comparison table: price, YoY change, $/sqft, DOM, active, sold, benchmark, property type mix (stacked bars)
- Demographics table: population, median age, household income, walk score, transit score (progress bars)
- "Best" values highlighted in gold

### 3.10 Mortgage Calculator (`/calculator`)
- 2-column layout: inputs (left) + results (right)
- Inputs: price ($100K-$5M slider), down payment (5%-50% slider), interest rate (1%-10% with quick-select buttons for current rates), amortization (15/20/25/30yr), property tax, insurance
- Results: monthly payment breakdown (mortgage, tax, insurance), total cost, total interest, CMHC insurance (if down <20% with tiered rates), estimated income required
- Real-time calculation via useMemo

### 3.11 About (`/about`)
- Hero with gradient overlay
- Brand story section
- 4 animated stat counters (services, properties, founded year, founders)
- Team member grid: photo, name, title (gold uppercase), bio
- "Work With Us" CTA

### 3.12 Contact (`/contact`)
- 2-column: contact info (address, phone, email with clickable links) + contact form
- Contact form: name, email, phone, property interest dropdown, message textarea
- Appointment booking widget: appointment type, date picker, 9 time slots (9AM-5PM), name, phone

### 3.13 FAQ (`/faq`)
- Category filter buttons: All, Buying, Selling, Mortgage, Investment, General
- Accordion Q&A (12 questions) with smooth expand/collapse animation, chevron rotation
- Category badges on each question

### 3.14 Home Valuation (`/home-valuation`)
- 3-step lead capture form with progress indicator:
  - Step 1: address, property type, sqft, beds, baths
  - Step 2: condition (Excellent/Good/Fair/Needs Work), timeline (ASAP/1-3mo/3-6mo/Just Curious)
  - Step 3: name, email, phone
- Success screen with callback expectation
- Trust stats below form: 50+ sold, 24 avg DOM, 98% asking price, 100% free

### 3.15 Guides (`/guides`)
- 3-column grid of 6 guide cards with seasonal badges
- Topics: Spring Buying, Summer Selling, Fall Investment, Year-End Review, First-Time Buyer, Renovation ROI

### 3.16 Success Stories (`/stories`)
- Case study cards with: challenge, solution, result narrative
- Key stats per story (savings, days on market, satisfaction rating)

### 3.17 Custom 404
- Large "404" text (120-180px), "Page Not Found" message, "Return Home" button

---

## 4. Interactive Components (26 UI Components)

### 4.1 Guided Walkthrough Tour
**File:** `Walkthrough.tsx` (348 lines — largest component)
- **17-step multi-page tour** covering entire website
- Auto-starts on first desktop visit (2.5s delay, skips mobile <992px)
- Two modes: Auto Tour (6-7s per step) and Manual Tour (prev/next buttons)
- Tour bar at bottom: step counter, title, play/pause, prev/next, exit
- Tooltip positions dynamically based on target element bounds (clamped to viewport)
- Cross-page navigation (auto-routes between pages)
- Progress bar animated per step duration
- Persists state via sessionStorage (resumes mid-tour)
- Retries element finding (up to 20 times, 200ms intervals)
- Repositions on scroll/resize

### 4.2 AI Chatbot
**File:** `Chatbot.tsx` (156 lines)
- Floating toggle button (bottom-right)
- Keyword-based responses: buy, sell, services, mortgage, schedule, contact, price, area, neighbourhood
- 5 quick-reply buttons on initial open
- Message history with user/bot differentiation
- Auto-scroll to latest message
- 600ms delay before bot response
- Green pulse "online" status indicator

### 4.3 Property Search
**File:** `PropertySearch.tsx` (99 lines)
- Searches against properties AND neighbourhoods simultaneously
- Matches: title, address, neighbourhood (properties) + name, slug (areas)
- Shows up to 6 results with type badges (Listing/Area)
- Result subtitles: price for properties, listing count for areas
- "View all properties" fallback if no matches
- Enter key navigates to first result
- Click outside closes dropdown
- Two variants: nav (compact) and hero (large with backdrop blur)

### 4.4 Currency Converter
**File:** `CurrencyConverter.tsx` (35 lines)
- Converts property price to 5 currencies: CAD, USD, CNY, INR, GBP
- Locale-formatted number display
- Dropdown selector with currency symbol

### 4.5 Favourite Button
**File:** `FavouriteButton.tsx` (30 lines)
- Heart icon toggle (filled gold = saved, outlined = unsaved)
- Persists to localStorage array ("24k-favourites")
- Positioned absolute on property cards

### 4.6 Recently Viewed
**File:** `RecentlyViewed.tsx` (53 lines)
- Tracks property views in localStorage (max 10)
- Shows last 3 viewed properties (excludes current)
- Deduplicates and moves re-visits to front
- `PropertyViewTracker` companion component (10 lines) — silent tracker on detail pages

### 4.7 Exit-Intent Popup
**File:** `ExitIntentPopup.tsx` (65 lines)
- Detects mouse leaving viewport (clientY < 10)
- Activates after 5s delay
- Email signup for market report
- Triggered once per session (sessionStorage)
- Backdrop blur, click-outside-to-close

### 4.8 Appointment Booking
**File:** `AppointmentBooking.tsx` (57 lines)
- 6 appointment types: Buying, Selling, Viewing, Mortgage, Valuation, General
- Date picker (min: today)
- 9 time slots (9AM-5PM) in 3-column grid
- Name + phone fields
- Confirmation screen after submission

### 4.9 Share Property
**File:** `ShareProperty.tsx` (33 lines)
- 4 share channels: WhatsApp, Facebook, Email, Copy Link
- WhatsApp pre-fills title + URL
- Copy-to-clipboard with checkmark feedback (2s)

### 4.10 Print Brochure
**File:** `PrintBrochure.tsx` (58 lines)
- Generates styled HTML document in new window
- Brochure layout: header (logo + price), hero image, details, stats grid, features list, footer
- Georgia serif fonts for print elegance
- Auto-triggers print dialog (500ms delay)

### 4.11 Image Lightbox
**File:** `Lightbox.tsx` (93 lines)
- Grid of 6 thumbnails (2 cols mobile, 3 cols tablet) with "+N" overlay for extra images
- Full-screen overlay with prev/next navigation (circular wrapping)
- Image counter (current/total)
- Click outside to close
- 4:3 aspect ratio thumbnails with hover zoom

### 4.12 WhatsApp Button
**File:** `WhatsAppButton.tsx` (21 lines)
- Fixed circular button (bottom-left)
- Opens WhatsApp Web with pre-filled message
- WhatsApp green (#25D366), hover scale 1.1

### 4.13 Cookie Banner
**File:** `CookieBanner.tsx` (54 lines)
- Appears 2.5s after page load
- Accept/Decline buttons
- Persists choice to localStorage
- Fade-up animation, responsive layout

### 4.14 Accessibility Toggle
**File:** `AccessibilityToggle.tsx` (56 lines)
- Fixed button (right side)
- Font size adjustment (80%-140%) with A-/Reset/A+ controls
- High contrast mode toggle
- Applies to document root

### 4.15 Language Switcher
**File:** `LanguageSwitcher.tsx` (42 lines)
- Dropdown with 3 languages: English (EN), Punjabi (PN), Chinese (ZH)
- Uses React Context (I18nProvider)
- Animated chevron indicator

### 4.16 Sold Ticker
**File:** `SoldTicker.tsx` (37 lines)
- Horizontal bar showing recently sold property
- Auto-rotates through 6 items every 4s
- SOLD badge + address + price + area

### 4.17 Features Panel
**File:** `FeaturesPanel.tsx` (126 lines)
- Vertical gold tab on left edge of screen
- Opens full-screen modal listing all 50 features in 5-column grid
- Tech stack footer

### 4.18 Back to Top
**File:** `BackToTop.tsx` (28 lines)
- Circular button (bottom-right), shows after 500px scroll
- Smooth scroll to top

---

## 5. Animation System

### 5.1 Scroll Reveal (`ScrollReveal.tsx`)
- IntersectionObserver (15% threshold, -40px root margin)
- Opacity 0→1, translateY(20px)→0
- 900ms duration, cubic-bezier easing
- One-time trigger, staggered delay support
- **Used on virtually every section** for fade-up-on-scroll effect

### 5.2 Letter Reveal (`LetterReveal.tsx`)
- Each character animates individually with 50ms stagger
- translateY(20px)→0, opacity 0→1
- 500ms per character
- IntersectionObserver triggered

### 5.3 Count Up (`CountUp.tsx`)
- Animated number counter (0 → target)
- Cubic easing: `1 - (1 - progress)^3`
- requestAnimationFrame for smooth animation
- IntersectionObserver triggered (50% threshold)
- Supports prefix ($) and suffix (M, +, %)

### 5.4 Hero Carousel
- Auto-rotating images (5s intervals, 1500ms transition)
- Ken Burns zoom effect (20s animation on active image)
- Navigation dots for manual selection
- Smooth crossfade between slides

### 5.5 Testimonial Rotation
- Auto-cycles every 6s
- Fade in/out with translateY transition (600ms)
- Interactive dot navigation

### 5.6 Market Ticker
- CSS keyframe animation (40s linear infinite)
- 3x content repeat for seamless loop

### 5.7 Loading Screen (Framer Motion)
- "24K" heading fades in
- Horizontal gold line grows 0→120px (1.2s)
- "Realty Group" subtitle fades in
- Exits after 1.8s with opacity fade

### 5.8 Page Transitions (Framer Motion)
- Enter: opacity 0, y:12 → opacity 1, y:0
- Exit: opacity 1, y:0 → opacity 0, y:-12
- Duration: 0.3s, custom easing

### 5.9 Smooth Scrolling (Lenis)
- Duration: 1.2s
- Custom easing: `1.001 - Math.pow(2, -10 * t)`
- Wheel support enabled

### 5.10 Drag-to-Scroll Carousel (Neighbourhoods)
- Mouse event tracking (mousedown/move/up/leave)
- Sensitivity multiplier: 1.5x
- Cursor: grab → grabbing
- CSS scroll-snap for snapping

---

## 6. Layout System

### 6.1 Navigation (`Navbar.tsx`)
- Fixed position, z-index high
- Desktop: split nav — left links + centered logo + right links
- Scroll compression: 110px → 72px height on scroll (>80px)
- Mobile: hamburger menu with slide-in overlay from left
- Smooth transitions with cubic-bezier easing
- i18n-aware link labels

### 6.2 Footer (`Footer.tsx`)
- 4-column grid (responsive: 1→2→4)
- Columns: Brand (logo + description + social icons), Quick Links, Services, Contact
- Bottom bar: copyright + Privacy Policy + Terms of Service
- Gold accent border at top

### 6.3 Section Patterns
```css
.section-dark    { background: rich-black; padding: 120px 0; }
.section-darker  { background: near-black; }
.section-light   { background: warm-cream; }
.section-white   { background: warm-white; }
```
Responsive: 120px desktop → 80px tablet → 60px mobile

### 6.4 Container
```css
.container-main { max-width: 1440px; margin: 0 auto; padding: 0 80px; }
/* Responsive: 80px → 40px → 24px */
```

### 6.5 Responsive Breakpoints
| Name | Width | Usage |
|------|-------|-------|
| sm | 375px | Small mobile |
| mobile | 560px | Standard mobile |
| tablet | 768px | Tablet |
| md | 992px | Desktop start |
| lg | 1200px | Large desktop |
| xl | 1440px | Max content width |

---

## 7. SEO & Performance

### 7.1 SEO Features
- **JSON-LD** structured data (RealEstateAgent schema with founders, phone, address)
- **OpenGraph** meta tags per page
- **Auto-generated XML sitemap** with priorities and change frequencies
- **Semantic HTML** throughout
- **Custom favicon** (gold 24K SVG)
- **Per-page metadata**: title, description for every route
- **Static generation** via `generateStaticParams()` for dynamic routes

### 7.2 Performance
- **Next.js SSG** for all content pages (zero server latency)
- **Next/Image** lazy loading with remote pattern optimization
- **next/font** optimization for Google Fonts
- **Bundle:** 87.3 KB shared JS + 3-5 KB per page
- **Targets:** Lighthouse 90+, LCP <2.5s, FID <100ms, CLS <0.1

---

## 8. Internationalization (i18n)

### Supported Languages
| Code | Language | Script |
|------|----------|--------|
| `en` | English | Latin |
| `pa` | Punjabi | Gurmukhi (ਪੰਜਾਬੀ) |
| `zh` | Chinese | Simplified (中文) |

### Translation Coverage
- Navigation labels
- Hero section text
- Intro section text
- Section headers (all sections)
- Value pillars (title + description)
- Status labels (sold, active, reduced)
- Property metrics (bed, bath, sqft)
- Button text (get in touch, view properties, learn more)
- Search placeholder
- Footer labels
- Recently sold metrics

### Implementation
- React Context API (`I18nProvider`)
- `useI18n()` hook returns `{ t, locale, setLocale }`
- `t("key")` function for translations
- Language switcher dropdown in navbar

---

## 9. Colour & Typography Specification

### Design Language
"Apple-style minimalism meets luxury real estate — cinematic, feel the money"

### Colour Palette (Gold Theme)
| Name | Hex | Usage |
|------|-----|-------|
| Rich Black | #0A0A0A | Primary background |
| Near Black | #111111 | Card backgrounds, darker sections |
| Dark Charcoal | #1A1A1A | Elevated surfaces |
| Warm White | #FAFAF8 | Primary text on dark |
| Warm Cream | #F5F0EB | Light section backgrounds |
| Off White | #EDEDED | Subtle backgrounds |
| 24K Gold | #C5A572 | Primary accent (use sparingly, like gold leaf) |
| Gold Hover | #D4B88A | Hover state |
| Gold Dark | #A38B5C | Pressed/active state |
| Body Gray | #9A9A9A | Secondary text |
| Dark Gray | #6A6A6A | Muted text |

### Typography
| Element | Font | Weight | Size (Desktop) | Size (Mobile) |
|---------|------|--------|----------------|---------------|
| Hero H1 | Cormorant Garamond | 300 | 72-96px | 36-48px |
| Section Heading | Cormorant Garamond | 300 | 42-52px | 28-34px |
| Card Title | Cormorant Garamond | 400 | 24-28px | 20-22px |
| Overline | Inter | 500 | 12-13px | 11-12px |
| Body | Inter | 400 | 15-16px | 14-15px |
| Button | Inter | 600 | 13px | 12px |
| Label | Inter | 500 | 12px | 11px |

### Typography Rules
- Overlines: uppercase, wide letter-spacing (0.15-0.2em), gold colour
- Headings: light weight (300), tight line-height (1.1-1.2)
- Body: regular weight (400), generous line-height (1.6-1.8)
- Buttons: uppercase, letter-spacing 0.1em, semibold

---

## 10. Component Inventory for CRM Generation

### Required Section Components (16)
| Component | Required Data | Complexity |
|-----------|--------------|------------|
| HeroSection | background images (1-5), heading, subtitle, search | High |
| IntroSection | team photo, bio text, 3 stats | Medium |
| RecentlySold | sold properties (4+) | Medium |
| FeaturedProperties | property listings (3+) | Medium |
| NeighborhoodsSection | neighbourhood cards (4-8) | Medium |
| ValueSection | 4 value pillars (icon, title, description) | Low |
| TestimonialsSection | testimonials (3-6) | Low |
| ReviewsSection | Google reviews (4-8) | Low |
| VideoTestimonials | video thumbnails (3) | Low |
| AwardsSection | credentials/awards (4-6) | Low |
| InsightsSection | blog articles (3+) | Medium |
| NeighbourhoodMap | neighbourhood coordinates + properties | High |
| MarketTicker | 8 market metrics | Low |
| InstagramFeed | 6 Instagram images | Low |
| ContactCTA | heading, description, CTA button | Low |
| MarketCharts | 12-month price/sales data, neighbourhood breakdown | High |

### Required UI Components (18)
| Component | Data Needed | Complexity |
|-----------|------------|------------|
| Navbar | logo, nav items, social links | Medium |
| Footer | brand info, nav items, services, contact | Medium |
| PropertyCard | property object | Low |
| PropertySearch | properties + neighbourhoods arrays | Medium |
| Button | text, href, variant | Low |
| ContactForm | — (standalone) | Low |
| AppointmentBooking | — (standalone) | Medium |
| Lightbox | image array | Medium |
| CurrencyConverter | price in CAD | Low |
| FavouriteButton | property ID | Low |
| ShareProperty | title, URL | Low |
| PrintBrochure | property object | Medium |
| RecentlyViewed | — (localStorage) | Low |
| Chatbot | — (keyword config) | Medium |
| WhatsAppButton | phone number | Low |
| ExitIntentPopup | — (standalone) | Low |
| CookieBanner | — (standalone) | Low |
| Walkthrough | tour steps config | High |

### Optional Enhancement Components (8)
| Component | Purpose |
|-----------|---------|
| AccessibilityToggle | Font size + contrast controls |
| LanguageSwitcher | Multi-language support |
| SoldTicker | Recently sold ticker bar |
| FeaturesPanel | Feature showcase modal |
| BackToTop | Scroll-to-top button |
| ScrollReveal | Fade-up animation wrapper |
| LetterReveal | Character-by-character text animation |
| CountUp | Animated number counter |

---

## 11. Page Templates for CRM Generation

### Minimum Viable Site (5 pages)
1. **Homepage** — Hero + Intro + Featured Properties + Testimonials + Contact CTA
2. **Properties** — Property grid with status filter
3. **Property Detail** — Gallery + specs + description + share/print
4. **About** — Team photo + bio + stats
5. **Contact** — Contact form + appointment booking

### Full-Featured Site (15+ pages)
Add to minimum:
6. **Areas Index** — Neighbourhood guide cards
7. **Area Detail** — Neighbourhood deep-dive
8. **Insights Index** — Blog article grid
9. **Insight Detail** — Full article page
10. **Market Dashboard** — Charts + neighbourhood table + rates
11. **Neighbourhood Comparison** — Side-by-side tool
12. **Mortgage Calculator** — Interactive calculator with CMHC
13. **FAQ** — Categorized accordion
14. **Home Valuation** — Multi-step lead capture form
15. **Guides** — Content guide cards
16. **Success Stories** — Case study pages

---

## 12. CRM-to-Website Data Mapping

### How CRM data maps to website JSON files:

| CRM Table/Entity | Website JSON | Fields Mapped |
|------------------|-------------|---------------|
| `realtor_sites` | `site.json` | brand name, tagline, contact info, services, social links |
| `listings` (status=active) | `properties.json` | address→title, list_price→price, beds/baths/sqft, images, features, description |
| `contacts` (type=team) | `team.json` | name, title, photo, bio, phone, email |
| `testimonials` | `testimonials.json` | quote, author name, detail |
| Custom / Areas table | `areas.json` | neighbourhood data, schools, parks, transit, pricing |
| `newsletters` / blog content | `insights.json` | title, excerpt, date, category, image |
| Market data API | `market.json` | average prices, sales volume, DOM, rates |
| Google reviews API | `reviews.json` | name, rating, review text, date |

### Generation Flow
```
1. Realtor fills profile in CRM (realtor_sites table)
2. CRM queries listings, contacts, testimonials from database
3. Agent generates site config JSON (theme + content data files)
4. Pre-built React components render config into HTML
5. Deploy to Vercel/Cloudflare Pages
6. Auto-sync: CRM listing changes → regenerate properties.json → redeploy
```

---

## 13. Competitor Research Highlights

### Sites Analyzed (6 luxury realtor sites)
| Site | Known For | Key Technique |
|------|----------|---------------|
| Jade Mills Estates | Best animations | WOW.js scroll triggers |
| Josh Flagg | Best typography | GSAP + ScrollTrigger |
| Beverly Hills Estates | Unique colour (green/gold) | Image-fill text effect |
| Jill Szeder | Best video usage | AVIF format, video heroes |
| Hilton & Hyland | Luxury brokerage brand | Video hero, editorial layout |
| Soprovich | Vancouver local | Pure monochrome palette |

### Universal Luxury Patterns
- Full-screen hero slideshows (100vh)
- Fixed navigation with scroll compression
- Hamburger mobile menus (no horizontal scroll)
- Property photography dominance (high-res, professional)
- Carousel property showcases
- Dark backgrounds with metallic accents
- Serif fonts for headings, sans-serif for body
- Minimal UI, maximum imagery
- Scroll-triggered animations on every section

---

## 14. Feature Priority for Auto-Generation

### Tier 1 — Must Have (generates automatically)
- Responsive homepage with hero, properties, testimonials, CTA
- Property listings page + detail pages
- Contact form + appointment booking
- About page with team profiles
- Mobile-responsive navigation + footer
- Theme system (at least 3 presets)
- SEO (meta tags, JSON-LD, sitemap)
- WhatsApp floating button
- Smooth scroll + scroll reveal animations

### Tier 2 — Should Have (configurable)
- Market dashboard with charts
- Neighbourhood guides
- Blog/insights section
- Mortgage calculator
- FAQ page
- Property search
- Favourites system
- Share/print property
- Currency converter
- Google reviews display

### Tier 3 — Nice to Have (premium)
- Guided walkthrough tour
- AI chatbot
- Exit-intent popup
- Multi-language support
- Neighbourhood comparison tool
- Home valuation lead capture
- Video testimonials
- Interactive neighbourhood map
- Success stories/case studies
- Accessibility toggle
- Cookie consent banner
- Loading screen animation
- Sold ticker
- Instagram feed integration

---

*Document generated from 24K Realty website analysis (24krealty.vercel.app) — March 2026*
*Source: /Users/bigbear/KunalWebsite/*
