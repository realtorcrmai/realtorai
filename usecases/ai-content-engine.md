---
title: " Use Case: AI Content Engine"
slug: "ai-content-engine"
owner: rahul
last_reviewed: "2026-03-27"
visibility: public
related_routes: ["/content"]
changelog: []
---

# Use Case: AI Content Engine

## Problem Statement

Creating compelling marketing content for every listing is time-intensive. Writing MLS remarks that are accurate, engaging, and within the 500-character limit; crafting Instagram captions with the right hashtags; and producing cinematic video and image assets — each task can take hours per listing. Most agents either skip this content entirely or publish generic, low-effort copy that undersells the property.

ListingFlow's AI Content Engine eliminates this bottleneck. Claude AI generates MLS remarks and social captions from listing data in seconds. Kling AI produces broadcast-quality 4K video (9:16 for Instagram Reels/TikTok) and 8K images (1:1 for Instagram posts) from a single hero photo and text prompt. The entire workflow — Prompts → Generate → Gallery — lives inside the CRM.

---

## User Roles

| Role | Interaction |
|------|-------------|
| **Listing Agent** | Triggers AI generation; reviews and edits outputs; copies MLS remarks; downloads media assets for posting |
| **Marketing Assistant** | Manages the content gallery; reorders photos; submits assets to social platforms |
| **Seller (Client)** | Benefits from professional-grade marketing content without agent spending hours producing it |

---

## Existing System Context

- **Claude AI integration:** `src/lib/anthropic/creative-director.ts`
  - `generateMLSRemarks(listing)` → returns `{ publicRemarks, realtorRemarks }` (max 500 chars each)
  - `generateContentPrompts(listing)` → returns `{ videoPrompt, imagePrompt, igCaption }`
  - Model: `claude-sonnet-4-20250514`
- **Kling AI client:** `src/lib/kling/client.ts`
  - `startVideoGeneration({ imageUrl, prompt, aspectRatio: "9:16" })` → returns `taskId`
  - `startImageGeneration({ prompt, aspectRatio: "1:1" })` → returns `taskId`
  - `getTaskStatus(taskId)` → returns `{ status, outputUrl }`
- **API routes:**
  - `POST /api/mls-remarks` — proxies to content generator service at `:8769`; returns `{ publicRemarks, realtorRemarks }`
  - `GET /api/kling/status?taskId=...` — polls Kling task status; returns `{ status, outputUrl }`
- **Tables:** `prompts` (stores AI-generated prompts per listing), `media_assets` (stores generated files with status and output URLs)
- **Content stepper:** `src/components/content/ContentStepper.tsx` — 3-step UI: Prompts → Generate → Gallery
- **Pages:** `/content` (listing selector), `/content/[id]` (content engine for a specific listing)
- **Hook:** `src/hooks/useKlingTask.ts` — polls `/api/kling/status` every 5 seconds until task completes

---

## Features

### 1. Claude AI — MLS Remarks Generation
Given listing context (address, price, bedrooms, bathrooms, sqft, year built, features, showing instructions), Claude generates:
- **Public Remarks** (max 500 chars): Consumer-facing, highlights key selling points and lifestyle. No agent contact info, no showing instructions.
- **REALTOR Remarks** (max 500 chars): Agent-only. Showing instructions, lockbox details, offer presentation preferences, agent-to-agent notes.

Both are generated with Canadian English spelling and enforced to ≤500 characters.

### 2. Claude AI — Content Prompts Generation
Claude generates three pieces of content for downstream Kling AI use:
- **Video Prompt**: Cinematic direction for Kling image-to-video. Describes camera movements, lighting, mood, and scene composition for a 9:16 vertical video.
- **Image Prompt**: Art direction for Kling text-to-image. Describes the ideal hero shot angle, lighting, style, and atmosphere for a 1:1 square image.
- **Instagram Caption**: Compelling caption with 5–10 relevant hashtags. Max 2,200 characters.

