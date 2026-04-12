<!-- docs-audit: realtors360-social/**, src/components/social/* -->
# PRD: Realtors360 Social — AI Content Studio for Realtors

> **Version:** 1.0
> **Date:** March 27, 2026
> **Author:** Realtors360 Product Team
> **Status:** Draft
> **Based on:** Global market research across US (15 cities), Canada (12 cities), UK (13 cities), 200+ sources

---

## 1. Problem Statement

### The Core Problem
Real estate agents spend **5-10 hours per week** creating social media content manually — it's their biggest time sink after client meetings. They cobble together 3-5 separate tools (Canva, CapCut, Later, ChatGPT, Coffee & Contracts) costing **$100+/month** that don't connect to their CRM data. Meanwhile, the content that actually works — video — gets 403% more inquiries, but only 33% of agents are comfortable producing it.

### Why This Matters
- Social media is the **#1 lead-generating technology** (39% of agents, NAR 2025)
- **52% of agents** say social leads are higher quality than MLS leads
- **82% of business** comes from repeat clients and referrals — social media keeps you top-of-mind
- YouTube has **84% consumer usage** but only **25-30% agent adoption** — massive untapped channel
- TikTok has **37% consumer usage** but only **13% agent adoption** — biggest growth opportunity
- Agents who automate content creation reduce time from **5-10 hrs/week to 30 minutes**

### What Exists Today (and Why It Fails)

| Tool | What It Does | Why It Fails |
|------|-------------|-------------|
| Coffee & Contracts ($54/mo) | Monthly templates + captions | Not connected to CRM data, generic, no video |
| Canva Pro ($13/mo) | Design templates | Manual, no scheduling, no real estate intelligence |
| Later/Buffer ($18-25/mo) | Post scheduling | No content creation, no CRM integration |
| CapCut ($8/mo) | Video editing | Manual, steep learning curve, no automation |
| ChatGPT (free-$20/mo) | Caption/description writing | Generic, no brand voice, no listing data |
| Lab Coat Agents ($59/mo) | Templates + community | Print-focused, no automation |
| Breakthrough Broker ($15-20/mo) | MLS-integrated templates | Limited to basic designs |

**Total cost: $100-200/mo for 5-7 disconnected tools that still require hours of manual work.**

**No tool combines:** CRM data + AI content generation + video creation + multi-platform scheduling + performance attribution.

---

## 2. Vision

### One Sentence
Realtors360 Social turns every CRM event into ready-to-post social media content across all platforms — automatically.

### The 30-Second Pitch
When a realtor creates a listing, closes a deal, gets a testimonial, or market data updates — Realtors360 Social automatically generates platform-specific content (Instagram carousels, TikTok videos, YouTube Shorts, Facebook posts, LinkedIn articles) using the realtor's brand voice and actual CRM data. The agent reviews, approves, and it posts. AI learns what works for their specific audience and gets smarter over time. No Canva. No CapCut. No ChatGPT. No Buffer. One tool. 30 minutes a week instead of 10 hours.

### Success Metrics
| Metric | Target | Current Baseline |
|--------|--------|-----------------|
| Content creation time | <30 min/week | 5-10 hrs/week |
| Tools replaced | 3-5 | 0 |
| Monthly content output | 20-30 posts | 4-8 posts (typical agent) |
| Video content adoption | 80%+ of agents | 33% |
| Lead attribution | Track social → CRM lead | None |
| Agent NPS | 60+ | N/A |

---

## 3. Target Users

### Primary: Solo Agent (Sarah)
- **Demographics:** 35-55 years old, 3-10 years experience, $40K-$120K income
- **Tech comfort:** Uses iPhone for everything, comfortable with Instagram, nervous about TikTok/YouTube
- **Pain:** Spends Sunday nights prepping content for the week. Uses Canva templates, ChatGPT for captions, Later for scheduling. Knows she should do video but dreads it.
- **Goal:** Post consistently without it feeling like a second job
- **Budget:** $50-150/mo for marketing tools

### Secondary: Team Lead (Marcus)
- **Demographics:** 40-55, runs a 5-15 person team, $200K+ income
- **Pain:** Agents on his team post inconsistently. No brand consistency. Can't track which content generates leads.
- **Goal:** Give every agent branded content automatically. See ROI on social.
- **Budget:** $300-800/mo for team tools

### Tertiary: New Agent (Priya)
- **Demographics:** 25-35, first 2 years, $30K-50K income, digital native
- **Pain:** Has no listings to post about. Doesn't know what content to create. Can't afford expensive tools.
- **Goal:** Build personal brand from zero with neighbourhood/market content
- **Budget:** <$50/mo

---

## 4. High-Level Feature List

### Phase 1 — Content Engine (MVP)

| Feature | Description | Priority |
|---------|-------------|----------|
| **F1: Listing-to-Content** | Listing created in CRM → AI generates 5 platform-specific posts (Instagram carousel, TikTok script, YouTube Short script, Facebook post, LinkedIn post) | P0 |
| **F2: AI Caption Generator** | Claude generates captions with platform-specific length, tone, hashtags, CTAs | P0 |
| **F3: Content Calendar** | Visual calendar showing scheduled/draft/published posts. Drag-and-drop rescheduling | P0 |
| **F4: Brand Kit** | Upload logo, set brand colours, fonts, voice tone. All generated content follows the kit | P0 |
| **F5: Template Library** | 50+ customizable templates: Just Listed, Just Sold, Open House, Market Update, Neighbourhood Guide, Client Story, Holiday, Tips | P0 |
| **F6: AI Photo-to-Video** | Listing photos → cinematic property video (Kling AI integration, already built) | P0 |
| **F7: Approval Queue** | AI generates draft → agent reviews/edits → approve or regenerate | P0 |
| **F8: Content Triggers** | Auto-generate content when: new listing, price change, status change (sold/pending), open house created, testimonial received, deal closed | P1 |
| **F9: Neighbourhood Content** | AI generates area guides, local business spotlights, school info from market data | P1 |
| **F10: Market Update Posts** | Monthly market stats → branded infographic + caption | P1 |

### Phase 2 — Multi-Platform Publishing

| Feature | Description | Priority |
|---------|-------------|----------|
| **F11: Instagram Publishing** | Direct publish to Instagram (Feed, Reels, Stories, Carousels) via Meta API | P0 |
| **F12: Facebook Publishing** | Direct publish to Facebook (Page, Group post, Story) via Meta API | P0 |
| **F13: TikTok Publishing** | Direct publish via TikTok Content Posting API | P1 |
| **F14: YouTube Publishing** | Upload Shorts + long-form via YouTube Data API | P1 |
| **F15: LinkedIn Publishing** | Direct publish via LinkedIn Marketing API | P1 |
| **F16: Pinterest Publishing** | Pin creation via Pinterest API | P2 |
| **F17: Google Business Profile** | Post to GBP via API | P2 |
| **F18: Smart Scheduling** | AI suggests optimal post times based on audience engagement data per platform | P1 |
| **F19: Cross-Platform Preview** | See exactly how content will look on each platform before publishing | P0 |
| **F20: Bulk Scheduling** | Schedule a week/month of content at once from calendar view | P1 |

### Phase 3 — Video Studio

| Feature | Description | Priority |
|---------|-------------|----------|
| **F21: Photo-to-Video Generator** | Upload listing photos → AI generates cinematic property tour video with music, transitions, text overlays | P0 |
| **F22: Auto-Resize** | One video → auto-crop to 9:16 (Reels/TikTok/Shorts), 16:9 (YouTube), 1:1 (Feed), 4:5 (Instagram) | P0 |
| **F23: AI Voiceover** | Text-to-speech voiceover in agent's style (or stock voices) with lip-sync avatar option | P1 |
| **F24: Caption Overlay** | Auto-generate burned-in captions (critical — most watch without sound) | P0 |
| **F25: Music Library** | Royalty-free music library with trending audio suggestions per platform | P1 |
| **F26: Virtual Staging** | Empty room photos → AI-staged with furniture in multiple styles | P2 |
| **F27: Drone Simulation** | Ground-level photos → simulated aerial/drone-style video | P2 |
| **F28: Template Video Styles** | 10+ video templates: Luxury Tour, Quick Walkthrough, Neighbourhood Highlight, Market Update, Client Story, Before/After | P1 |

### Phase 4 — Intelligence & Attribution

| Feature | Description | Priority |
|---------|-------------|----------|
| **F29: Performance Dashboard** | Unified analytics: impressions, engagement, clicks, leads by platform, content type, time period | P0 |
| **F30: Lead Attribution** | Track: which post → which click → which CRM lead → which deal. Full funnel visibility | P0 |
| **F31: Content Score** | AI rates each post draft on predicted engagement (0-100) before publishing | P1 |
| **F32: A/B Testing** | Test 2 caption variants or 2 images. Auto-pick winner after N impressions | P1 |
| **F33: Competitor Tracking** | Monitor competitor agents' social activity (post frequency, engagement, content types) | P2 |
| **F34: Best Time Analytics** | Per-platform, per-account optimal posting times based on historical engagement | P1 |
| **F35: Hashtag Intelligence** | AI suggests hashtags based on: content type, location, trending, competition level | P1 |
| **F36: Audience Insights** | Demographics of social audience synced with CRM contact data | P2 |

### Phase 5 — Automation & AI Learning

| Feature | Description | Priority |
|---------|-------------|----------|
| **F37: Auto-Pilot Mode** | AI generates + schedules + publishes content without agent review (trust level: manual → review → auto) | P1 |
| **F38: Voice Learning** | AI learns agent's writing style from edits (reuse existing voice learning engine) | P0 |
| **F39: Content Recycling** | Identify evergreen posts that performed well → auto-reshare with fresh caption after N months | P1 |
| **F40: Engagement Auto-Reply** | AI drafts reply suggestions for comments/DMs (agent approves before sending) | P2 |
| **F41: Weekly Content Brief** | AI emails agent: "Here's your content plan for next week" with 1-click approve | P1 |
| **F42: Learning Engine** | Track what content types/times/platforms generate leads for THIS agent → optimize recommendations | P0 |
| **F43: Seasonal Calendar** | Pre-loaded with: holidays, market reporting dates, real estate milestones, local events | P1 |

---

## 5. Detailed User Stories & Acceptance Criteria

### Epic 1: Listing-to-Content (F1, F2, F5, F8)

**US-1.1: Auto-generate content from new listing**
> As a realtor, when I create a new listing in the CRM, I want the system to automatically generate social media posts for all my connected platforms, so I don't have to manually create content.

**Acceptance Criteria:**
- [ ] When listing status changes to "active", system generates content within 60 seconds
- [ ] Generates 5 variants: Instagram carousel (5 slides), Instagram Reel script, Facebook post, LinkedIn post, TikTok script
- [ ] Each variant uses listing data: address, price, beds/baths/sqft, key features, description, main photo
- [ ] Captions include: property highlights, neighbourhood name, CTA, relevant hashtags (platform-specific count: IG max 30, LinkedIn 3-5, Facebook 2-3)
- [ ] Instagram carousel: slide 1 = hero photo + price overlay, slides 2-4 = feature highlights, slide 5 = CTA with agent contact
- [ ] Content appears in agent's approval queue within the Content Calendar
- [ ] Agent can edit caption, swap photos, regenerate, or approve
- [ ] Approved content is scheduled for next available time slot (or agent picks time)
- [ ] System respects brand kit (logo, colours, fonts, tone)

**US-1.2: Just Sold celebration post**
> As a realtor, when a listing status changes to "sold", I want a celebration post auto-generated, so I can share the win and attract seller leads.

**Acceptance Criteria:**
- [ ] Triggers on listing status change to "sold"
- [ ] Post includes: "SOLD" overlay on hero image, address, sold price (if public), days on market, agent headshot
- [ ] Caption celebrates the sale, thanks clients (if permission), includes neighbourhood stats
- [ ] Generates Instagram Story version (vertical, animated "SOLD" stamp effect)
- [ ] Does NOT publish automatically — goes to approval queue (client privacy)
- [ ] Agent can toggle "show sold price" on/off before approving

**US-1.3: Open House announcement**
> As a realtor, when I create a showing/open house in the CRM, I want an event announcement auto-generated for social media.

**Acceptance Criteria:**
- [ ] Triggers when open house event is created on a listing
- [ ] Post includes: property photo, date/time, address, registration CTA
- [ ] Generates: Instagram Story (swipe-up/link sticker), Facebook Event share, Instagram feed post
- [ ] Countdown sticker suggested for Instagram Story (day before)
- [ ] Reminder post auto-queued for 24 hours before event
- [ ] RSVP link tracks back to CRM (lead attribution)

**US-1.4: Price change alert**
> As a realtor, when I change a listing's price, I want a "Price Reduced" post auto-generated.

**Acceptance Criteria:**
- [ ] Triggers on list_price change for active listings
- [ ] Shows: original price (strikethrough), new price, savings amount/percentage
- [ ] Urgency-focused caption ("Just reduced!", "Won't last!")
- [ ] Uses listing hero image with price overlay
- [ ] Goes to approval queue (agent may not want to advertise reduction)

### Epic 2: Brand Kit & Templates (F4, F5)

**US-2.1: Set up brand kit**
> As a realtor, I want to configure my brand identity once and have all generated content follow it consistently.

**Acceptance Criteria:**
- [ ] Brand kit settings page with: logo upload (PNG/SVG), primary colour, secondary colour, accent colour, heading font, body font, bio text, headshot photo, brokerage name
- [ ] Voice tone selector: Professional, Friendly, Luxury, Bold, Warm (or custom description)
- [ ] All generated content (images, captions, videos) uses brand kit automatically
- [ ] Preview panel shows sample post with current brand settings
- [ ] Brand kit syncs with Realtors360 Sites website theme (if connected)
- [ ] Font selection from curated list (Google Fonts subset: 20 serif + 20 sans-serif)

**US-2.2: Browse and customize templates**
> As a realtor, I want to browse a library of content templates and customize them with my brand.

**Acceptance Criteria:**
- [ ] Template library with 50+ templates across 12 categories:
  - Just Listed (5 variants)
  - Just Sold (5 variants)
  - Open House (4 variants)
  - Price Reduced (3 variants)
  - Market Update (4 variants)
  - Neighbourhood Guide (4 variants)
  - Client Testimonial (4 variants)
  - Tips & Education (5 variants)
  - Holiday/Seasonal (8 variants)
  - Personal/Behind-the-Scenes (4 variants)
  - Milestone (3 variants: anniversary, deals closed, awards)
  - Coming Soon (3 variants)
- [ ] Each template shows: preview, supported platforms, content type (static/carousel/video)
- [ ] One-click "Use Template" applies brand kit + listing data
- [ ] Templates responsive to platform (auto-adjusts for IG square, Story vertical, FB landscape)
- [ ] Favourite templates for quick access
- [ ] Custom templates: agent can save their own edited versions

### Epic 3: Content Calendar & Scheduling (F3, F18, F20)

**US-3.1: View and manage content calendar**
> As a realtor, I want a visual calendar showing all my scheduled, draft, and published social media posts across all platforms.

**Acceptance Criteria:**
- [ ] Monthly calendar view with daily cells showing post thumbnails
- [ ] Weekly view with time slots (hour-by-hour)
- [ ] Colour-coded by platform: Instagram (gradient pink/purple), Facebook (blue), TikTok (black), YouTube (red), LinkedIn (blue), Pinterest (red)
- [ ] Status indicators: draft (yellow), scheduled (blue), published (green), failed (red)
- [ ] Drag-and-drop to reschedule posts between dates/times
- [ ] Click post to: preview, edit, delete, duplicate, reschedule
- [ ] Filter by: platform, status, content type, listing
- [ ] "Gaps" highlighted: days with no scheduled content shown in amber
- [ ] AI suggestion: "You have no content scheduled for Thursday — want me to generate something?"

**US-3.2: Smart scheduling**
> As a realtor, I want the system to suggest optimal posting times based on when my audience is most active.

**Acceptance Criteria:**
- [ ] Analyses connected account engagement data (when followers are online)
- [ ] Suggests top 3 time slots per platform per day
- [ ] "Best time" badge on suggested slots in calendar
- [ ] Respects: no posting before 7 AM or after 10 PM (configurable quiet hours)
- [ ] Avoids posting on same platform within 2 hours of previous post
- [ ] Priority queue: listing content > market content > evergreen content

**US-3.3: Bulk content approval**
> As a realtor, I want to review and approve a week's worth of AI-generated content in one session.

**Acceptance Criteria:**
- [ ] "Weekly Review" mode: shows all pending drafts for the week in sequence
- [ ] Swipe/arrow to move through posts: Approve, Edit, Skip, Regenerate
- [ ] Edit inline: change caption, swap image, adjust hashtags
- [ ] "Approve All" button for quick approval of entire batch
- [ ] Timer shows: "Estimated 5 min to review 15 posts"
- [ ] Weekly email notification: "You have 12 posts ready for review"

### Epic 4: Video Studio (F21, F22, F23, F24)

**US-4.1: Generate property video from photos**
> As a realtor, I want to upload listing photos and get a professional property tour video generated automatically.

**Acceptance Criteria:**
- [ ] Upload 5-20 photos OR auto-pull from listing in CRM
- [ ] AI generates cinematic video: Ken Burns pan/zoom effects, smooth transitions, text overlays (address, price, features)
- [ ] Video length options: 15s (TikTok/Reels), 30s (standard), 60s (YouTube)
- [ ] Background music auto-selected from royalty-free library (genre: luxury, modern, upbeat)
- [ ] Agent can: reorder photos, change music, edit text overlays, adjust timing
- [ ] Output formats: 9:16 (vertical), 16:9 (horizontal), 1:1 (square) — generated simultaneously
- [ ] Processing time: <3 minutes for 15-second video
- [ ] Quality: 1080p minimum, 4K option
- [ ] Kling AI integration for advanced video generation

**US-4.2: Add captions to video**
> As a realtor, I want burned-in captions on all my videos since most people watch without sound.

**Acceptance Criteria:**
- [ ] Auto-transcribe voiceover/narration text
- [ ] If no audio: generate captions from property description/features
- [ ] Caption styles: bottom-center (standard), animated word-by-word (trending), subtitle bar
- [ ] Font and colour follow brand kit
- [ ] Caption positioning avoids platform UI elements (TikTok bottom bar, IG interaction buttons)
- [ ] Toggle captions on/off before publishing
- [ ] Support: English, French, Punjabi, Chinese (i18n from existing system)

**US-4.3: Auto-resize video for all platforms**
> As a realtor, I want one video automatically resized for every platform I post to.

**Acceptance Criteria:**
- [ ] Input: one master video (any aspect ratio)
- [ ] Output: 9:16 (TikTok, Reels, Shorts, Stories), 16:9 (YouTube, Facebook), 1:1 (Instagram Feed), 4:5 (Instagram Feed alternate)
- [ ] AI smart-crop: keeps subject centred, doesn't cut off text overlays
- [ ] Each resize is a separate schedulable post
- [ ] Preview all sizes side-by-side before approving

### Epic 5: Multi-Platform Publishing (F11-F17)

**US-5.1: Connect social media accounts**
> As a realtor, I want to connect all my social media accounts once and publish from the CRM.

**Acceptance Criteria:**
- [ ] OAuth connection flow for: Instagram Business, Facebook Page, TikTok Business, YouTube Channel, LinkedIn Profile/Page, Pinterest Business
- [ ] Connection status dashboard: green (connected), yellow (token expiring), red (disconnected)
- [ ] Reconnect flow if token expires (common with Instagram — 60 day expiry)
- [ ] Multiple accounts per platform supported (for agents managing personal + team)
- [ ] Disconnect account without losing historical data

**US-5.2: Publish to Instagram**
> As a realtor, I want to publish posts, carousels, Reels, and Stories directly to Instagram from the CRM.

**Acceptance Criteria:**
- [ ] Support content types: single image, carousel (up to 10 slides), Reel (up to 90s video), Story
- [ ] Caption + hashtags + location tag + user tags
- [ ] Carousel: upload/reorder slides, individual captions per slide
- [ ] Reel: upload video, cover image selection, audio (original or trending)
- [ ] Story: image/video, link sticker (for accounts with 10K+ followers or verified)
- [ ] Publishing options: publish now, schedule for later
- [ ] Confirmation with post URL after successful publish
- [ ] Error handling: clear message if post fails (aspect ratio, file size, API limit)

**US-5.3: Publish to TikTok**
> As a realtor, I want to publish videos to TikTok directly from the CRM.

**Acceptance Criteria:**
- [ ] Upload video (9:16, 3s-10min)
- [ ] Caption + hashtags (max 2,200 chars)
- [ ] Privacy settings: public, friends, private
- [ ] Allow comments toggle
- [ ] Allow duets/stitches toggle
- [ ] Schedule for later (TikTok API supports this)
- [ ] Disclosure labels for branded/promotional content
- [ ] Post URL confirmation

### Epic 6: Performance & Attribution (F29, F30, F35)

**US-6.1: View unified social media analytics**
> As a realtor, I want one dashboard showing performance across all platforms.

**Acceptance Criteria:**
- [ ] Stat pills: total posts (30d), total impressions, total engagement, total clicks, total leads
- [ ] Platform breakdown: bar chart showing engagement by platform
- [ ] Content type breakdown: which type (listing, market update, tips, video) performs best
- [ ] Top 5 posts by engagement with thumbnails
- [ ] Engagement trend line (30/60/90 day)
- [ ] Follower growth by platform
- [ ] Best posting times heatmap (day of week × hour)
- [ ] Data refresh: every 4 hours via platform APIs

**US-6.2: Track social media to CRM lead**
> As a realtor, I want to know which social media post generated which lead in my CRM.

**Acceptance Criteria:**
- [ ] Every link in social posts includes UTM parameters: `utm_source=instagram&utm_medium=social&utm_campaign=listing-123-just-listed`
- [ ] When lead submits form on website (via Realtors360 Sites or SDK), UTM captured and stored on contact record
- [ ] Contact detail page shows: "Source: Instagram — Just Listed post (March 15)"
- [ ] Analytics dashboard: "Social Media Leads" section showing lead count per platform, per content type
- [ ] Revenue attribution: if lead converts to deal, attribute deal value to originating post
- [ ] Monthly report: "Your Instagram generated 8 leads and $12,000 in commission this month"

**US-6.3: Hashtag intelligence**
> As a realtor, I want AI to suggest the best hashtags for each post based on my market and content.

**Acceptance Criteria:**
- [ ] AI generates 3 tiers: high-reach (100K+ posts), medium-reach (10K-100K), niche/local (<10K)
- [ ] Mix recommendation: 5 high-reach + 10 medium + 15 niche for Instagram (30 max)
- [ ] Location-specific: #SurreyBC, #VancouverRealEstate, #BCHomes
- [ ] Content-specific: #JustListed, #DreamHome, #LuxuryLiving
- [ ] Banned hashtag detection (Instagram shadow-bans certain tags)
- [ ] Trending hashtag alerts: "🔥 #SpringMarket2026 is trending — use it today"
- [ ] Performance tracking: which hashtag sets drive most engagement

### Epic 7: AI Learning & Automation (F37, F38, F42)

**US-7.1: AI learns my writing voice**
> As a realtor, I want the AI to learn my unique writing style so content sounds like me, not generic.

**Acceptance Criteria:**
- [ ] Reuse existing voice learning engine (`src/lib/voice-learning.ts`)
- [ ] When agent edits AI-generated caption, system extracts style rules
- [ ] Rules include: emoji usage, sentence length, tone, vocabulary, CTA style, hashtag preferences
- [ ] After 10+ edits, AI adapts to match agent's voice
- [ ] Voice profile visible in settings: "Your voice: Professional with warmth, moderate emoji use, prefers questions as CTAs"
- [ ] Agent can: view/edit rules, reset voice profile, provide example posts for AI to learn from

**US-7.2: Content learning engine**
> As a realtor, I want the AI to learn what content works best for MY audience and optimize recommendations.

**Acceptance Criteria:**
- [ ] Track per post: impressions, engagement rate, clicks, leads generated
- [ ] Weekly analysis: which content type, posting time, platform, hashtags performed best
- [ ] AI adjusts: content mix recommendations, posting schedule, template selection
- [ ] Monthly "Content Report" email: top 5 posts, worst 5 posts, recommendations for next month
- [ ] Dashboard widget: "AI recommends: Post more neighbourhood content (3x engagement vs listings)"
- [ ] Learning improves over 3+ months of data

**US-7.3: Auto-pilot mode (progressive trust)**
> As a realtor, I want the option to let AI handle my social media completely after I trust it.

**Acceptance Criteria:**
- [ ] Three trust levels: Manual (review everything) → Review (AI schedules, agent approves batch weekly) → Auto-Pilot (AI publishes without review)
- [ ] Trust level upgrade suggested after: 50+ approved posts with <5% edit rate
- [ ] Auto-pilot guardrails: no client names without permission, no sold prices without permission, no content during quiet hours
- [ ] Emergency stop: agent can pause all scheduled posts instantly
- [ ] Auto-pilot dashboard: shows what AI published, engagement results, any flagged items
- [ ] Weekly summary email even in auto-pilot mode

---

## 6. Technical Design

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CRM (Next.js 16)                         │
│                                                             │
│  ┌──────────┐  ┌───────────┐  ┌──────────┐  ┌───────────┐ │
│  │ Content   │  │ Calendar  │  │ Video    │  │ Analytics │ │
│  │ Studio UI │  │ UI        │  │ Studio   │  │ Dashboard │ │
│  └─────┬─────┘  └─────┬─────┘  └────┬─────┘  └─────┬─────┘ │
│        │              │              │              │        │
│  ┌─────┴──────────────┴──────────────┴──────────────┴─────┐ │
│  │              Server Actions / API Routes                │ │
│  └─────┬──────────────┬──────────────┬──────────────┬─────┘ │
│        │              │              │              │        │
│  ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼────┐  ┌─────▼─────┐ │
│  │ Claude AI │  │ Kling AI  │  │Platform │  │ Supabase  │ │
│  │ (content) │  │ (video)   │  │  APIs   │  │   (data)  │ │
│  └───────────┘  └───────────┘  └─────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────┘

Platform APIs:
  ├── Meta Graph API (Instagram + Facebook)
  ├── TikTok Content Posting API
  ├── YouTube Data API v3
  ├── LinkedIn Marketing API
  └── Pinterest API v5
```

### New Files & Modules

```
realestate-crm/src/
├── app/(dashboard)/social/
│   ├── page.tsx                    # Social dashboard (calendar + stats)
│   ├── studio/page.tsx             # Content creation studio
│   ├── templates/page.tsx          # Template library
│   ├── video/page.tsx              # Video studio
│   ├── analytics/page.tsx          # Performance dashboard
│   └── settings/page.tsx           # Accounts, brand kit, preferences
├── app/api/social/
│   ├── generate/route.ts           # AI content generation
│   ├── publish/route.ts            # Publish to platforms
│   ├── schedule/route.ts           # Schedule management
│   ├── analytics/route.ts          # Fetch platform analytics
│   ├── accounts/route.ts           # OAuth account management
│   ├── templates/route.ts          # Template CRUD
│   ├── video/route.ts              # Video generation proxy
│   └── hashtags/route.ts           # Hashtag intelligence
├── actions/
│   ├── social-content.ts           # Content CRUD, generation, approval
│   ├── social-publish.ts           # Publishing to platforms
│   ├── social-accounts.ts          # Account connection management
│   └── social-analytics.ts         # Analytics aggregation
├── components/social/
│   ├── ContentCalendar.tsx         # Visual calendar component
│   ├── ContentCard.tsx             # Post preview card
│   ├── ContentEditor.tsx           # Caption + image editor
│   ├── BrandKitEditor.tsx          # Brand settings panel
│   ├── TemplateGallery.tsx         # Template browser
│   ├── VideoStudio.tsx             # Video creation interface
│   ├── PlatformPreview.tsx         # Multi-platform preview
│   ├── ApprovalQueue.tsx           # Batch review interface
│   ├── AnalyticsDashboard.tsx      # Stats + charts
│   ├── HashtagSuggester.tsx        # Hashtag AI panel
│   ├── AccountConnector.tsx        # OAuth flow UI
│   └── ContentScore.tsx            # AI quality score indicator
├── lib/social/
│   ├── content-generator.ts        # Claude AI content generation
│   ├── platform-publisher.ts       # Unified publish interface
│   ├── instagram-api.ts            # Meta Graph API wrapper
│   ├── facebook-api.ts             # Facebook API wrapper
│   ├── tiktok-api.ts               # TikTok API wrapper
│   ├── youtube-api.ts              # YouTube Data API wrapper
│   ├── linkedin-api.ts             # LinkedIn API wrapper
│   ├── pinterest-api.ts            # Pinterest API wrapper
│   ├── video-generator.ts          # Kling AI + FFmpeg pipeline
│   ├── image-generator.ts          # Template rendering (Canvas/Sharp)
│   ├── hashtag-engine.ts           # Hashtag research + suggestions
│   ├── analytics-sync.ts           # Pull engagement data from platforms
│   ├── attribution-tracker.ts      # UTM generation + lead mapping
│   └── content-scorer.ts           # AI quality scoring
└── emails/
    └── WeeklyContentBrief.tsx      # Weekly content plan email
```

### Database Schema

```sql
-- Migration: 058_social_media_studio.sql

-- Connected social accounts
CREATE TABLE social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id uuid REFERENCES realtor_sites(id) ON DELETE CASCADE,
  platform text NOT NULL,           -- instagram, facebook, tiktok, youtube, linkedin, pinterest
  account_id text NOT NULL,         -- platform's account/page ID
  account_name text,                -- display name
  access_token text NOT NULL,       -- encrypted
  refresh_token text,               -- encrypted
  token_expires_at timestamptz,
  account_meta jsonb DEFAULT '{}',  -- followers, profile_url, etc.
  is_active boolean DEFAULT true,
  connected_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX idx_sa_platform ON social_accounts(realtor_id, platform, account_id);

-- Brand kit configuration
CREATE TABLE social_brand_kits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id uuid UNIQUE REFERENCES realtor_sites(id) ON DELETE CASCADE,
  logo_url text,
  headshot_url text,
  primary_colour text DEFAULT '#4f35d2',
  secondary_colour text DEFAULT '#ff5c3a',
  accent_colour text DEFAULT '#00bfa5',
  heading_font text DEFAULT 'Playfair Display',
  body_font text DEFAULT 'Inter',
  voice_tone text DEFAULT 'professional',    -- professional, friendly, luxury, bold, warm
  voice_rules jsonb DEFAULT '[]',            -- learned from edits
  bio_text text,
  brokerage_name text,
  default_hashtags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Content posts (drafts + published)
CREATE TABLE social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id uuid REFERENCES realtor_sites(id) ON DELETE CASCADE,

  -- Content
  content_type text NOT NULL,        -- listing_alert, just_sold, open_house, market_update,
                                     -- neighbourhood, testimonial, tips, holiday, milestone, custom
  caption text,
  hashtags text[] DEFAULT '{}',
  media_urls text[] DEFAULT '{}',    -- image/video URLs (Supabase storage)
  media_type text DEFAULT 'image',   -- image, carousel, video, reel, story
  template_id uuid,

  -- Source (what triggered this content)
  source_type text,                  -- listing, contact, testimonial, market_data, manual, ai_suggestion
  source_id uuid,                    -- listing_id, contact_id, etc.

  -- Platform targeting
  platforms text[] DEFAULT '{}',     -- which platforms to publish to
  platform_variants jsonb DEFAULT '{}', -- per-platform overrides {instagram: {caption, hashtags}, tiktok: {...}}

  -- Status & scheduling
  status text DEFAULT 'draft',       -- draft, scheduled, publishing, published, failed, cancelled
  scheduled_at timestamptz,
  published_at timestamptz,

  -- AI metadata
  ai_generated boolean DEFAULT true,
  ai_model text,
  content_score int,                 -- 0-100 predicted engagement
  generation_prompt text,            -- the prompt used

  -- Engagement (synced from platforms)
  engagement jsonb DEFAULT '{}',     -- {instagram: {likes, comments, shares, saves, impressions, reach}}

  -- Attribution
  utm_campaign text,                 -- for link tracking
  leads_generated int DEFAULT 0,

  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX idx_sp_realtor ON social_posts(realtor_id);
CREATE INDEX idx_sp_status ON social_posts(status);
CREATE INDEX idx_sp_scheduled ON social_posts(scheduled_at);

-- Published post records (one per platform per post)
CREATE TABLE social_post_publishes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES social_posts(id) ON DELETE CASCADE,
  account_id uuid REFERENCES social_accounts(id) ON DELETE CASCADE,
  platform text NOT NULL,
  platform_post_id text,             -- platform's post ID
  platform_url text,                 -- URL to the live post
  status text DEFAULT 'pending',     -- pending, published, failed
  error_message text,
  published_at timestamptz,
  engagement jsonb DEFAULT '{}',     -- platform-specific engagement data
  last_synced_at timestamptz
);
CREATE INDEX idx_spp_post ON social_post_publishes(post_id);

-- Content templates
CREATE TABLE social_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,            -- just_listed, just_sold, open_house, market_update, etc.
  media_type text NOT NULL,          -- image, carousel, video
  platforms text[] DEFAULT '{instagram,facebook}',
  thumbnail_url text,
  template_data jsonb NOT NULL,      -- layout, text positions, styles
  caption_template text,             -- with {{variables}}
  hashtag_suggestions text[] DEFAULT '{}',
  is_system boolean DEFAULT true,    -- system vs user-created
  usage_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Social analytics snapshots (daily)
CREATE TABLE social_analytics_daily (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id uuid REFERENCES realtor_sites(id) ON DELETE CASCADE,
  platform text NOT NULL,
  date date NOT NULL,
  followers int,
  impressions int,
  engagement int,
  clicks int,
  leads int,
  posts_count int,
  top_post_id uuid REFERENCES social_posts(id),
  metadata jsonb DEFAULT '{}',
  UNIQUE (realtor_id, platform, date)
);

-- Hashtag performance tracking
CREATE TABLE social_hashtag_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  realtor_id uuid REFERENCES realtor_sites(id) ON DELETE CASCADE,
  hashtag text NOT NULL,
  platform text NOT NULL,
  times_used int DEFAULT 0,
  avg_engagement float DEFAULT 0,
  avg_impressions float DEFAULT 0,
  last_used_at timestamptz,
  UNIQUE (realtor_id, hashtag, platform)
);

-- RLS
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_brand_kits ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_post_publishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_hashtag_performance ENABLE ROW LEVEL SECURITY;

CREATE POLICY social_accounts_policy ON social_accounts FOR ALL USING (true);
CREATE POLICY social_brand_kits_policy ON social_brand_kits FOR ALL USING (true);
CREATE POLICY social_posts_policy ON social_posts FOR ALL USING (true);
CREATE POLICY social_post_publishes_policy ON social_post_publishes FOR ALL USING (true);
CREATE POLICY social_templates_policy ON social_templates FOR ALL USING (true);
CREATE POLICY social_analytics_daily_policy ON social_analytics_daily FOR ALL USING (true);
CREATE POLICY social_hashtag_performance_policy ON social_hashtag_performance FOR ALL USING (true);
```

### Platform API Requirements

| Platform | API | Auth | Key Limits |
|----------|-----|------|-----------|
| Instagram | Meta Graph API v21 | OAuth 2.0 (Facebook Login) | 200 calls/user/hour, carousel max 10 images |
| Facebook | Meta Graph API v21 | OAuth 2.0 | Same auth as Instagram, Pages only (not personal profiles) |
| TikTok | Content Posting API | OAuth 2.0 | 3 video uploads/day for unverified apps, must be approved |
| YouTube | Data API v3 | OAuth 2.0 (Google) | 10,000 units/day quota, video upload = 1,600 units |
| LinkedIn | Marketing API | OAuth 2.0 | 100 API calls/day for basic, must apply for Marketing Developer Platform |
| Pinterest | API v5 | OAuth 2.0 | 1,000 calls/min for approved apps |

### AI Content Generation (Claude)

**Prompt structure for listing content:**
```
System: You are a social media content creator for a real estate agent.
Brand voice: {voice_rules from brand_kit}
Agent: {agent_name}, {brokerage}, {service_areas}

Generate social media content for this listing:
- Address: {address}
- Price: {price}
- Beds/Baths/SqFt: {specs}
- Key features: {features}
- Description: {description}
- Neighbourhood: {neighbourhood}

Generate for each platform:
1. Instagram carousel (5 slide captions + main caption + 30 hashtags)
2. Instagram Reel script (15-second voiceover text + text overlays)
3. Facebook post (2-3 paragraphs + 3 hashtags)
4. LinkedIn post (professional tone, market context, 5 hashtags)
5. TikTok script (hook + body + CTA, 30 seconds)

Rules:
- {voice_rules}
- Include neighbourhood highlights
- CTA: {preferred_cta_style}
- Emoji usage: {emoji_preference}
- Never use: {banned_words}
```

### Cron Jobs

| Cron | Schedule | Purpose |
|------|----------|---------|
| `/api/cron/social-publish` | Every 5 min | Check for posts scheduled in next 5 min, publish them |
| `/api/cron/social-analytics-sync` | Every 4 hours | Pull engagement data from all connected platforms |
| `/api/cron/social-content-triggers` | Every 15 min | Check for CRM events (new listing, sold, etc.) → generate content |
| `/api/cron/social-weekly-brief` | Monday 8 AM | Generate + email weekly content plan to agent |
| `/api/cron/social-token-refresh` | Daily 2 AM | Refresh expiring OAuth tokens |

---

## 7. Launch Plan

### Phase 1: Content Engine MVP (4 weeks)
- Brand kit setup
- AI content generation from listings (Claude)
- Template library (30 templates)
- Content calendar with approval queue
- Instagram publishing (most used platform)
- Basic analytics (post performance)

**Launch gate:** 5 beta agents using daily, generating 10+ posts/week each, >50% approval rate on first drafts

### Phase 2: Video + Multi-Platform (4 weeks)
- Photo-to-video generator (Kling AI)
- Auto-resize for all formats
- Burned-in captions
- Facebook publishing
- TikTok publishing
- YouTube Shorts publishing

**Launch gate:** Agents creating 3+ videos/week, publishing to 3+ platforms

### Phase 3: Intelligence (3 weeks)
- Unified analytics dashboard
- Lead attribution (UTM → CRM contact)
- Hashtag intelligence
- Content scoring
- Voice learning integration
- Smart scheduling

**Launch gate:** Attribution tracking 80%+ of social leads, analytics data refreshing reliably

### Phase 4: Automation (3 weeks)
- Content triggers (auto-generate on CRM events)
- Weekly content brief email
- Auto-pilot mode (progressive trust)
- Content recycling (reshare evergreen)
- LinkedIn + Pinterest publishing
- A/B testing

**Launch gate:** 3+ agents on auto-pilot mode, <5% edit rate

### Phase 5: Team Features (2 weeks)
- Team brand consistency (shared templates, locked brand elements)
- Team analytics (agent performance comparison)
- Content approval workflow (team lead approves before publish)
- Shared content library

---

## 8. Pricing Strategy

| Plan | Price | Includes |
|------|-------|---------|
| **Included in CRM** | $0 add-on | 5 AI posts/week, 1 platform, basic templates, manual publish |
| **Social Pro** | $29/mo | Unlimited posts, 3 platforms, all templates, scheduling, analytics |
| **Social Studio** | $49/mo | Everything + video generator, all platforms, auto-pilot, A/B testing, attribution |
| **Team Studio** | $99/mo | Everything + team features, brand lock, multi-agent, approval workflow |

**Value proposition:** Replaces Coffee & Contracts ($54) + Canva Pro ($13) + Later ($25) + CapCut ($8) = **$100/mo saved** at $49/mo.

---

## 9. Risk & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Platform API access denied | Medium | High | Apply for API access early (Meta, TikTok require app review). Start with Instagram (easiest approval). |
| API rate limits | Medium | Medium | Queue-based publishing, respect limits, cache analytics data |
| Content quality concerns | Medium | Medium | Approval queue default, voice learning, content scoring |
| Token expiry / OAuth breaks | High | Medium | Proactive token refresh cron, clear reconnect UI, alert agent |
| Platform policy changes | Medium | Medium | Abstract platform layer, monitor developer blogs, adapt quickly |
| Agent won't adopt | Medium | High | Make it zero-effort (auto-generate from CRM events). Weekly email nudge. |
| Video generation costs | Low | Medium | Kling AI per-video pricing, include N videos in plan, charge overage |

---

## 10. Competitive Moat

What makes this different from Coffee & Contracts + Canva + Later:

1. **CRM-Connected** — content auto-generates from real listing data, not generic templates
2. **AI Video** — listing photos → cinematic video in 3 minutes (no editing skills needed)
3. **Full Attribution** — know which post generated which lead and which deal
4. **Voice Learning** — AI sounds like the agent, not generic
5. **One Platform** — replaces 5+ tools, one login, one bill
6. **Auto-Trigger** — new listing? AI already has your Just Listed post ready
7. **Performance Learning** — AI learns what works for YOUR audience over time
8. **Multi-Market** — works for US, Canada, and UK agents (compliance-aware content)

---

*PRD Version 1.0 — March 27, 2026*
*Based on research across 200+ sources, US/Canada/UK markets*
