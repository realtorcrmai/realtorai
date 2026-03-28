-- ============================================================
-- 056: Seed data for RAG system — Knowledge Base + Competitive Emails
-- ============================================================

-- ============================================================
-- KNOWLEDGE BASE ARTICLES (BC real estate focused)
-- ============================================================

INSERT INTO knowledge_articles (title, body, category, audience_type, tags) VALUES

-- FAQs
('What is subject removal in BC real estate?',
'Subject removal is the process where a buyer waives (removes) the conditions they placed on their offer. Common subjects include:

1. **Financing subject** — Buyer confirms mortgage approval from their lender (typically 5-7 business days)
2. **Inspection subject** — Buyer completes a professional home inspection and is satisfied with the results (typically 5-7 days)
3. **Title search** — Lawyer confirms clean title with no liens or encumbrances (typically 3-5 days)
4. **Strata documents review** — Buyer reviews strata minutes, financial statements, depreciation report, and bylaws (condo/townhouse purchases, typically 7 days)
5. **Insurance** — Buyer confirms ability to obtain homeowner''s insurance
6. **Appraisal** — Lender''s appraisal confirms the property value supports the mortgage amount

Once all subjects are removed, the contract becomes **firm and binding**. The buyer''s deposit is then at risk if they fail to complete the purchase. Subject removal deadlines are specified in the Contract of Purchase and Sale.',
'faq', 'buyer', '["subject removal", "conditions", "financing", "inspection"]'),

('How does the Property Transfer Tax work in BC?',
'The BC Property Transfer Tax (PTT) is paid by the buyer when a property changes ownership. Current rates:

- **1%** on the first $200,000
- **2%** on $200,001 to $2,000,000
- **3%** on amounts over $2,000,000
- **Additional 2%** on residential properties over $3,000,000

**First-time home buyer exemption:** Full exemption if property is $500,000 or less (partial exemption up to $525,000). Must be a Canadian citizen or PR, lived in BC 12+ months, never owned a principal residence.

**Newly built home exemption:** Full exemption on homes up to $750,000 (partial up to $800,000).

**Foreign buyer tax:** Additional 20% on residential properties in specified areas (Metro Vancouver, Fraser Valley, Capital Regional District, Central Okanagan, Nanaimo).

Example: $900,000 home for a non-first-time buyer:
- $200,000 × 1% = $2,000
- $700,000 × 2% = $14,000
- **Total PTT: $16,000**',
'faq', 'buyer', '["property transfer tax", "PTT", "first-time buyer", "closing costs"]'),

('What is FINTRAC and why do realtors need it?',
'FINTRAC (Financial Transactions and Reports Analysis Centre of Canada) requires realtors to verify client identity and report certain transactions to prevent money laundering and terrorist financing.

**Realtor obligations:**
1. **Client identification** — Verify identity of all clients (buyers AND sellers) using government-issued photo ID before any transaction. Record: full name, DOB, address, citizenship, ID type/number/expiry.
2. **Receipt of funds** — Record the source of any funds received for a transaction over $3,000.
3. **Suspicious transaction reports** — File if there are reasonable grounds to suspect money laundering or terrorist financing.
4. **Large cash transaction reports** — Report cash transactions of $10,000 or more.
5. **Record keeping** — Maintain all records for a minimum of 5 years after the last transaction.

**Penalties for non-compliance:**
- Administrative penalties up to $500,000 per violation
- Criminal penalties: up to 5 years imprisonment and/or $2,000,000 fine

In ListingFlow, FINTRAC identity collection happens in Phase 1 (Seller Intake) of the listing workflow.',
'faq', 'agent', '["FINTRAC", "compliance", "identity verification", "anti-money laundering"]'),

