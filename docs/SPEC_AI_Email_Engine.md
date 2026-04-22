<!-- Extracted from CLAUDE.md v1 during 2026-04-21 audit. See also: AGENTS.md for policy, CLAUDE.md for agent conventions. -->
<!-- docs-audit: src/actions/newsletters.ts, src/actions/journeys.ts, src/lib/newsletter-ai.ts, src/lib/workflow-engine.ts -->

# AI Email Marketing Engine

**Flow:** Contact added → AI writes email (text-pipeline → email-blocks → quality-pipeline) → Realtor approves → Resend sends → Webhooks track engagement → Adapt next email.

**Key libs:** `email-blocks.ts` (13 modular blocks, Apple-quality HTML), `text-pipeline.ts` (personalization + voice + compliance), `quality-pipeline.ts` (7-dimension Claude Haiku scoring), `validated-send.ts`, `send-governor.ts` (frequency caps), `newsletter-ai.ts`, `workflow-engine.ts`.

**Actions:** `newsletters.ts` (CRUD, send, approve), `journeys.ts` (enrollment, phase advancement). **Validators:** `src/lib/validators/*.ts` (content, design, compliance-gate, quality-scorer).

**Crons (require Bearer CRON_SECRET):** `/api/cron/process-workflows` (daily 9 AM), `/api/cron/daily-digest` (daily 8 AM), `/api/cron/consent-expiry` (weekly Mon 6 AM).

**UI:** `/newsletters` page with 7 tabs: Overview, AI Agent, Campaigns, Relationships, Journeys, Analytics, Settings.

**Tables:** `newsletters`, `newsletter_events`, `contact_journeys`, `contacts.newsletter_intelligence`, `realtor_agent_config`.

**Seed data:** `scripts/seed-demo.mjs` (29 contacts, 84 emails, 129 events). Phone prefix `+1604555`. Idempotent.

**Specs:** `docs/MASTER_IMPLEMENTATION_PLAN.md`, `docs/SPEC_Prospect_360.md`, `docs/SPEC_Email_Content_Intelligence.md`, `docs/SPEC_Validation_Pipeline.md`, `docs/PLAN_Competitive_RAG.md`, `docs/user-journeys.md`, `pendingwork.md`.
