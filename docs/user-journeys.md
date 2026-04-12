# Realtors360 — User Journey Maps

## 5 Personas
1. **Prospect** — potential buyer or seller discovering the realtor
2. **Buyer** — active home searcher through purchase and post-close
3. **Seller** — listing through sale and post-close
4. **Other Agents** — buyer/seller agents collaborating
5. **Realtor** — daily workflow using the CRM

---

## 1. Prospect Journey

### 1A. Entry Points — How Prospects Find the Realtor

```mermaid
flowchart TD
    A[Prospect discovers realtor] --> B{Entry channel}
    B -->|Website form| C[Lead captured with email + source]
    B -->|Inbound phone call| D[Realtor logs call in CRM]
    B -->|Open house sign-in| E[Quick add: name + phone at event]
    B -->|Referral from past client| F[Added with referrer linked]
    B -->|Social media DM| G[Lead from Instagram/Facebook]
    B -->|Yard sign / print ad| H[Prospect calls listing number]
    B -->|Google ad / SEO| I[Clicks ad - lands on website]

    C & D & E & F & G & H & I --> J[Contact created in CRM]

    J --> K[Auto-detect: has email? has phone?]
    K --> L{Communication channels}
    L -->|Email + Phone| M[Full journey: email + SMS]
    L -->|Email only| N[Email-only journey]
    L -->|Phone only| O[SMS-only nurture + ask for email]
    L -->|Neither| P[Realtor must follow up manually]

    M & N & O --> Q[Auto-enroll in prospect journey]
    Q --> R[Welcome message drafted]
```

### 1B. Welcome + First Engagement

```mermaid
flowchart TD
    R[Welcome message drafted] --> S{Realtor trust level}
    S -->|Level 0: Ghost| S1[Realtor reviews every email manually]
    S -->|Level 1: Co-pilot| S2[1-tap approve in queue]
    S -->|Level 2: Supervised| S3[Auto-sends - realtor gets digest]
    S -->|Level 3: Autonomous| S4[Auto-sends - weekly summary only]

    S1 & S2 --> T{Realtor action}
    T -->|Approve| U[Message sent]
    T -->|Edit| V[Realtor modifies - AI learns voice rules]
    T -->|Skip| W[Skipped - AI logs reason for learning]
    V --> U
    S3 & S4 --> U
```

### 1C. Engagement Tracking — Email + Direct Contact

```mermaid
flowchart TD
    U[Message sent to prospect] --> ENG{Engagement type}

    ENG -->|EMAIL ENGAGEMENT| EA[Tracked automatically]
    ENG -->|DIRECT CONTACT| DC[Realtor logs in CRM]

    EA --> EB{What happened?}
    EB -->|Opened email| EC[Score +5]
    EB -->|Clicked content| ED[Score +15 - classify click]
    EB -->|No action| EE[Score unchanged]
    EB -->|Unsubscribed| EF[Journey paused - CASL compliant]

    DC --> DC1{Contact type}
    DC1 -->|Inbound call| DC2[Score +25 - log call notes + trigger]
    DC1 -->|Text / WhatsApp| DC3[Score +20 - auto-logged via Twilio]
    DC1 -->|Open house visit| DC4[Score +15 - log property interest]
    DC1 -->|Walked into office| DC5[Score +20 - log conversation]
    DC1 -->|Social media reply| DC6[Score +10 - log interaction]

    DC2 --> DC7{What triggered the call?}
    DC7 -->|After receiving email| DC8[Link call back to email - attribution]
    DC7 -->|Saw yard sign| DC9[Source: yard sign - log listing]
    DC7 -->|Google search| DC10[Source: organic - log search intent]
    DC7 -->|Referral mentioned| DC11[Source: referral - link referrer]
```

### 1D. Click Intelligence — What Clicks Reveal