('What are typical closing costs for a buyer in BC?',
'Buyers in BC should budget for these closing costs beyond the purchase price:

1. **Property Transfer Tax** — 1-3% based on purchase price (see PTT exemptions for first-time buyers)
2. **Legal fees** — $1,000-$2,000 for a real estate lawyer/notary
3. **Home inspection** — $400-$600 for a standard inspection
4. **Appraisal fee** — $300-$500 (sometimes covered by lender)
5. **Title insurance** — $200-$400
6. **Strata form fees** — $50-$100 per form (Form B, Form F)
7. **Property insurance** — Varies; required before closing
8. **Mortgage default insurance** — If down payment < 20%, CMHC/Genworth premium (2.8-4% of mortgage)
9. **Property tax adjustment** — Prorated from closing date to end of tax year
10. **Move-in costs** — Movers, utilities setup, mail forwarding

**Rule of thumb:** Budget 1.5-4% of purchase price for total closing costs.

For a $800,000 purchase with 20% down:
- PTT: ~$14,000
- Legal: ~$1,500
- Inspection: ~$500
- Other: ~$2,000
- **Total: ~$18,000**',
'faq', 'buyer', '["closing costs", "buyer costs", "PTT", "legal fees"]'),

-- Playbooks
('Listing Onboarding Process',
'Follow these steps when onboarding a new listing in ListingFlow:

**Step 1: Initial Contact**
- Schedule listing presentation meeting
- Prepare CMA (Comparative Market Analysis) for the area
- Research recent sales and active listings in the neighbourhood

**Step 2: Listing Presentation**
- Present CMA and pricing strategy
- Discuss marketing plan (photography, video, staging)
- Review commission structure and listing agreement terms
- Collect seller expectations (timeline, price floor, showing preferences)

**Step 3: Seller Intake (Phase 1 in ListingFlow)**
- Create contact in CRM (type: seller)
- Create listing with property details
- Collect FINTRAC identity documents (government photo ID)
- Record commission rates, showing windows, lockbox codes
- Enter showing instructions and special notes

**Step 4: Data Enrichment (Phase 2)**
- Run BC Geocoder for precise coordinates and postal code
- Pull ParcelMap BC for lot boundaries and PID
- Request LTSA title search (manual submission)
- Obtain BC Assessment data for tax assessment value

**Step 5: Pricing & Forms (Phases 3-5)**
- Complete CMA analysis with comparable sales data
- Confirm list price with seller (price lock)
- Generate all 12 BCREA forms via the form engine
- Review forms with seller, obtain signatures

**Step 6: MLS & Launch (Phases 6-8)**
- Complete e-signature process for all documents
- Generate MLS public and REALTOR remarks (AI-assisted)
- Upload professional photos to MLS
- Submit listing to MLS (Paragon)
- Launch marketing: social media, email campaigns, signage',
'playbook', 'agent', '["listing", "onboarding", "CMA", "BCREA forms", "MLS"]'),

('Open House Checklist',
'Complete checklist for running a successful open house in BC:

**1 Week Before:**
- [ ] Schedule open house in ListingFlow calendar
- [ ] Create open house event in MLS
- [ ] Order/confirm directional signage (minimum 5 signs)
- [ ] Coordinate with seller on property preparation
- [ ] Create social media posts (Instagram, Facebook, LinkedIn)
- [ ] Send open house invites to buyer contacts in CRM

**Day Before:**
- [ ] Confirm with seller: home clean, pets removed, valuables secured
- [ ] Prepare sign-in sheets and business cards
- [ ] Print feature sheets with property details and floor plan
- [ ] Charge phone, prepare portable speaker for background music
- [ ] Plan refreshments (water, coffee, light snacks)

**Day Of (30 min before):**
- [ ] Arrive early, place directional signs along route
- [ ] Open all blinds, turn on all lights
- [ ] Set temperature to comfortable level (20-21°C)
- [ ] Place feature sheets at entrance
- [ ] Set up sign-in sheet (name, phone, email, currently working with agent?)
- [ ] Take pre-open house photos for social media

**During Open House:**
- [ ] Greet visitors warmly, hand feature sheet
- [ ] Ask qualifying questions: budget, timeline, neighbourhood preference
- [ ] Record hot/warm/cold interest level for each visitor
- [ ] Take notes on feedback (pricing, condition, layout concerns)
- [ ] Note any showing requests for follow-up

**After Open House:**
- [ ] Enter all visitors into ListingFlow as contacts
- [ ] Rate interest levels (hot/warm/cold)
- [ ] Send follow-up within 24 hours to all attendees
- [ ] Update seller with attendance count and feedback summary
- [ ] Post recap on social media',
'playbook', 'agent', '["open house", "checklist", "showing", "marketing"]'),

