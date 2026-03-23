# ListingFlow — User Journey Maps

## 5 Personas
1. **Prospect** — potential buyer or seller discovering the realtor
2. **Buyer** — active home searcher through purchase and post-close
3. **Seller** — listing through sale and post-close
4. **Other Agents** — buyer/seller agents collaborating
5. **Realtor** — daily workflow using the CRM

---

## 1. Prospect Journey

```mermaid
flowchart TD
    A[Prospect discovers realtor] --> B{How?}
    B -->|Website form| C[Lead captured with email]
    B -->|Phone call| D[Realtor manually adds to CRM]
    B -->|Open house| E[Quick add: name + phone]
    B -->|Referral| F[Added with referrer linked]
    B -->|Social media| G[Lead from DM/comment]

    C & D & E & F & G --> H[Contact created in CRM]

    H --> I{Has email?}
    I -->|Yes| J[Auto-enroll in journey]
    I -->|No| K[SMS-only nurture path]

    J --> L[Welcome email drafted]
    L --> M{Realtor trust level?}
    M -->|Ghost/Co-pilot| N[Email goes to approval queue]
    M -->|Supervised+| O[Email auto-sends]

    N --> P{Realtor action}
    P -->|Approve| Q[Email sent]
    P -->|Edit| R[Realtor modifies - AI learns voice]
    P -->|Skip| S[Skipped - AI notes reason]
    R --> Q

    Q --> T{Prospect engagement}
    T -->|Opens email| U[Engagement score +5]
    T -->|Clicks listing| V[Engagement score +15 - AI infers area price type]
    T -->|Clicks CMA/showing| W[HOT LEAD - Realtor alert immediately]
    T -->|No action| X[Score unchanged - Try different content next time]
    T -->|Unsubscribes| Y[Journey paused - CASL compliant]

    U & V --> Z[Next email adapts]
    Z --> AA{What did they click?}
    AA -->|Listings in Kits| AB[Future emails: Kits focus]
    AA -->|School info| AC[Future emails: family angle]
    AA -->|Market stats| AD[Future emails: data-heavy]
    AA -->|Nothing 3x| AE[Change content type - Reduce frequency]

    AB & AC & AD --> AF[Scheduled email in 3-7 days]
    AF --> T

    AE --> AG{Still no engagement after 60 days?}
    AG -->|Yes| AH[Move to Dormant - Re-engagement email]
    AG -->|No| AF

    W --> AI[Realtor calls/texts prospect]
    AI --> AJ{Outcome?}
    AJ -->|Books showing| AK[Convert to BUYER - Journey: Lead to Active]
    AJ -->|Wants to sell| AL[Convert to SELLER - Journey: Lead to Active]
    AJ -->|Not ready| AM[Stay in nurture - Continue journey]
    AJ -->|Lost| AN[Mark as lost - Pause journey]

    AK --> AO[Buyer journey begins]
    AL --> AP[Seller journey begins]
```

### Key Decision Points

| # | Decision | Who Decides | Data Used |
|---|----------|-------------|-----------|
| 1 | Welcome email content | AI + Realtor | Contact type, notes, area from form |
| 2 | What to send next | AI Agent | Click history, engagement score, inferred interests |
| 3 | When to send | AI Agent | Optimal send time, frequency cap, last email date |
| 4 | Whether to send at all | Send Governor | Engagement trend, frequency limit, CASL status |
| 5 | Hot lead alert | AI Agent | Click type (showing/CMA = hot), engagement velocity |
| 6 | Convert to buyer/seller | Realtor | Phone call outcome, prospect's stated intent |

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

*Generated 2026-03-23 — ListingFlow CRM*
