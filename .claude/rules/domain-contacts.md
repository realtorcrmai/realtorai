---
paths:
  - "src/**/contacts/**"
  - "src/actions/contacts.ts"
---

# Domain Rules: Contacts

- Phone: E.164 format (+1XXXXXXXXXX). Always use `lib/twilio.ts` formatter.
- `pref_channel`: one of `sms`, `whatsapp`, `email`, `phone`
- `newsletter_intelligence`: JSONB — merge updates, never overwrite the whole field
- CASL: check `consent_status` before any outbound message
- **Multi-tenant:** Always use `getAuthenticatedTenantClient()` — never raw admin client (HC-12)