```mermaid
flowchart TD
    ED[Prospect clicks in email] --> CL{Click category}

    CL -->|Specific listing| CL1[Infer: area + price range + property type]
    CL -->|School / family info| CL2[Infer: has kids - schools matter]
    CL -->|Market stats / data| CL3[Infer: analytical - wants proof]
    CL -->|Mortgage calculator| CL4[Infer: actively budgeting - pre-approval stage]
    CL -->|Neighbourhood lifestyle| CL5[Infer: exploring areas - early stage]
    CL -->|Book Showing button| CL6[HOT: ready to see homes NOW]
    CL -->|Get CMA / home value| CL7[HOT: thinking about selling]
    CL -->|Investment / rental yield| CL8[Infer: investor buyer - focus on ROI]
    CL -->|Price drop alert| CL9[Infer: bargain hunter or watching specific listing]
    CL -->|Open house RSVP| CL10[Infer: wants to see homes - low commitment]
    CL -->|Forwarded email| CL11[Infer: advocate - may have referral]
    CL -->|Clicked same email 2x+| CL12[Infer: highly interested in this content]

    CL1 & CL2 & CL3 & CL4 & CL5 & CL8 & CL9 & CL10 --> AI[AI updates contact intelligence]
    AI --> ADAPT[Next email adapts to inferred interests]
    ADAPT --> NEXT[Schedule next email in 3-7 days]
    NEXT --> U

    CL6 & CL7 --> HOT[HOT LEAD - immediate realtor alert]
    CL11 & CL12 --> WARM[WARM SIGNAL - include in daily digest]
```

### 1E. Graduated Escalation — When Does the Realtor Step In?

```mermaid
flowchart TD
    SCORE[Engagement Score Updates] --> ESC{Current score range}

    ESC -->|0-20: Cold| L1[AI handles everything]
    L1 --> L1A[Weekly/bi-weekly nurture emails]
    L1A --> L1B[No realtor action needed]

    ESC -->|20-40: Warming| L2[AI increases frequency]
    L2 --> L2A[2x per week - varied content]
    L2A --> L2B[Optional: appears in weekly digest]

    ESC -->|40-60: Engaged| L3[AI sends targeted content]
    L3 --> L3A[Daily if matching listings exist]
    L3A --> L3B[Soft alert to realtor: X is engaging - consider reaching out]

    ESC -->|60-80: Hot| L4[AI sends time-sensitive alerts]
    L4 --> L4A[Same-day listing matches]
    L4A --> L4B[CALL THEM: X clicked 4 listings this week]

    ESC -->|80+: Ready| L5[AI reduces email - realtor should own relationship]
    L5 --> L5A[Offer-prep and showing-prep content only]
    L5A --> L5B[URGENT: X clicked Book Showing 3 times - ready to act]

    ESC -->|Direct contact logged| L6[Score jumps +20-30]
    L6 --> L6A[Realtor logs call/text/visit outcome]
    L6A --> CONV{Ready to convert?}
```

### 1F. Conversion — Prospect Becomes Buyer or Seller

```mermaid
flowchart TD
    CONV{Conversion trigger} --> TR{What triggered it?}

    TR -->|Clicked Book Showing in email| T1[AI suggests: Move to Active Buyer?]
    TR -->|Clicked Get CMA in email| T2[AI suggests: Move to Active Seller?]
    TR -->|Called about a listing| T3[Realtor logs: interested in buying]
    TR -->|Asked about selling in call| T4[Realtor logs: interested in selling]
    TR -->|Booked showing via CRM| T5[Auto-convert: Active Buyer]
    TR -->|Signed listing agreement| T6[Auto-convert: Active Seller]
    TR -->|Score 60+ sustained 2 weeks| T7[AI suggests conversion with evidence]
    TR -->|Attended open house + positive| T8[AI suggests: promising buyer]
    TR -->|Realtor manually changes type| T9[Manual override - immediate]

    T1 & T2 & T7 & T8 --> SUGGEST[AI shows conversion prompt]
    SUGGEST --> PROMPT["X has been engaging for 2 weeks, score 72.<br>Clicked 6 Kits listings + mortgage calc.<br>Opened every email."]
    PROMPT --> REAL{Realtor decides}
    REAL -->|Yes - buyer| BUY[Convert to BUYER journey]
    REAL -->|Yes - seller| SELL[Convert to SELLER journey]
    REAL -->|Not yet| WAIT[Keep nurturing - check again in 1 week]
    REAL -->|Actually both| DUAL[Dual journey: buyer + seller]

    T3 & T4 & T9 --> MANUAL[Realtor confirms type]
    MANUAL --> BUY2{Which?}
    BUY2 -->|Buyer| BUY
    BUY2 -->|Seller| SELL

    T5 --> BUY
    T6 --> SELL

    BUY --> BUYJ[Buyer journey begins - see Section 2]
    SELL --> SELLJ[Seller journey begins - see Section 3]
```

