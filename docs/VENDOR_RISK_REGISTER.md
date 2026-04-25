<!-- docs-audit-reviewed: 2026-04-25 --soc2-mfa-drift -->
<!-- docs-audit: package.json -->

# Vendor Risk Register

**Review cadence:** Annually
**Last reviewed:** 2026-04-24

---

| Vendor | Purpose | SOC 2 | DPA | Data sent | Risk level | Fallback |
|--------|---------|-------|-----|-----------|------------|----------|
| **Supabase** | Database, Auth, Storage | Yes | Yes (GDPR) | All PII | High | PITR backup, migrate to self-hosted Postgres |
| **Vercel** | Hosting, CDN, Serverless | Yes | Yes | Code, env vars | Medium | Netlify, self-hosted |
| **Anthropic** | AI (Claude) | SOC 2 Type II | Yes | Listing data, prompts (no PII per HC-11) | Medium | OpenAI fallback |
| **Twilio** | SMS, WhatsApp | Yes | Yes | Phone numbers, message content | High | Vonage, MessageBird |
| **Resend** | Email delivery | Yes | Yes | Email addresses, newsletter content | Medium | SendGrid, Postmark |
| **Render** | Newsletter agent hosting | Yes | Yes | Code, env vars | Low | Railway, Fly.io |
| **Google** | OAuth, Calendar API | Yes | Yes (GDPR) | Email, calendar events | Medium | Microsoft Graph |
| **Kling AI** | Video/Image generation | Unknown | Unknown | Listing photos, prompts | Low | Runway, Stability AI |
| **Cloudflare** | Website hosting (Sites) | Yes | Yes | Static site content | Low | Netlify, Vercel |

## Annual review checklist

- [ ] Verify SOC 2 reports are current (< 12 months old)
- [ ] Review DPA terms for changes
- [ ] Check for security incidents at each vendor
- [ ] Evaluate alternatives if vendor risk increased
- [ ] Update this register
