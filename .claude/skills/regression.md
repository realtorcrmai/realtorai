---
name: regression
description: Run Full Regression Tests — all 3,500+ test cases across 8 layers (TypeScript, build, core CRUD 500, newsletter integration 3000, API endpoints 90, visual/browser 60, unit tests)
user_invocable: true
---

Run the complete Realtors360 regression test suite.

## What It Runs (8 Layers, 2,250+ Tests)

| Layer | Suite | Tests | Time |
|-------|-------|-------|------|
| 1 | TypeScript (`tsc --noEmit`) | Full | ~60s |
| 2 | Production Build (`npm run build`) | Full | ~3min |
| 3 | Core CRM Suite (`test-suite.sh`) | 500 | ~2min |
| 4 | Newsletter Integration (`integration-test-newsletter.sh`) | 3,000 | ~3min |
| 5 | API Endpoint Coverage (`test-endpoints.sh`) | 90 | ~30s |
| 6 | Visual & Browser (`test-visual-browser.sh`) | 60 | ~30s |
| 7 | Newsletter Service Unit Tests (vitest) | 121 | ~10s |
| 8 | CRM Unit Tests (vitest) | 5+ | ~10s |

## Steps

1. **Check dev server** is running on localhost:3000. If not, start it.

2. **Run the full regression suite:**
   ```bash
   bash scripts/run-all-tests.sh
   ```

3. **Report results** — show the summary table with pass/fail per layer and total duration.

4. **If any required suite fails**, investigate the failure output, fix the issue, and re-run only that layer to confirm the fix.

5. **Quick mode** (skip build + layers 4-8, ~2 min):
   ```bash
   bash scripts/run-all-tests.sh --quick
   ```

6. **No-build mode** (skip only the build step):
   ```bash
   bash scripts/run-all-tests.sh --no-build
   ```

## What Each Layer Tests

- **Layer 1 (TypeScript):** Zero compile errors across 732+ source files
- **Layer 2 (Build):** Next.js production build succeeds, all routes compile
- **Layer 3 (Core):** Navigation (38 routes), API auth (5), CRUD (16 entities), data integrity (6 constraints), cron auth (14), cascade delete, sample data validation
- **Layer 4 (Newsletter):** 20 categories — schema (19 tables, 82 columns), templates (18 types), contacts, CASL compliance, frequency caps, validation pipeline, AI generation, HTML rendering, sending, webhooks, journeys, workflows, crons, M5 agent, greetings, segments, analytics, learning, multi-tenancy, edge cases
- **Layer 5 (Endpoints):** Every API route returns correct status codes — auth (401 without session), cron (401 without token, 200 with token), webhooks, page routes, POST endpoints
- **Layer 6 (Visual):** Login page renders correctly, HTML quality (DOCTYPE, lang, charset), response time (<3s), static assets, security headers, error pages, cookie security
- **Layer 7 (Newsletter Unit):** 121 vitest cases — chunker, retriever, validators, trust levels, lead scorer, learning engine, prompts, template vars, agent pipeline
- **Layer 8 (CRM Unit):** Phone formatting, flow converter, email blocks, learning engine, field mapping

## Results

Results saved to `test-results/regression-results.json` after each run.

## When to Run

| Trigger | Mode |
|---------|------|
| Before every PR merge to `dev` | `--quick` minimum |
| Before every PR merge to `main` | Full (all 8 layers) |
| After any schema migration | Full |
| After any security fix | Full |
| After major feature completion | Full |
| Weekly health check | Full |
