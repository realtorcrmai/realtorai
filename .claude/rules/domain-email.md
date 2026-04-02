---
paths:
  - "src/**/newsletters/**"
  - "src/actions/newsletters.ts"
  - "src/actions/journeys.ts"
  - "src/emails/**"
  - "src/lib/newsletter-ai.ts"
  - "src/lib/email-blocks.ts"
  - "src/lib/text-pipeline.ts"
  - "src/lib/quality-pipeline.ts"
  - "src/lib/validated-send.ts"
  - "src/lib/send-governor.ts"
  - "src/lib/workflow-engine.ts"
  - "src/app/api/webhooks/resend/**"
---

# Domain Rules: Email Engine

- Templates: `src/emails/*.tsx` (React Email)
- Send logic: `src/actions/newsletters.ts`
- Webhooks: `src/app/api/webhooks/resend/route.ts`
- AI generation: `src/lib/newsletter-ai.ts`
- Test with: `node scripts/qa-test-email-engine.mjs`
- CASL: always check consent. Include unsubscribe link. Physical address in footer.
- **Multi-tenant:** Always use `getAuthenticatedTenantClient()` — never raw admin client (HC-12)
