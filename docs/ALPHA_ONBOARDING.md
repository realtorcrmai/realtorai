<!-- docs-audit: none --># Realtors360 Editorial — Alpha Agent Onboarding Guide
> Version 1.0 · April 2026 · 10-agent cohort

## Pre-Call Setup (5 min before Zoom)

1. Create their account at `https://realtors360.ai` (or send demo login)
2. Verify their email is allowlisted in Resend (add to suppression allowlist if needed)
3. Have their brokerage name, licence number, and city ready

---

## Zoom Onboarding Call Script (~30 min)

### 1. Voice Profile (5 min)
- Navigate to **Newsletters → Editions → Set Up Voice**
- Walk through the 4 steps:
  - City (e.g. "Vancouver, BC" or "Austin, TX")
  - Style: pick one that fits them — Professional / Friendly / Luxury
  - 3 rules: suggest "Always include a statistic", "Use the agent's first name in the sign-off", "Keep it under 200 words"
  - Paste a past email they've sent clients (even a showing confirmation works)
- Save → voice profile created

### 2. First Edition (10 min)
- Navigate to **Newsletters → Editions → New Edition**
- Select: **Market Update** · City: their market
- Click **Generate** — explain what's happening: "It's pulling live mortgage rates from Bank of Canada right now, and searching for local events in your market via AI"
- Wait 60–90 seconds for generation
- Walk through each block:
  - Show them the BoC rate watch (real numbers)
  - Have them rewrite the agent note in their own words (this feeds voice learning)
  - Check the neighbourhood spotlight is relevant

### 3. Send a Test (5 min)
- In the editor, click **Send** → enter their email as a test send
- Check their inbox together — show them the editorial format
- Ask: "Does this feel like something you'd send your clients?"

### 4. Settings + Automation (5 min)
- Navigate to **Newsletters → Settings → Sources**
- Enable the **Monday Auto-Draft** toggle
- Explain: "Every Monday at 6am, the system creates a draft edition for your market. You review and approve — takes 5 minutes"
- Show the **Content Library** (`/newsletters/library`) — platform tips they can rotate in

### 5. Wrap Up (5 min)
- Show the **Analytics** page for the test send
- Explain A/B subject line testing (Pro feature)
- Confirm their weekly rhythm: Monday draft → Tuesday or Wednesday send
- Schedule a follow-up check-in for Week 2

---

## Alpha Feedback Loop

After each weekly send, ask the agent:

1. **Edit ratio** — Did they change the AI draft a lot or a little? (We track this automatically via voice learning)
2. **Engagement** — Did any clients reply? Any CMA requests from the CTA?
3. **What felt off** — Any block that consistently gets deleted or rewritten?

Collect feedback weekly for 4 weeks. Priority fixes ship within 48h of each call.

---

## Alpha Tier: What They Get

| Feature | Alpha Agents |
|---------|-------------|
| Editions per month | Unlimited (Pro tier, free) |
| A/B subject line testing | ✅ |
| Voice learning AI | ✅ |
| Live BoC / Freddie Mac rates | ✅ |
| Monday auto-draft | ✅ |
| Analytics | ✅ |
| Support | Direct Slack or email |

---

## Metrics to Track (Week 4 Review)

| Metric | Target |
|--------|--------|
| Time to first send | < 15 min from account creation |
| Edit ratio (agent edits vs AI draft) | < 40% of content changed |
| Draft-to-send rate | > 70% of Monday drafts get approved |
| Open rate | > 35% |
| Click rate | > 4% |
| CMA requests from CTA | ≥ 1 per agent over 4 weeks |

---

## Known Limitations (Be Upfront)

- **MLS data**: Rate watch and market stats use BoC/Freddie Mac for rates, but sold prices come from Claude web search (not a live MLS feed yet). Numbers are directionally accurate, not precise.
- **Local events**: Sourced via AI web search — good for major cities, thinner for rural markets.
- **Stripe**: Billing is not live yet — all alpha agents are on unlimited Pro for free during the trial.
