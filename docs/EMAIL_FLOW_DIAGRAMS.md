<!-- docs-audit: src/emails/*, src/actions/newsletters.ts, src/lib/resend.ts -->
# Realtors360 CRM — Email Flow Diagrams

> To render these diagrams, open in GitHub (renders natively) or paste into [mermaid.live](https://mermaid.live)

## 1. Complete Email Ecosystem

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8e0ff', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#1a1535', 'lineColor': '#4f35d2', 'secondaryColor': '#f4f2ff', 'tertiaryColor': '#fff', 'background': '#ffffff', 'mainBkg': '#f4f2ff', 'nodeBorder': '#4f35d2', 'clusterBkg': '#faf8ff', 'clusterBorder': '#d8b4fe', 'titleColor': '#1a1535', 'edgeLabelBackground': '#ffffff'}}}%%
graph TB
    subgraph TRIGGERS["What Triggers Emails"]
        T1[New Contact Created]
        T2[Listing Goes Active]
        T3[Listing Price Changed]
        T4[Showing Completed]
        T5[Deal Closed]
        T6[Contact Inactive 60+ Days]
        T7[Birthday Today]
        T8[Home Anniversary Today]
        T9[Holiday Calendar Match]
        T10[Realtor Clicks 'Send Blast']
        T11[Cron: Daily 9 AM]
        T12[Cron: Every 10 Min]
    end

    subgraph SYSTEMS["Which System Sends"]
        S1[Journey Engine]
        S2[Workflow Engine]
        S3[AI Greeting Agent]
        S4[Manual Blast API]
        S5[Campaign Wizard]
    end

    subgraph PIPELINE["Email Pipeline"]
        P1[Text Pipeline — personalize, voice rules, compliance]
        P2[Email Blocks — assemble Apple-quality HTML]
        P3[Quality Score — Claude Haiku 7 dimensions]
        P4[Validated Send — content + design + compliance gate]
        P5[Resend API — deliver email]
        P6[BCC Monitor — metadata banner to realtor]
    end

    subgraph TRACKING["Post-Send"]
        TR1[Resend Webhook — open/click/bounce]
        TR2[Contact Intelligence — update score]
        TR3[AI Agent — adapt next email]
    end

    T1 --> S1 & S2
    T2 --> S4
    T3 --> S4
    T4 --> S2
    T5 --> S2
    T6 --> S2
    T7 --> S3
    T8 --> S3
    T9 --> S3
    T10 --> S4
    T11 --> S1 & S2
    T12 --> S3

    S1 & S2 & S3 & S4 & S5 --> P1
    P1 --> P2 --> P3 --> P4 --> P5
    P5 --> P6
    P5 --> TR1 --> TR2 --> TR3
```

---

## 2. Email Types — What Each Contact Receives

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8e0ff', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#1a1535', 'lineColor': '#4f35d2', 'secondaryColor': '#f4f2ff', 'tertiaryColor': '#fff', 'background': '#ffffff', 'mainBkg': '#f4f2ff', 'nodeBorder': '#4f35d2', 'clusterBkg': '#faf8ff', 'clusterBorder': '#d8b4fe', 'titleColor': '#1a1535', 'edgeLabelBackground': '#ffffff'}}}%%
graph LR
    subgraph BUYER["Buyer Contact Receives"]
        B1[Welcome Email]
        B2[Neighbourhood Guide]
        B3[New Listing Alert — weekly]
        B4[Market Update — monthly]
        B5[Mortgage Pre-Approval Guide]
        B6[Buying Process Overview]
        B7[Making an Offer Guide]
        B8[Closing Checklist]
        B9[Congratulations — deal closed]
        B10[Move-In Checklist]
        B11[30-Day Maintenance Tips]
        B12[90-Day Referral Ask]
        B13[6-Month Equity Update]
        B14[1-Year Anniversary]
    end

    subgraph SELLER["Seller Contact Receives"]
        SE1[Welcome + CMA Preview]
        SE2[Market Update for Sellers]
        SE3[Weekly Showing Summary]
        SE4[Congratulations on Sale]
        SE5[What's Next + Moving Resources]
        SE6[30-Day Referral Ask]
        SE7[90-Day Market Update]
        SE8[6-Month Neighbourhood Update]
        SE9[1-Year Anniversary]
    end

    subgraph GREETINGS["Everyone Receives — Greetings"]
        G1[🎂 Birthday]
        G2[🏠 Home Anniversary]
        G3[🎄 Christmas]
        G4[🎆 New Year]
        G5[🪔 Diwali]
        G6[🧧 Lunar New Year]
        G7[🍁 Canada Day]
        G8[🦃 Thanksgiving]
        G9[💝 Valentine's Day]
        G10[💐 Mother's Day]
        G11[👔 Father's Day]
    end

    subgraph AGENTS["Agent/Partner Receives"]
        A1[Listing Blast — New Listing Alert]
        A2[Listing Blast — Luxury Showcase]
        A3[Listing Blast — Open House Invite]
        A4[Partner Welcome]
        A5[Partner Market Update]
        A6[Partner Quarterly Newsletter]
        A7[Partner Annual Recap]
    end
```

---

## 3. Buyer Journey — Complete Email Timeline

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#4f35d2', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#ffffff', 'lineColor': '#4f35d2', 'secondaryColor': '#e8e0ff', 'tertiaryColor': '#f4f2ff', 'background': '#ffffff', 'gridColor': '#e5e7eb', 'todayLineColor': '#ff5c3a'}}}%%
gantt
    title Buyer Journey Email Sequence
    dateFormat X
    axisFormat Day %s

    section Lead Phase
    Welcome Email                   :done, 0, 1
    Welcome SMS                     :done, 0, 1
    Neighbourhood Guide             :done, 3, 4
    Listing Alert #1                :done, 7, 8
    Market Update                   :done, 14, 15
    Listing Alert #2                :done, 21, 22

    section Active Phase (after showing booked)
    Weekly Listings                  :active, 28, 29
    Market Report                   :active, 42, 43

    section Under Contract (after offer accepted)
    Neighbourhood Welcome Guide     :crit, 44, 45

    section Past Client (after deal closed)
    Home Anniversary                :milestone, 74, 75
    Quarterly Market Update         :milestone, 134, 135
    Referral Ask                    :milestone, 254, 255
    Annual Anniversary              :milestone, 439, 440
```

---

## 4. Workflow Step Types — What Gets Sent

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8e0ff', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#1a1535', 'lineColor': '#4f35d2', 'secondaryColor': '#f4f2ff', 'tertiaryColor': '#fff', 'background': '#ffffff', 'mainBkg': '#f4f2ff', 'nodeBorder': '#4f35d2', 'clusterBkg': '#faf8ff', 'clusterBorder': '#d8b4fe', 'edgeLabelBackground': '#ffffff'}}}%%
flowchart TD
    subgraph STEP_TYPES["7 Workflow Step Types"]
        ST1["📧 auto_email\nAI generates content → Email Blocks → Resend"]
        ST2["📱 auto_sms\nTemplate + variables → Twilio SMS"]
        ST3["💬 auto_whatsapp\nTemplate + variables → Twilio WhatsApp"]
        ST4["✅ manual_task\nCreate task in CRM for realtor"]
        ST5["🔔 auto_alert\nAgent notification in dashboard"]
        ST6["⚙️ system_action\nChange status/stage/tag automatically"]
        ST7["⏳ wait\nDelay before next step"]
    end

    ST1 -->|"Resend API"| EMAIL[Email in Inbox]
    ST2 -->|"Twilio API"| SMS[SMS on Phone]
    ST3 -->|"Twilio API"| WA[WhatsApp Message]
    ST4 --> TASK[Task in CRM]
    ST5 --> NOTIF[Bell Notification]
    ST6 --> DB[Database Update]
    ST7 --> NEXT[Next Step Fires After Delay]
```

---

## 5. Customer (Lead) Qualification Flow

> Customers are unqualified leads. They receive generic nurture until the realtor converts them to Buyer or Seller.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8e0ff', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#1a1535', 'lineColor': '#4f35d2', 'secondaryColor': '#f4f2ff', 'tertiaryColor': '#fff', 'background': '#ffffff', 'mainBkg': '#f4f2ff', 'nodeBorder': '#4f35d2', 'clusterBkg': '#faf8ff', 'clusterBorder': '#d8b4fe', 'edgeLabelBackground': '#ffffff'}}}%%
flowchart TD
    NEW["Someone reaches out\n(form, call, referral, webhook)"] --> CREATE["Contact created\ntype: customer"]

    CREATE --> JOURNEY["Auto-enroll in\ncustomer journey"]
    JOURNEY --> WELCOME["📧 Welcome email\n(generic — not buyer/seller specific)"]
    WELCOME --> NURTURE["📧 Market updates\n(every 7 days)"]
    NURTURE --> QUALIFY{Realtor qualifies:\n'What are they looking for?'}

    QUALIFY -->|"Wants to buy"| CONVERT_B["Convert to Buyer\n(button on contact page)"]
    QUALIFY -->|"Wants to sell"| CONVERT_S["Convert to Seller\n(button on contact page)"]
    QUALIFY -->|"Not ready"| NURTURE

    CONVERT_B --> BUYER["type → buyer\nstatus → qualified\nBuyer Nurture enrolls"]
    CONVERT_S --> SELLER["type → seller\nstatus → qualified\nSeller journey starts"]

    BUYER --> BUYER_WF["Buyer workflows:\nListing alerts, mortgage guide,\noffer guide, closing checklist"]
    SELLER --> SELLER_WF["Seller workflows:\nMarket updates,\nshowing summaries"]

    style CREATE fill:#dcfce7
    style CONVERT_B fill:#dbeafe
    style CONVERT_S fill:#f3e8ff
```

---

## 5b. Contact Types — Who Gets What

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8e0ff', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#1a1535', 'lineColor': '#4f35d2', 'secondaryColor': '#f4f2ff', 'tertiaryColor': '#fff', 'background': '#ffffff', 'mainBkg': '#f4f2ff', 'nodeBorder': '#4f35d2', 'clusterBkg': '#faf8ff', 'clusterBorder': '#d8b4fe', 'edgeLabelBackground': '#ffffff'}}}%%
flowchart LR
    subgraph CUSTOMER["🟢 Customer (Lead)"]
        C1[Welcome email]
        C2[Market updates]
        C3[Greetings]
        C4[NO listing alerts]
        C5[NO mortgage guides]
    end

    subgraph BUYER["🔵 Buyer"]
        B1[Listing alerts]
        B2[Mortgage guide]
        B3[Offer guide]
        B4[Closing checklist]
        B5[Post-close sequence]
        B6[Greetings]
    end

    subgraph SELLER["🟣 Seller"]
        S1[Market updates]
        S2[Showing summaries]
        S3[Sale congratulations]
        S4[Post-close sequence]
        S5[Greetings]
    end

    subgraph AGENT["🟠 Agent"]
        A1[Listing blasts ONLY]
        A2[NO greetings]
        A3[NO nurture emails]
        A4[NO journey]
    end

    subgraph PARTNER["🔷 Partner"]
        P1[Partner welcome]
        P2[Market updates]
        P3[Quarterly newsletter]
        P4[Greetings optional]
    end
```

---

## 6. Speed-to-Contact Workflow (Inactive by Default — Manual Enable)

> This workflow is **inactive by default**. The realtor enables it from the AI Workflows tab and manually enrolls contacts. New contacts do NOT auto-enroll.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorBkg': '#e8e0ff', 'actorBorder': '#4f35d2', 'actorTextColor': '#1a1535', 'signalColor': '#4f35d2', 'signalTextColor': '#1a1535', 'noteBkgColor': '#f4f2ff', 'noteBorderColor': '#d8b4fe', 'noteTextColor': '#1a1535', 'activationBkgColor': '#e8e0ff', 'activationBorderColor': '#4f35d2', 'sequenceNumberColor': '#ffffff', 'background': '#ffffff'}}}%%
sequenceDiagram
    participant Lead as New Lead
    participant CRM as Realtors360 CRM
    participant Agent as Realtor
    participant Twilio as Twilio
    participant Resend as Resend

    Note over Lead,Resend: Lead Speed-to-Contact (12 steps, 0-24 hours)

    Lead->>CRM: Contact created
    CRM->>Twilio: 📱 Instant SMS: "Thanks for reaching out!"
    CRM->>Agent: 🔔 Alert: "New lead received"
    CRM->>Agent: ✅ Task: "Call lead within 5 min"

    Note over CRM: ⏳ Wait 5 minutes

    CRM->>Twilio: 📱 Follow-up SMS (if no response)

    Note over CRM: ⏳ Wait 1 hour

    CRM->>Resend: 📧 Email: Value offer + what I can help with
    CRM->>Lead: Email lands in inbox

    Note over CRM: ⏳ Wait 4 hours

    CRM->>Agent: ✅ Task: "Second call attempt"

    Note over CRM: ⏳ Wait 24 hours

    CRM->>Twilio: 📱 Final outreach SMS
    CRM->>CRM: ⚙️ Change status → "nurturing"
```

---

## 6. Post-Close Buyer Workflow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorBkg': '#e8e0ff', 'actorBorder': '#4f35d2', 'actorTextColor': '#1a1535', 'signalColor': '#4f35d2', 'signalTextColor': '#1a1535', 'noteBkgColor': '#f4f2ff', 'noteBorderColor': '#d8b4fe', 'noteTextColor': '#1a1535', 'activationBkgColor': '#e8e0ff', 'activationBorderColor': '#4f35d2', 'sequenceNumberColor': '#ffffff', 'background': '#ffffff'}}}%%
sequenceDiagram
    participant Buyer as Buyer
    participant CRM as Realtors360 CRM
    participant Agent as Realtor
    participant Resend as Resend
    participant Twilio as Twilio

    Note over Buyer,Twilio: Post-Close Buyer (19 steps, 0 → 1 year)

    CRM->>Resend: 📧 Day 0: Congratulations email
    CRM->>Twilio: 📱 Day 0: Congrats text
    CRM->>Agent: ✅ Task: Send closing gift

    Note over CRM: ⏳ Wait 3 days

    CRM->>Resend: 📧 Move-in checklist + local resources

    Note over CRM: ⏳ Wait 7 days

    CRM->>Twilio: 📱 "How is the new home?"
    CRM->>Agent: ✅ Task: Post-close check-in call

    Note over CRM: ⏳ Wait 23 days

    CRM->>Resend: 📧 30-day home maintenance tips

    Note over CRM: ⏳ Wait 60 days

    CRM->>Resend: 📧 90-day check-in + referral ask
    CRM->>Agent: ✅ Task: Ask for Google review

    Note over CRM: ⏳ Wait 90 days

    CRM->>Resend: 📧 6-month home equity update

    Note over CRM: ⏳ Wait 180 days

    CRM->>Resend: 📧 1-year anniversary + market update
    CRM->>Agent: ✅ Task: Anniversary call
    CRM->>CRM: ⚙️ Change status → "closed"
```

---

## 7. Buyer Nurture Plan Workflow

> **Trigger:** Realtor changes lead status (e.g., new → qualified). **Contact type:** Buyer only. **Duration:** ~30 days.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorBkg': '#e8e0ff', 'actorBorder': '#4f35d2', 'actorTextColor': '#1a1535', 'signalColor': '#4f35d2', 'signalTextColor': '#1a1535', 'noteBkgColor': '#f4f2ff', 'noteBorderColor': '#d8b4fe', 'noteTextColor': '#1a1535', 'activationBkgColor': '#e8e0ff', 'activationBorderColor': '#4f35d2', 'sequenceNumberColor': '#ffffff', 'background': '#ffffff'}}}%%
sequenceDiagram
    participant Buyer as Buyer Lead
    participant CRM as Realtors360 CRM
    participant Agent as Realtor
    participant Resend as Resend
    participant Twilio as Twilio

    Note over Buyer,Twilio: Buyer Nurture Plan (24 steps, 0 → 30 days)

    CRM->>Resend: 📧 Day 0: Welcome — intro + what to expect
    CRM->>Twilio: 📱 Day 0: Confirm preferences received
    CRM->>Agent: ✅ Task: Review buyer preferences

    Note over CRM: ⏳ Wait 1 day

    CRM->>Resend: 📧 Day 1: Buying process overview

    Note over CRM: ⏳ Wait 2 days

    CRM->>Resend: 📧 Day 3: Mortgage pre-approval guide

    Note over CRM: ⏳ Wait 2 days

    CRM->>Resend: 📧 Day 5: Current market snapshot
    CRM->>Agent: ✅ Task: Send 3-5 curated listings

    Note over CRM: ⏳ Wait 2 days

    CRM->>Twilio: 📱 Day 7: Check-in on listings sent (exit on reply)
    CRM->>Agent: ✅ Task: Schedule first showing

    Note over CRM: ⏳ Wait 3 days

    CRM->>Resend: 📧 Day 10: Neighbourhood guides

    Note over CRM: ⏳ Wait 4 days

    CRM->>Agent: ✅ Task: Showing follow-up call

    Note over CRM: ⏳ Wait 4 days

    CRM->>Resend: 📧 Day 18: Making an offer guide

    Note over CRM: ⏳ Wait 3 days

    CRM->>Twilio: 📱 Day 21: Ready to make an offer? (exit on reply)

    Note over CRM: ⏳ Wait 4 days

    CRM->>Resend: 📧 Day 25: Closing checklist
    CRM->>CRM: ⚙️ Change status → "active"
```

---

## 8. Post-Close Seller Workflow

> **Trigger:** Listing status changes to "sold" (seller contact). **Duration:** 0 → 1 year.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorBkg': '#e8e0ff', 'actorBorder': '#4f35d2', 'actorTextColor': '#1a1535', 'signalColor': '#4f35d2', 'signalTextColor': '#1a1535', 'noteBkgColor': '#f4f2ff', 'noteBorderColor': '#d8b4fe', 'noteTextColor': '#1a1535', 'activationBkgColor': '#e8e0ff', 'activationBorderColor': '#4f35d2', 'sequenceNumberColor': '#ffffff', 'background': '#ffffff'}}}%%
sequenceDiagram
    participant Seller as Seller
    participant CRM as Realtors360 CRM
    participant Agent as Realtor
    participant Resend as Resend
    participant Twilio as Twilio

    Note over Seller,Twilio: Post-Close Seller (19 steps, 0 → 1 year)

    CRM->>Resend: 📧 Day 0: Congratulations on sale
    CRM->>Twilio: 📱 Day 0: Thank you text
    CRM->>Agent: ✅ Task: Send thank-you gift

    Note over CRM: ⏳ Wait 3 days

    CRM->>Resend: 📧 What's next + moving resources

    Note over CRM: ⏳ Wait 7 days

    CRM->>Twilio: 📱 "Settling in OK?"
    CRM->>Agent: ✅ Task: Post-sale check-in call

    Note over CRM: ⏳ Wait 23 days

    CRM->>Resend: 📧 30-day follow-up + referral ask
    CRM->>Agent: ✅ Task: Request testimonial / Google review

    Note over CRM: ⏳ Wait 60 days

    CRM->>Resend: 📧 90-day market update

    Note over CRM: ⏳ Wait 90 days

    CRM->>Resend: 📧 6-month neighbourhood update

    Note over CRM: ⏳ Wait 180 days

    CRM->>Resend: 📧 1-year anniversary
    CRM->>Agent: ✅ Task: Anniversary touch-base call
    CRM->>CRM: ⚙️ Change status → "closed"
```

---

## 9. Lead Re-Engagement Workflow

> **Trigger:** Contact inactive for 60+ days (detected by daily inactivity check). **Contact type:** Any. **Duration:** ~28 days.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorBkg': '#e8e0ff', 'actorBorder': '#4f35d2', 'actorTextColor': '#1a1535', 'signalColor': '#4f35d2', 'signalTextColor': '#1a1535', 'noteBkgColor': '#f4f2ff', 'noteBorderColor': '#d8b4fe', 'noteTextColor': '#1a1535', 'activationBkgColor': '#e8e0ff', 'activationBorderColor': '#4f35d2', 'sequenceNumberColor': '#ffffff', 'background': '#ffffff'}}}%%
sequenceDiagram
    participant Contact as Dormant Contact
    participant CRM as Realtors360 CRM
    participant Agent as Realtor
    participant Resend as Resend
    participant Twilio as Twilio

    Note over Contact,Twilio: Lead Re-Engagement (11 steps, 0 → 28 days)

    CRM->>Twilio: 📱 Day 0: "Still looking?" (exit on reply)
    CRM->>Agent: 🔔 Alert: Re-engagement triggered

    Note over CRM: ⏳ Wait 2 days

    CRM->>Resend: 📧 Day 2: Market update + new listings (exit on reply)

    Note over CRM: ⏳ Wait 5 days

    CRM->>Agent: ✅ Task: Personal outreach call

    Note over CRM: ⏳ Wait 7 days

    CRM->>Resend: 📧 Day 14: Exclusive opportunity / value add (exit on reply)

    Note over CRM: ⏳ Wait 14 days

    CRM->>Twilio: 📱 Day 28: Final check-in
    CRM->>CRM: ⚙️ Tag as "cold_lead" if no response
```

---

## 10. Open House / Showing Follow-Up Workflow

> **Trigger:** Showing confirmed (seller replies YES to SMS). **Contact type:** Buyer. **Duration:** ~7 days.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorBkg': '#e8e0ff', 'actorBorder': '#4f35d2', 'actorTextColor': '#1a1535', 'signalColor': '#4f35d2', 'signalTextColor': '#1a1535', 'noteBkgColor': '#f4f2ff', 'noteBorderColor': '#d8b4fe', 'noteTextColor': '#1a1535', 'activationBkgColor': '#e8e0ff', 'activationBorderColor': '#4f35d2', 'sequenceNumberColor': '#ffffff', 'background': '#ffffff'}}}%%
sequenceDiagram
    participant Buyer as Buyer
    participant CRM as Realtors360 CRM
    participant Agent as Realtor
    participant Resend as Resend
    participant Twilio as Twilio

    Note over Buyer,Twilio: Open House Follow-Up (11 steps, 0 → 7 days)

    CRM->>Twilio: 📱 Immediate: Thank you text

    Note over CRM: ⏳ Wait 2 hours

    CRM->>Resend: 📧 Property details + next steps
    CRM->>Agent: ✅ Task: Follow-up call next day

    Note over CRM: ⏳ Wait 1 day

    CRM->>Twilio: 📱 "Thoughts on the property?" (exit on reply)

    Note over CRM: ⏳ Wait 2 days

    CRM->>Resend: 📧 Similar properties you might like

    Note over CRM: ⏳ Wait 4 days

    CRM->>Twilio: 📱 "Ready for another showing?"
    CRM->>CRM: ⚙️ Change status → "nurturing" if no reply
```

---

## 11. Referral Partner Workflow

> **Trigger:** Realtor adds "referral_partner" tag to contact. **Contact type:** Any. **Duration:** ~6 months.

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorBkg': '#e8e0ff', 'actorBorder': '#4f35d2', 'actorTextColor': '#1a1535', 'signalColor': '#4f35d2', 'signalTextColor': '#1a1535', 'noteBkgColor': '#f4f2ff', 'noteBorderColor': '#d8b4fe', 'noteTextColor': '#1a1535', 'activationBkgColor': '#e8e0ff', 'activationBorderColor': '#4f35d2', 'sequenceNumberColor': '#ffffff', 'background': '#ffffff'}}}%%
sequenceDiagram
    participant Partner as Referral Partner
    participant CRM as Realtors360 CRM
    participant Agent as Realtor
    participant Resend as Resend
    participant Twilio as Twilio

    Note over Partner,Twilio: Referral Partner (12 steps, 0 → 6 months)

    CRM->>Resend: 📧 Day 0: Welcome — thank you for partnership
    CRM->>Twilio: 📱 Day 0: Intro + what to expect
    CRM->>Agent: ✅ Task: Add to referral partner list

    Note over CRM: ⏳ Wait 7 days

    CRM->>Resend: 📧 Week 1: Market update for partners

    Note over CRM: ⏳ Wait 30 days

    CRM->>Agent: ✅ Task: Coffee / lunch check-in

    Note over CRM: ⏳ Wait 30 days

    CRM->>Resend: 📧 Month 2: Quarterly newsletter

    Note over CRM: ⏳ Wait 60 days

    CRM->>Agent: ✅ Task: Send appreciation gift
    CRM->>Resend: 📧 Month 6: Annual recap + thank you
```

---

## 12. Greeting Agent Decision Flow (AI-Powered)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8e0ff', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#1a1535', 'lineColor': '#4f35d2', 'secondaryColor': '#f4f2ff', 'tertiaryColor': '#fff', 'background': '#ffffff', 'mainBkg': '#f4f2ff', 'nodeBorder': '#4f35d2', 'clusterBkg': '#faf8ff', 'clusterBorder': '#d8b4fe', 'edgeLabelBackground': '#ffffff'}}}%%
flowchart TD
    CRON["⏰ Agent-evaluate cron\n(every 10 min)"] --> LOAD["Load greeting rules\nfrom realtor_agent_config"]

    LOAD --> CHECK{Any enabled\ngreeting rules?}
    CHECK -->|No| DONE[Done — no greetings today]

    CHECK -->|Yes| LOOP["For each enabled rule"]

    LOOP --> TYPE{Occasion type?}

    TYPE -->|Birthday| BD["Query contact_dates\nwhere label=birthday\nand month/day = today"]
    TYPE -->|Anniversary| AN["Query contact_dates\nwhere label=anniversary\nand month/day = today"]
    TYPE -->|Holiday| CAL["Check calendar:\nChristmas=Dec 24/25\nNew Year=Dec 31/Jan 1\nDiwali=lookup table\nThanksgiving=2nd Mon Oct\netc."]

    BD --> CONTACTS["Found contacts"]
    AN --> CONTACTS
    CAL -->|Today matches| RECIPIENTS["Get contacts by\nrecipient filter:\nall / buyers / sellers\n/ past clients / active"]
    CAL -->|Not today| SKIP[Skip this rule]

    CONTACTS --> DEDUP{"Already sent\nthis year?"}
    RECIPIENTS --> DEDUP

    DEDUP -->|Yes| SKIP2[Skip — yearly dedup]
    DEDUP -->|No| CLAUDE["Claude AI writes\npersonalized greeting\n(batch up to 10)"]

    CLAUDE --> DECIDE{Claude decides}

    DECIDE -->|Send| QUEUE["Queue newsletter\nApple-quality HTML\nvia email-blocks"]
    DECIDE -->|Skip| LOG["Log skip\nwith reasoning"]

    QUEUE --> MODE{Approval mode?}

    MODE -->|Auto| SEND["sendNewsletter()\n→ Resend API\n→ BCC to realtor"]
    MODE -->|Review| DRAFT["Save as draft\n→ Appears in\nPerformance tab queue"]

    SEND --> DONE2[Greeting delivered ✓]
    DRAFT --> DONE2
```

---

## 13. Listing Blast Automation Flow

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8e0ff', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#1a1535', 'lineColor': '#4f35d2', 'secondaryColor': '#f4f2ff', 'tertiaryColor': '#fff', 'background': '#ffffff', 'mainBkg': '#f4f2ff', 'nodeBorder': '#4f35d2', 'clusterBkg': '#faf8ff', 'clusterBorder': '#d8b4fe', 'edgeLabelBackground': '#ffffff'}}}%%
flowchart TD
    TRIGGER["Listing event:\n🟢 Goes Active\n📝 Created\n💰 Price Change"] --> RULES["Load automation rules\nfrom realtor_agent_config"]

    RULES --> MATCH{Rule matches\ntrigger?}

    MATCH -->|No| NOTHING[No blast sent]
    MATCH -->|Yes| TEMPLATE{Template choice?}

    TEMPLATE -->|"✨ AI Chooses"| AI_PICK["AI selects template:\nLuxury if >$1.5M\nAlert for standard\nOpen House if scheduled"]
    TEMPLATE -->|"🏠 Listing Alert"| ALERT[New Listing Alert template]
    TEMPLATE -->|"💎 Luxury"| LUXURY[Luxury Showcase template]
    TEMPLATE -->|"🏡 Open House"| OH[Open House Invite template]

    AI_PICK --> BUILD
    ALERT --> BUILD
    LUXURY --> BUILD
    OH --> BUILD

    BUILD["assembleEmail()\nApple-quality HTML\nwith listing data"] --> RECIPIENTS{Recipients?}

    RECIPIENTS -->|All agents| AGENTS["All agent/partner\ncontacts with email"]
    RECIPIENTS -->|Area agents| AREA["Agents active\nin listing's area"]
    RECIPIENTS -->|All buyers| BUYERS["All buyer contacts"]

    AGENTS --> SEND
    AREA --> SEND
    BUYERS --> SEND

    SEND["sendBatchEmails()\nvia Resend\n10 per batch\n500ms delay"] --> LOG["Log to newsletters\n+ activity_log"]

    LOG --> DONE["Blast complete ✓\nRealtor gets BCC\nwith metadata"]
```

---

## 14. Email Content Templates — What They Look Like

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8e0ff', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#1a1535', 'lineColor': '#4f35d2', 'secondaryColor': '#f4f2ff', 'tertiaryColor': '#fff', 'background': '#ffffff', 'mainBkg': '#f4f2ff', 'nodeBorder': '#4f35d2', 'clusterBkg': '#faf8ff', 'clusterBorder': '#d8b4fe', 'edgeLabelBackground': '#ffffff'}}}%%
graph TD
    subgraph LISTING_ALERT["🏠 New Listing Alert"]
        LA1["Header: Realtors360 branding"]
        LA2["Hero: Full-width property photo\nwith dark overlay + address"]
        LA3["Price Bar: $1,290,000\n3 BD · 2 BA · 1,847 sqft"]
        LA4["Personal Note: AI-written\n'This ground floor unit just hit...'"]
        LA5["Features: 3 icon cards\nGround Floor · Kits Elementary · Premium Finishes"]
        LA6["Photo Gallery: 2x2 grid"]
        LA7["CTA: 'Schedule a Viewing' pill button"]
        LA8["Agent Card: photo + name + phone"]
        LA9["Footer: unsubscribe + address"]
        LA1 --> LA2 --> LA3 --> LA4 --> LA5 --> LA6 --> LA7 --> LA8 --> LA9
    end

    subgraph LUXURY["💎 Luxury Showcase"]
        LX1["Dark background (#0a0a0a)"]
        LX2["Gold accent (#c4a35a)"]
        LX3["Playfair Display serif font"]
        LX4["Full-bleed hero photo"]
        LX5["Gold price + specs"]
        LX6["Editorial description"]
        LX7["Gold-bordered CTA\n'Request Private Viewing'"]
        LX1 --> LX2 --> LX3 --> LX4 --> LX5 --> LX6 --> LX7
    end

    subgraph GREETING["🎂 Birthday Greeting"]
        GR1["Gradient header with emoji 🎂"]
        GR2["AI-written personal message:\n'Happy Birthday! I've been thinking\nabout your neighbourhood...'"]
        GR3["Agent signature card"]
        GR4["Minimal footer — no sales pitch"]
        GR1 --> GR2 --> GR3 --> GR4
    end

    subgraph MARKET["📊 Market Update"]
        MK1["Gradient hero header"]
        MK2["Stats Row:\nAvg Price · DOM · Inventory · Sales Ratio"]
        MK3["AI personal note:\n'The spring market is heating up...'"]
        MK4["Recent Sales table"]
        MK5["CTA: 'View Full Report'"]
        MK1 --> MK2 --> MK3 --> MK4 --> MK5
    end
```

---

## 15. Complete System — All 46 Workflow Emails

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8e0ff', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#1a1535', 'lineColor': '#4f35d2', 'secondaryColor': '#f4f2ff', 'tertiaryColor': '#fff', 'background': '#ffffff', 'mainBkg': '#f4f2ff', 'nodeBorder': '#4f35d2', 'clusterBkg': '#faf8ff', 'clusterBorder': '#d8b4fe', 'edgeLabelBackground': '#ffffff'}}}%%
graph TD
    subgraph WF1["⚡ Speed-to-Contact (12 steps)"]
        W1_1["📱 Instant SMS: Acknowledge"]
        W1_2["🔔 Alert: New lead"]
        W1_3["✅ Task: Call within 5 min"]
        W1_4["⏳ Wait 5 min"]
        W1_5["📱 Follow-up SMS"]
        W1_6["⏳ Wait 1 hour"]
        W1_7["📧 Email: Value offer"]
        W1_8["⏳ Wait 4 hours"]
        W1_9["✅ Task: Second call"]
        W1_10["⏳ Wait 24 hours"]
        W1_11["📱 Final SMS"]
        W1_12["⚙️ Status → nurturing"]
    end

    subgraph WF2["🏠 Buyer Nurture (24 steps)"]
        W2_1["📧 Welcome email"]
        W2_2["📱 Welcome SMS"]
        W2_3["✅ Review preferences"]
        W2_4["⏳ 1 day"]
        W2_5["📧 Buying process"]
        W2_6["⏳ 2 days"]
        W2_7["📧 Mortgage guide"]
        W2_8["⏳ 2 days"]
        W2_9["📧 Market snapshot"]
        W2_10["✅ Send listings"]
        W2_11["⏳ 2 days"]
        W2_12["📱 Check-in SMS"]
        W2_MORE["... +12 more steps"]
    end

    subgraph WF3["🎉 Post-Close Buyer (19 steps)"]
        W3_1["📧 Congrats email"]
        W3_2["📱 Congrats SMS"]
        W3_3["✅ Send gift"]
        W3_MORE["... 3d → move-in\n7d → check-in\n30d → maintenance\n90d → referral\n6mo → equity\n1yr → anniversary"]
    end

    subgraph WF4["🤝 Post-Close Seller (19 steps)"]
        W4_1["📧 Congrats on sale"]
        W4_2["📱 Thank you SMS"]
        W4_MORE["... 3d → what's next\n7d → check-in\n30d → referral\n90d → market\n6mo → neighbourhood\n1yr → anniversary"]
    end

    subgraph WF5["🔁 Re-Engagement (11 steps)"]
        W5_1["📱 Still looking? SMS"]
        W5_2["🔔 Alert: re-engagement"]
        W5_MORE["... 2d → market email\n5d → call task\n7d → exclusive email\n14d → final SMS\n→ tag as cold"]
    end

    subgraph WF6["🏡 Open House Follow-Up (11 steps)"]
        W6_1["📱 Thank you SMS"]
        W6_MORE["... 2h → property email\n1d → thoughts SMS\n2d → similar email\n4d → another showing SMS\n→ status nurturing"]
    end

    subgraph WF7["🤝 Referral Partner (12 steps)"]
        W7_1["📧 Partnership welcome"]
        W7_2["📱 Intro SMS"]
        W7_MORE["... 7d → market email\n30d → coffee task\n60d → quarterly email\n90d → gift task\n→ annual recap"]
    end
```

---

## 16. Engagement Tracking & Feedback Loop

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'actorBkg': '#e8e0ff', 'actorBorder': '#4f35d2', 'actorTextColor': '#1a1535', 'signalColor': '#4f35d2', 'signalTextColor': '#1a1535', 'noteBkgColor': '#f4f2ff', 'noteBorderColor': '#d8b4fe', 'noteTextColor': '#1a1535', 'activationBkgColor': '#e8e0ff', 'activationBorderColor': '#4f35d2', 'sequenceNumberColor': '#ffffff', 'background': '#ffffff'}}}%%
sequenceDiagram
    participant Email as Email in Inbox
    participant Resend as Resend
    participant Webhook as /api/webhooks/resend
    participant DB as Supabase
    participant Agent as AI Agent

    Email->>Resend: Contact opens email
    Resend->>Webhook: POST email.opened
    Webhook->>DB: Insert newsletter_events
    Webhook->>DB: Update contact intelligence<br/>total_opens++, engagement_score recalc

    Email->>Resend: Contact clicks "Book Showing"
    Resend->>Webhook: POST email.clicked {link}
    Webhook->>Webhook: Classify click → "book_showing" (30pts)
    Webhook->>DB: Insert event + update click_history
    Webhook->>DB: Update engagement_score += 30
    Webhook->>DB: Insert agent_notification (HOT LEAD)
    Webhook->>Agent: Emit "high_intent_click" event

    Note over Agent: Next evaluation cycle

    Agent->>Agent: Score contact (buying_readiness UP)
    Agent->>Agent: Generate recommendation:<br/>"Call Sarah — she clicked Book Showing"
    Agent->>DB: Save to agent_recommendations
    Agent->>DB: Recommendation shows in<br/>Performance tab
```

---

## 17. Send Decision Pipeline

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryColor': '#e8e0ff', 'primaryBorderColor': '#4f35d2', 'primaryTextColor': '#1a1535', 'lineColor': '#4f35d2', 'secondaryColor': '#f4f2ff', 'tertiaryColor': '#fff', 'background': '#ffffff', 'mainBkg': '#f4f2ff', 'nodeBorder': '#4f35d2', 'clusterBkg': '#faf8ff', 'clusterBorder': '#d8b4fe', 'edgeLabelBackground': '#ffffff'}}}%%
flowchart TD
    START["Email ready to send"] --> TEXT["Text Pipeline\nsrc/lib/text-pipeline.ts"]

    TEXT --> |"8 token replacements\nvoice rules enforced\ncompliance regex check\nsubject dedup 14 days\nword count check"| DESIGN["Design Validator\nsrc/lib/validators/design-validator.ts"]

    DESIGN --> |"Unsubscribe link present?\nImage dimensions OK?\nDark mode support?\nSize < 100KB?"| COMPLIANCE["Compliance Gate\nsrc/lib/validators/compliance-gate.ts"]

    COMPLIANCE --> |"CASL consent valid?\nFrequency cap OK?\nMin gap hours met?\nQuiet hours check?\nBounce list check?"| QUALITY{"Quality Score\nClaude Haiku"}

    QUALITY --> |"Score ≥ 6/10"| TRUST{"Trust Gate"}
    QUALITY --> |"Score 4-6"| REGEN["Regenerate\nMark as draft\nfor review"]
    QUALITY --> |"Score < 4"| BLOCK["Block\nMark as failed"]

    TRUST --> |"Trust Level 0-1\n(ghost/supervised)"| QUEUE["Queue for Review\nShows in Performance tab"]
    TRUST --> |"Trust Level 2+\n(autonomous)"| SEND["Auto-Send\nvia Resend"]

    SEND --> RESEND["Resend API\n+ BCC monitor\n+ metadata banner"]

    QUEUE --> APPROVE{Realtor action}
    APPROVE --> |"Approve"| SEND
    APPROVE --> |"Skip"| SKIPPED["Status: skipped"]
    APPROVE --> |"Edit"| EDIT["Edit subject/body\n→ Voice learner extracts rules\n→ Re-queue"]

    style BLOCK fill:#fee2e2
    style REGEN fill:#fef3c7
    style SEND fill:#dcfce7
    style QUEUE fill:#dbeafe
```

---

## Summary: Every Email a Contact Can Receive

| # | Email | Trigger | System | Template Style |
|---|-------|---------|--------|---------------|
| 1 | Welcome | Contact created | Journey Engine | Gradient hero + personal note |
| 2 | Neighbourhood Guide | 3 days after join | Journey Engine | Gradient + area highlights |
| 3 | New Listing Alert | Weekly / listing match | Journey + Blast | Hero photo + price bar + gallery |
| 4 | Market Update | Monthly | Journey Engine | Stats row + recent sales |
| 5 | Buying Process Guide | Day 5 | Buyer Nurture | Gradient + personal note |
| 6 | Mortgage Guide | Day 7 | Buyer Nurture | Gradient + personal note |
| 7 | Making an Offer | Day 18 | Buyer Nurture | Gradient + personal note |
| 8 | Closing Checklist | Day 25 | Buyer Nurture | Gradient + personal note |
| 9 | Congratulations | Deal closed | Post-Close | Gradient + celebration |
| 10 | Move-In Checklist | Day 3 post-close | Post-Close Buyer | Gradient + resource list |
| 11 | Maintenance Tips | Day 30 | Post-Close Buyer | Gradient + checklist |
| 12 | Referral Ask | Day 90 | Post-Close | Gradient + personal note |
| 13 | Equity Update | 6 months | Post-Close Buyer | Gradient + comparison |
| 14 | Anniversary | 1 year | Post-Close | Gradient + celebration |
| 15 | Re-Engagement | 60 days inactive | Re-Engagement | Gradient + market stats |
| 16 | Property Details | After showing | Open House Follow-Up | Hero photo + price bar |
| 17 | Similar Properties | 2 days post-showing | Open House Follow-Up | Gradient + property grid |
| 18 | Luxury Showcase | Listing blast ($1.5M+) | Listing Blast | Dark bg + gold accents |
| 19 | Open House Invite | Listing blast | Listing Blast | Gradient event header |
| 20 | Partner Welcome | Tag added | Referral Partner | Gradient + personal note |
| 21 | Partner Market Update | 7 days | Referral Partner | Gradient + stats |
| 22 | Partner Quarterly | 60 days | Referral Partner | Gradient + recap |
| 23 | Partner Annual | 1 year | Referral Partner | Gradient + celebration |
| 24 | 🎂 Birthday | Birthday date | AI Greeting Agent | Gradient header + emoji |
| 25 | 🏠 Home Anniversary | Closing date | AI Greeting Agent | Anniversary + value |
| 26 | 🎄 Christmas | Dec 24/25 | AI Greeting Agent | Holiday gradient |
| 27 | 🎆 New Year | Dec 31/Jan 1 | AI Greeting Agent | Holiday gradient |
| 28 | 🪔 Diwali | Oct/Nov (varies) | AI Greeting Agent | Holiday gradient |
| 29 | 🧧 Lunar New Year | Jan/Feb (varies) | AI Greeting Agent | Holiday gradient |
| 30 | 🍁 Canada Day | Jul 1 | AI Greeting Agent | Holiday gradient |
| 31 | 🦃 Thanksgiving | 2nd Mon Oct | AI Greeting Agent | Holiday gradient |
| 32 | 💝 Valentine's | Feb 14 | AI Greeting Agent | Holiday gradient |
| 33 | 💐 Mother's Day | 2nd Sun May | AI Greeting Agent | Holiday gradient |
| 34 | 👔 Father's Day | 3rd Sun Jun | AI Greeting Agent | Holiday gradient |
