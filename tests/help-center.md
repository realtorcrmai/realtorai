# Help Center — Test Cases

## Navigation (8 tests)

- [auto] GET /help returns 200 with feature cards
- [auto] GET /help/listing-workflow returns 200 with detail page
- [auto] GET /help/nonexistent returns 404
- [auto] GET /docs/listing-workflow returns 200 (public, no auth)
- [auto] GET /docs/voice-agent returns 404 (internal visibility)
- [manual] ? button shows contextual help for /listings page
- [manual] ? button shows generic help on unknown routes
- [manual] Cmd+K opens command palette, Escape closes

## Help Parser (6 tests)

- [auto] getAllFeatures() returns 10+ features from usecases/*.md
- [auto] getFeature("listing-workflow") returns valid HelpFeature with title, problem, roles
- [auto] getFeature("nonexistent") returns null
- [auto] getFeatureForRoute("/listings") returns listing-workflow
- [auto] Scenarios parsed correctly (name, steps, preconditions, edge cases)
- [auto] FAQ parsed correctly (question, answer pairs)

## Tours (5 tests)

- [manual] "Create Your First Listing" tour highlights elements on /listings
- [manual] Tour skips missing elements gracefully (no crash)
- [manual] Tour shows all steps with progress indicator
- [pending] Playwright CI test validates all data-tour selectors exist in DOM
- [pending] Tour completion logged to help_events

## Feedback (4 tests)

- [manual] Thumbs up submits immediately, shows "Thanks"
- [manual] Thumbs down expands tag selector
- [manual] Submitting negative feedback with tags works
- [pending] POST /api/help/feedback stores event in help_events table

## Onboarding Checklist (5 tests)

- [manual] Checklist appears on first visit (bottom-right)
- [manual] Checklist persists across page navigations
- [manual] Clicking "Go" navigates to correct page
- [manual] Dismiss hides checklist permanently
- [manual] Progress bar updates as items are checked

## Command Palette (4 tests)

- [manual] Cmd+K opens palette
- [manual] Typing "how" shows help results first
- [manual] Typing "create" shows action results first
- [manual] Selecting result navigates to correct page

## Public Docs / SEO (4 tests)

- [auto] /docs/listing-workflow renders without auth
- [auto] /docs/listing-workflow has Schema.org JSON-LD
- [auto] /docs/listing-workflow has proper meta title and description
- [manual] Internal articles (visibility: internal) not accessible at /docs

## Accessibility (6 tests)

- [pending] All help pages pass axe accessibility scan
- [manual] Tab navigation works through all interactive elements
- [manual] Screen reader reads feature cards correctly
- [manual] Escape closes popover, command palette, tour
- [manual] Skip nav link works on /help and /help/[slug]
- [manual] Focus trap in command palette dialog

## Summary

| Category | Auto | Manual | Pending | Total |
|----------|------|--------|---------|-------|
| Navigation | 5 | 3 | 0 | 8 |
| Help Parser | 6 | 0 | 0 | 6 |
| Tours | 0 | 3 | 2 | 5 |
| Feedback | 0 | 3 | 1 | 4 |
| Onboarding | 0 | 5 | 0 | 5 |
| Command Palette | 0 | 4 | 0 | 4 |
| Public Docs | 3 | 1 | 0 | 4 |
| Accessibility | 0 | 5 | 1 | 6 |
| **Total** | **14** | **24** | **4** | **42** |
