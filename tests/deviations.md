# Deviation Log

> Document any intentional deviations from the testing design specification.
> Never silently deviate. Document here, then raise for review.

| Date | What changed | Why | Signal that original was right | Reviewer |
|------|-------------|-----|-------------------------------|----------|
| 2026-04-21 | Using shared dev DB instead of schema-per-PR | Supabase free tier doesn't support branching. Test data marked with is_sample for cleanup. | If test data collides or tests interfere | Rahul |
| 2026-04-21 | Supabase admin client instead of Prisma | Realtors360 uses Supabase JS, not Prisma ORM | If type safety gaps cause bugs | Rahul |
| 2026-04-21 | Server actions instead of Express routes | Next.js App Router pattern. L4 tests call actions or fetch. | If action testing proves insufficient | Rahul |
| 2026-04-21 | No L6c i18n tests | English-only app. No localization. | When localization is added | Rahul |
| 2026-04-21 | Relaxed pyramid target (40% L1) | Early stage, large existing E2E suite. L1 will grow. | If flake rate increases | Rahul |
| 2026-04-21 | Removed MCP test templates (4 files) | Realtors360 has no MCP server consumption. Templates were dead weight from PropAgent design spec. | When MCP integration is added to the CRM | Rahul |
| 2026-04-21 | 3-layer assertions instead of 4-layer | No separate UI layer in server action tests (no Prisma/Express split). Assert: Response + DB + Side effects. | If UI-specific bugs slip through | Rahul |
| 2026-04-21 | Kept curl-based test-suite.sh as G0 smoke | Pragmatic 73-test curl suite provides value. Design spec wanted pure Vitest/Playwright only. | If curl tests become maintenance burden | Rahul |