### 3. Kling AI — Image-to-Video (4K, 9:16)
Takes the listing's hero photo URL and the Claude-generated video prompt and sends to Kling AI's video generation API. Returns a 5-second 4K cinematic video in 9:16 aspect ratio — optimised for Instagram Reels and TikTok. Generation is async; `useKlingTask` polls for completion.

### 4. Kling AI — Text-to-Image (8K, 1:1)
Sends the Claude-generated image prompt to Kling AI's image generation API. Returns an 8K square image optimised for Instagram feed posts. Useful when hero photography is not available or needs augmentation.

### 5. Content Stepper Workflow
Three-step interface for each listing:
1. **Prompts Step** — shows Claude-generated prompts (MLS remarks, video prompt, image prompt, IG caption). Agent can edit any prompt before proceeding.
2. **Generate Step** — triggers Kling AI jobs for video and image. Shows real-time progress bars via polling. Both tasks can run in parallel.
3. **Gallery Step** — displays all completed media assets (photos, generated video, generated image) in a grid. Agent can download assets or copy MLS remarks to clipboard.

### 6. Asset Management
All generated assets are stored in the `media_assets` table with `status` (pending, processing, completed, failed) and `output_url`. The gallery view surfaces all assets for the listing, not just AI-generated ones — allowing photo uploads to sit alongside AI content.

---

## End-to-End Scenarios

### Scenario 1: Generate MLS Remarks from Listing Data
1. Agent opens `/content` → selects listing "456 Maple St, Surrey."
2. System navigates to `/content/[id]` — Content Stepper opens at the Prompts step.
3. Agent clicks "Generate MLS Remarks."
4. `POST /api/mls-remarks` is called with listing context (address, price, beds, baths, sqft, features).
5. Claude returns: Public Remarks — "Stunning 4-bed family home in sought-after Sullivan Heights. Renovated kitchen with quartz counters, vaulted ceilings, and private backyard. Steps to schools, parks & transit. Priced to move — don't miss this one. Open Sunday 2–4pm." (498 chars)
6. REALTOR Remarks — "Lockbox on front door. Seller needs 24hr notice for showings. Offers presented Tues at 6pm. Please allow 48hr irrev. Pre-inspection report available." (149 chars)
7. Agent reviews, makes a minor edit, and copies Public Remarks for MLS input.

### Scenario 2: Generate Video and Image Simultaneously
1. Agent is at the Generate step for "456 Maple St."
2. Hero photo is available at a Supabase storage URL.
3. Claude-generated video prompt: "Slow cinematic dolly shot through bright living room, warm afternoon light, seamless cut to aerial over private backyard, finishing with close-up of quartz kitchen. Soft orchestral score. 9:16."
4. Agent clicks "Generate Video" and "Generate Image" — both Kling jobs start in parallel.
5. `useKlingTask` polls `/api/kling/status` every 5 seconds for both task IDs.
6. Video completes in ~45 seconds — a 5-second 4K 9:16 clip appears in the gallery.
7. Image completes in ~30 seconds — an 8K 1:1 image appears in the gallery.
8. Agent downloads both assets for posting.

### Scenario 3: Edit Prompt Before Generation
1. Agent is at the Prompts step for "789 Oak Ave."
2. Claude-generated image prompt describes "golden hour exterior shot" but the listing is a condo with no exterior.
3. Agent edits the prompt: "Bright corner unit interior looking out over city skyline, late afternoon light, modern minimalist styling, 1:1 square crop."
4. Edited prompt is saved to `prompts` table for the listing.
5. Agent proceeds to Generate step — Kling uses the edited prompt.
6. Result is a high-quality interior shot reflecting the correct property type.

### Scenario 4: MLS Remarks Too Long — Character Enforcement
1. Claude initially generates a 512-character public remarks paragraph.
2. The `generateMLSRemarks` function enforces `.slice(0, 500)` — truncation is applied automatically.
3. The agent sees a character counter in the UI: "498 / 500" — within limit.
4. If the agent manually types beyond 500 characters, the input field caps at 500 and shows a warning.

