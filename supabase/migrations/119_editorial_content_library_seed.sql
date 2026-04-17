-- =============================================================================
-- Migration: 119_editorial_content_library_seed.sql
-- Description: Fix editorial_content_library schema to support platform tips
--   (realtor_id nullable), add country + season columns, and seed 50 tips.
-- Created: 2026-04-15
-- =============================================================================

-- ---------------------------------------------------------------------------
-- PART 1: Schema fixes — make realtor_id nullable, add country/season columns
-- ---------------------------------------------------------------------------

-- Make realtor_id nullable (NULL = platform tip, visible to all agents)
ALTER TABLE editorial_content_library
  ALTER COLUMN realtor_id DROP NOT NULL;

-- Add country column (CA / US / BOTH)
ALTER TABLE editorial_content_library
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT 'BOTH'
    CHECK (country IN ('CA', 'US', 'BOTH'));

-- Add season column (spring / summer / fall / winter / all)
ALTER TABLE editorial_content_library
  ADD COLUMN IF NOT EXISTS season text NOT NULL DEFAULT 'all'
    CHECK (season IN ('spring', 'summer', 'fall', 'winter', 'all'));

-- Update RLS to allow all agents to read platform tips (realtor_id IS NULL)
DROP POLICY IF EXISTS editorial_content_library_realtor_policy ON editorial_content_library;
DROP POLICY IF EXISTS editorial_content_library_read_policy ON editorial_content_library;
DROP POLICY IF EXISTS editorial_content_library_write_policy ON editorial_content_library;
CREATE POLICY editorial_content_library_read_policy
  ON editorial_content_library
  FOR SELECT
  USING (realtor_id IS NULL OR realtor_id = auth.uid());

CREATE POLICY editorial_content_library_write_policy
  ON editorial_content_library
  FOR ALL
  USING (realtor_id = auth.uid());

-- Index for country + season filters
CREATE INDEX IF NOT EXISTS idx_editorial_content_library_country
  ON editorial_content_library (country);

CREATE INDEX IF NOT EXISTS idx_editorial_content_library_season
  ON editorial_content_library (season);

-- ---------------------------------------------------------------------------
-- PART 2: Seed data — 20 CA tips + 20 US tips + 10 BOTH tips
-- ---------------------------------------------------------------------------

INSERT INTO editorial_content_library
  (id, realtor_id, block_type, content, context_tags, country, season, use_count)
VALUES

-- ============================================================
-- CANADA TIPS (20)
-- ============================================================

-- Spring CA
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Get a strata document review before you waive subjects","tip_text":"Before removing conditions on a strata unit, hire a strata document reviewer ($200–$400). They flag special levies, depreciation report deficiencies, bylaw restrictions (rental bans, pet rules), and active litigation that standard disclosure does not surface. One missed levy can mean a $10,000+ surprise after closing.","tip_category":"buyers"}',
 ARRAY['strata','condo','subjects'], 'CA', 'spring', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"List in late April to catch peak spring buyer demand","tip_text":"In most Canadian markets, the last two weeks of April and first two weeks of May consistently produce the highest buyer traffic of the year. Buyers who paused over winter return with pre-approvals in hand. Listing during this window typically means faster sales and stronger offer competition — both signal higher final prices.","tip_category":"sellers"}',
 ARRAY['timing','listing','spring-market'], 'CA', 'spring', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Budget for BC property transfer tax before you make an offer","tip_text":"BC''s Property Transfer Tax is 1% on the first $200,000, 2% on the portion up to $2 million, and 3% above that. On a $900,000 home, that is $16,000 due on closing day — separate from your down payment. First-time buyers may qualify for a full or partial exemption if the purchase price is under $835,000.","tip_category":"buyers"}',
 ARRAY['tax','closing-costs','BC'], 'CA', 'spring', 0),