### 1G. Dormancy + Re-engagement

```mermaid
flowchart TD
    DORM{No engagement detected} --> D1{How long?}
    D1 -->|30 days no opens| D2[Reduce frequency to 1x per 2 weeks]
    D1 -->|45 days no opens| D3[Try completely different content type]
    D1 -->|60 days no opens| D4[Move to Dormant phase]

    D4 --> D5[Re-engagement email: Market changed since we last spoke]
    D5 --> D6{Response?}
    D6 -->|Opens| D7[Reactivate - score reset to 20]
    D6 -->|Clicks| D8[Reactivate - score reset to 35]
    D6 -->|Nothing| D9[Wait 30 more days]
    D9 --> D10[Final attempt: Different subject line + channel]
    D10 --> D11{Response?}
    D11 -->|Yes| D7
    D11 -->|No 90 days total| D12[Auto-sunset: stop all emails]
    D12 --> D13[Contact stays in CRM but marked inactive]
    D13 --> D14[Realtor can manually reactivate anytime]
```

### Key Decision Points

| # | Decision | Who Decides | Data Used |
|---|----------|-------------|-----------|
| 1 | Welcome email content | AI + Realtor | Contact type, notes, area, source |
| 2 | What to send next | AI Agent | Click history (12 categories), engagement score, inferred interests |
| 3 | When to send | AI Agent | Optimal send time, frequency cap, last email date, score-based frequency |
| 4 | Whether to send at all | Send Governor | Engagement trend, frequency limit, CASL status, sunset rules |
| 5 | Hot lead alert | AI Agent | Click type (showing/CMA = hot), engagement velocity, direct contact |
| 6 | Soft alert (daily digest) | AI Agent | Score 40-60, consistent engagement pattern |
| 7 | Convert to buyer/seller | AI suggests + Realtor confirms | Score 60+, click patterns, direct contact outcome |
| 8 | Dormancy handling | AI Agent | Days since last open, content type exhaustion |
| 9 | Attribution | System | Link calls/showings back to emails that triggered them |
| 10 | Reactivation | AI or Realtor | Re-engagement click, or manual override |

### Click Intelligence Categories (12)

| Category | Signal | AI Response | Score Impact |
|---|---|---|---|
| Specific listing | Interested in that type/area/price | Narrow future listings | +15 |
| School / family info | Has kids, schools matter | Family-angle content | +10 |
| Market stats / data | Analytical, wants proof | Data-heavy emails | +10 |
| Mortgage calculator | Actively budgeting | Pre-approval info + affordable listings | +20 |
| Neighbourhood lifestyle | Exploring areas, early stage | Area comparison content | +10 |
| Book Showing button | Ready to act NOW | HOT LEAD alert | +30 |
| Get CMA / home value | Thinking about selling | Switch to seller nurture | +30 |
| Investment / rental yield | Investor buyer | Focus on ROI and cap rates | +15 |
| Price drop alert | Bargain hunter or watching | Re-send listing with urgency | +10 |
| Open house RSVP | Wants to see homes, low commitment | Open house roundups | +15 |
| Forwarded email | Advocate, potential referral | Referral incentive | +5 |
| Multiple clicks same email | Highly interested in this content | More of this type | +10 |

### Engagement Score Thresholds

| Score | Label | AI Frequency | Realtor Action |
|---|---|---|---|
| 0-20 | Cold | Weekly | None |
| 20-40 | Warming | 2x/week | In weekly digest |
| 40-60 | Engaged | Daily if inventory | Soft alert: consider reaching out |
| 60-80 | Hot | Same-day matches | Call them: high engagement |
| 80+ | Ready | Reduce email, realtor owns it | Urgent: ready to act |

---

## 2. Buyer Journey

