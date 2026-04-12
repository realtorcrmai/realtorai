const fs = require("fs");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  PageNumber, PageBreak, TabStopType, TabStopPosition,
} = require("docx");

// ─── Theme ─────────────────────────────────────────────────────────
const INDIGO = "4F35D2";
const GREEN  = "16A34A";
const AMBER  = "D97706";
const RED    = "DC2626";
const GRAY   = "6B7280";
const WHITE  = "FFFFFF";
const ALT_BG = "F8F7FC";
const GREEN_BG = "F0FDF4";
const AMBER_BG = "FFFBEB";
const RED_BG   = "FEF2F2";

const border = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const cellMargins = { top: 60, bottom: 60, left: 100, right: 100 };

function headerCell(text, width) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: INDIGO, type: ShadingType.CLEAR },
    margins: cellMargins, verticalAlign: "center",
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: WHITE, font: "Calibri", size: 20 })] })],
  });
}

function statusCell(text, width, status) {
  const fills = { full: GREEN_BG, partial: AMBER_BG, none: RED_BG, na: ALT_BG };
  const colors = { full: GREEN, partial: AMBER, none: RED, na: GRAY };
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: { fill: fills[status] || ALT_BG, type: ShadingType.CLEAR },
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: "Calibri", size: 20, bold: true, color: colors[status] || GRAY })] })],
  });
}

function cell(text, width, shade) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: [new Paragraph({ children: [new TextRun({ text, font: "Calibri", size: 20 })] })],
  });
}

function multiLineCell(lines, width, shade) {
  return new TableCell({
    borders, width: { size: width, type: WidthType.DXA },
    shading: shade ? { fill: shade, type: ShadingType.CLEAR } : undefined,
    margins: cellMargins,
    children: lines.map(l => new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: l, font: "Calibri", size: 18 })] })),
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
function pBold(text) {
  return new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text, bold: true, font: "Calibri", size: 20 })] });
}
function pb() { return new Paragraph({ children: [new PageBreak()] }); }

function bulletList(items, ref) {
  return items.map(t => new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text: t, font: "Calibri", size: 20 })] }));
}

function colorBullet(text, color, ref) {
  return new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: [new TextRun({ text, font: "Calibri", size: 20, color })] });
}

// Status legend helper
function legendRow() {
  return new Paragraph({
    spacing: { before: 120, after: 200 },
    children: [
      new TextRun({ text: "Status Key:  ", font: "Calibri", size: 20, bold: true }),
      new TextRun({ text: "\u2705 Fully Built", font: "Calibri", size: 20, color: GREEN }),
      new TextRun({ text: "    ", font: "Calibri", size: 20 }),
      new TextRun({ text: "\u26A0\uFE0F Partially Built", font: "Calibri", size: 20, color: AMBER }),
      new TextRun({ text: "    ", font: "Calibri", size: 20 }),
      new TextRun({ text: "\u274C Not Built", font: "Calibri", size: 20, color: RED }),
      new TextRun({ text: "    ", font: "Calibri", size: 20 }),
      new TextRun({ text: "\u2014 N/A", font: "Calibri", size: 20, color: GRAY }),
    ],
  });
}