-- Summer CA
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Sellers: overgrown landscaping costs you more than you think","tip_text":"Unkempt lawns, overgrown hedges, and untended garden beds are among the top reasons buyers form a negative first impression before they even enter your home. A professional tidy-up costs $300–$600 and can prevent a $10,000–$20,000 low-ball offer from a buyer who assumes the interior is equally neglected.","tip_category":"sellers"}',
 ARRAY['curb-appeal','staging','summer'], 'CA', 'summer', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Use summer to complete deferred maintenance before fall listing","tip_text":"Planning to list in September? Use July and August to address deferred maintenance: roof, gutters, caulking, deck condition, and HVAC servicing. Buyers in fall markets conduct more thorough inspections after summer purchase cycles wind down. Arriving at your inspection with a binder of completed repairs positions you to hold firm on price.","tip_category":"sellers"}',
 ARRAY['maintenance','fall-listing','preparation'], 'CA', 'summer', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Lock your mortgage rate hold now — they expire in 90–120 days","tip_text":"Most Canadian lenders will hold a pre-approved rate for 90 to 120 days at no cost. If you are shopping in summer with a fall move-in target, securing a rate hold today protects you against rate increases. If rates drop before closing, most lenders will honour the lower rate.","tip_category":"mortgage"}',
 ARRAY['pre-approval','rate-hold','mortgage'], 'CA', 'summer', 0),

-- Fall CA
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"The fall market window closes fast — be ready to act by Thanksgiving","tip_text":"In most Canadian markets, serious fall activity runs from Labour Day through Canadian Thanksgiving (mid-October). After that, buyer traffic drops sharply as families settle into school routines. Buyers who want a December possession date must act in this window, which creates genuine urgency you can use in negotiations.","tip_category":"buyers"}',
 ARRAY['timing','fall-market','negotiation'], 'CA', 'fall', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Sellers who leave their home on the market in December often get better prices","tip_text":"Many sellers pull listings in December assuming no one buys in winter. That belief creates opportunity: buyers active in December are highly motivated — they are relocating for work, have a lease ending, or have already sold. Serious buyers in a thin market often bid closer to asking price because competition is lower on the buy side.","tip_category":"sellers"}',
 ARRAY['winter-listing','motivated-buyers','strategy'], 'CA', 'fall', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Review your home insurance before a fall purchase closes","tip_text":"Insurers in Canada have tightened underwriting on older homes — knob-and-tube wiring, aluminum wiring, galvanized plumbing, and oil tanks can trigger policy exclusions or premium surcharges. Confirm you can get insurable coverage (and at what cost) before removing subjects, not after. Some lenders require proof of insurance 48 hours before funding.","tip_category":"buyers"}',
 ARRAY['insurance','subjects','due-diligence'], 'CA', 'fall', 0),

-- Winter CA
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Canada''s First Home Savings Account can save you $8,000 in tax","tip_text":"The First Home Savings Account (FHSA) lets eligible first-time buyers contribute up to $8,000 per year (lifetime max $40,000) and deduct contributions from taxable income — like an RRSP. Withdrawals for a qualifying first home are tax-free — unlike an RRSP Home Buyers'' Plan, the FHSA amount never needs to be repaid.","tip_category":"mortgage"}',
 ARRAY['FHSA','first-time-buyer','tax'], 'CA', 'winter', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"January is the best month to get honest pricing from your agent","tip_text":"Listing agents who review the market in January — before spring activity picks up — can give you the most honest comparable analysis of the year. They are not competing with 15 other offers and can look at what actually sold in Q4 versus what was wishful-price listing. Use this window to set your strategy before the spring rush.","tip_category":"sellers"}',
 ARRAY['pricing','strategy','winter'], 'CA', 'winter', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Get a home inspection even in a competitive offer situation","tip_text":"Waiving inspection in a multiple-offer market is tempting, but it exposes you to significant risk. Consider booking a pre-inspection before offers are due — many listing agents will facilitate access. Alternatively, include an inspection condition with a tight 5-day window rather than waiving it entirely. A $500 inspection is cheap compared to a $30,000 surprise.","tip_category":"buyers"}',
 ARRAY['inspection','subjects','risk'], 'CA', 'winter', 0),

