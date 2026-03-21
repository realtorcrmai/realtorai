# Claude Code Onboarding Prompt

**Copy and paste this into Claude Code after checking out the latest code from `main`.**

---

```
I just pulled the latest code from https://github.com/realtorcrmai/realtorai (main branch).

Please help me set up and verify my local environment:

1. Read CLAUDE.md and deploy.md to understand the project
2. Run `npm install` to install all dependencies
3. Check if I have a `.env.local` file — if not, help me create one with all required variables (reference deploy.md)
4. Run all Supabase migrations using: `SUPABASE_ACCESS_TOKEN=<my-token> npx supabase db query --linked -f <migration-file>` for each file in supabase/migrations/ (in order)
5. Start the dev server with `npm run dev` and verify it starts on localhost:3000
6. Run the QA test suite: `RESEND_API_KEY=<key> ANTHROPIC_API_KEY=<key> CRON_SECRET=<secret> node scripts/qa-test-email-engine.mjs`
7. Tell me if anything fails and fix it

Key things to know:
- This is a Next.js 16 app with Supabase, Resend (email), and Anthropic Claude (AI)
- The email marketing engine uses React Email templates in src/emails/
- AI agent layer is in src/lib/ai-agent/ (lead scoring, send advisor, recommendations)
- Workflow engine is in src/lib/workflow-engine.ts
- All cron endpoints need CRON_SECRET bearer token
- The middleware in src/middleware.ts exempts /api/cron/*, /api/webhooks/*, and /api/newsletters/unsubscribe from auth

If any migrations fail, check if the prerequisite tables exist and run earlier migrations first. Migration files are numbered — run them in order.
```

---

## For developers who already have the environment set up:

```
I just pulled new changes from main. Please:

1. Run `npm install` (in case new packages were added)
2. Check for new migration files in supabase/migrations/ that haven't been run yet
3. Run any new migrations using: `SUPABASE_ACCESS_TOKEN=<token> npx supabase db query --linked -f <file>`
4. Check if new env vars were added (look at deploy.md or CLAUDE.md for the full list)
5. Restart the dev server
6. Run the QA tests to verify everything works
7. Tell me what's new in this update (read the latest git log)
```

---

## For developers working on the email marketing engine:

```
I'm working on the email marketing engine. Before I start, please:

1. Read the functional spec at docs/functional-specs/Email_Marketing_Engine.md
2. Read the PRD at PRD_Newsletter_Journey_Engine.md
3. Read the evals at evals.md (section 6: Newsletter Engine — 80 test cases)
4. Verify these tables exist in Supabase: newsletters, newsletter_events, contact_journeys, newsletter_templates, agent_recommendations, contact_segments
5. Check that RESEND_API_KEY, ANTHROPIC_API_KEY, and CRON_SECRET are set in .env.local
6. Run the QA test suite and tell me the results

Key architecture:
- AI generates email content: src/lib/newsletter-ai.ts
- 6 React Email templates: src/emails/*.tsx
- Journey engine: src/actions/journeys.ts
- Workflow integration: src/lib/workflow-engine.ts (ai_email step type)
- Click tracking: src/app/api/webhooks/resend/route.ts
- Lead scoring: src/lib/ai-agent/lead-scorer.ts
- Send advisor: src/lib/ai-agent/send-advisor.ts (feature flag: AI_SEND_ADVISOR=true)
- Dashboard: src/app/(dashboard)/newsletters/page.tsx
```