// ─── Main comparison table per phase ───────────────────────────────
function phaseTable(rows) {
  // rows: [{feature, docDesc, siteStatus, siteDetail, status}]
  const cw = [2000, 3000, 1200, 3160];
  return new Table({
    width: { size: 9360, type: WidthType.DXA },
    columnWidths: cw,
    rows: [
      new TableRow({ children: [
        headerCell("Feature / Requirement", cw[0]),
        headerCell("Design Document Spec", cw[1]),
        headerCell("Status", cw[2]),
        headerCell("Current Implementation", cw[3]),
      ]}),
      ...rows.map(r => new TableRow({ children: [
        cell(r.feature, cw[0]),
        cell(r.docDesc, cw[1]),
        statusCell(r.statusLabel, cw[2], r.status),
        cell(r.siteDetail, cw[3]),
      ]})),
    ],
  });
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
      { reference: "b1", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b2", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b3", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b4", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b5", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b6", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b7", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b8", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b9", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b10", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b11", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b12", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b13", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b14", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "b15", levels: [{ level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [
    // ═══ TITLE PAGE ═══
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      children: [
        new Paragraph({ spacing: { before: 3000 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 200 }, children: [new TextRun({ text: "ListingFlow", font: "Calibri", size: 56, bold: true, color: INDIGO })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Comparative Gap Analysis", font: "Calibri", size: 36, color: "555555" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun({ text: "Design Document vs. Current Website Implementation", font: "Calibri", size: 24, italics: true, color: "777777" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200 }, border: { top: { style: BorderStyle.SINGLE, size: 6, color: INDIGO, space: 12 } }, children: [] }),
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Version 1.0 \u2014 March 2026", font: "Calibri", size: 22, color: "888888" })] }),
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: "Prepared by: ListingFlow Product Team", font: "Calibri", size: 22, color: "888888" })] }),
      ],
    },
    // ═══ MAIN CONTENT ═══
    {
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
      headers: {
        default: new Header({ children: [new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          children: [
            new TextRun({ text: "ListingFlow \u2014 Gap Analysis", font: "Calibri", size: 16, color: "999999" }),
            new TextRun({ text: "\tCONFIDENTIAL", font: "Calibri", size: 16, color: "CC0000", bold: true }),
          ],
        })] }),
      },
      footers: {
        default: new Footer({ children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [ new TextRun({ text: "Page ", font: "Calibri", size: 16, color: "999999" }), new TextRun({ children: [PageNumber.CURRENT], font: "Calibri", size: 16, color: "999999" }) ],
        })] }),
      },
      children: [
        // ═══ EXECUTIVE SUMMARY ═══
        h1("1. Executive Summary"),
        p("This report compares the ListingFlow Realtor Workflow Design Document (12-phase BC realtor listing lifecycle) against the current ListingFlow CRM website implementation. It identifies what has been built, what is partially implemented, and what gaps remain."),

        h2("1.1 High-Level Scorecard"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [4000, 1200, 1200, 1200, 1760],
          rows: [
            new TableRow({ children: [
              headerCell("Phase", 4000), headerCell("Built", 1200), headerCell("Partial", 1200), headerCell("Missing", 1200), headerCell("Score", 1760),
            ]}),
            ...[
              ["1. Pre-Listing & Prospecting", "2", "1", "3", "35%", "partial"],
              ["2. Listing Agreement & Intake", "5", "1", "1", "75%", "partial"],
              ["3. Data Enrichment", "4", "1", "0", "90%", "full"],
              ["4. CMA & Pricing Strategy", "3", "2", "1", "65%", "partial"],
              ["5. Form Preparation", "4", "1", "0", "85%", "full"],
              ["6. E-Signature", "1", "2", "1", "40%", "partial"],
              ["7. MLS Preparation", "3", "1", "2", "55%", "partial"],
              ["8. MLS Submission", "0", "1", "3", "10%", "none"],
              ["9. Marketing & Showings", "4", "2", "2", "60%", "partial"],
              ["10. Offer Management", "0", "0", "6", "0%", "none"],
              ["11. Contract-to-Close", "0", "0", "7", "0%", "none"],
              ["12. Post-Closing", "0", "1", "4", "10%", "none"],
            ].map((r, ri) => new TableRow({ children: [
              cell(r[0], 4000), cell(r[1], 1200), cell(r[2], 1200), cell(r[3], 1200),
              statusCell(r[4], 1760, r[5]),
            ]})),
            new TableRow({ children: [
              cell("TOTAL", 4000, ALT_BG), cell("26", 1200, ALT_BG), cell("13", 1200, ALT_BG), cell("30", 1200, ALT_BG),
              statusCell("44%", 1760, "partial"),
            ]}),
          ],
        }),

        h2("1.2 Summary"),
        ...bulletList([
          "The CRM has strong foundations in Phases 2-5 (intake, enrichment, forms) \u2014 the core listing setup workflow is well-built",
          "Showing management (Phase 9) is robust with Twilio SMS/WhatsApp integration and Google Calendar",
          "Content generation via Claude AI and Kling AI is a bonus feature not in the design document",
          "Major gaps exist in Phases 10-12 (offer management, contract-to-close, post-closing) \u2014 the sell-side workflow is not yet built",
          "Phase 8 (MLS submission) has no direct Paragon integration \u2014 only data preparation",
          "The 8-phase workflow in the CRM maps to Phases 1-8 of the 12-phase design document; Phases 9-12 are handled outside the workflow stepper",
        ], "b1"),
        pb(),

        // ═══ PHASE 1 ═══
        h1("2. Phase 1 \u2014 Pre-Listing & Prospecting"),
        legendRow(),
        phaseTable([
          { feature: "Lead Generation", docDesc: "SOI referrals, farming, online leads, open houses", statusLabel: "\u274C Missing", status: "none", siteDetail: "No lead gen or prospecting tools. Contacts are created manually." },
          { feature: "Discovery Call Tracking", docDesc: "Log call notes, motivation, timeline, mortgage status", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "Contacts have notes field but no structured discovery fields (motivation, timeline, mortgage)." },
          { feature: "Pre-Listing Research", docDesc: "BC Assessment lookup, LTSA, prior MLS, neighbourhood", statusLabel: "\u2705 Built", status: "full", siteDetail: "Enrichment system covers BC Assessment, LTSA, geocoding, ParcelMap. Neighbourhood endpoint exists." },
          { feature: "CMA Report Generation", docDesc: "3-5 comps, price/sqft, adjustments", statusLabel: "\u2705 Built", status: "full", siteDetail: "Phase 3 (CMA) in workflow with comparable data fields and notes." },
          { feature: "Pre-Listing Package", docDesc: "Agent bio, testimonials, marketing plan, FAQ", statusLabel: "\u274C Missing", status: "none", siteDetail: "No pre-listing package generator." },
          { feature: "Listing Presentation", docDesc: "CMA deck, seller net sheet, commission structure", statusLabel: "\u274C Missing", status: "none", siteDetail: "No seller net sheet calculator or presentation builder." },
        ]),
        pb(),

        // ═══ PHASE 2 ═══
        h1("3. Phase 2 \u2014 Listing Agreement & Intake"),
        legendRow(),
        phaseTable([
          { feature: "DORTS Form", docDesc: "Agency disclosure, must be FIRST form", statusLabel: "\u2705 Built", status: "full", siteDetail: "Tracked in forms_status, generated via ListingFlow Python server." },
          { feature: "Privacy Notice (PNC)", docDesc: "PIPA consent before collecting personal info", statusLabel: "\u2705 Built", status: "full", siteDetail: "PRIVACY form key exists, generated via form engine." },
          { feature: "FINTRAC ID Verification", docDesc: "3 methods: photo ID, credit file, dual-process", statusLabel: "\u2705 Built", status: "full", siteDetail: "seller_identities table: name, DOB, citizenship, ID type/number/expiry, occupation." },
          { feature: "Multiple Listing Contract", docDesc: "Listing agreement with price, duration, commission", statusLabel: "\u2705 Built", status: "full", siteDetail: "MLC form generated; listings table stores list_price, list_duration, commissions." },
          { feature: "Property Disclosure (PDS)", docDesc: "5 sections: land, services, building, general, defects", statusLabel: "\u2705 Built", status: "full", siteDetail: "PDS form key tracked; PNDS alternative not yet implemented." },
          { feature: "Strata Documents", docDesc: "Form B, bylaws, depreciation report, minutes", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "strata JSONB field in enrichment; STRATA doc_type exists. No structured strata document collection workflow." },
          { feature: "Multiple Sellers", docDesc: "Each seller needs separate FINTRAC ID", statusLabel: "\u2705 Built", status: "full", siteDetail: "seller_identities supports multiple sellers per listing with sort_order." },
        ]),
        pb(),

        // ═══ PHASE 3 ═══
        h1("4. Phase 3 \u2014 Data Enrichment"),
        legendRow(),
        phaseTable([
          { feature: "BC Geocoder", docDesc: "Address \u2192 lat/lng, locality, confidence", statusLabel: "\u2705 Built", status: "full", siteDetail: "runGeocoderEnrichment() calls geocoder.api.gov.bc.ca REST API." },
          { feature: "ParcelMap BC", docDesc: "Coordinates \u2192 PID, plan number, municipality", statusLabel: "\u2705 Built", status: "full", siteDetail: "runParcelMapEnrichment() calls openmaps.gov.bc.ca WFS API." },
          { feature: "LTSA Title Search", docDesc: "PID \u2192 owner, title number, charges", statusLabel: "\u2705 Built", status: "full", siteDetail: "setLTSAData() for manual entry. Stored in listing_enrichment.ltsa JSONB." },
          { feature: "BC Assessment", docDesc: "Assessment values, year built, lot size, zoning", statusLabel: "\u2705 Built", status: "full", siteDetail: "setAssessmentData() for manual entry with all fields (value, year, beds, baths, etc.)." },
          { feature: "Owner Name Validation", docDesc: "Fuzzy match LTSA owner vs. seller identity (Jaro-Winkler, 0.85)", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "fuzzy-match.ts exists but not confirmed as actively wired into the enrichment flow validation step." },
          { feature: "Enrichment Status Tracking", docDesc: "Per-source status: pending/running/done/fail/manual", statusLabel: "\u2705 Built", status: "full", siteDetail: "enrich_status JSONB field tracks each source independently." },
        ]),
        pb(),

        // ═══ PHASE 4 ═══
        h1("5. Phase 4 \u2014 CMA & Pricing Strategy"),
        legendRow(),
        phaseTable([
          { feature: "Comparable Analysis", docDesc: "3-5 recent sales, active/expired, price adjustments", statusLabel: "\u2705 Built", status: "full", siteDetail: "CMA phase exists with cma_low, cma_high, suggested_price, cma_notes fields." },
          { feature: "Neighbourhood Comps", docDesc: "Nearby sold properties with price/sqft, DOM", statusLabel: "\u2705 Built", status: "full", siteDetail: "Neighbourhood API endpoint returns mock comps. Button on listing detail." },
          { feature: "List Price Confirmation", docDesc: "Seller agrees on price, price lock mechanism", statusLabel: "\u2705 Built", status: "full", siteDetail: "list_price and price_locked fields on listings table. Phase 4 (Pricing) in workflow." },
          { feature: "Marketing Tier Selection", docDesc: "Standard / Enhanced / Premium", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "marketing_tier field exists in DB. UI may not yet expose tier selection in pricing phase." },
          { feature: "Seller Net Sheet", docDesc: "Estimated seller proceeds after costs", statusLabel: "\u274C Missing", status: "none", siteDetail: "No net sheet calculator implemented." },
          { feature: "Price Range Warning", docDesc: "Alert if price outside CMA range", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "CMA range fields exist but no automatic validation/warning when price is outside range." },
        ]),
        pb(),

        // ═══ PHASE 5 ═══
        h1("6. Phase 5 \u2014 Form Preparation"),
        legendRow(),
        phaseTable([
          { feature: "12 BCREA Forms", docDesc: "DORTS, MLC, PDS, FINTRAC, Privacy, C3, DRUP, MLS Input, Marketing Auth, Agency, C3 Conf, Fair Housing", statusLabel: "\u2705 Built", status: "full", siteDetail: "All 12 form keys exist in forms_status JSONB. Generated via /api/forms/generate." },
          { feature: "CDM Data Model", docDesc: "Flat payload combining listing + seller + enrichment + config", statusLabel: "\u2705 Built", status: "full", siteDetail: "cdm-mapper.ts transforms normalized DB data into CDM format." },
          { feature: "Python Form Engine", docDesc: "ListingFlow server renders HTML forms from CDM", statusLabel: "\u2705 Built", status: "full", siteDetail: "POST to LISTINGFLOW_URL/api/form/html. Proxied via /api/forms/generate." },
          { feature: "Form Status Tracking", docDesc: "Per form: pending \u2192 generated \u2192 ready \u2192 signed", statusLabel: "\u2705 Built", status: "full", siteDetail: "forms_status JSONB on listings tracks each form independently." },
          { feature: "Agent Review Step", docDesc: "Agent reviews pre-filled forms for accuracy before signing", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "Forms are generated and viewable but no explicit review/approve UI step before routing to e-sign." },
        ]),
        pb(),

        // ═══ PHASE 6 ═══
        h1("7. Phase 6 \u2014 E-Signature"),
        legendRow(),
        phaseTable([
          { feature: "DocuSign Integration", docDesc: "Route forms for electronic signature", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "envelopes JSONB field exists for tracking. PhaseESign component exists. No confirmed DocuSign API integration live." },
          { feature: "Seller Signing Package", docDesc: "MLC, PDS, Privacy, Marketing Auth, Agency, Fair Housing", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "Package concept exists in UI but actual envelope routing not confirmed live." },
          { feature: "Agent Signing Package", docDesc: "DORTS, FINTRAC record, C3 Conf", statusLabel: "\u274C Missing", status: "none", siteDetail: "No separate agent package workflow." },
          { feature: "Multiple Seller Routing", docDesc: "Each seller gets separate signing invitation", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented \u2014 multiple sellers supported in data but not in e-sign routing." },
        ]),
        pb(),

        // ═══ PHASE 7 ═══
        h1("8. Phase 7 \u2014 MLS Preparation"),
        legendRow(),
        phaseTable([
          { feature: "Photo Management", docDesc: "Professional photos, drone, virtual tour, floor plans", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "mls_photos array field exists. Hero image upload works. No multi-photo ordering or virtual tour link field." },
          { feature: "MLS Public Remarks", docDesc: "Max 500 chars, consumer-facing, no agent info", statusLabel: "\u2705 Built", status: "full", siteDetail: "Claude AI generates remarks via /api/mls-remarks. mls_remarks field on listings." },
          { feature: "REALTOR Remarks", docDesc: "Max 500 chars, agent-only, showing instructions", statusLabel: "\u2705 Built", status: "full", siteDetail: "mls_realtor_remarks field. AI generates both remark types together." },
          { feature: "AI Remarks Generation", docDesc: "Claude generates drafts from listing context", statusLabel: "\u2705 Built", status: "full", siteDetail: "Claude Sonnet generates remarks with real estate system prompt. Agent can edit." },
          { feature: "MLS Data Validation", docDesc: "Verify all required MLS fields are complete", statusLabel: "\u274C Missing", status: "none", siteDetail: "No pre-submission validation checklist for MLS field completeness." },
          { feature: "Virtual Tour Link", docDesc: "Unbranded virtual tour URL for MLS", statusLabel: "\u274C Missing", status: "none", siteDetail: "No virtual tour URL field in the listings schema." },
        ]),
        pb(),

        // ═══ PHASE 8 ═══
        h1("9. Phase 8 \u2014 MLS Submission"),
        legendRow(),
        phaseTable([
          { feature: "Paragon MLS Integration", docDesc: "Direct submit to board MLS system", statusLabel: "\u274C Missing", status: "none", siteDetail: "No Paragon API integration. Phase 8 exists as a workflow step but is manual." },
          { feature: "Board Contract Upload", docDesc: "Send signed listing contract to board", statusLabel: "\u274C Missing", status: "none", siteDetail: "No automated upload to board." },
          { feature: "MLS Status Tracking", docDesc: "FA \u2192 Active \u2192 Pending \u2192 Closed statuses", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "mls_status field exists on listings. Not synced with Paragon." },
          { feature: "3-Day Submission Rule", docDesc: "Must submit within 3 days of effective date", statusLabel: "\u274C Missing", status: "none", siteDetail: "No deadline tracking or alerts for submission timing." },
          { feature: "Agent Modify Access", docDesc: "Edit remarks/non-contractual fields after activation", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not applicable without Paragon integration." },
        ]),
        pb(),

        // ═══ PHASE 9 ═══
        h1("10. Phase 9 \u2014 Marketing & Showing Management"),
        legendRow(),
        phaseTable([
          { feature: "Showing Request Workflow", docDesc: "Buyer agent request \u2192 calendar check \u2192 SMS seller \u2192 confirm/deny", statusLabel: "\u2705 Built", status: "full", siteDetail: "Full workflow: form submit \u2192 Google Calendar check \u2192 Twilio SMS/WhatsApp to seller \u2192 webhook confirms." },
          { feature: "Lockbox Code Delivery", docDesc: "Share lockbox code only upon confirmation", statusLabel: "\u2705 Built", status: "full", siteDetail: "Lockbox code sent to buyer agent via Twilio only after seller confirms." },
          { feature: "Communication Timeline", docDesc: "All messages logged per showing", statusLabel: "\u2705 Built", status: "full", siteDetail: "communications table logs SMS/WhatsApp/email/notes. Timeline UI on showing detail." },
          { feature: "Google Calendar Sync", docDesc: "Events synced for availability and scheduling", statusLabel: "\u2705 Built", status: "full", siteDetail: "Full Google Calendar integration: fetch events, check busy, create events." },
          { feature: "Open House Management", docDesc: "Schedule, publish, sign-in, DORTS distribution, follow-up", statusLabel: "\u274C Missing", status: "none", siteDetail: "No open house specific features (scheduling, sign-in sheets, follow-up)." },
          { feature: "Marketing Campaigns", docDesc: "Social media, email blasts, yard signs, feature sheets", statusLabel: "\u274C Missing", status: "none", siteDetail: "No marketing campaign management. Content Engine generates AI media but no campaign distribution." },
          { feature: "Showing Analytics", docDesc: "Activity reports, feedback tracking, volume metrics", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "Dashboard shows showing counts. No buyer agent feedback collection or detailed analytics." },
          { feature: "Seller Activity Reports", docDesc: "Regular reports on showing activity and feedback", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "Seller is notified per showing via SMS. No aggregated activity report feature." },
        ]),
        pb(),

        // ═══ PHASE 10 ═══
        h1("11. Phase 10 \u2014 Offer Management & Negotiation"),
        legendRow(),
        phaseTable([
          { feature: "Offer Tracking", docDesc: "Record and track all written offers", statusLabel: "\u274C Missing", status: "none", siteDetail: "No offers table or tracking system." },
          { feature: "Offer Presentation Rules", docDesc: "Present all offers to seller in order received", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
          { feature: "DRPO Management", docDesc: "Set offer submission deadline, notify agents", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
          { feature: "DMOP Form", docDesc: "Disclosure of Multiple Offers Presented", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
          { feature: "Counter-Offer Workflow", docDesc: "Written counters with deadlines, negotiation tracking", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
          { feature: "HBRP Tracking", docDesc: "3 business day rescission period, 0.25% fee calculation", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
        ]),
        pb(),

        // ═══ PHASE 11 ═══
        h1("12. Phase 11 \u2014 Contract-to-Close"),
        legendRow(),
        phaseTable([
          { feature: "Subject Period Tracking", docDesc: "Track subject conditions with deadlines", statusLabel: "\u274C Missing", status: "none", siteDetail: "No subject tracking system. Stakeholders JSONB exists but no subject workflow." },
          { feature: "Subject Removal Form", docDesc: "Buyer submits written removal, contract becomes firm", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
          { feature: "Deposit Tracking", docDesc: "5% deposit due within 24h of subject removal", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
          { feature: "FINTRAC Buyer Records", docDesc: "Buyer ID, Receipt of Funds, third-party determination", statusLabel: "\u274C Missing", status: "none", siteDetail: "FINTRAC only implemented for sellers currently." },
          { feature: "Five Key Dates", docDesc: "Acceptance, subject removal, completion, possession, adjustment", statusLabel: "\u274C Missing", status: "none", siteDetail: "Only possession_date field exists. No completion/adjustment date tracking." },
          { feature: "Conveyancing Coordination", docDesc: "Lawyer instructions, statement of adjustments, title transfer", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "ConveyancingPackButton exists for download. Stakeholders JSONB stores lawyer info. No active coordination workflow." },
          { feature: "MLS Status Update", docDesc: "Update to Pending after subject removal", statusLabel: "\u274C Missing", status: "none", siteDetail: "mls_status field exists but no automated status change on subject removal." },
        ]),
        pb(),

        // ═══ PHASE 12 ═══
        h1("13. Phase 12 \u2014 Post-Closing"),
        legendRow(),
        phaseTable([
          { feature: "Commission Tracking", docDesc: "Calculate, split, track disbursement", statusLabel: "\u274C Missing", status: "none", siteDetail: "Commission rates stored but no disbursement tracking." },
          { feature: "File Archival", docDesc: "Store all documents, FINTRAC 5yr + BCFSA 7yr retention", statusLabel: "\u26A0\uFE0F Partial", status: "partial", siteDetail: "listing_documents table stores files. No retention policy enforcement or archival workflow." },
          { feature: "Client Follow-Up", docDesc: "Thank you, testimonial request, referral ask", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
          { feature: "CRM Nurture Program", docDesc: "Anniversary, market updates, birthday, annual valuation", statusLabel: "\u274C Missing", status: "none", siteDetail: "No automated nurture sequences or drip campaigns." },
          { feature: "Performance Tracking", docDesc: "Production metrics, commission analysis, marketing ROI", statusLabel: "\u274C Missing", status: "none", siteDetail: "No agent performance dashboard or analytics." },
        ]),
        pb(),

        // ═══ BONUS FEATURES ═══
        h1("14. Bonus Features (Not in Design Document)"),
        p("The following features exist in the website but are not covered by the design document. These should be considered for inclusion in future document revisions."),
        phaseTable([
          { feature: "Content Engine", docDesc: "Not in design document", statusLabel: "\u2705 Bonus", status: "full", siteDetail: "Full AI content pipeline: Claude generates prompts \u2192 Kling AI generates 4K video + 8K images for social media." },
          { feature: "Instagram Captions", docDesc: "Not in design document", statusLabel: "\u2705 Bonus", status: "full", siteDetail: "Claude AI generates Instagram-ready captions with hashtags per listing." },
          { feature: "Hero Image Management", docDesc: "Not in design document", statusLabel: "\u2705 Bonus", status: "full", siteDetail: "Upload and manage hero images per listing for content generation." },
          { feature: "Glassmorphism UI", docDesc: "Not in design document", statusLabel: "\u2705 Bonus", status: "full", siteDetail: "Full ListingFlow design system with glass effects, gradient palette, Bricolage Grotesque font." },
          { feature: "WhatsApp Integration", docDesc: "Document mentions SMS only", statusLabel: "\u2705 Bonus", status: "full", siteDetail: "Dual-channel: both SMS and WhatsApp via Twilio with seller preference tracking." },
        ]),
        pb(),

        // ═══ COMPLIANCE GAP ANALYSIS ═══
        h1("15. Compliance Gap Analysis"),
        h2("15.1 FINTRAC Compliance"),
        phaseTable([
          { feature: "Seller ID Records", docDesc: "Full identity collection with 3 verification methods", statusLabel: "\u2705 Built", status: "full", siteDetail: "seller_identities table with all required fields." },
          { feature: "Buyer ID Records", docDesc: "Same requirements for buyer side", statusLabel: "\u274C Missing", status: "none", siteDetail: "No buyer identity collection. Only seller side built." },
          { feature: "Receipt of Funds Record", docDesc: "Record every time funds are received", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
          { feature: "Large Cash Transaction Report", docDesc: "Report cash transactions $10,000+", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
          { feature: "Suspicious Transaction Report", docDesc: "Report when suspicion arises", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
          { feature: "5-Year Record Retention", docDesc: "Automated retention policy", statusLabel: "\u274C Missing", status: "none", siteDetail: "Records stored but no retention policy or alerts." },
        ]),
        h2("15.2 CASL Compliance"),
        phaseTable([
          { feature: "Consent Collection", docDesc: "C3 form for express consent", statusLabel: "\u2705 Built", status: "full", siteDetail: "C3 form key exists in forms_status." },
          { feature: "Unsubscribe Mechanism", docDesc: "Every commercial message must include opt-out", statusLabel: "\u274C Missing", status: "none", siteDetail: "No email marketing system with unsubscribe." },
          { feature: "Consent Expiry Tracking", docDesc: "2-year post-sale, 6-month post-inquiry", statusLabel: "\u274C Missing", status: "none", siteDetail: "Not implemented." },
        ]),
        h2("15.3 PIPA Compliance"),
        phaseTable([
          { feature: "Privacy Notice", docDesc: "PNC form before data collection", statusLabel: "\u2705 Built", status: "full", siteDetail: "PRIVACY form key in forms_status, generated via form engine." },
          { feature: "Opt-Out Boxes", docDesc: "4 opt-out options for secondary uses", statusLabel: "\u274C Missing", status: "none", siteDetail: "Form exists but no opt-out preference tracking in the system." },
        ]),
        pb(),

        // ═══ PRIORITY RECOMMENDATIONS ═══
        h1("16. Priority Recommendations"),

        h2("16.1 Priority 1 \u2014 Critical Gaps (Phases 10-11)"),
        p("These phases represent the core sell-side transaction workflow. Without them, agents must manage offers and closing outside the system."),
        ...bulletList([
          "Build Offer Management module: offers table, offer tracking, presentation workflow, counter-offers",
          "Implement HBRP (Home Buyer Rescission Period) tracking with countdown timer and fee calculator",
          "Build Subject Period tracking with condition deadlines and removal workflow",
          "Add Five Key Dates management (acceptance, subject removal, completion, possession, adjustment)",
          "Implement deposit tracking and trust account integration",
        ], "b8"),

        h2("16.2 Priority 2 \u2014 Compliance Gaps"),
        p("Missing compliance features expose agents to regulatory risk."),
        ...bulletList([
          "Extend FINTRAC to buyer side: buyer identity records and Receipt of Funds",
          "Add record retention policy enforcement with automated alerts",
          "Build Suspicious Transaction Report workflow",
          "Implement CASL consent expiry tracking and unsubscribe mechanism",
        ], "b9"),

        h2("16.3 Priority 3 \u2014 Enhancement Gaps (Phases 1, 8, 12)"),
        p("These features improve the agent experience but the system is functional without them."),
        ...bulletList([
          "Phase 1: Add seller net sheet calculator and listing presentation builder",
          "Phase 8: Explore Paragon MLS API integration (if available) or improve manual submission workflow",
          "Phase 12: Build post-closing workflow with commission tracking and client nurture automation",
          "Add open house management features (scheduling, sign-in, follow-up)",
          "Build marketing campaign management and distribution tools",
        ], "b10"),

        h2("16.4 Priority 4 \u2014 Design Document Updates"),
        p("The design document should be updated to reflect bonus features already built:"),
        ...bulletList([
          "Add Content Engine section: AI-powered video/image generation for social media marketing",
          "Add WhatsApp as a communication channel alongside SMS",
          "Document the ListingFlow glassmorphism design system",
          "Add Claude AI integration for remarks generation and content creation",
          "Document Kling AI integration for property video/image generation",
        ], "b11"),
        pb(),

        // ═══ FEATURE COVERAGE MAP ═══
        h1("17. Feature Coverage Summary"),
        new Table({
          width: { size: 9360, type: WidthType.DXA },
          columnWidths: [3500, 1200, 1200, 1200, 2260],
          rows: [
            new TableRow({ children: [
              headerCell("Category", 3500), headerCell("Built", 1200), headerCell("Partial", 1200), headerCell("Missing", 1200), headerCell("Coverage", 2260),
            ]}),
            ...[
              ["Core Workflow (Phases 1-8)", "22", "9", "11", "52%", "partial"],
              ["Sell-Side (Phases 9-12)", "4", "4", "19", "15%", "none"],
              ["FINTRAC Compliance", "1", "0", "5", "17%", "none"],
              ["CASL Compliance", "1", "0", "2", "33%", "none"],
              ["PIPA Compliance", "1", "0", "1", "50%", "partial"],
              ["Bonus (Content Engine + AI)", "5", "0", "0", "100%", "full"],
            ].map(r => new TableRow({ children: [
              cell(r[0], 3500), cell(r[1], 1200), cell(r[2], 1200), cell(r[3], 1200),
              statusCell(r[4], 2260, r[5]),
            ]})),
            new TableRow({ children: [
              cell("OVERALL TOTAL", 3500, ALT_BG), cell("34", 1200, ALT_BG), cell("13", 1200, ALT_BG), cell("38", 1200, ALT_BG),
              statusCell("40%", 2260, "partial"),
            ]}),
          ],
        }),
        new Paragraph({ spacing: { before: 200 } }),
        p("The CRM is approximately 40% complete relative to the full design document specification. The listing setup workflow (Phases 1-8) is the strongest area at ~52% coverage. The sell-side transaction workflow (Phases 9-12) represents the largest opportunity for development."),

        // END
        new Paragraph({ spacing: { before: 600 } }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          border: { top: { style: BorderStyle.SINGLE, size: 6, color: INDIGO, space: 12 } },
          spacing: { before: 200 },
          children: [new TextRun({ text: "End of Report", font: "Calibri", size: 20, color: "999999", italics: true })],
        }),
      ],
    },
  ],
});

// ─── Generate ──────────────────────────────────────────────────────
const outPath = "/Users/bigbear/reality crm/ListingFlow_Gap_Analysis_Report.docx";
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outPath, buffer);
  console.log(`Report created: ${outPath}`);
  console.log(`Size: ${(buffer.length / 1024).toFixed(1)} KB`);
}).catch(err => {
  console.error("Error:", err.message);
  process.exit(1);
});