-- All-season CA
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Understand the difference between assessed and market value in BC","tip_text":"BC Assessment value is based on data from July 1 of the prior year and does not reflect current market conditions. In active markets, homes sell well above assessed value; in slow markets, they may sell below. Your listing price should be based on recent comparable sales, not your assessment notice. They are two very different numbers.","tip_category":"sellers"}',
 ARRAY['BC-assessment','pricing','sellers'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"CASL consent: always confirm email permission before adding contacts","tip_text":"Canada''s Anti-Spam Legislation requires express or implied consent before sending commercial emails to contacts. Express consent (they opted in) is safest. Implied consent (business relationship in the past 2 years) has an expiry. Always document when and how consent was given — CASL fines reach $10 million per violation for organizations.","tip_category":"market"}',
 ARRAY['CASL','compliance','email'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Rental bylaws in BC strata buildings change frequently — always verify","tip_text":"Strata corporations in BC can change rental restriction bylaws with a 3/4 vote of owners. A building that was investor-friendly two years ago may have since passed rental ban bylaws. Before buying any strata unit as a rental, request the most recent bylaw package and confirm no rental restriction resolutions are pending at the next AGM.","tip_category":"buyers"}',
 ARRAY['strata','rental','investors'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Your RRSP Home Buyers'' Plan gives you $35,000 tax-free for a down payment","tip_text":"First-time buyers in Canada can withdraw up to $35,000 from their RRSP under the Home Buyers'' Plan without immediate tax. Couples can withdraw $35,000 each, contributing up to $70,000 toward a down payment. Funds must be in your RRSP for at least 90 days before withdrawal, and repayment begins 2 years after purchase over 15 years.","tip_category":"mortgage"}',
 ARRAY['RRSP','HBP','first-time-buyer'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Foreign buyer rules in Canada: know before you advise investor clients","tip_text":"Canada''s Prohibition on the Purchase of Residential Property by Non-Canadians Act bans most non-Canadians from buying residential real estate. There are exceptions for work permit holders, refugees, and certain mixed-use properties. Always confirm your buyer client''s residency and citizenship status before they make an offer — violations carry significant penalties.","tip_category":"buyers"}',
 ARRAY['foreign-buyer','compliance','investors'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Depreciation reports tell you what a strata building will cost to maintain","tip_text":"BC law requires strata corporations with 5+ lots to commission a depreciation report every 5 years. This report estimates future repair costs for common property — roofs, elevators, parkades — and the recommended contingency reserve fund balance. A strata with a depleted contingency fund and a large upcoming capital expense is a significant financial risk for buyers.","tip_category":"buyers"}',
 ARRAY['strata','depreciation','contingency-reserve'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Land transfer tax in Ontario: know the full amount before your client falls in love","tip_text":"Ontario''s Land Transfer Tax is tiered: 0.5% on the first $55,000, 1% up to $250,000, 1.5% up to $400,000, 2% up to $2 million, and 2.5% above $2 million. Toronto adds a matching municipal tax. On a $1.2M Toronto property, combined LTT exceeds $40,000. First-time buyers may claim a provincial rebate of up to $4,000.","tip_category":"buyers"}',
 ARRAY['land-transfer-tax','Ontario','Toronto'], 'CA', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Subject-free offers in BC: how to protect buyers without waiving conditions","tip_text":"Rather than waiving all subjects, consider using a pre-inspection, requesting the seller''s disclosure statement in advance, and arranging bridge financing commitment. Including a 24-48 hour review period in your offer (not a full inspection condition) can allow your buyer to back out for a fraction of the risk of a fully subject-free offer.","tip_category":"buyers"}',
 ARRAY['subjects','subjects-free','BC','risk'], 'CA', 'all', 0),

-- ============================================================
-- UNITED STATES TIPS (20)
-- ============================================================

-- Spring US
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Request a preliminary title report before making an offer","tip_text":"A preliminary title report shows liens, easements, and encumbrances on the property before you are under contract. Your lender will require title insurance anyway, but reviewing the prelim early lets you negotiate price reductions for known issues or walk away before you have spent money on inspections and appraisal.","tip_category":"buyers"}',
 ARRAY['title','due-diligence','prelim'], 'US', 'spring', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Spring sellers: price ahead of the comp data, not behind it","tip_text":"Comparable sales data from winter months reflects a slower market. If your neighborhood is seeing accelerating offers in spring, listing at a spring-appropriate price means you compete for the wave of buyers — not the tail end of it. Work with your agent to project where demand is heading, not just where it has been.","tip_category":"sellers"}',
 ARRAY['pricing','spring-market','comps'], 'US', 'spring', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Verify HOA financials before removing contingencies","tip_text":"HOA financial health directly impacts your home value and monthly costs. Before removing contingencies, review 3 years of HOA meeting minutes, the current reserve fund balance, and any pending special assessments. Underfunded reserves often precede large one-time assessments — sometimes $5,000 to $20,000 — passed down to all unit owners.","tip_category":"buyers"}',
 ARRAY['HOA','due-diligence','contingencies'], 'US', 'spring', 0),

-- Summer US
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Waiving appraisal contingency? Understand your actual risk first","tip_text":"Waiving the appraisal contingency means you agree to pay the contract price even if the home appraises below it. Before doing this, calculate the gap: if you offer $750,000 on a home that appraises at $710,000, you need $40,000 cash above your planned down payment to cover the difference. Make sure that cash is liquid and available at closing.","tip_category":"buyers"}',
 ARRAY['appraisal','contingency','competitive'], 'US', 'summer', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Summer is the best time to show large yard spaces and outdoor features","tip_text":"Outdoor kitchens, pools, gardens, and large decks show best in summer when buyers can visualize using them. If your listing has premium outdoor space, schedule open houses and private showings when the landscaping is at peak condition. Consider twilight showings — outdoor lighting and entertaining spaces look their most appealing at dusk.","tip_category":"sellers"}',
 ARRAY['outdoor','staging','open-house'], 'US', 'summer', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Check flood zone status on every property in coastal and low-lying areas","tip_text":"FEMA flood zone maps determine your flood insurance requirement and annual premium. A property in a Special Flood Hazard Area (Zone A or AE) requires flood insurance if you have a federally backed mortgage — often $1,500–$4,000+ per year. Check FEMA''s online map or request a flood elevation certificate before making an offer.","tip_category":"buyers"}',
 ARRAY['flood','FEMA','insurance'], 'US', 'summer', 0),

-- Fall US
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Fall buyers face less competition — use it to negotiate closing cost credits","tip_text":"Fall markets in most US cities see 20–30% fewer competing buyers than spring peak. This is leverage. Consider structuring your offer to request seller-paid closing cost credits (typically 2–3% of the purchase price) in exchange for a clean offer price. Sellers who did not sell in spring are often more motivated to contribute to closing costs.","tip_category":"buyers"}',
 ARRAY['negotiation','closing-costs','fall-market'], 'US', 'fall', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Capital gains exclusion: the two-year rule sellers must plan around","tip_text":"Single filers can exclude up to $250,000 in capital gains on a primary residence sale; married couples get $500,000. To qualify, you must have owned and lived in the home for at least 2 of the past 5 years. If you are close to the 2-year mark, timing your listing by a few months could be worth tens of thousands of dollars in tax savings.","tip_category":"sellers"}',
 ARRAY['capital-gains','tax','timing'], 'US', 'fall', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Review your home inspector''s E&O insurance before hiring them","tip_text":"Home inspectors in the US vary widely in training, licensing, and liability coverage. Before hiring, verify the inspector carries Errors and Omissions (E&O) insurance and ask for their sample report. Inspectors who include a liability cap in their contract may limit damages to the inspection fee itself. Reputable inspectors carry $500,000–$1M in coverage.","tip_category":"buyers"}',
 ARRAY['inspection','due-diligence','liability'], 'US', 'fall', 0),

-- Winter US
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"FHA loan limits increased for 2025 — check the new ceiling for your county","tip_text":"FHA loan limits are set by county and adjusted annually based on median home prices. In high-cost areas, the 2025 limit has increased significantly. FHA loans allow down payments as low as 3.5% with a 580+ credit score. If you have been telling clients they earn too much for FHA, verify the current county limit — they may still qualify.","tip_category":"mortgage"}',
 ARRAY['FHA','loan-limits','first-time-buyer'], 'US', 'winter', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"December and January are the lowest-competition months to buy","tip_text":"Inventory is thinnest in winter, but so is buyer competition. Sellers listing in December are usually motivated — relocations, divorces, or estate sales — and less likely to get multiple offers. Buyers who transact in winter often pay at or below asking price, while spring buyers frequently overbid. If you can be flexible on timing, winter buying has real financial advantages.","tip_category":"buyers"}',
 ARRAY['timing','winter-market','strategy'], 'US', 'winter', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Use year-end to request a relocation company market analysis","tip_text":"Corporate relocation companies often commission market analyses in Q4 to set budgets for the following year''s transferee moves. If you have relationships with HR contacts or relocation coordinators, December is the right time to offer a complimentary neighborhood market report. It positions you well before the spring move season begins.","tip_category":"market"}',
 ARRAY['relocation','corporate','year-end'], 'US', 'winter', 0),