### Scenario 5: Kling Generation Fails — Error Recovery
1. Agent triggers video generation for "321 Cedar Rd."
2. Kling API returns an error: `task_id` resolves to `status: "failed"` after 60 seconds.
3. `useKlingTask` surfaces the error in the Generate step: "Video generation failed. Please try again."
4. The `media_assets` record is updated to `status: "failed"` with `error_message`.
5. Agent edits the video prompt (simplifies the camera direction) and retries — second attempt succeeds.

### Scenario 6: Voice Agent Content Status Check
1. Agent says: "What content has been generated for Maple Street?"
2. Voice agent calls `get_crm_help` with topic `content engine` and cross-references the listing's `media_assets` and `prompts` records.
3. Response: "For 456 Maple St — MLS remarks have been generated. A 4K video and 8K image are both complete. Instagram caption is ready. You can view all assets at /content/[id]."

---

## Demo Script

**Setup:** Listing "456 Maple St, Surrey" exists with a hero photo uploaded. No content generated yet.

1. **Open `/content`** → select "456 Maple St" → navigate to content engine
2. **Prompts Step** → click "Generate MLS Remarks" → Claude response appears in ~3 seconds
3. **Show character counter** on Public Remarks — 498/500 chars
4. **Show REALTOR Remarks** — showing instructions, lockbox code, offer presentation
5. **Click "Generate Prompts"** → Claude returns video prompt, image prompt, IG caption
6. **Read Instagram caption aloud** — show hashtags (#SurreyRealEstate, #ListingFlow, etc.)
7. **Advance to Generate Step** → click "Generate Video" and "Generate Image" simultaneously
8. **Show progress bars** polling in real time — "Processing... 40%"
9. **Video completes** → 5-second 4K clip plays in browser
10. **Image completes** → 8K image renders in gallery
11. **Gallery Step** → show full asset grid: hero photo + generated video + generated image
12. **Download assets** → show download button

---

## Data Model

### `prompts` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row identifier |
| `listing_id` | uuid FK → listings | Associated listing |
| `video_prompt` | text | Claude-generated Kling video prompt |
| `image_prompt` | text | Claude-generated Kling image prompt |
| `ig_caption` | text | Claude-generated Instagram caption with hashtags |
| `public_remarks` | text | Claude-generated MLS public remarks (max 500 chars) |
| `realtor_remarks` | text | Claude-generated MLS REALTOR remarks (max 500 chars) |
| `created_at` | timestamptz | Generation timestamp |
| `updated_at` | timestamptz | Last edited timestamp |

### `media_assets` Table
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Row identifier |
| `listing_id` | uuid FK → listings | Associated listing |
| `asset_type` | text | video, image, photo |
| `source` | text | kling_video, kling_image, upload |
| `status` | text | pending, processing, completed, failed |
| `task_id` | text | Kling AI task ID for async polling |
| `output_url` | text | Final asset URL once complete |
| `error_message` | text | Error detail if failed |
| `created_at` | timestamptz | Asset creation timestamp |
| `completed_at` | timestamptz | When generation finished |

---

## Voice Agent Integration

### Supported Queries
- "Generate MLS remarks for [address]" → voice agent directs to `/content/[id]` content engine
- "What content is ready for [listing]?" → looks up `media_assets` and `prompts` for the listing
- "Explain the content engine" → `get_crm_help` with topic `content engine`
- "How do I create an Instagram post?" → describes the Prompts → Generate → Gallery workflow
- "What is the character limit for MLS remarks?" → "MLS public remarks and REALTOR remarks are both limited to a maximum of 500 characters."

### Knowledge Base Entry (voice agent `get_crm_help`)
Topic: `content engine` — "The AI Content Engine generates marketing assets for listings using Claude AI and Kling AI. Claude generates MLS public remarks (max 500 chars), REALTOR remarks (max 500 chars), Instagram captions, and Kling prompts. Kling AI generates Image-to-Video (hero photo → 4K video for Instagram Reels) and Text-to-Image (prompt → 8K image for Instagram feed). Access the content engine at /content. Select a listing to start generating assets through the 3-step workflow: Prompts → Generate → Gallery."
