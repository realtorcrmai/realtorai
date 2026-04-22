<!-- docs-audit: none --># Resend Webhook Setup

This document describes how to configure Resend webhooks so that email engagement events (opens, clicks, bounces, complaints) are tracked in Supabase and feed the AI engagement intelligence engine.

---

## Webhook URL

```
https://realtors360.ai/api/webhooks/resend
```

This endpoint verifies the Svix HMAC signature on every request before processing.

---

## Events to Enable

When creating the webhook in Resend, enable the following events:

| Event | What it tracks |
|-------|----------------|
| `email.delivered` | Confirms the email reached the recipient's inbox |
| `email.opened` | Recipient opened the email (pixel tracking) |
| `email.clicked` | Recipient clicked a link — classified by type (listing, CMA, showing, etc.) |
| `email.bounced` | Hard bounce — contact is automatically marked `newsletter_unsubscribed = true` |
| `email.complained` | Spam complaint — contact is automatically marked `newsletter_unsubscribed = true` |

---

## Where to Configure

1. Log in to [Resend](https://resend.com) → go to **Webhooks** in the left sidebar.
2. Click **Add endpoint**.
3. Paste the webhook URL above.
4. Select all five events listed above.
5. Click **Create**.
6. Resend will display the **Signing Secret** (format: `whsec_...`). Copy it immediately — it is only shown once.

---

## Environment Variables

### `RESEND_WEBHOOK_SECRET`

**What it is:** The Svix signing secret provided by Resend after webhook creation.

**Format:** `whsec_<base64-encoded-secret>`

**Where to set it:**

- **Vercel (CRM):** Vercel dashboard → Project → Settings → Environment Variables → add `RESEND_WEBHOOK_SECRET`.
- **Render (Newsletter Agent):** Render dashboard → Service → Environment → add `RESEND_WEBHOOK_SECRET`.
- **Local dev:** Add to `.env.local` at the repo root.

```bash
RESEND_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

> If this variable is missing, the webhook handler returns `503` and logs a warning. The webhook will not process any events.

---

## How It Works

When an event fires, Resend POSTs a signed JSON payload to the webhook URL. The handler:

1. Verifies the `svix-signature` header using the `RESEND_WEBHOOK_SECRET`.
2. Extracts the `newsletter_id` tag from the email to look up the contact.
3. Inserts a row into the `newsletter_events` table.
4. Updates `contacts.newsletter_intelligence` (JSONB) with engagement signals.
5. For high-intent clicks (score ≥ 30): inserts a hot lead alert into `agent_notifications`.
6. For bounces or complaints: sets `newsletter_unsubscribed = true` and pauses all active journeys.

---

## How to Test

1. Send a test newsletter from the CRM (`/newsletters` → Campaigns → Send).
2. Open the email and click a link.
3. Check the Supabase `newsletter_events` table for new rows:
   ```sql
   SELECT * FROM newsletter_events ORDER BY created_at DESC LIMIT 10;
   ```
4. Check that `contacts.newsletter_intelligence` was updated:
   ```sql
   SELECT newsletter_intelligence FROM contacts WHERE id = '<contact-id>';
   ```

You can also use the **Test** button inside Resend's webhook dashboard to send a sample payload — but note that test payloads use a fake `newsletter_id` that won't match any row, so the handler will return `{ ok: true }` without writing any data (by design).

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| Webhook returns 503 | `RESEND_WEBHOOK_SECRET` not set | Add env var, redeploy |
| Webhook returns 401 | Wrong secret or signing mismatch | Regenerate secret in Resend, update env var |
| Events received but no rows in `newsletter_events` | Email was not tagged with `newsletter_id` | Check `src/lib/resend.ts` — all sends must include `tags: [{ name: 'newsletter_id', value: id }]` |
| Contacts not marked as unsubscribed after bounce | Supabase RLS or missing column | Verify `newsletter_unsubscribed` column exists on `contacts` table |

---

## Related Files

| File | Purpose |
|------|---------|
| `src/app/api/webhooks/resend/route.ts` | Webhook handler — signature verification, event processing |
| `src/lib/resend.ts` | Resend API wrapper — includes `newsletter_id` tag on every send |
| `src/app/unsubscribe/[token]/page.tsx` | Public unsubscribe landing page |
| `src/lib/unsubscribe-token.ts` | HMAC token generation and verification |
| `src/actions/contacts.ts` | `unsubscribeContact` / `resubscribeContact` server actions |
