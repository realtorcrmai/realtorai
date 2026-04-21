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
