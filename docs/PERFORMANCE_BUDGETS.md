<!-- docs-audit: src/app/(dashboard)/** -->
<!-- docs-audit-reviewed: 2026-04-22 -->
# Performance Budgets

**Last reviewed:** 2026-04-21

---

## Per-route budgets

| Route | LCP target | Bundle budget | Status |
|-------|-----------|---------------|--------|
| `/` (dashboard) | < 2.5s | < 300KB JS | Not measured |
| `/contacts` | < 2.5s | < 250KB JS | Not measured |
| `/listings` | < 2.5s | < 250KB JS | Not measured |
| `/newsletters` | < 3.0s | < 400KB JS | Not measured (complex) |
| Login | < 1.5s | < 150KB JS | Not measured |

## Core Web Vitals targets

| Metric | Target | Current |
|--------|--------|---------|
| LCP (Largest Contentful Paint) | < 2.5s | Unknown |
| FID (First Input Delay) | < 100ms | Unknown |
| CLS (Cumulative Layout Shift) | < 0.1 | Unknown |

## CI integration plan

```yaml
# Lighthouse CI in nightly.yml
- name: Lighthouse audit
  run: |
    npm run build
    npx lhci autorun --config=lighthouserc.json
```

## Next steps

- [ ] Enable Vercel Analytics (Web Vitals tracking)
- [ ] Set up Lighthouse CI in nightly workflow
- [ ] Identify and fix top 3 bundle size contributors
- [ ] Add `next/dynamic` lazy loading for heavy components (newsletters, workflow builder)

<!-- Last reviewed: 2026-04-21 — team WIP session artifacts -->

<!-- team-management: reviewed 2026-04-22 — team analytics widget, audit log, offboarding wizard added -->
