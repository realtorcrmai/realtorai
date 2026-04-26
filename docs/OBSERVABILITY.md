<!-- docs-audit: src/lib/*, src/app/api/* -->
<!-- docs-audit-reviewed: 2026-04-25 --paragon-browser-fix -->
# Observability Baseline

**Last reviewed:** 2026-04-21

---

## Golden signals per service

| Service | Latency | Traffic | Errors | Saturation |
|---------|---------|---------|--------|------------|
| CRM (Next.js) | Vercel Analytics (p50/p95) | Vercel request count | Vercel function errors | Vercel concurrent executions |
| Newsletter (Render) | Render metrics | Cron execution count | Render logs (stderr) | Memory usage |
| Supabase | Dashboard query perf | Connection count | Failed queries | Connection pool usage |

---

## Error tracking

**Current:** No dedicated error tracking service.

**Recommended:** Sentry (free tier: 5K errors/month).

### Implementation plan
1. `npm install @sentry/nextjs`
2. Run `npx @sentry/wizard@latest -i nextjs`
3. Configure DSN in env vars (Vercel + Render)
4. Sentry auto-instruments: API routes, server actions, client errors, React error boundaries
5. Add `Sentry.captureException()` to existing catch blocks that currently `console.error`

**Estimated effort:** 1 hour setup + 2 hours to wire existing error paths.

---

## Structured logging

**Current:** `console.log` / `console.error` — unstructured, no levels, no correlation.

**Recommended standard:**

```typescript
// src/lib/logger.ts (to be created)
type LogLevel = "debug" | "info" | "warn" | "error";

function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...meta,
  };
  // JSON format for structured log ingestion
  console[level === "error" ? "error" : "log"](JSON.stringify(entry));
}
```

**Correlation:** Include `requestId` (from Vercel headers) and `realtorId` (from auth session) in every log entry.

---

## Dashboards needed

| Dashboard | Source | Status |
|-----------|--------|--------|
| SLO tracker (4 SLIs) | Vercel + external monitor | Defined in `docs/SLO_DEFINITIONS.md`, not instrumented |
| API error rate (24h) | Vercel function logs | Not built |
| AI success rate | Application logs | Circuit breaker exists, no dashboard |
| Newsletter delivery | `newsletter_events` table | Queries exist in analytics page |

---

## Alerting

| Alert | Trigger | Channel | Status |
|-------|---------|---------|--------|
| Site down (5min) | External monitor fails 3 checks | Email | Not configured |
| High error rate (>5% in 1h) | Sentry alert rule | Email/Slack | Not configured |
| AI circuit breaker fired | 3x token overrun | In-app notification | Exists (completion-gate) |
| DB connection pool exhausted | Supabase dashboard alert | Email | Supabase built-in |

---

## Next steps

- [ ] Set up Sentry (1 hour)
- [ ] Create `src/lib/logger.ts` structured logger
- [ ] Configure external uptime monitor (UptimeRobot free tier)
- [ ] Build SLO tracking spreadsheet (monthly manual update until automated)
- [ ] Replace top 10 `console.log` statements with structured logger

<!-- Last reviewed: 2026-04-21 — team WIP session artifacts -->

<!-- team-management: reviewed 2026-04-22 — team analytics widget, audit log, offboarding wizard added -->
