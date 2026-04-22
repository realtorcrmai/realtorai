<!-- docs-audit: src/lib/analytics.ts -->

# Analytics Event Standard

**Last reviewed:** 2026-04-21

---

## Naming convention

```
<object>_<action>
```

**Objects:** `contact`, `listing`, `showing`, `newsletter`, `task`, `team`, `workflow`
**Actions:** `created`, `updated`, `deleted`, `viewed`, `exported`, `sent`, `approved`, `declined`

Examples: `contact_created`, `listing_viewed`, `newsletter_sent`, `task_completed`

## Event schema

```typescript
interface AnalyticsEvent {
  event: string;          // e.g. "contact_created"
  timestamp: string;      // ISO 8601
  realtor_id: string;     // tenant scope
  properties?: {
    source?: string;      // "web" | "api" | "cron" | "webhook"
    entity_id?: string;   // ID of the affected record
    [key: string]: unknown;
  };
}
```

## PII rules

**Never include in analytics events:**
- Contact phone numbers or email addresses
- FINTRAC identity data
- Message content
- API keys or tokens

**Allowed:**
- Entity IDs (UUIDs — not PII)
- Counts and aggregates
- Feature names and actions
- Error codes (not error messages containing user data)

## Current implementation

`src/lib/analytics.ts` — `trackEvent()` function writes to `analytics_events` table.

## Next steps

- [ ] Audit existing `trackEvent()` calls for PII compliance
- [ ] Add event tracking to major user actions (contact CRUD, listing workflow, newsletter send)
- [ ] Build analytics dashboard page