('Speed to Contact — New Lead Response',
'When a new lead enters the CRM, fast response is critical. Studies show a 78% higher conversion rate when contacting a lead within 5 minutes vs 30 minutes.

**Automated Flow (ListingFlow handles):**
1. Lead enters CRM → contact created → lifecycle_stage = "lead"
2. Trigger engine fires "new_lead" event
3. Speed-to-contact workflow enrolls automatically
4. Sends welcome SMS within 60 seconds
5. Queues personalized email for send within 5 minutes

**Realtor Follow-Up (within 24 hours):**
1. Review lead source and any preferences collected
2. Check if buyer preferences match any active listings
3. Make a personal phone call — introduce yourself, ask about timeline
4. After call, log activity in CRM with outcome and notes
5. If interested: enroll in buyer nurture workflow
6. If not ready: tag as "nurture" and set follow-up reminder for 30 days

**Key Metrics to Track:**
- Time to first contact (target: < 5 minutes automated, < 2 hours personal)
- Response rate (target: > 80% leads contacted within 24 hours)
- Conversion: lead → active buyer (target: > 15% within 90 days)

**Scripts for First Call:**
- "Hi [Name], this is [Agent] from [Brokerage]. I noticed you were looking at properties in [Area]. I''d love to help you find the right home. Do you have a few minutes to chat about what you''re looking for?"',
'playbook', 'agent', '["speed to contact", "new lead", "response time", "conversion"]'),

-- Scripts
('Subject Removal Explanation — Nervous Buyer Script',
'Use this script when a buyer is nervous about removing subjects on their offer:

**Situation:** Buyer has completed inspection, financing is approved, but they''re hesitant to remove conditions and commit.

**Script:**

"[Name], I completely understand the nerves — this is one of the biggest decisions you''ll make. Let me walk you through exactly where we stand:

Your financing is confirmed at [rate]% with [lender], so we know the numbers work within your budget.

The inspection came back with [summary — e.g., no major issues / minor items that are normal for a home of this age]. The inspector confirmed the roof, foundation, electrical, and plumbing are all in good condition.

The title search is clean — no liens, no easements, nothing unexpected.

Once we remove subjects, your $[deposit] deposit is at risk if you walk away without cause, but that''s the commitment that tells the seller you''re serious. Without it, another buyer could take this home.

You have until [date] to remove subjects. If you''re comfortable, I''d recommend we proceed. If anything changes between now and closing — and I mean anything significant — we''ll address it together.

What questions do you have?"

**Key Points:**
- Acknowledge the emotion — don''t minimize it
- Walk through each condition systematically
- Explain the deposit risk honestly
- Remind them of the competitive market
- Never pressure — present facts and let them decide',
'script', 'buyer', '["subject removal", "nervous buyer", "objection handling", "closing"]'),

('Price Reduction Conversation — Seller Script',
'Use this script when recommending a price reduction to a seller whose listing has been sitting:

**Situation:** Listing has been on market 30+ days with limited showings and no offers. Market data supports a lower price.

**Script:**

"[Name], I want to give you an honest update on where we stand. We''ve been on the market for [X] days, and I want to make sure we''re positioned to get you the best result.

Here''s what the market is telling us:
- We''ve had [X] showings, but no offers
- Similar homes in [neighbourhood] are selling at $[avg price], which is [X]% below our current list
- The average days on market in our area is [X] days
- Homes that sell in the first 21 days typically get [X]% closer to list price

The feedback from showings has been [summary — e.g., ''buyers love the location but feel the price is above comparable recent sales''].

I''d recommend we adjust to $[new price], which aligns with the recent sale at [comparable address] and positions us competitively against the [X] active listings in our price range.

This isn''t about giving your home away — it''s about attracting the right buyer pool. A well-priced home generates more interest, more showings, and often multiple offers.

What are your thoughts?"

**Key Points:**
- Lead with data, not opinion
- Reference specific comparable sales
- Show the cost of sitting (extended DOM, buyer perception)
- Frame the reduction as strategic, not desperate
- Always ask for their input — it''s their decision',
'script', 'seller', '["price reduction", "days on market", "seller conversation", "pricing strategy"]'),