```mermaid
flowchart TD
    A[Prospect converts to BUYER] --> B[Journey: Lead to Active]

    B --> C[AI reads buyer preferences]
    C --> D{Preferences set?}
    D -->|Yes| E[Budget, area, beds, type known]
    D -->|No| F[AI infers from notes + clicks]

    E & F --> G[Active Buyer Email Sequence]

    G --> H{MLS Event: New listing}
    H --> I[Agent evaluates relevance]
    I --> J{Match score > 65%?}
    J -->|Yes| K[Generate listing alert email]
    J -->|No| L[Skip - log suppression]

    K --> M{Send Governor check}
    M -->|Frequency OK| N[Listing alert sent]
    M -->|Cap reached| O[Defer to next window]

    N --> P{Buyer clicks?}
    P -->|Clicks listing| Q[Score +15 - Update intelligence]
    P -->|Clicks Book Showing| R[HOT - Alert realtor NOW]
    P -->|Ignores| S[Score -2 - Try different angle]

    R --> T[Realtor books showing]
    T --> U[Pre-showing email: What to look for]
    U --> V[Showing happens]

    V --> W{Buyer feedback}
    W -->|Loved it| X[Post-showing: Ready to make an offer?]
    W -->|Liked it| Y[Post-showing: 2 similar homes nearby]
    W -->|Not interested| Z[Post-showing: What else is available]

    X --> AA{Offer submitted?}
    AA -->|Yes| AB[Journey: Active to Under Contract]
    AA -->|No| AC[Continue showing cycle]
    AC --> G

    AB --> AD[Under Contract Sequence]
    AD --> AE[What happens next timeline]
    AE --> AF[Subject removal reminders]
    AF --> AG[Inspection prep guide]
    AG --> AH[Meet your neighbourhood content]
    AH --> AI[Closing day countdown]

    AI --> AJ{Deal closes?}
    AJ -->|Yes| AK[Journey: Under Contract to Past Client]
    AJ -->|Falls through| AL[Journey back to Active]
    AL --> G

    AK --> AM[Past Client Sequence]
    AM --> AN[Day 1: Welcome home - Move-in checklist]
    AN --> AO[Day 30: How is the new place? + maintenance tip]
    AO --> AP[Month 6: Your home value update]
    AP --> AQ[Year 1: Happy home anniversary + value change]
    AQ --> AR[Quarterly: Market updates for their area]
    AR --> AS[Every 6 months: Subtle referral ask]

    AS --> AT{Engagement drops?}
    AT -->|60+ days no opens| AU[Journey to Dormant]
    AU --> AV[Re-engagement: Market changed since we last spoke]
    AV --> AW{Re-engages?}
    AW -->|Opens/clicks| AX[Reactivate to Past Client]
    AW -->|Still silent 90d| AY[Auto-sunset - stop emails]
    AX --> AR

    AS --> AZ{Clicks refer a friend?}
    AZ -->|Yes| BA[New prospect enters CRM - Referral source linked]
    BA --> BB[Prospect journey starts]

    AR --> BC{Life event detected?}
    BC -->|Mentions sell or move| BD[Alert realtor: Past buyer may be selling]
    BC -->|Mortgage renewal approaching| BE[Your mortgage renews soon - review options]
    BC -->|Growing family signals| BF[Thinking of upsizing? Available homes]
```

### Buyer Email Touchpoints

| Phase | Trigger | Email Type | Frequency |
|-------|---------|-----------|-----------|
| Active Search | New listing matches | Listing Alert | Real-time (max 3/week) |
| Active Search | Weekly digest | Your Weekly Roundup | Weekly |
| Active Search | Market shift | Market Update | Monthly |
| Pre-Showing | Showing booked | What to look for | Once per showing |
| Post-Showing | Showing completed | Feedback + similar homes | 24h after showing |
| Under Contract | Offer accepted | What happens next | Immediately |
| Under Contract | Milestones | Subject removal, inspection, closing | Event-driven |
| Past Client | Day 1 | Move-in checklist | Once |
| Past Client | Day 30 | How's the new place? | Once |
| Past Client | Month 6 | Home value update | Once |
| Past Client | Year 1+ | Home anniversary | Annually |
| Past Client | Ongoing | Area market updates | Quarterly |
| Past Client | Ongoing | Referral ask | Every 6 months |
| Dormant | 60d no engagement | Re-engagement | Once |

---

## 3. Seller Journey

