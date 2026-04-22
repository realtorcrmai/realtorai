<!-- docs-audit: src/app/api/*, src/actions/* -->

# Service Level Objectives (SLOs)

**Last reviewed:** 2026-04-21
**Review cadence:** Monthly

---

## SLIs and targets

| SLI | Measurement | Target | Error budget (30d) |
|-----|-------------|--------|-------------------|
| **Page load (p95)** | Time to interactive on dashboard pages | < 3 seconds | 5% of requests may exceed |
| **API error rate** | 5xx responses / total responses on `/api/*` | < 1% | 99% success rate |
| **AI response success** | Successful Claude API calls / total attempts | > 95% | 5% failures allowed (rate limits, timeouts) |
| **Uptime** | HTTP 200 on health endpoint / total checks | 99.5% | ~3.6 hours downtime/month |

---

## Measurement plan

### Page load (p95)
- **Source:** Vercel Analytics (built-in) or Web Vitals
- **Dashboard:** Vercel project → Analytics tab
- **Alert:** Not configured yet — add when Vercel Pro enables custom alerts

### API error rate
- **Source:** Vercel function logs
- **Calculation:** `count(status >= 500) / count(all) * 100` per 24h window
- **Alert:** Not configured yet

### AI response success
- **Source:** Application logging in `src/lib/anthropic/retry.ts`
- **Calculation:** Successful completions / total attempts (including retries)
- **Alert:** Circuit breaker fires at 3x token overrun or 10 iterations (existing)

### Uptime
- **Source:** External monitor (UptimeRobot, Pingdom, or similar — not yet set up)
- **Endpoint:** `GET /` (returns 200/307 when healthy)
- **Alert:** Email on 5-minute downtime

---

## Action thresholds

| Condition | Action |
|-----------|--------|
| SLI misses target for 1 day | Investigate — check logs, recent deploys |
| SLI misses target for 3 consecutive days | Incident — create issue, assign owner |
| Error budget consumed (30d) | Freeze non-critical deploys until budget recovers |

---

## Current status

All SLIs are defined but **not yet instrumented**. Next steps:
- [ ] Set up Vercel Analytics for page load tracking
- [ ] Add structured logging for API error rate calculation
- [ ] Configure external uptime monitor
- [ ] Build simple dashboard (even a spreadsheet works for start)

<!-- Last reviewed: 2026-04-21 — team WIP session artifacts -->
