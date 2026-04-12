const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  TableOfContents, HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, TabStopType, TabStopPosition,
} = require("docx");

// ─── Helpers ───────────────────────────────────────────────────────
const INDIGO = "4F35D2";
const LIGHT_BG = "F0EDFA";
const ALT_BG = "F8F7FC";
const WHITE = "FFFFFF";
const CONTENT_W = 9360; // US Letter - 1" margins

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: { fill: INDIGO, type: ShadingType.CLEAR },
    margins: cellMargins,
    verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Calibri", size: 20 })] })],
  });
}

function cell(text, width, shade) {
  return new TableCell({
    borders,
    width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: "Calibri", size: 20 })] })],
  });
}

function makeTable(headers, rows, colWidths) {
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: colWidths,
    rows: [
      new TableRow({ children: headers.map((h, i) => headerCell(h, colWidths[i])) }),
      ...rows.map((row, ri) =>
        new TableRow({
          children: row.map((c, ci) => cell(c, colWidths[ci], ri % 2 === 1 ? ALT_BG : undefined)),
        })
      ),
    ],
  });
}

function h1(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_1, spacing: { before: 360, after: 200 }, children: [new TextRun({ text, bold: true, font: "Calibri", size: 32 })] });
}
function h2(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 280, after: 160 }, children: [new TextRun({ text, bold: true, font: "Calibri", size: 26 })] });
}
function h3(text) {
  return new Paragraph({ heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 120 }, children: [new TextRun({ text, bold: true, font: "Calibri", size: 22 })] });
}
function p(text) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, font: "Calibri", size: 20 })] });
}
function pb() { return new Paragraph({ children: [new PageBreak()] }); }

function bulletList(items, ref) {
  return items.map(t => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t, font: "Calibri", size: 20 })] }));
}

function numberedList(items, ref) {
  return items.map(t => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t, font: "Calibri", size: 20 })] }));
}

function subBulletList(items, ref) {
  return items.map(t => new Paragraph({ numbering: { reference: ref, level: 1 }, spacing: { after: 40 }, children: [new TextRun({ text: t, font: "Calibri", size: 20 })] }));
}