```mermaid
flowchart TD
    A[Prospect converts to SELLER] --> B[Journey: Lead to Active Listing]

    B --> C[AI reads property details + notes]
    C --> D{Listing created in CRM?}
    D -->|Not yet| E[Pre-listing sequence]
    D -->|Yes| F[Active Listing sequence]

    E --> E1[Your home estimated value + comps]
    E1 --> E2[Why now is a good time to sell in area]
    E2 --> E3[My marketing plan for your home]
    E3 --> E4{Signs listing agreement?}
    E4 -->|Yes| F
    E4 -->|No| E5{Still engaged?}
    E5 -->|Yes| E6[Monthly market updates for their area]
    E5 -->|No 60d| E7[Dormant - re-engagement]
    E6 --> E4

    F --> G[Listing goes live in CRM]
    G --> H[AI matches listing to buyers in CRM]
    H --> I[New Listing Alerts sent to matching buyers]

    G --> J[Seller weekly report begins]
    J --> J1[Week 1: Your listing is live! Marketing timeline]
    J1 --> J2{Showings happening?}

    J2 -->|Yes| K[Weekly: Showing count + feedback summary]
    J2 -->|No showings 2 weeks| L[AI suggests strategy change - Alert realtor]

    K --> M{Showing feedback}
    M -->|Positive feedback| N[Share positive quotes with seller]
    M -->|Price concerns| O[Market positioning update]
    M -->|Low traffic| P[Suggest price adjustment or staging]

    L & P --> Q{Price reduction?}
    Q -->|Yes| R[Price drop alerts to watching buyers]
    Q -->|No| S[Continue current strategy]
    R --> J2
    S --> J2

    K --> T{Offer received?}
    T -->|Yes| U[Offer overview - let us talk]
    T -->|No| J2

    U --> V{Offer accepted?}
    V -->|Yes| W[Journey: Active to Under Contract]
    V -->|Counter/Reject| X[Back to showings]
    X --> J2

    W --> Y[Under Contract Sequence]
    Y --> Y1[Accepted! Here is what happens next]
    Y1 --> Y2[Subject removal timeline]
    Y2 --> Y3[Inspection preparation checklist]
    Y3 --> Y4[Closing preparation - docs needed]
    Y4 --> Y5[What to expect on closing day]

    Y5 --> Z{Deal closes?}
    Z -->|Yes| AA[Journey: Under Contract to Past Client]
    Z -->|Falls through| AB[Journey back to Active]
    AB --> J2

    AA --> AC[Just Sold celebration email to seller]
    AC --> AD[Just Sold email to CRM buyer contacts]

    AD --> AE[Past Client Sequence]
    AE --> AF[Day 1: Congratulations on your sale!]
    AF --> AG[Day 30: Your old neighbourhood - what sold after you]
    AG --> AH[Quarterly: Thinking of you + market updates]
    AH --> AI[Year 1: One year since the sale]
    AI --> AJ[Ongoing: Referral nurture]

    AJ --> AK{Buying next?}
    AK -->|Yes| AL[Convert to BUYER journey]
    AK -->|Has investment property| AM[Investment property updates]
```

---

## 4. Other Agents Journey

```mermaid
flowchart TD
    A[Other Agent interacts with realtor] --> B{Context?}

    B -->|Inquires about listing| C[Buyer Agent wants showing]
    B -->|Has buyer for listing| D[Buyer Agent sends offer]
    B -->|Co-listing| E[Seller Agent partnership]
    B -->|Referral| F[Agent refers a client]

    C --> G[Agent calls/emails about listing]
    G --> H[Realtor adds agent as contact type: agent/partner]
    H --> I[Showing request created in CRM]
    I --> J[SMS/WhatsApp to seller: approve showing?]
    J --> K{Seller responds}
    K -->|YES| L[Showing confirmed - Confirmation + lockbox code to agent]
    K -->|NO| M[Showing denied - Alternative times suggested]

    L --> N[Showing happens]
    N --> O[Agent provides feedback]
    O --> P[Feedback logged in CRM - Shared with seller in weekly report]

    D --> Q[Offer received]
    Q --> R[Logged in CRM with agent details]
    R --> S[Notification to realtor + seller]
    S --> T{Negotiation}
    T -->|Accepted| U[Both agents notified - Under contract begins]
    T -->|Counter| V[Counter sent to buyer agent]
    T -->|Rejected| W[Rejection with feedback]

    F --> X[New contact added to CRM - Referral source: Agent name]
    X --> Y[Prospect journey begins]
    Y --> Z[Referral tracking: if deal closes - referral fee logged]

    H --> AA{Agent relationship type}
    AA -->|One-time| AB[No ongoing emails]
    AA -->|Repeat collaborator| AC[Agent Newsletter Sequence]
    AC --> AD[Monthly: New listings - bring your buyers]
    AD --> AE[Market updates: What is moving in my areas]
    AE --> AF[Success stories: We just closed together]
    AF --> AG[Seasonal: Happy holidays from our team]
```

