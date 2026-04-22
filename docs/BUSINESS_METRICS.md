<!-- docs-audit-reviewed: 2026-04-21 -->
<!-- docs-audit: src/app/(dashboard)/page.tsx, src/actions/contacts.ts, src/actions/listings.ts, src/app/(auth)/signup/page.tsx -->
# Business Metrics — Realtors360

> North Star metric, activation funnel, retention signals, and how engineering work
> maps to revenue. Data source: Supabase `qcohfohjihazivkforsj`. Last updated: 2026-04-21.

---

## North Star Metric

**Active Listings Managed Per Month**

Definition: Count of distinct listings with at least one workflow action (phase advancement, showing booked, document uploaded, or form generated) in the calendar month.

Why this is the right North Star:
- Directly measures core value delivery — Realtors360 exists to manage listing lifecycles
- Correlates with revenue: realtors on team/studio plans manage more listings
- Leading indicator of expansion: high listing volume → realtor upgrades plan or adds team members
- Regulatory proxy: active listings require FINTRAC compliance actions, creating sticky engagement

**Target thresholds:**
- 0 listings/month → churning (trigger re-engagement sequence)
- 1–3 listings/month → healthy solo realtor
- 4–10 listings/month → power user (upsell team plan)
- 10+ listings/month → brokerage candidate (enterprise outreach)

---

## Activation Funnel

The six steps from signup to core value delivery. Each step must be instrumented:

```
Step 1: Signup
  → Track: users table created_at
  → Drop-off signal: email not verified within 24 hours

Step 2: Email Verification
  → Track: users.email_verified_at
  → Drop-off signal: verification email clicked but not confirmed (resend rate)

Step 3: Onboarding Completed
  → Track: users.onboarding_completed_at (set by /onboarding wizard)
  → Drop-off signal: wizard abandoned at step 2 (personalization) most commonly

Step 4: First Contact Added
  → Track: MIN(contacts.created_at) per realtor_id
  → Drop-off signal: completed onboarding but no contact within 48 hours

Step 5: First Listing Created
  → Track: MIN(listings.created_at) per realtor_id
  → Drop-off signal: has contacts but no listing within 7 days

Step 6: First Newsletter Sent
  → Track: MIN(newsletters.sent_at) per realtor_id WHERE status = 'sent'
  → Drop-off signal: has listing but hasn't used email engine
```

**Activation rate definition:** Realtors who complete Steps 1–5 within 7 days of signup.

**Target:** ≥40% activation rate. Industry benchmark for B2B SaaS: 25–40%.

**Biggest known drop-off (2026-04-21):** Step 3 → 4. Realtors complete onboarding wizard but don't add a real contact. Mitigation: sample data seeding with `is_sample` flag (migration 103) + empty state CTAs.

---

## Retention Metric

**Weekly Active Users: Realtors who visited /listings or /contacts in the past 7 days.**

Secondary retention signals:
- Showings booked this week
- Communications sent (SMS, email, WhatsApp)
- Workflow phase advanced

Monthly retention SQL (run in Supabase SQL editor):
```sql
-- WAU: weekly active realtors (proxy via listings/contacts page — add page_views table when instrumented)
-- Until page_views table exists, use workflow activity as proxy:
SELECT
  DATE_TRUNC('week', created_at) AS week,
  COUNT(DISTINCT realtor_id) AS active_realtors
FROM listings
WHERE created_at > NOW() - INTERVAL '90 days'
GROUP BY 1
ORDER BY 1 DESC;
```

---

## Revenue Model & Plan Tiers

Plan tiers as defined in `users.plan` column:

| Plan | Target User | Expected MRR | Key Unlock |
|------|------------|-------------|------------|
| `free` | Trial realtors, new signups | $0 | Core CRM (contacts + listings) |
| `professional` | Solo realtor, active | ~$49/mo | Full AI engine, newsletters, content |
| `studio` | Power user, small team | ~$99/mo | All features + higher limits |
| `team` | Team lead + 2–5 agents | ~$199/mo | Multi-seat, shared listings |
| `admin` | Internal / brokerage admin | Custom | Full platform access |

Expansion revenue path: `free → professional → studio → team`. Team management feature directly enables the `professional → team` upgrade.

---

## Key Business Metrics to Track Monthly

### 1. MRR by Plan Tier
```sql
SELECT plan, COUNT(*) as users, COUNT(*) * CASE
  WHEN plan = 'professional' THEN 49
  WHEN plan = 'studio' THEN 99
  WHEN plan = 'team' THEN 199
  ELSE 0 END as estimated_mrr
FROM users
WHERE is_active = true
GROUP BY plan;
```

### 2. Activation Rate (signup → first listing within 7 days)
```sql
SELECT
  COUNT(DISTINCT u.id) AS signups,
  COUNT(DISTINCT l.realtor_id) AS activated,
  ROUND(COUNT(DISTINCT l.realtor_id)::numeric / COUNT(DISTINCT u.id) * 100, 1) AS activation_pct
FROM users u
LEFT JOIN listings l
  ON l.realtor_id = u.id
  AND l.created_at < u.created_at + INTERVAL '7 days'
WHERE u.created_at > NOW() - INTERVAL '30 days';
```

### 3. Feature Adoption
```sql
-- % of active realtors using newsletters
SELECT
  ROUND(COUNT(DISTINCT n.realtor_id)::numeric /
    NULLIF(COUNT(DISTINCT u.id), 0) * 100, 1) AS newsletter_adoption_pct
FROM users u
LEFT JOIN newsletters n ON n.realtor_id = u.id
WHERE u.is_active = true AND u.plan != 'free';
```

### 4. Time-to-Value (signup → first completed listing workflow phase)
Target: ≤72 hours from signup to first Phase 1 completion.

---

## How Engineering Work Maps to Metrics

| Engineering Work | Metric Impact |
|-----------------|--------------|
| Server-side pagination (TD-022) | Retention — power users with 100+ contacts stop hitting performance wall |
| Onboarding flow (migration 103) | Activation rate — wizard + sample data reduce Step 3→4 drop-off |
| AI email engine (Phase A complete) | Feature adoption — newsletters, journey enrollment |
| Team management (current sprint) | Expansion revenue — enables `professional → team` upgrades |
| FINTRAC compliance features | Regulatory requirement — not a growth metric but a churn prevention metric |
| Kling AI content studio | Feature adoption — differentiator vs. kvCORE / Follow Up Boss |
| Speed-to-lead alerts | Time-to-value — realtors who respond fast convert more leads |

---

## Monthly Metrics Review Checklist

Run on the first Monday of each month in the Supabase SQL editor:

- [ ] Active listings managed (North Star) — trending up/down vs. last month?
- [ ] Activation rate — above 40%?
- [ ] WAU trend — stable, growing, or declining?
- [ ] MRR by tier — any plan downgrades?
- [ ] Feature adoption by tier — who is NOT using newsletters/showings/AI content?
- [ ] Top 3 support issues from GitHub Issues — any pattern?
- [ ] Compliance actions pending — CASL re-confirmations, FINTRAC reviews?

Export results to a monthly GitHub Issue tagged `metrics-review` for audit trail.