-- All-season US
(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Earnest money is not a down payment — it applies to your closing costs","tip_text":"Earnest money (typically 1–3% of purchase price) is held in escrow and applied to your total funds due at closing — not a separate fee. If you back out for a contingency-protected reason (inspection, financing), it is returned. If you back out without a contingency to rely on, you forfeit it. Make sure your agent explains when each contingency deadline expires.","tip_category":"buyers"}',
 ARRAY['earnest-money','contingency','contract'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Disclosure law varies by state — know what your state requires sellers to reveal","tip_text":"Disclosure requirements differ significantly across states. Some states (California, Washington) require extensive seller disclosure forms covering everything from past flooding to neighborhood nuisances. Others (Texas, Virginia) have more limited requirements. Buyers in low-disclosure states must conduct more independent due diligence and ask specific questions directly to the seller in writing.","tip_category":"sellers"}',
 ARRAY['disclosure','state-law','compliance'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"1031 exchange: how investors defer capital gains on investment property sales","tip_text":"A 1031 exchange allows an investor to sell an investment property and defer capital gains tax by reinvesting the proceeds into a like-kind property. The replacement property must be identified within 45 days of the sale and acquired within 180 days. The exchange must go through a qualified intermediary — funds cannot touch the investor''s account during the process.","tip_category":"buyers"}',
 ARRAY['1031','investors','capital-gains'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"VA loans: no down payment required, but sellers sometimes push back","tip_text":"VA loans are one of the strongest financing products available — no down payment, no PMI, and competitive rates. However, some sellers or listing agents resist VA offers because of the VA appraisal process (which can flag property condition issues). Combat this by including a strong pre-approval letter, a short inspection window, and a cover letter explaining the buyer''s service history.","tip_category":"mortgage"}',
 ARRAY['VA-loan','veterans','down-payment'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Dual agency: understand why some agents cannot fully represent both sides","tip_text":"In a dual agency arrangement, one agent represents both buyer and seller. While legal in most US states with written consent, it creates an inherent conflict of interest — the agent cannot advocate for the best price for both parties simultaneously. Buyers are often better served by engaging a buyer''s agent who exclusively represents their interests in the transaction.","tip_category":"buyers"}',
 ARRAY['dual-agency','representation','ethics'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Sellers: a pre-listing inspection puts you in control of the negotiation","tip_text":"Getting a home inspection before listing gives you time to fix issues on your terms — at contractor rates — rather than scrambling under buyer pressure after an offer is accepted. You disclose the inspection findings upfront, which signals transparency, reduces the chance of inspection re-negotiations, and prevents deals from falling apart due to surprise discoveries.","tip_category":"sellers"}',
 ARRAY['pre-listing-inspection','disclosure','negotiation'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"The difference between pre-qualification and pre-approval matters","tip_text":"Pre-qualification is a lender''s rough estimate based on self-reported income and debt — it takes minutes and carries little weight with sellers. Pre-approval involves a verified credit check, income documentation review, and asset verification. In competitive markets, sellers routinely reject offers backed only by pre-qualification letters. Always get pre-approved before making an offer.","tip_category":"buyers"}',
 ARRAY['pre-approval','mortgage','competitive'], 'US', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Use a net sheet to show sellers their true take-home before listing","tip_text":"A seller net sheet estimates the proceeds after deducting the mortgage payoff, agent commissions, closing costs, prorated taxes, and any repair credits. Presenting this to your listing clients before you set the price anchors the conversation in real numbers and prevents disappointment on closing day. Update it as the transaction progresses.","tip_category":"sellers"}',
 ARRAY['net-sheet','pricing','sellers'], 'US', 'all', 0),

-- ============================================================
-- BOTH (CA + US APPLICABLE) TIPS (10)
-- ============================================================

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Price reductions signal: wait two weeks after a cut to make your move","tip_text":"When a listing takes a price reduction after 14–21 days, buyer interest often spikes briefly — then fades again. The most strategic time to submit an offer is 10–14 days after a price cut when seller anxiety is high but buyer traffic has thinned again. At that point, sellers are often more receptive to additional negotiation on terms and conditions.","tip_category":"buyers"}',
 ARRAY['price-reduction','strategy','negotiation'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Staging sells faster and for more money — the research is consistent","tip_text":"Staged homes sell 17% faster and for 5–10% more than comparable unstaged properties, according to multiple industry studies. Professional staging costs $1,500–$5,000 depending on home size. The return on that investment — especially on a $800,000+ home where 5% is $40,000 — makes staging one of the highest-ROI decisions a seller can make before listing.","tip_category":"sellers"}',
 ARRAY['staging','ROI','listing'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Adjustable-rate mortgages can save money in specific circumstances","tip_text":"An ARM (Adjustable-Rate Mortgage) starts with a fixed rate for 5, 7, or 10 years before adjusting annually. If you plan to sell or refinance within 5–7 years, an ARM''s lower initial rate can save tens of thousands of dollars compared to a 30-year fixed. The risk is keeping the loan beyond the fixed period in a rising rate environment.","tip_category":"mortgage"}',
 ARRAY['ARM','mortgage','strategy'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Market absorption rate tells you who has the negotiating advantage","tip_text":"Absorption rate measures how many months of inventory remain if no new listings appear. Under 3 months is a seller''s market; over 6 months favors buyers. Calculate it by dividing active listings by the average monthly sales in your area. When you present this number to clients, it immediately frames who holds the leverage — without opinion or guesswork.","tip_category":"market"}',
 ARRAY['absorption-rate','market-analysis','negotiation'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"New construction negotiations happen before you sign, not after","tip_text":"Unlike resale transactions, new construction prices are rarely negotiable after the contract is signed. Builders may offer upgrades, rate buydowns, or closing cost credits as incentives — but they discount off the list price only reluctantly because published prices affect their other lots. Negotiate hard at the contract table and get everything in writing before you sign.","tip_category":"buyers"}',
 ARRAY['new-construction','negotiation','builders'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Professional photography increases listing click-through rates by over 60%","tip_text":"Listings with professional photography receive 61% more views and 47% more showing requests than listings with smartphone photos, according to industry research. The cost of a real estate photographer ($200–$500) is recoverable many times over in a faster sale. Wide-angle, well-lit images are the first thing buyers judge — before they ever read your listing description.","tip_category":"sellers"}',
 ARRAY['photography','marketing','listing'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"The inspection objection letter is a negotiation tool, not a repair list","tip_text":"After an inspection, buyers often send a list of every item the inspector noted. Sellers should recognize this as an opening position, not a demand. Counter by addressing items that are genuine safety concerns or code violations, and push back on cosmetic issues or minor wear. The goal is agreement on material items — not a full renovation at seller''s expense.","tip_category":"sellers"}',
 ARRAY['inspection','negotiation','counteroffering'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Your listing description should lead with the buyer''s life, not the home''s features","tip_text":"Most listing descriptions lead with \"This stunning 3-bed, 2-bath home features...\" — the same as every other listing. High-performing descriptions open with the lifestyle: what it feels like to live there, what the location enables, what the buyer gains. Feature lists belong in the data fields, not the narrative. Make your first sentence worth reading.","tip_category":"sellers"}',
 ARRAY['copywriting','listing-description','marketing'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Referrals require a system, not just good service","tip_text":"Most agents believe great service generates referrals automatically. Research shows it does not — not reliably. Clients who had good experiences still need a specific trigger and a moment of ease. A structured 12-month follow-up plan (anniversary check-in, market update, client event) outperforms a reactive approach by a factor of 3–5x in referral generation.","tip_category":"market"}',
 ARRAY['referrals','client-care','follow-up'], 'BOTH', 'all', 0),

(gen_random_uuid(), NULL, 'quick_tip',
 '{"headline":"Open houses convert better when they are an event, not just an access window","tip_text":"Standard open houses — door open, agent sitting at the table — produce low engagement. High-converting open houses include a neighborhood guide handout, a single data point about recent sales (creates credibility), and a specific call to action (\"We are reviewing offers Tuesday — here is the timeline\"). Small details signal professionalism and urgency simultaneously.","tip_category":"sellers"}',
 ARRAY['open-house','marketing','conversion'], 'BOTH', 'spring', 0)

ON CONFLICT DO NOTHING;
