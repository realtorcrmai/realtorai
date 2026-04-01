import { NextRequest, NextResponse } from "next/server";
import { generateAndQueueNewsletter, sendNewsletter } from "@/actions/newsletters";
import { sendEmail } from "@/lib/resend";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Test endpoint to generate and send a newsletter.
 * Only available in development.
 *
 * POST /api/test/generate-newsletter
 * Body: { contactId, emailType, journeyPhase, journeyId?, sendMode?, skipAI? }
 *
 * When skipAI=true, uses a static HTML template instead of Claude AI.
 */

const STATIC_TEMPLATES: Record<string, { subject: string; body: string }> = {
  // ── Journey Email Types ──
  welcome: {
    subject: "Welcome to ListingFlow, {{name}}!",
    body: `<h2>Welcome aboard, {{name}}!</h2><p>We're excited to have you. As a {{type}} in the BC real estate market, we'll keep you updated with personalized listings, market insights, and neighbourhood guides.</p><p>Here's what to expect:</p><ul><li>Weekly listing alerts matched to your preferences</li><li>Monthly market updates for your area</li><li>Neighbourhood guides when you're exploring new areas</li></ul>`,
  },
  neighbourhood_guide: {
    subject: "Discover Kitsilano — Your Neighbourhood Guide",
    body: `<h2>Explore Kitsilano, {{name}}</h2><p>Kitsilano is one of Vancouver's most sought-after neighbourhoods.</p><ul><li><strong>Beaches:</strong> Kits Beach, Jericho Beach</li><li><strong>Dining:</strong> 4th Ave restaurant row with 50+ restaurants</li><li><strong>Schools:</strong> Kitsilano Secondary, Henry Hudson Elementary</li><li><strong>Transit:</strong> 10 min to downtown via Burrard Bridge</li></ul><p>Average home prices: Condos $850K–$1.2M, Detached $2.5M+</p>`,
  },
  new_listing_alert: {
    subject: "New Homes in Kitsilano — Fresh Listings This Week",
    body: `<h2>New listings matched for you, {{name}}</h2><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0;"><h3>3456 W 4th Ave, Kitsilano</h3><p>2 bed · 2 bath · 950 sq ft · <strong style="color:#4f35d2;">$899,000</strong></p></div><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:12px 0;"><h3>2845 Vine St, Kitsilano</h3><p>3 bed · 2 bath · 1,200 sq ft · <strong style="color:#4f35d2;">$1,195,000</strong></p></div>`,
  },
  market_update: {
    subject: "Your Kitsilano Market Update — March 2026",
    body: `<h2>March 2026 Market Snapshot</h2><p>Hi {{name}}, here's what's happening in your area:</p><table style="width:100%;border-collapse:collapse;"><tr style="background:#f4f2ff;"><td style="padding:12px;font-weight:bold;">Avg Sale Price</td><td style="padding:12px;">$1,125,000 (+3.2%)</td></tr><tr><td style="padding:12px;font-weight:bold;">Days on Market</td><td style="padding:12px;">18 days</td></tr><tr style="background:#f4f2ff;"><td style="padding:12px;font-weight:bold;">New Listings</td><td style="padding:12px;">47 this month</td></tr></table>`,
  },
  home_anniversary: {
    subject: "Happy Home Anniversary, {{name}}!",
    body: `<h2>Happy Anniversary, {{name}}!</h2><p>It's been a year since you found your perfect home.</p><p><strong>Estimated value:</strong> <span style="font-size:24px;font-weight:bold;color:#059669;">$925,000 (+5.2%)</span></p><ul><li>Schedule an HVAC inspection</li><li>Check your roof and gutters</li><li>Review your home insurance</li></ul>`,
  },
  just_sold: {
    subject: "Just Sold: 3456 W 4th Ave, Kitsilano",
    body: `<h2>Another One Sold!</h2><p>3456 W 4th Ave, Kitsilano just closed.</p><p style="font-size:20px;font-weight:bold;">Sold for $915,000</p><p>Listed at $899,000 · 12 days on market · 3 offers</p>`,
  },
  open_house_invite: {
    subject: "Open House This Saturday: 2845 Vine St",
    body: `<h2>You're Invited!</h2><div style="background:#f4f2ff;border-radius:8px;padding:16px;margin:12px 0;"><p><strong>2845 Vine St, Kitsilano</strong></p><p>Saturday, March 28 · 2:00 PM – 4:00 PM</p><p>3 bed · 2 bath · $1,195,000</p></div>`,
  },
  // ── Workflow Step Templates (email versions of SMS/alerts) ──
  "sms_acknowledge_lead": {
    subject: "[SMS] Instant Lead Acknowledgement",
    body: `<div style="background:#dcfce7;border:2px solid #86efac;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Hi {{name}}! Thanks for reaching out about homes in Vancouver. I'm your dedicated realtor and I'll be in touch shortly. In the meantime, feel free to text me with any questions! — Sarah Smith, ListingFlow Realty</p></div>`,
  },
  "sms_followup": {
    subject: "[SMS] Follow-Up Message",
    body: `<div style="background:#dcfce7;border:2px solid #86efac;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Hi {{name}}, just checking in! I noticed you were looking at properties in Kitsilano. Would you like me to set up some showings this week? I have a few great options that just came on the market. — Sarah</p></div>`,
  },
  "sms_final_outreach": {
    subject: "[SMS] Final Outreach",
    body: `<div style="background:#fef3c7;border:2px solid #fcd34d;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS — Final Touch</p><p>Hi {{name}}, I wanted to reach out one more time. The market is moving fast and I don't want you to miss out. If you're still interested in finding your perfect home, let's connect! — Sarah</p></div>`,
  },
  "sms_congrats": {
    subject: "[SMS] Congratulations!",
    body: `<div style="background:#dcfce7;border:2px solid #86efac;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Congratulations {{name}}!! 🎉 So excited for you! Welcome to your new home. If you need anything at all — movers, handyman, anything — just text me! — Sarah</p></div>`,
  },
  "sms_checkin": {
    subject: "[SMS] Check-In",
    body: `<div style="background:#dcfce7;border:2px solid #86efac;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Hey {{name}}! How are you settling in? Everything going smoothly with the new place? Let me know if you need anything! — Sarah</p></div>`,
  },
  "sms_property_thoughts": {
    subject: "[SMS] Thoughts on the Property?",
    body: `<div style="background:#dcfce7;border:2px solid #86efac;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Hi {{name}}! What did you think of the property we saw? I'd love to hear your thoughts. If it's not the one, I have a few more options that might be even better! — Sarah</p></div>`,
  },
  "sms_another_showing": {
    subject: "[SMS] Ready for Another Showing?",
    body: `<div style="background:#dcfce7;border:2px solid #86efac;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Hey {{name}}! Some amazing new listings just hit the market. Want to schedule another showing this week? I think you'll love these! — Sarah</p></div>`,
  },
  "sms_reengagement": {
    subject: "[SMS] Still Looking?",
    body: `<div style="background:#fef3c7;border:2px solid #fcd34d;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS — Re-engagement</p><p>Hi {{name}}! It's been a while since we connected. The market has changed quite a bit — are you still thinking about buying? I'd love to catch you up on what's new. — Sarah</p></div>`,
  },
  "sms_last_checkin": {
    subject: "[SMS] Last Check-In",
    body: `<div style="background:#fef3c7;border:2px solid #fcd34d;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS — Last Check-In</p><p>Hey {{name}}, just a final note — if your plans have changed, no worries at all! But if you're still interested in the Vancouver market, I'm always here to help. Wishing you all the best! — Sarah</p></div>`,
  },
  "sms_partner_intro": {
    subject: "[SMS] Partnership Welcome",
    body: `<div style="background:#dbeafe;border:2px solid #93c5fd;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Hi {{name}}! Thanks for the partnership. Looking forward to working together! I'll keep you updated on market trends and new listings. Feel free to send any referrals my way — I'll take great care of them! — Sarah</p></div>`,
  },
  "sms_offer_check": {
    subject: "[SMS] Ready to Make an Offer?",
    body: `<div style="background:#dcfce7;border:2px solid #86efac;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Hi {{name}}! After seeing those properties, are you feeling ready to make an offer? The market is competitive right now and I want to make sure you don't miss out. Let me know! — Sarah</p></div>`,
  },
  "sms_listings_checkin": {
    subject: "[SMS] Thoughts on the Listings?",
    body: `<div style="background:#dcfce7;border:2px solid #86efac;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Hey {{name}}! Did you get a chance to look at those listings I sent? Any catch your eye? Let me know and I'll set up showings! — Sarah</p></div>`,
  },
  "sms_preferences": {
    subject: "[SMS] Preferences Confirmed",
    body: `<div style="background:#dcfce7;border:2px solid #86efac;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Hi {{name}}! Got your preferences locked in. I'll start matching you with the best listings in your areas. Stay tuned for your first batch! — Sarah</p></div>`,
  },
  "sms_thank_you": {
    subject: "[SMS] Thank You!",
    body: `<div style="background:#dcfce7;border:2px solid #86efac;border-radius:8px;padding:16px;"><p style="font-weight:bold;">📱 SMS Message</p><p>Thank you so much {{name}}! It was an absolute pleasure helping you. Wishing you all the best in your new chapter! Don't hesitate to reach out anytime. — Sarah</p></div>`,
  },
  "alert_new_lead": {
    subject: "[AGENT ALERT] New Lead Received",
    body: `<div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:16px;"><p style="font-weight:bold;">🔔 Agent Notification</p><p><strong>New lead received:</strong> {{name}} ({{type}})</p><p>Contact: {{name}} via email</p><p><strong>Action required:</strong> Call within 5 minutes for best conversion rate.</p></div>`,
  },
  "alert_reengagement": {
    subject: "[AGENT ALERT] Re-Engagement Triggered",
    body: `<div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:8px;padding:16px;"><p style="font-weight:bold;">🔔 Agent Notification</p><p><strong>Re-engagement triggered for:</strong> {{name}}</p><p>This contact has been inactive for 60+ days. The system has sent a re-engagement text. Consider a personal phone call this week.</p></div>`,
  },
  // ── Workflow-Specific Email Templates ──
  "email_value_offer": {
    subject: "Something Special for You, {{name}}",
    body: `<h2>Hi {{name}},</h2><p>I wanted to share something valuable with you. As a new contact, here's what I can offer:</p><ul><li>Free personalized market analysis for your preferred neighbourhood</li><li>Early access to listings before they hit MLS</li><li>Mortgage pre-approval guidance with my preferred lender</li></ul><p>Would any of these be helpful? Just reply to this email or give me a call!</p>`,
  },
  "email_buying_process": {
    subject: "Your Guide to Buying a Home in BC",
    body: `<h2>The Home Buying Process, Step by Step</h2><p>Hi {{name}}, here's a quick overview of what to expect:</p><ol><li><strong>Pre-Approval:</strong> Get mortgage pre-approved (2-5 days)</li><li><strong>Search:</strong> I'll match you with listings based on your preferences</li><li><strong>Showings:</strong> We'll tour homes together</li><li><strong>Offer:</strong> When you find "the one," we submit a competitive offer</li><li><strong>Inspection:</strong> Professional home inspection (subject removal)</li><li><strong>Closing:</strong> Sign documents, get your keys!</li></ol><p>Average timeline: 60-90 days from pre-approval to keys.</p>`,
  },
  "email_mortgage_guide": {
    subject: "Mortgage Pre-Approval Guide — Get Ready to Buy",
    body: `<h2>Getting Pre-Approved, {{name}}</h2><p>Pre-approval is the first step to buying with confidence.</p><h3>What you'll need:</h3><ul><li>2 years of T4s/tax returns</li><li>Recent pay stubs</li><li>Bank statements (3 months)</li><li>ID (2 pieces)</li></ul><h3>Current rates (March 2026):</h3><table style="width:100%;border-collapse:collapse;"><tr style="background:#f4f2ff;"><td style="padding:8px;">5-year fixed</td><td style="padding:8px;font-weight:bold;">4.29%</td></tr><tr><td style="padding:8px;">5-year variable</td><td style="padding:8px;font-weight:bold;">4.95%</td></tr></table><p>Want me to connect you with my preferred mortgage broker? No obligation!</p>`,
  },
  "email_market_snapshot": {
    subject: "Current Market Snapshot — Vancouver",
    body: `<h2>Market at a Glance</h2><p>Hi {{name}}, here's what's happening right now:</p><table style="width:100%;border-collapse:collapse;"><tr style="background:#f4f2ff;"><td style="padding:12px;font-weight:bold;">Active Listings</td><td style="padding:12px;">8,432 (+12% MoM)</td></tr><tr><td style="padding:12px;font-weight:bold;">Benchmark Price</td><td style="padding:12px;">$1,173,500</td></tr><tr style="background:#f4f2ff;"><td style="padding:12px;font-weight:bold;">Avg Days on Market</td><td style="padding:12px;">22 days</td></tr><tr><td style="padding:12px;font-weight:bold;">Sales-to-Active</td><td style="padding:12px;">54%</td></tr></table><p>It's a balanced market right now — good time for buyers to negotiate.</p>`,
  },
  "email_neighbourhood_guides": {
    subject: "Top Neighbourhoods for Your Budget",
    body: `<h2>Neighbourhoods to Explore, {{name}}</h2><p>Based on your preferences, here are my top picks:</p><div style="border-left:4px solid #4f35d2;padding-left:12px;margin:12px 0;"><h3>Kitsilano</h3><p>Beach lifestyle, great dining, 10 min to downtown. Condos: $800K–$1.2M</p></div><div style="border-left:4px solid #059669;padding-left:12px;margin:12px 0;"><h3>Mount Pleasant</h3><p>Trendy, walkable, craft brewery scene. Condos: $650K–$950K</p></div><div style="border-left:4px solid #ff5c3a;padding-left:12px;margin:12px 0;"><h3>East Vancouver</h3><p>Family-friendly, diverse, up-and-coming. Homes: $1.4M–$1.8M</p></div>`,
  },
  "email_offer_guide": {
    subject: "How to Write a Winning Offer in This Market",
    body: `<h2>Making an Offer, {{name}}</h2><p>When you're ready to make an offer, here's what matters:</p><ol><li><strong>Price:</strong> I'll do a comparative analysis to find the right number</li><li><strong>Subjects:</strong> Financing + inspection (typically 5-7 days)</li><li><strong>Deposit:</strong> Usually 5% of purchase price</li><li><strong>Completion:</strong> Typically 30-60 days from acceptance</li><li><strong>Inclusions:</strong> Appliances, window coverings, etc.</li></ol><p><strong>Pro tip:</strong> A clean offer with quick subject removal wins over higher prices with more conditions.</p>`,
  },
  "email_closing_checklist": {
    subject: "Your Closing Checklist — Almost There!",
    body: `<h2>You're Almost a Homeowner, {{name}}!</h2><p>Here's your closing checklist:</p><ul><li>✅ Financing approved</li><li>✅ Home inspection complete</li><li>⬜ Final walkthrough (2 days before closing)</li><li>⬜ Title insurance arranged</li><li>⬜ Home insurance activated</li><li>⬜ Utilities transferred to your name</li><li>⬜ Movers booked</li><li>⬜ Meet with lawyer/notary to sign</li></ul><p>I'll be with you every step of the way!</p>`,
  },
  "email_congrats_buyer": {
    subject: "Congratulations on Your New Home!",
    body: `<h2>You Did It, {{name}}! 🎉🏠</h2><p>Congratulations on becoming a homeowner! This is such an exciting milestone.</p><p>Here's what happens next:</p><ul><li>Your lawyer will handle the title transfer</li><li>Keys are typically released on completion day afternoon</li><li>I've prepared a welcome package for you</li></ul><p>Thank you for trusting me with this journey. It's been an absolute pleasure!</p>`,
  },
  "email_movein_checklist": {
    subject: "Move-In Checklist & Local Resources",
    body: `<h2>Welcome to Your New Home, {{name}}!</h2><p>Here are some resources to help you settle in:</p><h3>First Week:</h3><ul><li>Change locks (I can recommend a locksmith)</li><li>Set up mail forwarding with Canada Post</li><li>Register for municipal services</li></ul><h3>Local Essentials:</h3><ul><li>🏥 Nearest hospital: Vancouver General</li><li>🛒 Grocery: Whole Foods on W 4th, Save-On on W Broadway</li><li>☕ Coffee: 49th Parallel, Matchstick</li></ul>`,
  },
  "email_maintenance_tips": {
    subject: "30-Day Home Maintenance Tips",
    body: `<h2>Your First Month, {{name}}</h2><p>Now that you're settled in, here are some important maintenance items:</p><ul><li><strong>HVAC Filter:</strong> Replace every 3 months</li><li><strong>Water Heater:</strong> Check temperature (120°F recommended)</li><li><strong>Smoke Detectors:</strong> Test monthly</li><li><strong>Drains:</strong> Clean hair traps weekly</li><li><strong>Gutters:</strong> Clean before rainy season</li></ul><p>A well-maintained home appreciates faster!</p>`,
  },
  "email_referral_ask": {
    subject: "Know Anyone Looking to Buy or Sell?",
    body: `<h2>A Small Favour, {{name}}</h2><p>I hope you're enjoying your home! If you know anyone who's thinking about buying or selling, I'd love to help them the same way I helped you.</p><p><strong>My promise:</strong> I'll give them the same dedication and care.</p><p>Just reply with their name and I'll reach out personally. No pressure, no spam — just a friendly introduction.</p><p>Also, if you have a moment, a Google review would mean the world to me!</p>`,
  },
  "email_equity_update": {
    subject: "Your Home's Equity Update — 6 Months In",
    body: `<h2>6-Month Update, {{name}}</h2><p>Here's how your investment is doing:</p><div style="background:#f0fdf4;border-radius:8px;padding:16px;text-center;"><p style="font-size:28px;font-weight:bold;color:#059669;">+5.2%</p><p>Estimated appreciation since purchase</p></div><p>The market in your area continues to be strong. Your home is a great investment!</p>`,
  },
  "email_anniversary": {
    subject: "Happy 1-Year Home Anniversary!",
    body: `<h2>One Year Already, {{name}}! 🎂</h2><p>Can you believe it's been a year? Time flies when you love where you live!</p><p><strong>Your home's current estimated value:</strong></p><p style="font-size:24px;font-weight:bold;color:#059669;">$925,000</p><p>Here's to many more years of memories in your beautiful home.</p>`,
  },
  "email_congrats_seller": {
    subject: "Congratulations on Your Sale!",
    body: `<h2>It's Official, {{name}}! 🎉</h2><p>Your property has officially sold. What an incredible result!</p><p>Thank you for trusting me to handle the sale. It was a pleasure working with you through every showing, every offer, and every negotiation.</p><p>If you need anything during your transition — movers, cleaners, or just advice — I'm always here.</p>`,
  },
  "email_whats_next_seller": {
    subject: "What's Next After Your Sale",
    body: `<h2>What's Next, {{name}}</h2><p>Now that the sale is complete, here are some things to take care of:</p><ul><li>Cancel or transfer home insurance</li><li>Forward your mail via Canada Post</li><li>Cancel or transfer utilities</li><li>Gather all manuals and keys for the new owner</li></ul><p>If you're buying next, I'd love to help you find your new home!</p>`,
  },
  "email_seller_referral": {
    subject: "Thank You — Any Friends Looking to Sell?",
    body: `<h2>Thank You, {{name}}</h2><p>It was truly a pleasure helping you sell your home. I hope the experience was smooth!</p><p>If anyone in your circle is thinking about selling, I'd be honored to help them achieve a great result too. A personal introduction goes a long way.</p><p>Also — a Google review would mean the world to me!</p>`,
  },
  "email_seller_market_90day": {
    subject: "90-Day Market Update for Your Area",
    body: `<h2>Market Check-In, {{name}}</h2><p>Here's what's happened in your old neighbourhood since you sold:</p><table style="width:100%;border-collapse:collapse;"><tr style="background:#f4f2ff;"><td style="padding:8px;">Homes sold nearby</td><td style="padding:8px;font-weight:bold;">12</td></tr><tr><td style="padding:8px;">Avg sale price</td><td style="padding:8px;font-weight:bold;">$1,145,000</td></tr><tr style="background:#f4f2ff;"><td style="padding:8px;">Price trend</td><td style="padding:8px;font-weight:bold;color:#059669;">+2.8%</td></tr></table>`,
  },
  "email_seller_neighbourhood_6mo": {
    subject: "6-Month Neighbourhood Update",
    body: `<h2>6 Months Later, {{name}}</h2><p>Just a friendly update on what's happening in your old neighbourhood:</p><p>The area continues to thrive with new restaurants, improved transit, and steady property values. Your timing was excellent!</p><p>If you ever want a current market analysis for your new area, just ask!</p>`,
  },
  "email_seller_anniversary": {
    subject: "Happy 1-Year Sale Anniversary!",
    body: `<h2>One Year Since the Sale, {{name}}!</h2><p>Hard to believe it's been a year since we closed on your property. I hope your new chapter has been amazing!</p><p>Whether you're settling into a new home, investing, or exploring new opportunities — I'm always here if you need real estate advice.</p>`,
  },
  "email_reengagement_market": {
    subject: "The Market Has Changed — Worth Another Look",
    body: `<h2>Things Have Changed, {{name}}</h2><p>It's been a while since we connected, and the market has shifted:</p><ul><li>New listings are up 15%</li><li>Mortgage rates have dropped to 4.29%</li><li>More inventory means more negotiating power</li></ul><p>If your circumstances have changed, it might be a great time to re-enter the market. No pressure — just wanted to keep you informed!</p>`,
  },
  "email_reengagement_exclusive": {
    subject: "An Exclusive Opportunity for You",
    body: `<h2>Hi {{name}},</h2><p>I came across something special and thought of you:</p><div style="border:2px solid #4f35d2;border-radius:8px;padding:16px;"><p style="font-weight:bold;">Pre-market listing in Kitsilano</p><p>3 bed · 2 bath · Renovated · Under $1M</p><p>This property isn't on MLS yet. If you're interested, I can arrange a private showing before it goes public.</p></div><p>Just say the word!</p>`,
  },
  "email_property_details": {
    subject: "Property Details & Next Steps",
    body: `<h2>Here's the Full Scoop, {{name}}</h2><p>Thanks for coming to the showing! Here are the details on the property:</p><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;"><h3>2845 Vine St, Kitsilano</h3><p>3 bed · 2 bath · 1,200 sq ft · Built 2019</p><p style="font-size:20px;font-weight:bold;color:#4f35d2;">$1,195,000</p><p>Strata fee: $385/mo · Pets allowed · 1 parking + storage</p></div><p><strong>Next steps:</strong> If you like it, I can pull comparable sales and prepare a competitive offer. Let me know!</p>`,
  },
  "email_similar_properties": {
    subject: "Similar Properties You Might Like",
    body: `<h2>More Options for You, {{name}}</h2><p>Based on the property we toured, here are some similar listings:</p><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:8px 0;"><h3>2100 W 3rd Ave</h3><p>2 bed · 2 bath · $879,000</p></div><div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:8px 0;"><h3>1455 W 7th Ave</h3><p>3 bed · 1 bath · $925,000</p></div><p>Want to see any of these? I can set up showings this week!</p>`,
  },
  "email_partner_welcome": {
    subject: "Welcome to Our Referral Network!",
    body: `<h2>Welcome, {{name}}!</h2><p>I'm thrilled to have you as a referral partner. Here's how our partnership works:</p><ul><li>Send me referrals anytime — I treat every one like gold</li><li>I'll keep you updated on every referral's progress</li><li>Referral fees paid promptly at closing</li></ul><p>I look forward to a great partnership!</p>`,
  },
  "email_partner_market": {
    subject: "Partner Market Update — March 2026",
    body: `<h2>Market Update for Partners</h2><p>Hi {{name}}, here's what's relevant for your referrals:</p><ul><li><strong>First-time buyers:</strong> Great inventory under $800K in East Van</li><li><strong>Investors:</strong> Pre-sale condo prices softening — good entry point</li><li><strong>Sellers:</strong> Spring market is strong — ideal time to list</li></ul><p>If any of your clients are asking about real estate, send them my way!</p>`,
  },
  "email_partner_quarterly": {
    subject: "Quarterly Newsletter — Partner Edition",
    body: `<h2>Q1 2026 Recap</h2><p>Hi {{name}}, here's what happened this quarter:</p><ul><li>12 homes sold across Vancouver</li><li>$14.2M in total transaction volume</li><li>98% client satisfaction rating</li></ul><p>Thank you for being a valued partner. Your referrals make a real difference!</p>`,
  },
  "email_partner_annual": {
    subject: "Annual Recap & Thank You",
    body: `<h2>Thank You for an Amazing Year, {{name}}!</h2><p>2026 highlights:</p><ul><li>42 families helped find homes</li><li>$52M in transaction volume</li><li>12 referral partners like you</li></ul><p>Thank you for your trust and partnership. Here's to an even better 2027!</p>`,
  },
};

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { contactId, emailType, journeyPhase, journeyId, sendMode = "auto", skipAI = false } = body;

    if (!contactId || !emailType || !journeyPhase) {
      return NextResponse.json({ error: "Missing required fields: contactId, emailType, journeyPhase" }, { status: 400 });
    }

    // If skipAI, use static templates and send directly via Resend
    if (skipAI) {
      const supabase = createAdminClient();

      // Get contact
      const { data: contact } = await supabase
        .from("contacts")
        .select("id, name, email, type")
        .eq("id", contactId)
        .single();

      if (!contact?.email) {
        return NextResponse.json({ error: "Contact not found or has no email" }, { status: 404 });
      }

      const template = STATIC_TEMPLATES[emailType] || STATIC_TEMPLATES.welcome;
      const firstName = contact.name.split(" ")[0];
      const subject = template.subject
        .replace(/\{\{name\}\}/g, firstName)
        .replace(/\{\{first_name\}\}/g, firstName);

      const htmlBody = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1535;">
        ${template.body
          .replace(/\{\{name\}\}/g, contact.name)
          .replace(/\{\{first_name\}\}/g, firstName)
          .replace(/\{\{type\}\}/g, contact.type)}
        <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="font-size:11px;color:#9ca3af;">This is a test email from ListingFlow CRM. <a href="#">Unsubscribe</a></p>
      </body></html>`;

      // Save newsletter record
      const { data: newsletter, error: insertError } = await supabase
        .from("newsletters")
        .insert({
          contact_id: contactId,
          journey_id: journeyId || null,
          journey_phase: journeyPhase,
          email_type: emailType,
          subject,
          html_body: htmlBody,
          status: "sending",
          send_mode: sendMode,
          ai_context: { test: true, skipAI: true },
        })
        .select()
        .single();

      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }

      // Send via Resend with metadata
      try {
        const { messageId } = await sendEmail({
          to: contact.email,
          subject,
          html: htmlBody,
          tags: [
            { name: "newsletter_id", value: newsletter.id },
            { name: "contact_id", value: contactId },
            { name: "email_type", value: emailType },
          ],
          metadata: {
            workflowName: `Buyer Journey — ${journeyPhase} phase`,
            stepName: `${emailType} (test)`,
            emailType,
            journeyPhase,
            contactName: contact.name,
            contactType: contact.type,
            contactId,
            triggeredBy: "Workflow Email Timing Test",
          },
        });

        // Mark as sent
        await supabase.from("newsletters").update({
          status: "sent",
          sent_at: new Date().toISOString(),
          resend_message_id: messageId || null,
        }).eq("id", newsletter.id);

        return NextResponse.json({ success: true, data: newsletter, messageId });
      } catch (sendError) {
        await supabase.from("newsletters").update({
          status: "failed",
          error_message: sendError instanceof Error ? sendError.message : "Send failed",
        }).eq("id", newsletter.id);

        return NextResponse.json({ error: sendError instanceof Error ? sendError.message : "Send failed" }, { status: 500 });
      }
    }

    // Full AI generation path
    const result = await generateAndQueueNewsletter(
      contactId,
      emailType,
      journeyPhase,
      journeyId,
      sendMode
    );

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    if (sendMode === "review" && result.data?.id) {
      const sendResult = await sendNewsletter(result.data.id);
      return NextResponse.json({ success: true, data: result.data, sendResult });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal error" },
      { status: 500 }
    );
  }
}
