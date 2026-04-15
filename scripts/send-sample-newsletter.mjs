import { Resend } from "resend";

const resend = new Resend("re_irQXbNRk_ERs9PMkpZu5nSHJGh7zeSKpM");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Vancouver Real Estate — May 2026 Edition</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f4f1eb; font-family: Georgia, 'Times New Roman', serif; }
  .wrapper { max-width: 620px; margin: 32px auto; background: #fff; border: 1px solid #e8e2d5; }
  .masthead { background: #1a2e1a; padding: 36px 40px 28px; text-align: center; }
  .masthead-eyebrow { color: #c9a96e; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; margin-bottom: 10px; font-family: Arial, sans-serif; }
  .masthead-title { color: #fff; font-size: 32px; font-weight: normal; letter-spacing: -0.5px; margin-bottom: 4px; }
  .masthead-subtitle { color: #a0b89a; font-size: 13px; font-family: Arial, sans-serif; }
  .divider-gold { height: 2px; background: linear-gradient(90deg, transparent, #c9a96e, transparent); margin: 0; }
  .hero { padding: 40px 40px 32px; border-bottom: 1px solid #f0ebe0; }
  .hero-eyebrow { font-size: 11px; color: #c9a96e; letter-spacing: 2px; text-transform: uppercase; font-family: Arial, sans-serif; margin-bottom: 12px; }
  .hero-headline { font-size: 28px; color: #1a2e1a; line-height: 1.25; margin-bottom: 16px; }
  .hero-body { font-size: 16px; color: #4a4a3a; line-height: 1.75; }
  .section { padding: 32px 40px; border-bottom: 1px solid #f0ebe0; }
  .section-label { font-size: 10px; color: #c9a96e; letter-spacing: 3px; text-transform: uppercase; font-family: Arial, sans-serif; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #e8e2d5; }
  .sold-card { background: #f9f7f2; padding: 16px; border-left: 3px solid #c9a96e; margin-bottom: 12px; }
  .sold-address { font-size: 14px; color: #1a2e1a; font-weight: bold; margin-bottom: 4px; font-family: Arial, sans-serif; }
  .sold-price { font-size: 20px; color: #1a6e3c; margin-bottom: 6px; }
  .sold-detail { font-size: 12px; color: #6b6b5a; font-family: Arial, sans-serif; }
  .rate-row { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 0; border-bottom: 1px solid #f0ebe0; font-family: Arial, sans-serif; }
  .rate-label { font-size: 14px; color: #4a4a3a; }
  .rate-value { font-size: 20px; color: #1a2e1a; font-weight: bold; }
  .rate-change { font-size: 11px; margin-left: 6px; }
  .rate-down { color: #1a6e3c; }
  .rate-up { color: #c0392b; }
  .stats-row { display: flex; flex-wrap: wrap; text-align: center; margin-bottom: 20px; }
  .stat { flex: 1 1 33%; padding: 12px 0; }
  .stat-number { font-size: 26px; color: #1a2e1a; display: block; }
  .stat-label { font-size: 10px; color: #6b6b5a; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 1px; }
  .tip-box { background: #f4f1eb; border-left: 4px solid #1a2e1a; padding: 20px 24px; }
  .tip-headline { font-size: 17px; color: #1a2e1a; margin-bottom: 8px; }
  .tip-body { font-size: 14px; color: #4a4a3a; line-height: 1.65; font-family: Arial, sans-serif; }
  .agent-note { background: #1a2e1a; padding: 32px 40px; }
  .agent-note-label { font-size: 11px; color: #c9a96e; letter-spacing: 2px; text-transform: uppercase; font-family: Arial, sans-serif; margin-bottom: 14px; }
  .agent-note-body { font-size: 15px; line-height: 1.75; color: #d0d8c8; }
  .agent-sig { margin-top: 20px; font-size: 14px; color: #c9a96e; font-family: Arial, sans-serif; }
  .cta-section { padding: 36px 40px; text-align: center; background: #f9f7f2; }
  .cta-headline { font-size: 22px; color: #1a2e1a; margin-bottom: 8px; }
  .cta-sub { font-size: 14px; color: #6b6b5a; font-family: Arial, sans-serif; margin-bottom: 24px; }
  .cta-btn { display: inline-block; background: #1a2e1a; color: #c9a96e; text-decoration: none; padding: 14px 36px; font-family: Arial, sans-serif; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; }
  .footer { padding: 24px 40px; text-align: center; background: #1a2e1a; }
  .footer-name { color: #c9a96e; font-size: 14px; font-family: Arial, sans-serif; margin-bottom: 4px; }
  .footer-detail { color: #6a7a62; font-size: 12px; font-family: Arial, sans-serif; margin-bottom: 2px; }
  .footer-legal { color: #4a5a42; font-size: 10px; font-family: Arial, sans-serif; margin-top: 12px; line-height: 1.6; }
  .footer-legal a { color: #6a7a62; }
</style>
</head>
<body>
<div class="wrapper">

  <div class="masthead">
    <div class="masthead-eyebrow">Realtors360 Editorial</div>
    <div class="masthead-title">The Vancouver Report</div>
    <div class="masthead-subtitle">May 2026 &nbsp;&middot;&nbsp; Greater Vancouver Real Estate</div>
  </div>
  <div class="divider-gold"></div>

  <div class="hero">
    <div class="hero-eyebrow">May 2026 Market Letter</div>
    <div class="hero-headline">Buyers are back &mdash; and they&rsquo;re negotiating harder than ever.</div>
    <div class="hero-body">
      After months of hesitation, buyer activity in Greater Vancouver picked up meaningfully this spring. Multiple offers have returned on well-priced detached homes in East Van and Burnaby, but the condo market is telling a different story &mdash; inventory is rising and sellers are accepting offers with conditions for the first time since 2021. If you&rsquo;ve been waiting for the right moment, the window may be opening.
    </div>
  </div>

  <div class="section">
    <div class="section-label">Recent Sales</div>
    <div class="sold-card">
      <div class="sold-address">4812 Boundary Rd, Burnaby</div>
      <div class="sold-price">$1,487,000</div>
      <div class="sold-detail">Listed $1,449,000 &nbsp;&middot;&nbsp; 4 bed / 3 bath &nbsp;&middot;&nbsp; 8 days &nbsp;&middot;&nbsp; 2.6% over ask</div>
    </div>
    <div class="sold-card">
      <div class="sold-address">302 &ndash; 1425 W 6th Ave, Vancouver</div>
      <div class="sold-price">$728,000</div>
      <div class="sold-detail">Listed $749,000 &nbsp;&middot;&nbsp; 1 bed / 1 bath &nbsp;&middot;&nbsp; 22 days &nbsp;&middot;&nbsp; Sold with inspection</div>
    </div>
    <div class="sold-card">
      <div class="sold-address">7231 Oak St, Vancouver</div>
      <div class="sold-price">$2,105,000</div>
      <div class="sold-detail">Listed $1,999,000 &nbsp;&middot;&nbsp; 5 bed / 4 bath &nbsp;&middot;&nbsp; 6 days &nbsp;&middot;&nbsp; Multiple offers</div>
    </div>
    <div class="sold-card" style="margin-bottom:0;">
      <div class="sold-address">1108 &ndash; 3333 Corvette Way, Richmond</div>
      <div class="sold-price">$638,000</div>
      <div class="sold-detail">Listed $659,000 &nbsp;&middot;&nbsp; 2 bed / 2 bath &nbsp;&middot;&nbsp; 31 days &nbsp;&middot;&nbsp; Accepted subjects</div>
    </div>
  </div>

  <div class="section">
    <div class="section-label">Rate Watch &mdash; May 2026</div>
    <div class="rate-row">
      <span class="rate-label">Bank of Canada Overnight Rate</span>
      <span class="rate-value">2.75% <span class="rate-change rate-down">&#9660; &minus;0.25 since March</span></span>
    </div>
    <div class="rate-row">
      <span class="rate-label">5-Year Fixed (best available)</span>
      <span class="rate-value">4.39% <span class="rate-change rate-down">&#9660; &minus;0.10</span></span>
    </div>
    <div class="rate-row">
      <span class="rate-label">Variable Rate (prime &minus; 0.90)</span>
      <span class="rate-value">5.10% <span class="rate-change rate-down">&#9660; &minus;0.25</span></span>
    </div>
    <div class="rate-row" style="border-bottom:none;">
      <span class="rate-label">Next BoC Decision</span>
      <span style="font-size:15px; color:#6b6b5a; font-family:Arial,sans-serif;">June 4, 2026</span>
    </div>
    <div style="margin-top:10px; font-size:11px; color:#9a9a8a; font-family:Arial,sans-serif;">Rates as of April 15, 2026. Actual rates vary by lender and qualification profile.</div>
  </div>

  <div class="section">
    <div class="section-label">Market Snapshot &mdash; April 2026</div>
    <div class="stats-row">
      <div class="stat"><span class="stat-number">2,847</span><span class="stat-label">New Listings</span></div>
      <div class="stat"><span class="stat-number">1,641</span><span class="stat-label">Sales</span></div>
      <div class="stat"><span class="stat-number">$1.24M</span><span class="stat-label">Avg Sale Price</span></div>
      <div class="stat"><span class="stat-number">19</span><span class="stat-label">Avg Days on Market</span></div>
      <div class="stat"><span class="stat-number">58%</span><span class="stat-label">Sales-to-Listings</span></div>
      <div class="stat"><span class="stat-number">+3.2%</span><span class="stat-label">YoY Price Change</span></div>
    </div>
    <div style="font-size:15px; color:#4a4a3a; line-height:1.75;">
      The 58% sales-to-listings ratio sits right on the balanced-market threshold. Detached homes in East Vancouver and South Burnaby are tracking seller-side at 68%; condos in Richmond and New Westminster are buyer-side at 43%. Overpriced listings are sitting 4&times; longer than correctly priced ones.
    </div>
  </div>

  <div class="section">
    <div class="section-label">Neighbourhood Spotlight</div>
    <div style="font-size:20px; color:#1a2e1a; margin-bottom:12px;">Mount Pleasant, Vancouver</div>
    <div style="font-size:14px; color:#4a4a3a; line-height:1.75; font-family:Arial,sans-serif;">
      Once considered fringe, Mount Pleasant has quietly become one of Vancouver&rsquo;s most compelling neighbourhoods for the 35&ndash;45 buyer cohort. The completion of the Broadway Subway corridor&rsquo;s Phase 2 stations (late 2026) is already driving pre-emptive price movement &mdash; detached values up 6.1% YoY, condos up 4.8%. The Main Street retail corridor between 7th and 20th carries a density of independent restaurants, studios, and galleries that rivals Commercial Drive. Walkability score: 94/100. Average household income: $118K. For buyers flexible on neighbourhood, this is the conversation worth having.
    </div>
  </div>

  <div class="section">
    <div class="section-label">This Month&rsquo;s Insight</div>
    <div class="tip-box">
      <div class="tip-headline">Pre-inspections are back as a competitive tool.</div>
      <div class="tip-body">
        In markets where conditions are becoming acceptable again, sellers who commission a pre-listing home inspection and share the report with buyers are seeing faster decisions and fewer extensions. Buyers feel confident removing the inspection condition when they&rsquo;ve already reviewed a credible third-party report. Cost: $400&ndash;$600. Return: often 3&ndash;5 fewer days on market and fewer last-minute price negotiations.
      </div>
    </div>
  </div>

  <div class="agent-note">
    <div class="agent-note-label">A Note From Your Agent</div>
    <div class="agent-note-body">
      Spring has arrived and I wanted to give you my honest read on what I&rsquo;m seeing. The buyers I&rsquo;m working with right now are more strategic than I&rsquo;ve seen in years &mdash; doing deeper due diligence, asking for pre-inspections, and taking their time. That discipline is going to serve them well. On the seller side, the agents getting the best results are pricing with precision and presenting their listings like they genuinely care about the outcome. There&rsquo;s no shortcut right now. If you&rsquo;ve been thinking about your next move &mdash; whether buying, selling, or just getting a sense of what your home is worth today &mdash; I&rsquo;d love to have a straight conversation.
    </div>
    <div class="agent-sig">Aman Dhindsa &nbsp;&middot;&nbsp; REALTOR&reg; &nbsp;&middot;&nbsp; Realtors360<br/>
    <span style="font-size:12px; color:#6a7a62;">BCFSA Licence #12345 &nbsp;&middot;&nbsp; Greater Vancouver</span></div>
  </div>

  <div class="cta-section">
    <div class="cta-headline">What&rsquo;s your home worth in this market?</div>
    <div class="cta-sub">Free, no-obligation comparative market analysis &mdash; delivered within 24 hours.</div>
    <a href="mailto:aman@realtors360.ai" class="cta-btn">Request My Free CMA</a>
  </div>

  <div class="footer">
    <div class="footer-name">Aman Dhindsa</div>
    <div class="footer-detail">REALTOR&reg; &mdash; Realtors360 Real Estate Group</div>
    <div class="footer-detail">+1 (604) 555-0192 &nbsp;&middot;&nbsp; aman@realtors360.ai</div>
    <div class="footer-legal">
      You are receiving this because you subscribed to The Vancouver Report.<br/>
      <a href="#">Unsubscribe</a> &nbsp;&middot;&nbsp; Realtors360 Real Estate Group, 1055 Dunsmuir St, Vancouver, BC V7X 1L3<br/>
      BCFSA Licence #12345. Sent in compliance with CASL.
    </div>
  </div>

</div>
</body>
</html>`;

const result = await resend.emails.send({
  from: "Aman @ Realtors360 <aman@realtors360.ai>",
  to: "er.amndeep@gmail.com",
  subject: "The Vancouver Report — May 2026 Edition",
  html,
});

if (result.error) {
  console.error("Send failed:", JSON.stringify(result.error, null, 2));
  process.exit(1);
} else {
  console.log("Sent successfully! ID:", result.data?.id);
}