-- Process docs
('How to Generate BCREA Forms in ListingFlow',
'ListingFlow auto-generates 12 BCREA (BC Real Estate Association) forms using data from the listing workflow:

**Available Forms:**
1. **DORTS** — Disclosure of Representation in Trading Services
2. **MLC** — Multiple Listing Contract
3. **PDS** — Property Disclosure Statement
4. **FINTRAC** — Client Identification Record
5. **PRIVACY** — Privacy Notice and Consent
6. **C3** — Commission Agreement
7. **DRUP** — Dual/Limited Representation Agreement
8. **MLS_INPUT** — MLS Input Sheet
9. **MKTAUTH** — Marketing Authorization
10. **AGENCY** — Agency Disclosure
11. **C3CONF** — Commission Confirmation
12. **FAIRHSG** — Fair Housing Compliance

**Steps:**
1. Navigate to the listing → Phase 5 (Form Generation)
2. Click "Generate Forms" — the system pulls data from the listing and seller contact
3. Review each form in the form viewer
4. Fill in any manual fields not auto-populated
5. Save each form → status changes to "completed"
6. Download PDF or proceed to e-signature (Phase 6)

**Data Sources (auto-filled):**
- Seller name, DOB, address → from contacts + seller_identities
- Property address, legal description, PID → from listings + listing_enrichment
- Commission rates → from listings.commission_rate
- List price → from listings.list_price
- Agent info → from user profile

**Common Issues:**
- "Fields missing" → Ensure Phase 1 (Seller Intake) and Phase 2 (Enrichment) are complete
- "Form won''t generate" → Check that the form server is running (localhost:8767)
- "Wrong data" → Update the listing or contact record, then regenerate',
'process', 'agent', '["BCREA", "forms", "documents", "compliance", "listing workflow"]'),

-- Explainer
('Understanding Strata Properties in BC',
'A strata property (condominium or townhouse in a strata corporation) has unique considerations for buyers and sellers in BC:

**Key Documents to Review:**
1. **Form B** — Information Certificate: Current strata fees, special levies, parking/storage details, rental/pet restrictions, insurance coverage, pending litigation
2. **Form F** — Certificate of Payment: Confirms all strata fees are paid up to date
3. **Strata Minutes** — Last 2 years of council meeting minutes (look for: special levies, maintenance issues, disputes, insurance claims)
4. **Financial Statements** — Annual budget, contingency reserve fund balance
5. **Depreciation Report** — Long-term maintenance plan and cost estimates
6. **Bylaws** — Rules governing the strata (pets, rentals, renovations, noise, move-in fees)

**Red Flags:**
- Contingency reserve fund < 25% of annual budget
- Special levies planned or recently passed
- Pending lawsuits against the strata
- High insurance deductibles (some reach $250,000+)
- Restrictive rental bylaws (may affect resale value)
- Building envelope issues or rainscreen work needed

**Strata Fees:**
- Monthly fees cover: insurance (building), common area maintenance, gardening, elevator, amenities
- Do NOT typically cover: homeowner contents insurance, in-suite repairs, hot water tank, parking
- Average in Metro Vancouver: $0.40-$0.65 per square foot per month

**For Sellers:**
- Order Form B ($35) and Form F ($15) from the strata management company
- Have recent minutes and financials available for buyer review
- Disclose any known issues, special levies, or upcoming maintenance',
'explainer', 'all', '["strata", "condo", "townhouse", "Form B", "Form F", "depreciation report"]');


-- ============================================================
-- COMPETITIVE EMAILS (sample competitor newsletters)
-- ============================================================

INSERT INTO competitive_emails (source, from_email, subject, body_text, email_type, received_at) VALUES

('compass',
'team@compass.com',
'Just Listed: Stunning Kitsilano Home with Ocean Views',
'Just Listed in Kitsilano — This beautifully renovated 4-bedroom home at 2847 W 3rd Ave offers breathtaking ocean and mountain views from the main living area and master suite. Highlights: Chef''s kitchen with Miele appliances, heated floors throughout, private landscaped garden, double garage, and walking distance to Kits Beach. List price: $3,290,000. Book your private showing today. Contact Sarah Chen, Compass Vancouver. This home won''t last — similar properties in Kits sold in under 10 days last month.',
'new_listing_alert',
NOW() - INTERVAL '3 days'),

