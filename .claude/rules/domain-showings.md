---
paths:
  - "src/**/showings/**"
  - "src/actions/showings.ts"
---

# Domain Rules: Showings

- Status flow: `pending` → `confirmed`/`denied` → `completed`/`cancelled`
- On confirm: send lockbox code via seller's `pref_channel`
- Always create `communications` log entry for status changes
- **Multi-tenant:** Always use `getAuthenticatedTenantClient()` — never raw admin client (HC-12)