---

## 5. Realtor Daily Workflow

```mermaid
flowchart TD
    A[Morning: Realtor opens CRM] --> B[Dashboard loads]

    B --> C[Overnight Summary Card]
    C --> C1[12 emails sent overnight - 89% open rate - 3 replies]
    C1 --> C2[AI insight: Kits listings get 3x more clicks]

    B --> D[Hot Leads Card]
    D --> D1[Sarah Kim clicked 4 listings - viewed mortgage calc - Agent says: Call her today]
    D1 --> D2{Realtor action}
    D2 -->|Call| E1[Log call outcome in CRM]
    D2 -->|Text| E2[Send SMS from CRM]
    D2 -->|Snooze| E3[Remind me tomorrow]

    B --> F[Pending Approvals Card]
    F --> F1[5 emails ready for review]
    F1 --> F2[Open Approval Queue]
    F2 --> F3{For each email}
    F3 -->|Approve| F4[Email sent immediately]
    F3 -->|Edit| F5[Modify - AI learns - Send]
    F3 -->|Skip| F6[Skipped - AI notes reason]
    F3 -->|Approve All| F7[Batch approve remaining]

    B --> G[Today Tasks Card]
    G --> G1[Follow-up calls scheduled]
    G --> G2[Showings today]
    G --> G3[Documents to prepare]

    G1 & G2 & G3 --> H[Midday: Active work]
    H --> H1[Conduct showings]
    H1 --> H2[Log showing feedback in CRM]
    H2 --> H3[AI auto-sends post-showing email to buyer]

    H --> H4[Add new contacts from calls/meetings]
    H4 --> H5[Journey auto-enrolls - Welcome email queued]

    H --> H6[Update listing status/price]
    H6 --> H7[AI auto-sends alerts to matching buyers]

    H3 & H5 & H7 --> I[Evening: Review]
    I --> I1[Check analytics: today opens/clicks]
    I --> I2[Review any new hot lead alerts]
    I --> I3[Set tomorrow tasks]

    I --> J[Weekly: Strategic Review]
    J --> J1[Newsletter analytics: what worked]
    J --> J2[Pipeline review: who is stuck]
    J --> J3[AI learning report: edit rate down 67% to 9%]
    J --> J4{Trust level promotion?}
    J4 -->|Stats qualify| J5[Ready to upgrade to Supervised? You edited 3 of 47 emails]
    J4 -->|Not yet| J6[Continue at current level]
```

---

## 6. Quick Contact Lookup

1. Press Cmd+K from any page
2. Type contact name — results appear in 300ms (debounced search against `/api/contacts?search=`)
3. Click result — navigate to contact detail page (`/contacts/{id}`)
4. Recent item saved automatically in sidebar via Zustand persist store

---

## 7. Triage Dashboard

1. Land on dashboard — see Today's Priorities card at the top (overdue tasks, hot leads, pending showings)
2. Scroll to Activity Feed — see what happened recently (communications, email events, showing changes, completed tasks)
3. Check Deal Pipeline widget — see active deals grouped by stage with values
4. Click KPI card — navigate to filtered list (e.g., click "Active Listings" to go to `/listings?status=active`)

---

## 8. Contact Management

1. Open `/contacts` — see paginated DataTable with avatars, lead scores, stages
2. Search by name — table filters instantly via search input
3. Hover row — call/email/preview icons appear (inline quick actions)
4. Click eye icon — preview sheet slides open showing contact info + recent communications
5. Select checkboxes on multiple rows — bulk action bar appears at bottom of screen
6. Click "Change Stage" in bulk bar — update multiple contacts' stage in one action

---

## 9. Showing Workflow

1. Schedule showing — notification fires to realtor (notification center bell shows unread count)
2. Confirm showing — notification fires to buyer agent, calendar event updated
3. Complete showing — feedback SMS sent to buyer agent via Twilio asking for 1-5 rating and comments

---

*Generated 2026-03-23, updated 2026-04-10 — Realtors360 CRM*