// ─── Build Document ────────────────────────────────────────────────
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Calibri", size: 20 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Calibri", color: INDIGO },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Calibri", color: "333333" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, font: "Calibri", color: "555555" },
        paragraph: { spacing: { before: 200, after: 120 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ]},
      { reference: "numbers1", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.LOWER_LETTER, text: "%2.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ]},
      { reference: "numbers2", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers3", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers4", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers5", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers6", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "bullets2", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 1440, hanging: 360 } } } },
      ]},
      { reference: "bullets3", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
      { reference: "bullets4", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
      { reference: "bullets5", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
      { reference: "bullets6", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
      { reference: "bullets7", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
      ]},
      { reference: "appendixNums", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    // ─── TITLE PAGE ───
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        new Paragraph({ spacing: { before: 3600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          children: [new TextRun({ text: "ListingFlow", font: "Calibri", size: 56, bold: true, color: INDIGO })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
          children: [new TextRun({ text: "Realtor Listing Workflow Design Document", font: "Calibri", size: 36, color: "555555" })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: INDIGO, space: 12 } },
          children: [new TextRun({ text: "End-to-End Property Listing Lifecycle for BC Real Estate Agents", font: "Calibri", size: 24, italics: true, color: "777777" })],
        }),
        new Paragraph({ spacing: { before: 1200 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Version 1.0 \u2014 March 2026", font: "Calibri", size: 22, color: "888888" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Prepared by: ListingFlow Product Team", font: "Calibri", size: 22, color: "888888" })] }),
        new Paragraph({ spacing: { before: 800 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "CONFIDENTIAL", font: "Calibri", size: 20, bold: true, color: "CC0000" })] }),
      ],
    },
    // ─── TOC + ALL CONTENT ───
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            children: [
              new TextRun({ text: "ListingFlow \u2014 Realtor Listing Workflow", font: "Calibri", size: 16, color: "999999" }),
              new TextRun({ text: "\tCONFIDENTIAL", font: "Calibri", size: 16, color: "CC0000", bold: true }),
            ],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: "Page ", font: "Calibri", size: 16, color: "999999" }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: "999999" }),
            ],
          })],
        }),
      },
      children: [
        // TABLE OF CONTENTS
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "Table of Contents", bold: true, font: "Calibri", size: 32 })] }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-3" }),
        pb(),

        // ─── EXECUTIVE SUMMARY ───
        h1("Executive Summary"),
        p("This design document defines the complete end-to-end workflow that a licensed real estate agent in British Columbia follows when listing and selling a residential property. It covers every phase from initial seller contact through post-closing, identifying the actions, forms, compliance requirements, data dependencies, and system touchpoints at each stage."),
        p("This document serves as the product blueprint for the ListingFlow CRM platform, ensuring our software mirrors the real-world workflow of BC realtors with full regulatory compliance."),
        pb(),

        // ─── SECTION 1: PURPOSE & SCOPE ───
        h1("1. Document Purpose & Scope"),
        h2("1.1 Purpose"),
        p("This document defines the canonical listing workflow that ListingFlow automates. Every feature, screen, form, and notification in the platform maps back to a phase defined here."),
        h2("1.2 Scope"),
        ...bulletList([
          "Residential property listings in British Columbia, Canada",
          "Single-family detached, townhouses, condos/apartments, duplexes, and bare land",
          "Covers REBGV, FVREB, and CADREB board jurisdictions",
          "Strata and freehold properties",
          "Regulatory compliance: BCFSA, BCREA, FINTRAC, PIPA, CASL",
        ], "bullets"),
        h2("1.3 Audience"),
        p("Product managers, developers, designers, QA engineers, and real estate advisors working on ListingFlow."),
        h2("1.4 Regulatory Bodies Referenced"),
        makeTable(
          ["Body", "Full Name", "Role"],
          [
            ["BCFSA", "BC Financial Services Authority", "Regulates real estate professionals under RESA"],
            ["BCREA", "BC Real Estate Association", "Provides standard forms, education, advocacy"],
            ["CREA", "Canadian Real Estate Association", "National association; operates Realtor.ca, WEBForms"],
            ["FINTRAC", "Financial Transactions and Reports Analysis Centre", "Federal AML/ATF regulator"],
            ["LTSA", "Land Title and Survey Authority", "Land title registration and searches"],
            ["BC Assessment", "BC Assessment Authority", "Property assessments for taxation"],
            ["REBGV", "Real Estate Board of Greater Vancouver", "Operates Paragon MLS for Greater Vancouver"],
          ],
          [1200, 3600, 4560]
        ),
        pb(),

        // ─── SECTION 2: WORKFLOW OVERVIEW ───
        h1("2. Workflow Overview"),
        h2("2.1 The 12-Phase Listing Lifecycle"),
        makeTable(
          ["Phase", "Name", "Key Activities", "Primary Output"],
          [
            ["1", "Pre-Listing & Prospecting", "Lead gen, CMA, listing presentation", "Signed listing agreement"],
            ["2", "Listing Agreement & Intake", "DORTS, MLC, FINTRAC ID, PDS, Privacy", "Executed contracts & compliance records"],
            ["3", "Data Enrichment", "Title search, BC Assessment, geocoding, ParcelMap", "Verified property data"],
            ["4", "CMA & Pricing Strategy", "Comparable analysis, pricing recommendation", "Confirmed list price"],
            ["5", "Form Preparation", "Generate BCREA forms, pre-fill data", "Complete form package"],
            ["6", "E-Signature", "DocuSign routing for seller & agent packages", "Signed documents"],
            ["7", "MLS Preparation", "Photos, remarks, virtual tours, data entry", "MLS-ready listing"],
            ["8", "MLS Submission", "Submit to Paragon, board activation", "Active MLS listing"],
            ["9", "Marketing & Showings", "Campaigns, open houses, showing management", "Buyer interest & offers"],
            ["10", "Offer Management & Negotiation", "Present offers, DMOP, counter-offers", "Accepted offer"],
            ["11", "Contract-to-Close", "Subject removal, conveyancing, completion", "Firm sale & title transfer"],
            ["12", "Post-Closing", "Commission disbursement, file archival, follow-up", "Closed file & client retention"],
          ],
          [700, 2200, 3500, 2960]
        ),
        h2("2.2 Workflow Flow"),
        p("The listing lifecycle progresses sequentially from Phase 1 through Phase 12. Key structural notes:"),
        ...bulletList([
          "Phases 1-8 are strictly sequential (each must complete before the next begins)",
          "Phases 9-10 run in parallel (marketing continues while offers come in)",
          "Phase 11 has sub-stages: rescission period, subject period, conveyancing, completion day, possession day",
          "Phase 12 begins on completion day and extends for ongoing client relationship management",
        ], "bullets2"),
        pb(),

        // ─── SECTION 3: PHASE 1 ───
        h1("3. Phase 1 \u2014 Pre-Listing & Prospecting"),
        h2("3.1 Overview"),
        p("The agent identifies a potential seller, conducts pre-listing research, prepares a Comparative Market Analysis (CMA), and delivers a listing presentation to win the listing."),
        h2("3.2 Activities"),
        ...numberedList([
          "Lead Generation \u2014 SOI referrals (65% of sellers), geographic farming, online leads, open houses, referral partners",
          "Initial Contact & Qualification \u2014 Discovery call: motivation, timeline, property type, mortgage status, ownership confirmation",
          "Pre-Listing Research \u2014 BC Assessment lookup, preliminary LTSA title search, prior MLS history review, neighbourhood research",
          "Comparative Market Analysis (CMA) \u2014 3-5 comparable recent sales, price per square foot benchmarks, active and expired listings comparison",
          "Pre-Listing Package \u2014 Agent bio, testimonials, marketing plan overview, CMA summary, FAQ",
          "Listing Presentation \u2014 Present CMA, marketing plan, seller net sheet, commission structure, staging recommendations, agency options",
        ], "numbers1"),
        h2("3.3 Data Collected"),
        ...bulletList([
          "Seller name, phone, email",
          "Property address",
          "Preliminary property details (type, beds, baths, approximate sqft)",
          "Seller motivation and timeline",
          "Existing mortgage information",
        ], "bullets3"),
        h2("3.4 System Touchpoints (ListingFlow)"),
        ...bulletList([
          "CRM contact creation",
          "Lead status tracking (hot/warm/cold)",
          "CMA report generation",
          "Seller net sheet calculator",
        ], "bullets4"),
        pb(),

        // ─── SECTION 4: PHASE 2 ───
        h1("4. Phase 2 \u2014 Listing Agreement & Intake"),
        h2("4.1 Overview"),
        p("The agent formalizes the client relationship, collects required identity and compliance information, and executes the listing contract."),
        h2("4.2 Required Forms (in sequence)"),
        makeTable(
          ["#", "Form", "Full Name", "Timing", "Regulatory Basis"],
          [
            ["1", "DORTS", "Disclosure of Representation in Trading Services", "FIRST \u2014 before any trading services", "RESA Rules s.54"],
            ["2", "PNC", "Privacy Notice and Consent", "Before collecting personal information", "PIPA"],
            ["3", "FINTRAC ID", "Individual Identification Information Record", "At time of entering agency relationship", "PCMLTFA"],
            ["4", "MLC", "Multiple Listing Contract", "At listing appointment after seller agrees", "BCREA Standard Form"],
            ["5", "PDS", "Property Disclosure Statement", "At or before listing", "BCREA (recommended)"],
            ["6", "PNDS", "Property No-Disclosure Statement", "At listing, if PDS not provided", "BCREA"],
          ],
          [400, 1000, 3000, 2700, 2260]
        ),
        h2("4.3 FINTRAC Identity Verification"),
        p("Three primary methods for identity verification:"),
        h3("Method 1 \u2014 Government-Issued Photo ID (most common)"),
        p("Must be authentic, valid, current. Contains name, photo, unique ID number. Acceptable: BC driver\u2019s licence, Canadian passport, permanent resident card, ICBC ID card."),
        h3("Method 2 \u2014 Canadian Credit File"),
        p("Compare name, DOB, address against credit file in existence for 3+ years."),
        h3("Method 3 \u2014 Dual-Process"),
        p("Two independent reliable sources verifying name + address OR name + DOB."),
        p("Record retention: 5 years minimum. As of October 2025, agents must also verify unrepresented parties."),
        h2("4.4 Seller Intake Data Collected"),
        makeTable(
          ["Category", "Fields"],
          [
            ["Seller Identity", "Full legal name, DOB, citizenship, ID type/number/expiry, phone, email, mailing address, occupation"],
            ["Property Details", "Address, unit number, property type (detached/townhouse/condo/duplex/land), PID, legal description"],
            ["Listing Terms", "List price, list duration (start/end dates), commission rate (seller/buyer split), marketing tier"],
            ["Property Features", "Possession date, inclusions, exclusions, rental equipment, showing instructions"],
            ["Multiple Sellers", "Each seller requires separate FINTRAC ID verification and identity record"],
          ],
          [2000, 7360]
        ),
        h2("4.5 Property Disclosure Statement Sections"),
        ...bulletList([
          "Section 1: LAND \u2014 Environmental issues, flooding, boundary disputes, grow-op history, heritage designation",
          "Section 2: SERVICES \u2014 Water supply, sewage, electrical, gas, heating fuel",
          "Section 3: BUILDING \u2014 Roof age/condition, foundation, plumbing type, electrical, HVAC, insulation",
          "Section 4: GENERAL \u2014 Renovations (with/without permits), insurance claims, pest issues, age",
          "Section 5: LATENT DEFECTS \u2014 Written disclosure of known material latent defects",
        ], "bullets5"),
        h2("4.6 Strata-Specific Requirements"),
        p("If the property is strata, additional documents are required:"),
        ...bulletList([
          "Form B Information Certificate (strata must produce within 7 days, ~$35)",
          "Current strata bylaws",
          "Budget and financial statements",
          "Depreciation report (required for stratas with 5+ units, updated every 5 years)",
          "Recent AGM/SGM minutes",
          "Insurance certificate",
          "Strata-specific PDS version",
        ], "bullets6"),
        pb(),

        // ─── SECTION 5: PHASE 3 ───
        h1("5. Phase 3 \u2014 Data Enrichment"),
        h2("5.1 Overview"),
        p("The system enriches the listing with authoritative property data from government and institutional sources to ensure accuracy and support form generation."),
        h2("5.2 Data Sources"),
        makeTable(
          ["Source", "Data Retrieved", "Access Method", "Cost"],
          [
            ["BC Geocoder", "Lat/lng, full address, locality, confidence score", "Free REST API (geocoder.api.gov.bc.ca)", "Free"],
            ["ParcelMap BC", "PID, plan number, parcel name, municipality, area", "Free WFS API (openmaps.gov.bc.ca)", "Free"],
            ["LTSA (myLTSA)", "Owner name on title, title number, charges, encumbrances", "Manual lookup via myLTSA.ca or BC OnLine", "~$10/search"],
            ["BC Assessment", "Assessed value, year built, lot size, building area, zoning", "Manual lookup via bcassessment.ca", "Free (basic)"],
            ["Strata Docs", "Form B, bylaws, depreciation report, minutes", "Request from strata corporation", "~$35 + fees"],
          ],
          [1600, 3400, 2800, 1560]
        ),
        h2("5.3 Enrichment Workflow"),
        ...numberedList([
          "GEOCODE \u2014 Agent enters address \u2192 system calls BC Geocoder \u2192 returns coordinates, verified address, locality",
          "PARCEL LOOKUP \u2014 Using coordinates \u2192 system queries ParcelMap BC WFS \u2192 returns PID, legal plan, municipality",
          "LTSA TITLE SEARCH \u2014 Agent looks up PID on myLTSA \u2192 manually enters owner name, title number into system",
          "BC ASSESSMENT \u2014 Agent looks up property on bcassessment.ca \u2192 manually enters assessed values, property characteristics",
          "VALIDATION \u2014 System cross-references LTSA owner name against seller identity using fuzzy matching (Jaro-Winkler algorithm, threshold 0.85)",
        ], "numbers2"),
        h2("5.4 Data Model"),
        p("Enrichment data is stored as structured JSON per listing:"),
        ...bulletList([
          "geo: {fullAddress, lat, lng, locality, score}",
          "parcel: {pid, planNumber, parcelName, municipality, areaSqm}",
          "ltsa: {ownerName, titleNumber, charges}",
          "assessment: {totalValue, landValue, improvementValue, yearBuilt, lotSizeSqft, buildingAreaSqft, bedrooms, bathrooms, zoning, neighbourhood, rollNumber}",
          "enrich_status: tracks status per source (pending/running/done/fail/manual)",
        ], "bullets7"),
        pb(),

        // ─── SECTION 6: PHASE 4 ───
        h1("6. Phase 4 \u2014 CMA & Pricing Strategy"),
        h2("6.1 Overview"),
        p("The agent finalizes the pricing strategy using comparable market data and confirms the list price with the seller."),
        h2("6.2 CMA Components"),
        ...bulletList([
          "3-5 comparable recently sold properties (within 6 months, similar area)",
          "Active listings (current competition)",
          "Expired listings (what didn\u2019t sell and why)",
          "Price per square foot analysis",
          "Adjustments for: lot size, age, condition, upgrades, location, views",
        ], "bullets"),
        h2("6.3 Pricing Decision"),
        ...bulletList([
          "CMA produces a low-high price range and a suggested/recommended price",
          "Agent discusses range with seller, considering: market conditions, seller timeline, marketing strategy",
          "Seller and agent agree on the list price",
          "Price lock: once confirmed, the list price is locked and requires explicit approval to change",
          "Marketing tier selection: Standard / Enhanced / Premium (determines marketing investment level)",
          "Warning if selected price falls outside CMA range",
        ], "bullets2"),
        h2("6.4 Data Fields"),
        makeTable(
          ["Field", "Type", "Description"],
          [
            ["cma_low", "NUMERIC(12,2)", "Low end of CMA price range"],
            ["cma_high", "NUMERIC(12,2)", "High end of CMA price range"],
            ["suggested_price", "NUMERIC(12,2)", "Agent\u2019s recommended list price"],
            ["cma_notes", "TEXT", "Comparable details, market commentary"],
            ["list_price", "NUMERIC(12,2)", "Confirmed list price"],
            ["marketing_tier", "TEXT", "standard / enhanced / premium"],
            ["price_locked", "BOOLEAN", "Whether the price is locked"],
          ],
          [2200, 2200, 4960]
        ),
        pb(),

        // ─── SECTION 7: PHASE 5 ───
        h1("7. Phase 5 \u2014 Form Preparation"),
        h2("7.1 Overview"),
        p("The system auto-generates the required BCREA forms by pre-filling them with data collected during intake and enrichment phases."),
        h2("7.2 Forms Generated"),
        makeTable(
          ["#", "Form Key", "Form Name", "Purpose", "Signers"],
          [
            ["1", "DORTS", "Disclosure of Representation", "Agency disclosure", "Seller + Agent"],
            ["2", "MLC", "Multiple Listing Contract", "Listing agreement", "Seller + Agent"],
            ["3", "PDS", "Property Disclosure Statement", "Property condition disclosure", "Seller"],
            ["4", "FINTRAC", "Individual ID Information Record", "AML identity verification", "Agent (records)"],
            ["5", "Privacy", "Privacy Notice and Consent", "PIPA compliance", "Seller"],
            ["6", "C3", "Consent to Contact (CASL)", "Anti-spam consent", "Seller"],
            ["7", "DRUP", "Disclosure of Risks to Unrep. Parties", "Unrepresented party disclosure", "Agent (provides)"],
            ["8", "MLS_Input", "MLS Data Input Sheet", "Paragon MLS data entry reference", "Agent"],
            ["9", "Mktg_Auth", "Marketing Authorization", "Permission for photos, signs, ads", "Seller"],
            ["10", "Agency", "Agency Agreement", "Formalize designated agency", "Seller + Agent"],
            ["11", "C3_Conf", "Cooperation & Compensation Conf.", "Cooperating brokerage commission", "Agent"],
            ["12", "Fair_Housing", "Fair Housing Acknowledgment", "Non-discrimination compliance", "Seller + Agent"],
          ],
          [400, 1200, 2800, 2800, 2160]
        ),
        h2("7.3 Form Generation Pipeline"),
        ...numberedList([
          "System collects all listing data, seller identities, and enrichment data",
          "Data is transformed into Common Data Model (CDM) format \u2014 a flat structure optimized for form templates",
          "CDM is sent to the form generation engine (Python server)",
          "Engine renders HTML forms with pre-filled fields",
          "Agent reviews each form for accuracy",
          "Status tracking per form: pending \u2192 generated \u2192 ready \u2192 signed",
        ], "numbers3"),
        h2("7.4 CDM Data Structure"),
        p("The CDM (Common Data Model) flattens normalized database records into a single payload:"),
        ...bulletList([
          "listing: {propAddress, propUnit, propType, listPrice, listDuration, possessionDate, commissions, inclusions, exclusions, mlsRemarks, seller[], geo{}, parcel{}, ltsa{}, assessment{}}",
          "cfg: {agentName, agentPhone, agentEmail, agentLicense, brokerage, brokerageAddress, brokeragePhone}",
        ], "bullets3"),
        pb(),

        // ─── SECTION 8: PHASE 6 ───
        h1("8. Phase 6 \u2014 E-Signature"),
        h2("8.1 Overview"),
        p("Completed forms are routed for electronic signature via DocuSign, organized into logical signing packages."),
        h2("8.2 Signing Packages"),
        makeTable(
          ["Package", "Forms Included", "Signer", "Routing"],
          [
            ["Seller Package", "MLC, PDS, Privacy, Marketing Auth, Agency, Fair Housing", "Seller(s)", "Sent to seller email \u2192 seller signs all \u2192 returns to agent"],
            ["Agent Package", "DORTS, FINTRAC record, C3 Conf", "Agent", "Agent signs/acknowledges \u2192 filed"],
          ],
          [1800, 3200, 1200, 3160]
        ),
        h2("8.3 Status Tracking"),
        p("Each package tracks: none \u2192 sent \u2192 partial \u2192 complete \u2192 declined"),
        h2("8.4 Multiple Sellers"),
        p("If multiple sellers exist, each receives their own signing invitation. All must sign for the package to reach \u201Ccomplete\u201D status."),
        pb(),

        // ─── SECTION 9: PHASE 7 ───
        h1("9. Phase 7 \u2014 MLS Preparation"),
        h2("9.1 Overview"),
        p("The agent prepares all content required for the MLS listing: professional photography, AI-generated remarks, and data verification."),
        h2("9.2 Photography & Media Requirements"),
        ...bulletList([
          "Professional interior and exterior photos (HDR, wide-angle)",
          "Aerial/drone photography (where applicable)",
          "Virtual tour / 3D walkthrough (Matterport or equivalent)",
          "Video walkthrough",
          "Floor plans (2D and/or 3D)",
          "Staging (physical or virtual)",
        ], "bullets4"),
        h2("9.3 MLS Remarks"),
        p("Two types of remarks are required:"),
        ...bulletList([
          "Public Remarks (max 500 characters): Visible to consumers on Realtor.ca and syndicated sites. Must not contain: agent contact info, commission details, showing instructions.",
          "REALTOR Remarks (max 500 characters): Visible only to licensed agents. Contains: showing instructions, offer presentation details, commission notes, lockbox code reference.",
        ], "bullets5"),
        h2("9.4 AI Remarks Generation"),
        p("ListingFlow uses Claude AI to generate draft remarks based on listing context:"),
        ...bulletList([
          "Input: property details, assessment data, geo data, inclusions/exclusions, listing terms",
          "Output: public and realtor remarks drafts",
          "Constraints: max 500 chars each, Canadian English, BCREA/CREA compliant, no fabrication",
          "Agent reviews and edits before submission",
        ], "bullets6"),
        h2("9.5 Required MLS Data Fields"),
        makeTable(
          ["Category", "Fields"],
          [
            ["Core", "Property type, sub-type, MLS area/sub-area, full address, PID, legal description"],
            ["Lot", "Lot size/dimensions, zoning, ALR status"],
            ["Building", "Year built, total floor area (sqft), levels/floors, basement type"],
            ["Rooms", "Bedrooms (above/below grade), bathrooms (full/half), fireplaces"],
            ["Financial", "List price, annual taxes (amount + year), assessed value, cooperating commission"],
            ["Features", "Parking type/spaces, heating, cooling, exterior finish, roofing, flooring, appliances"],
            ["Strata", "Strata plan number, monthly fees, management company, parking/storage stall numbers, restrictions"],
            ["Dates", "Listing effective date, expiry date"],
            ["Remarks", "Public remarks, REALTOR remarks, directions"],
            ["Media", "Photos (ordered), virtual tour link (unbranded)"],
          ],
          [1800, 7560]
        ),
        pb(),

        // ─── SECTION 10: PHASE 8 ───
        h1("10. Phase 8 \u2014 MLS Submission"),
        h2("10.1 Overview"),
        p("The listing is submitted to the real estate board\u2019s MLS system (Paragon) for activation."),
        h2("10.2 Submission Process"),
        ...numberedList([
          "Agent enters listing in Paragon with FA (For Approval) status",
          "Signed listing contract is uploaded/sent to the board",
          "Board reviews data and activates the listing",
          "Once active, listing appears on: Paragon member search, Realtor.ca, syndicated websites",
        ], "numbers4"),
        h2("10.3 Board Rules"),
        ...bulletList([
          "Must submit within 3 calendar days of the listing\u2019s effective date",
          "Listings that cannot be shown for more than 5 days cannot remain active",
          "Hold actions cannot exceed 14 calendar days",
          "Contractual fields (price, commission, dates) can only be changed by the board",
          "Agent can modify remarks and non-contractual fields via Agent Modify access",
        ], "bullets7"),
        h2("10.4 Listing Statuses"),
        makeTable(
          ["Status", "Meaning"],
          [
            ["FA (For Approval)", "Submitted, awaiting board activation"],
            ["Active", "Listed and available for showings"],
            ["Active Under Contract", "Conditional deal in place (optional status)"],
            ["Pending", "Unconditionally sold, awaiting completion"],
            ["Closed", "Automatically applied on completion date"],
          ],
          [3000, 6360]
        ),
        pb(),

        // ─── SECTION 11: PHASE 9 ───
        h1("11. Phase 9 \u2014 Marketing & Showing Management"),
        h2("11.1 Marketing Plan"),
        h3("Digital"),
        ...bulletList([
          "MLS optimization and Realtor.ca feature placement",
          "Social media campaigns (Facebook/Instagram)",
          "Email blasts (\u201CJust Listed\u201D)",
          "Agent website and YouTube video tours",
        ], "bullets"),
        h3("Traditional"),
        ...bulletList([
          "Yard signage and printed feature sheets",
          "Direct mail to farm area",
          "Broker tours",
        ], "bullets2"),
        h2("11.2 Open House Management"),
        ...bulletList([
          "Schedule and publish on MLS + social media",
          "Prepare feature sheets and sign-in sheets",
          "Provide DORTS and Disclosure of Risks to Unrepresented Parties to all visitors",
          "Follow up with all attendees within 24 hours",
          "Report showing activity to seller",
        ], "bullets3"),
        h2("11.3 Showing Management"),
        ...bulletList([
          "Coordinate showing requests via CRM",
          "Confirm seller availability and access instructions (lockbox code, pets, special instructions)",
          "Track all showings with buyer agent feedback",
          "Send seller regular activity reports",
          "Adjust pricing strategy based on showing volume and feedback",
        ], "bullets4"),
        h2("11.4 System Touchpoints (ListingFlow)"),
        ...bulletList([
          "Showing request workflow: buyer agent submits request \u2192 system checks Google Calendar \u2192 SMS/WhatsApp notification to seller \u2192 seller confirms/denies \u2192 buyer agent notified",
          "Communication timeline: all messages logged per showing",
          "Lockbox code shared only upon confirmation",
          "Showing analytics dashboard",
        ], "bullets5"),
        pb(),

        // ─── SECTION 12: PHASE 10 ───
        h1("12. Phase 10 \u2014 Offer Management & Negotiation"),
        h2("12.1 Offer Presentation Rules"),
        ...bulletList([
          "All written offers MUST be presented to the seller (unless seller provides specific written instructions otherwise)",
          "Offers presented in order received",
          "Buyer\u2019s agent may attend presentation unless seller instructs otherwise",
        ], "bullets6"),
        h2("12.2 Direction Regarding Presentation of Offers (DRPO)"),
        ...bulletList([
          "Sets a specific date/time by which all offers must be submitted",
          "Gives all potential buyers equal opportunity",
          "Updated March 2025 per REBGV/BCFSA guidance",
        ], "bullets7"),
        h2("12.3 Multiple Offers"),
        ...bulletList([
          "Listing agent must complete Disclosure of Multiple Offers Presented (DMOP) before presenting any offer in a multiple-offer situation",
          "Terms of one offer cannot be disclosed to another buyer without written seller consent",
          "Seller options: reject all, accept one, counter one at a time, or invite resubmissions",
        ], "bullets"),
        h2("12.4 Home Buyer Rescission Period (HBRP)"),
        ...bulletList([
          "3 business days after acceptance \u2014 buyer can rescind",
          "Cannot be waived by any party",
          "Rescission fee: 0.25% of offer price",
          "Buyer must notify seller in writing",
          "Runs concurrently with subject conditions",
        ], "bullets2"),
        h2("12.5 Counter-Offers & Negotiation"),
        ...bulletList([
          "Counter-offers must be in writing with a specific acceptance deadline",
          "Key negotiation points: price, subject conditions, completion/possession dates, inclusions/exclusions, deposit amount",
          "Disclosure to Sellers of Expected Remuneration form must be provided with EVERY offer and counter-offer (in dollar amounts)",
        ], "bullets3"),
        pb(),

        // ─── SECTION 13: PHASE 11 ───
        h1("13. Phase 11 \u2014 Contract-to-Close"),
        h2("13.1 Accepted Offer"),
        p("Contract of Purchase and Sale includes: parties, property description, purchase price, deposit terms, subject conditions, completion/possession/adjustment dates, inclusions/exclusions, HBRP disclosure."),
        h2("13.2 Subject Period (typically 5-10 business days)"),
        p("Common subjects:"),
        ...bulletList([
          "Subject to Financing",
          "Subject to Inspection",
          "Subject to PDS Review",
          "Subject to Title Review",
          "Subject to Strata Documents Review (strata)",
          "Subject to Appraisal",
          "Subject to Sale of Buyer\u2019s Property",
        ], "bullets4"),
        p("Subject removal: buyer submits written Subject Removal Form \u2192 contract becomes firm and binding \u2192 deposit due within 24 hours (typically 5% of purchase price)."),
        h2("13.3 FINTRAC \u2014 Buyer Side"),
        ...bulletList([
          "Buyer\u2019s agent completes Individual ID Record for buyer",
          "Receipt of Funds Record for every amount received",
          "Third-party determination if someone other than buyer provides funds",
        ], "bullets5"),
        h2("13.4 Post-Subject Removal"),
        ...bulletList([
          "Listing agent confirms deposit received",
          "Update MLS status to \u201CPending\u201D",
          "Send conveyancing instructions to lawyers/notaries",
          "Report sale to board within 5 days (Sales Report Form)",
        ], "bullets6"),
        h2("13.5 The Five Key Dates"),
        makeTable(
          ["Date", "Description"],
          [
            ["Acceptance Date", "Offer accepted by all parties"],
            ["Subject Removal Date", "Deadline for buyer to remove all conditions"],
            ["Completion Date", "Ownership and funds exchange; title transfers at LTSA (must be a business day)"],
            ["Possession Date", "Buyer receives keys; typically 1 day after completion"],
            ["Adjustment Date", "Buyer assumes financial responsibility (taxes, strata fees); usually same as possession"],
          ],
          [2500, 6860]
        ),
        h2("13.6 Conveyancing Process"),
        h3("Seller\u2019s Lawyer/Notary"),
        ...bulletList([
          "Prepare Statement of Adjustments",
          "Prepare Transfer of Title (Form A)",
          "Obtain mortgage payout statement",
          "Prepare discharge documents",
        ], "bullets7"),
        h3("Buyer\u2019s Lawyer/Notary"),
        ...bulletList([
          "Conduct final title search",
          "Process mortgage instructions",
          "Prepare mortgage documents",
          "Coordinate with seller\u2019s lawyer",
        ], "bullets"),
        h2("13.7 Completion Day"),
        ...bulletList([
          "Buyer\u2019s lawyer submits transfer and mortgage registration to LTSA",
          "Title registration recorded",
          "Funds flow: buyer\u2019s funds \u2192 seller\u2019s lawyer \u2192 pay out mortgage \u2192 pay commissions \u2192 distribute net proceeds to seller",
        ], "bullets2"),
        h2("13.8 Statement of Adjustments"),
        p("Includes: purchase price, deposit credit, prorated property taxes, prorated strata fees, prorated utilities, legal fees, title insurance, Property Transfer Tax."),
        pb(),

        // ─── SECTION 14: PHASE 12 ───
        h1("14. Phase 12 \u2014 Post-Closing"),
        h2("14.1 Commission Disbursement"),
        ...bulletList([
          "Commission deducted from sale proceeds on completion day",
          "Seller\u2019s lawyer pays total commission to listing brokerage",
          "Listing brokerage splits with buyer\u2019s agent brokerage",
          "Each brokerage pays its agent per their split agreement",
          "All remuneration flows through brokerages (BCFSA rule)",
          "GST/HST applies",
        ], "bullets3"),
        h2("14.2 Administrative Wrap-Up"),
        ...bulletList([
          "MLS status automatically updates from \u201CPending\u201D to \u201CClosed\u201D on completion date",
          "Close transaction file \u2014 ensure all documents are properly stored",
          "Archive FINTRAC records (5-year retention minimum)",
          "Brokerage file compliance per BCFSA requirements (7-year retention under RESA)",
        ], "bullets4"),
        h2("14.3 Client Follow-Up"),
        ...bulletList([
          "Thank you note / closing gift",
          "Request testimonial/review (Google, social media)",
          "Ask for referrals",
          "Add to long-term CRM nurture program: anniversary reminders, quarterly market updates, birthday greetings, annual home valuation updates",
        ], "bullets5"),
        h2("14.4 Performance Tracking"),
        ...bulletList([
          "Record sale in production tracking",
          "Calculate effective commission rate",
          "Review marketing spend vs. results",
          "Update CMA database with this sale",
        ], "bullets6"),
        pb(),

        // ─── SECTION 15: COMPLIANCE SUMMARY ───
        h1("15. Compliance Summary"),
        h2("15.1 FINTRAC Obligations"),
        makeTable(
          ["Obligation", "When", "Penalty"],
          [
            ["Individual ID Record", "At agency relationship", "Up to $500,000 fine and/or 5 years imprisonment"],
            ["Receipt of Funds Record", "Every time funds received", "Up to $500,000 fine"],
            ["Large Cash Transaction Report", "Cash $10,000+", "Up to $2M fine and/or 5 years"],
            ["Suspicious Transaction Report", "When suspicion arises", "Up to $2M fine and/or 5 years for failure to report"],
            ["Terrorist Property Report", "Immediately upon discovery", "Criminal penalties"],
            ["Record Retention", "5 years from creation", "Fines for non-compliance"],
          ],
          [3200, 2800, 3360]
        ),
        h2("15.2 CASL (Anti-Spam) Requirements"),
        ...bulletList([
          "Obtain consent before sending commercial electronic messages",
          "Provide identification info and unsubscribe mechanism in every message",
          "Express consent does not expire; implied consent during active business relationship (2 years post-sale, 6 months post-inquiry)",
          "Penalties: up to $1M per violation (individual), $10M (business)",
        ], "bullets7"),
        h2("15.3 PIPA (Privacy)"),
        ...bulletList([
          "Privacy Notice and Consent required before collecting personal information",
          "Four opt-out boxes for secondary uses (marketing, surveys, referrals, other)",
          "Personal information may be stored in foreign jurisdictions (must disclose)",
        ], "bullets"),
        h2("15.4 Record Retention Summary"),
        makeTable(
          ["Requirement", "Duration", "Authority"],
          [
            ["FINTRAC records", "5 years", "PCMLTFA"],
            ["Brokerage transaction files", "7 years", "RESA/BCFSA"],
            ["CASL consent records", "Duration of consent + dispute period", "CRTC"],
            ["Privacy consents", "Duration of business relationship", "PIPA"],
          ],
          [3200, 3200, 2960]
        ),
        pb(),

        // ─── SECTION 16: APPENDICES ───
        h1("16. Appendices"),
        h2("Appendix A: Complete Form Checklist (Listing Side)"),
        ...numberedList([
          "DORTS \u2014 Disclosure of Representation in Trading Services",
          "Privacy Notice and Consent (PNC)",
          "FINTRAC Individual Identification Information Record",
          "Multiple Listing Contract (MLC) or Exclusive Listing Contract",
          "Property Disclosure Statement (PDS) or Property No-Disclosure Statement (PNDS)",
          "Strata Form B Information Certificate (if strata)",
          "Marketing Authorization",
          "Agency Agreement",
          "Consent to Contact (CASL / C3)",
          "Fair Housing Acknowledgment",
          "MLS Data Input Sheet",
          "Cooperation & Compensation Confirmation (C3 Conf)",
          "Disclosure of Risks to Unrepresented Parties (at open houses/showings)",
          "Disclosure to Sellers of Expected Remuneration (at each offer)",
          "Disclosure of Multiple Offers Presented (DMOP) (if multiple offers)",
          "Trade Record Sheet (when funds held/received)",
          "Sales Report Form (after subject removal)",
        ], "appendixNums"),

        h2("Appendix B: Enrichment Data Sources Quick Reference"),
        makeTable(
          ["Source", "URL", "Provides", "Cost", "Access"],
          [
            ["BC Geocoder", "geocoder.api.gov.bc.ca", "Lat/lng, verified address", "Free", "REST API"],
            ["ParcelMap BC", "openmaps.gov.bc.ca", "PID, plan number, municipality", "Free", "WFS API"],
            ["myLTSA", "myltsa.ca", "Title, owner, charges", "~$10", "Web portal"],
            ["BC Assessment", "bcassessment.ca", "Assessed value, property details", "Free", "Web portal"],
          ],
          [1500, 2200, 2200, 800, 2660]
        ),

        h2("Appendix C: MLS Field Requirements Quick Reference"),
        makeTable(
          ["Category", "Required Fields"],
          [
            ["Property", "Type, sub-type, MLS area, address, PID, legal description"],
            ["Lot", "Size, dimensions, zoning, ALR status"],
            ["Building", "Year built, floor area, levels, basement type"],
            ["Rooms", "Bedrooms (above/below), bathrooms (full/half), fireplaces"],
            ["Financial", "List price, annual taxes, assessed value, cooperating commission"],
            ["Features", "Parking, heating, cooling, exterior, roof, flooring, appliances"],
            ["Strata", "Plan number, monthly fees, management, parking/storage stalls, restrictions"],
            ["Dates", "Effective date, expiry date"],
            ["Content", "Public remarks, REALTOR remarks, directions, photos, virtual tour"],
          ],
          [1800, 7560]
        ),

        h2("Appendix D: Glossary"),
        makeTable(
          ["Term", "Definition"],
          [
            ["CMA", "Comparative Market Analysis \u2014 a report comparing recent sales to estimate property value"],
            ["PID", "Parcel Identifier \u2014 unique 9-digit number assigned to each land parcel in BC"],
            ["LTSA", "Land Title and Survey Authority \u2014 manages BC\u2019s land title system"],
            ["MLC", "Multiple Listing Contract \u2014 the listing agreement between seller and agent"],
            ["PDS", "Property Disclosure Statement \u2014 seller\u2019s disclosure of property condition"],
            ["DORTS", "Disclosure of Representation in Trading Services \u2014 agency disclosure form"],
            ["FINTRAC", "Financial Transactions and Reports Analysis Centre \u2014 federal AML regulator"],
            ["PCMLTFA", "Proceeds of Crime (Money Laundering) and Terrorist Financing Act"],
            ["RESA", "Real Estate Services Act \u2014 BC legislation governing real estate professionals"],
            ["BCFSA", "BC Financial Services Authority \u2014 regulator of BC real estate licensees"],
            ["PIPA", "Personal Information Protection Act \u2014 BC privacy legislation"],
            ["CASL", "Canada\u2019s Anti-Spam Legislation \u2014 federal electronic messaging law"],
            ["HBRP", "Home Buyer Rescission Period \u2014 3 business day right to rescind after acceptance"],
            ["DRPO", "Direction Regarding Presentation of Offers \u2014 sets offer submission deadline"],
            ["DMOP", "Disclosure of Multiple Offers Presented \u2014 required in multiple offer situations"],
            ["CDM", "Common Data Model \u2014 flat data structure used for form generation"],
            ["Paragon", "MLS platform operated by REBGV for listing management"],
            ["WEBForms", "CREA\u2019s online platform for completing standard real estate forms"],
            ["Form B", "Strata Information Certificate \u2014 provides strata financial and governance details"],
            ["Statement of Adjustments", "Document calculating final amounts owed between buyer and seller on completion"],
            ["Conveyancing", "The legal process of transferring property ownership from seller to buyer"],
          ],
          [2800, 6560]
        ),

        // END
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: INDIGO, space: 12 } },
          spacing: { before: 200 },
          children: [new TextRun({ text: "End of Document", font: "Calibri", size: 20, color: "999999", italics: true })],
        }),
      ],
    },
  ],
});

// ─── Generate ──────────────────────────────────────────────────────
const outPath = "/Users/bigbear/reality crm/ListingFlow_Realtor_Workflow_Design_Document.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`Document created: ${outPath}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