('compass',
'team@compass.com',
'Vancouver Market Pulse: February 2026',
'Vancouver Market Pulse — February 2026. Key Stats: Benchmark price for detached homes in Vancouver West: $3,150,000 (+4.2% YoY). Condo benchmark: $765,000 (+1.8% YoY). Active listings down 12% vs January. Sales-to-active ratio: 28% (balanced market). Hottest neighbourhoods: Mount Pleasant (45% sales-to-active), Marpole (38%), Killarney (35%). Days on market average: 18 days for detached, 24 for condos. First-time buyer insight: Condos under $600,000 are seeing multiple offers — act fast if you''re in this range. Interest rates holding steady at 4.25% variable, 4.99% fixed (5-year). Download our full market report at compass.com/vancouver-market.',
'market_update',
NOW() - INTERVAL '7 days'),

('royallepage',
'newsletter@royallepage.ca',
'Your February Market Update: Fraser Valley',
'Fraser Valley Real Estate Market Report — February 2026. The Fraser Valley market continues to show strong activity in the townhouse and detached segments. February highlights: Total sales: 1,847 units (+8% vs Jan). Average sale price — Detached: $1,420,000. Townhouse: $780,000. Condo: $520,000. New listings: 2,340 (healthy supply). Buyer tip: Surrey and Langley townhouses remain the best value in the Lower Mainland, with prices 40% below comparable Vancouver properties. Seller tip: Spring market is approaching — March-May historically see 25% more buyer activity. Consider listing before the spring rush for maximum exposure. Get your free home evaluation at royallepage.ca/evaluate.',
'market_update',
NOW() - INTERVAL '5 days'),

('sothebys',
'luxury@sothebysrealty.ca',
'Curated Luxury: This Week''s Finest Properties',
'Sotheby''s International Realty — Curated Luxury Collection. Featured Property: The Penthouse at Alberni by Westbank. 4,200 sq ft of uncompromised luxury in Vancouver''s most coveted address. Floor-to-ceiling windows with 270-degree views of Stanley Park, the North Shore mountains, and English Bay. Features: Private elevator entry, Gaggenau kitchen, heated marble floors, wine cellar, two parking stalls. Offered at $15,800,000. Also this week: West Vancouver waterfront estate ($12,500,000), Shaughnessy heritage home ($8,900,000), Coal Harbour sky home ($4,200,000). Each property includes our complimentary white-glove concierge service. Schedule your private viewing with our luxury specialists.',
'new_listing_alert',
NOW() - INTERVAL '2 days'),

('remax',
'info@remax.ca',
'RE/MAX Spring Seller Guide: Get Top Dollar for Your Home',
'Thinking of selling this spring? Our 2026 Spring Seller Guide covers everything you need: 1. Pricing strategy: How to price your home using real-time comparable data. Overpricing by even 5% reduces showings by 60%. 2. Staging tips: Homes that are professionally staged sell 73% faster. Focus on: decluttering, neutral paint, updated lighting, and curb appeal. 3. Photography: Professional photos generate 61% more views online. Invest in twilight shots and drone photography. 4. Timing: The sweet spot for listing in BC is the last week of February through mid-April. Beat the spring rush but catch early-season buyers. 5. Offers strategy: In a balanced market, be prepared to negotiate. Set your bottom line before listing. Free home evaluation available at remax.ca/value or call your local RE/MAX agent.',
'market_update',
NOW() - INTERVAL '10 days'),

('zillow',
'alerts@zillow.com',
'Price Drop Alert: 5 Homes Just Reduced in Surrey',
'Price Drop Alert — Surrey, BC. 5 homes in your search area just reduced their price: 1. 14523 68th Ave, Surrey — Was $1,050,000, Now $989,000 (-5.8%). 4 bed, 3 bath, 2,400 sqft. 45 days on market. 2. 8834 152nd St, Surrey — Was $879,000, Now $849,000 (-3.4%). 3 bed, 2 bath townhouse. 21 days on market. 3. 10245 King George Blvd — Was $599,000, Now $569,000 (-5.0%). 2 bed condo. 38 days on market. 4. 5621 189th St, Surrey — Was $1,375,000, Now $1,299,000 (-5.5%). 5 bed, 4 bath. 52 days on market. 5. 2847 Morgan Creek Way — Was $2,100,000, Now $1,975,000 (-6.0%). Custom home. 67 days on market. See all reduced listings at zillow.com. Tip: Homes with price reductions often indicate motivated sellers — great opportunity for buyers.',
'new_listing_alert',
NOW() - INTERVAL '1 day');
