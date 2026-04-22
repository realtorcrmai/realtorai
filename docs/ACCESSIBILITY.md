<!-- docs-audit: src/components/**, src/app/(dashboard)/** -->
<!-- docs-audit-reviewed: 2026-04-22 -->
# Accessibility Baseline

**Target:** WCAG 2.2 AA
**Last reviewed:** 2026-04-21

---

## Current state

- 18/18 color contrast pairs pass WCAG AA
- Skip-to-content link in `DashboardShellClient.tsx`
- aria-labels on search inputs, tables, buttons, file uploads
- Focus rings (`ring-brand`) on DataTable rows
- Keyboard navigation: Tab+Enter on table rows, arrow keys in CommandPalette
- ARIA tab roles on PageHeader tab buttons

## Gaps

- Not all forms have `aria-describedby` annotations
- No automated a11y testing in CI
- No screen reader testing documented
- No a11y-tested persona in use-case template

## CI integration plan

```yaml
# Add to g2-review.yml after E2E tests
- name: Accessibility audit
  run: npx axe-core-cli http://localhost:3000 --exit
```

**Alternative:** Playwright `@axe-core/playwright` in E2E tests — checks each page during existing test runs.

## Accessibility checklist for new features

- [ ] Color contrast meets 4.5:1 for text, 3:1 for large text
- [ ] All interactive elements keyboard-accessible (Tab, Enter, Escape)
- [ ] Form inputs have associated labels (`aria-label` or `<label>`)
- [ ] Error messages announced to screen readers (`aria-live="polite"`)
- [ ] Images have alt text (decorative images: `alt=""`)
- [ ] Modals trap focus and return focus on close
- [ ] Page has a single `<h1>` with logical heading hierarchy

<!-- Last reviewed: 2026-04-21 — team WIP session artifacts -->

<!-- team-management: reviewed 2026-04-22 — team analytics widget, audit log, offboarding wizard added -->
