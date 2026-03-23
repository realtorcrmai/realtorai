import type { ListingDocument } from "@/types";

// --- Types ---

export type StepStatus = "completed" | "in-progress" | "pending";

export type SubStep = {
  id: string;
  name: string;
};

export type WorkflowStep = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  substeps: SubStep[];
};

export type MessageContext = {
  address?: string;
  sellerName?: string;
  listPrice?: number | null;
  mlsNumber?: string | null;
  status: string;
  documentCount: number;
  formStatuses: Record<string, "draft" | "completed">;
};

export type FieldItem = {
  label: string;
  value: string;
  editKey?: string;
  editTarget?: "listing" | "contact";
  inputType?: "text" | "number" | "time";
};

export type DataSection = { title: string; fields: FieldItem[] };

export type StepDataContext = {
  seller?: { name: string; phone: string; email: string | null; type?: string };
  listing: {
    status: string;
    address?: string;
    list_price?: number | null;
    mls_number?: string | null;
    lockbox_code?: string;
    notes?: string | null;
    showing_window_start?: string | null;
    showing_window_end?: string | null;
    created_at?: string;
  };
  documents: ListingDocument[];
  formStatuses: Record<string, "draft" | "completed">;
  showingsCount?: number;
  stepFormData?: Record<string, Record<string, unknown>>;
};

// --- Constants ---

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "seller-intake",
    name: "Seller Intake",
    desc: "Seller identity, property address, pricing & disclosures",
    icon: "👤",
    substeps: [
      { id: "verify-seller-id", name: "Verify seller identity" },
      { id: "confirm-address", name: "Confirm property address" },
      { id: "pricing-expectations", name: "Discuss pricing expectations" },
      { id: "sign-dorts-intake", name: "Sign DORTS" },
    ],
  },
  {
    id: "data-enrichment",
    name: "Data Enrichment",
    desc: "Geocoder → ParcelMap → LTSA → BC Assessment",
    icon: "🔍",
    substeps: [
      { id: "property-assessment", name: "Property assessment data" },
      { id: "tax-records", name: "Tax records" },
      { id: "title-search", name: "Title search" },
      { id: "strata-docs", name: "Strata docs (if applicable)" },
    ],
  },
  {
    id: "cma",
    name: "CMA",
    desc: "Comparable market analysis & suggested price range",
    icon: "📊",
    substeps: [
      { id: "pull-comparables", name: "Pull comparable sales" },
      { id: "analyze-trends", name: "Analyze market trends" },
      { id: "generate-cma-report", name: "Generate CMA report" },
      { id: "present-to-seller", name: "Present to seller" },
    ],
  },
  {
    id: "pricing-review",
    name: "Pricing & Review",
    desc: "Agent confirms list price & marketing strategy",
    icon: "💰",
    substeps: [
      { id: "confirm-list-price", name: "Confirm list price" },
      { id: "set-marketing-strategy", name: "Set marketing strategy" },
      { id: "review-listing-details", name: "Review listing details" },
      { id: "approve-photos", name: "Approve photos/descriptions" },
    ],
  },
  {
    id: "form-generation",
    name: "Form Generation",
    desc: "12 standard + conditional BCREA forms auto-filled",
    icon: "📄",
    substeps: [
      { id: "fill-fintrac", name: "Fill FINTRAC" },
      { id: "fill-dorts", name: "Fill DORTS" },
      { id: "fill-pds", name: "Fill PDS" },
      { id: "fill-mlc", name: "Fill MLC" },
    ],
  },
  {
    id: "e-signature",
    name: "E-Signature",
    desc: "DocuSign routing to seller & agent",
    icon: "✍️",
    substeps: [
      { id: "send-docs-seller", name: "Send docs to seller" },
      { id: "seller-signs", name: "Seller signs" },
      { id: "agent-countersigns", name: "Agent counter-signs" },
      { id: "archive-signed", name: "Archive signed copies" },
    ],
  },
  {
    id: "mls-prep",
    name: "MLS Preparation",
    desc: "Photos, descriptions, feature sheets",
    icon: "📸",
    substeps: [
      { id: "pro-photos", name: "Professional photos" },
      { id: "property-desc", name: "Property description" },
      { id: "feature-sheet", name: "Feature sheet" },
      { id: "virtual-tour", name: "Virtual tour" },
    ],
  },
  {
    id: "mls-submission",
    name: "MLS Submission",
    desc: "Listed on MLS, marketing goes live",
    icon: "🚀",
    substeps: [
      { id: "enter-mls-data", name: "Enter MLS data" },
      { id: "verify-listing", name: "Verify listing details" },
      { id: "submit-to-board", name: "Submit to board" },
      { id: "confirm-live", name: "Confirm live on MLS" },
    ],
  },
  {
    id: "post-listing",
    name: "Post-Listing",
    desc: "Showings, offers, negotiations, closing",
    icon: "🏠",
    substeps: [
      { id: "schedule-showings", name: "Schedule showings" },
      { id: "review-offers", name: "Review offers" },
      { id: "negotiate-terms", name: "Negotiate terms" },
      { id: "close-transaction", name: "Close transaction" },
    ],
  },
];

export const STATUS_STYLES = {
  completed: {
    circle: "bg-green-500 shadow-sm shadow-green-500/30",
    connector: "bg-green-500",
    text: "text-foreground",
    badge: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    badgeLabel: "COMPLETE",
  },
  "in-progress": {
    circle: "border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/50",
    connector: "bg-muted-foreground/15",
    text: "text-orange-600 dark:text-orange-400",
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    badgeLabel: "IN PROGRESS",
  },
  pending: {
    circle: "border-2 border-muted-foreground/25 bg-muted/50",
    connector: "bg-muted-foreground/15",
    text: "text-muted-foreground",
    badge: "",
    badgeLabel: "",
  },
} as const;

// --- Pure functions ---

export function formatPrice(price: number): string {
  return Number(price).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

export function deriveStepStatuses(
  listing: { status: string; mls_number?: string | null; list_price?: number | null },
  documents: ListingDocument[],
  formStatuses: Record<string, "draft" | "completed"> = {}
): Record<string, StepStatus> {
  const docTypes = new Set(documents.map((d) => d.doc_type));
  const hasRequiredDocs =
    docTypes.has("FINTRAC") && docTypes.has("DORTS") && docTypes.has("PDS");
  const hasPrice = listing.list_price != null;
  const hasMls = !!listing.mls_number;
  const isSold = listing.status === "sold";
  const isPending = listing.status === "pending";

  const requiredFormKeys = ["fintrac", "dorts", "pds", "mlc"];
  const allFormsCompleted = requiredFormKeys.every(
    (key) => formStatuses[key] === "completed"
  );
  const anyFormStarted = requiredFormKeys.some(
    (key) => formStatuses[key] === "draft" || formStatuses[key] === "completed"
  );

  const formsComplete = allFormsCompleted || hasRequiredDocs;

  const statuses: Record<string, StepStatus> = {};

  if (isSold) {
    const allSteps = [
      "seller-intake", "data-enrichment", "cma", "pricing-review",
      "form-generation", "e-signature", "mls-prep", "mls-submission", "post-listing",
    ];
    allSteps.forEach((s) => (statuses[s] = "completed"));
    return statuses;
  }

  statuses["seller-intake"] = "completed";
  statuses["data-enrichment"] = hasPrice ? "completed" : "in-progress";
  statuses["cma"] = hasPrice ? "completed" : "pending";
  statuses["pricing-review"] = hasPrice ? "completed" : "pending";
  statuses["form-generation"] = formsComplete
    ? "completed"
    : hasPrice && anyFormStarted
      ? "in-progress"
      : hasPrice
        ? "in-progress"
        : "pending";
  statuses["e-signature"] = formsComplete ? "completed" : "pending";
  statuses["mls-prep"] = hasMls ? "completed" : formsComplete ? "in-progress" : "pending";
  statuses["mls-submission"] = hasMls ? "completed" : "pending";
  statuses["post-listing"] = isPending
    ? "in-progress"
    : hasMls
      ? "in-progress"
      : "pending";

  const stepOrder = [
    "seller-intake", "data-enrichment", "cma", "pricing-review",
    "form-generation", "e-signature", "mls-prep", "mls-submission", "post-listing",
  ];
  for (let i = 1; i < stepOrder.length; i++) {
    const prevStatus = statuses[stepOrder[i - 1]];
    const currStatus = statuses[stepOrder[i]];
    if (prevStatus !== "completed") {
      if (currStatus === "completed") {
        statuses[stepOrder[i]] = "pending";
      }
      if (currStatus === "in-progress" && prevStatus === "pending") {
        statuses[stepOrder[i]] = "pending";
      }
    }
  }

  return statuses;
}

export function deriveSubstepStatuses(
  listing: { status: string; mls_number?: string | null; list_price?: number | null },
  documents: ListingDocument[],
  formStatuses: Record<string, "draft" | "completed">,
  stepStatuses: Record<string, StepStatus>
): Record<string, StepStatus> {
  const hasMls = !!listing.mls_number;
  const isSold = listing.status === "sold";
  const isPending = listing.status === "pending";

  const sub: Record<string, StepStatus> = {};

  function deriveFromParent(parentId: string, substepIds: string[]) {
    const parentStatus = stepStatuses[parentId];
    if (parentStatus === "completed") {
      substepIds.forEach((id) => (sub[id] = "completed"));
    } else if (parentStatus === "in-progress") {
      substepIds.forEach((id, idx) => (sub[id] = idx === 0 ? "in-progress" : "pending"));
    } else {
      substepIds.forEach((id) => (sub[id] = "pending"));
    }
  }

  // Seller Intake — always completed
  sub["verify-seller-id"] = "completed";
  sub["confirm-address"] = "completed";
  sub["pricing-expectations"] = "completed";
  sub["sign-dorts-intake"] = "completed";

  deriveFromParent("data-enrichment", ["property-assessment", "tax-records", "title-search", "strata-docs"]);
  deriveFromParent("cma", ["pull-comparables", "analyze-trends", "generate-cma-report", "present-to-seller"]);
  deriveFromParent("pricing-review", ["confirm-list-price", "set-marketing-strategy", "review-listing-details", "approve-photos"]);

  // Form Generation — granular from formStatuses
  const formMap: Record<string, string> = {
    "fill-fintrac": "fintrac",
    "fill-dorts": "dorts",
    "fill-pds": "pds",
    "fill-mlc": "mlc",
  };
  for (const [substepId, formKey] of Object.entries(formMap)) {
    const status = formStatuses[formKey];
    if (status === "completed") {
      sub[substepId] = "completed";
    } else if (status === "draft") {
      sub[substepId] = "in-progress";
    } else {
      sub[substepId] = "pending";
    }
  }

  deriveFromParent("e-signature", ["send-docs-seller", "seller-signs", "agent-countersigns", "archive-signed"]);
  deriveFromParent("mls-prep", ["pro-photos", "property-desc", "feature-sheet", "virtual-tour"]);
  deriveFromParent("mls-submission", ["enter-mls-data", "verify-listing", "submit-to-board", "confirm-live"]);

  // Post-Listing — granular based on listing status
  if (isSold) {
    sub["schedule-showings"] = "completed";
    sub["review-offers"] = "completed";
    sub["negotiate-terms"] = "completed";
    sub["close-transaction"] = "completed";
  } else if (isPending) {
    sub["schedule-showings"] = "completed";
    sub["review-offers"] = "completed";
    sub["negotiate-terms"] = "in-progress";
    sub["close-transaction"] = "pending";
  } else if (hasMls) {
    sub["schedule-showings"] = "in-progress";
    sub["review-offers"] = "pending";
    sub["negotiate-terms"] = "pending";
    sub["close-transaction"] = "pending";
  } else {
    sub["schedule-showings"] = "pending";
    sub["review-offers"] = "pending";
    sub["negotiate-terms"] = "pending";
    sub["close-transaction"] = "pending";
  }

  return sub;
}

export function getSubstepMessage(
  substepId: string,
  substepStatus: StepStatus,
  ctx: MessageContext
): string {
  const seller = ctx.sellerName ?? "seller";
  const addr = ctx.address ?? "property";
  const price = ctx.listPrice ? formatPrice(ctx.listPrice) : null;
  const mls = ctx.mlsNumber ?? "MLS";

  const messages: Record<string, Record<StepStatus, string>> = {
    "verify-seller-id": {
      completed: `Seller verified — ${seller}`,
      "in-progress": "Verifying seller identity...",
      pending: "Will verify seller identity",
    },
    "confirm-address": {
      completed: `Address confirmed — ${addr}`,
      "in-progress": "Confirming property address...",
      pending: "Will confirm property address",
    },
    "pricing-expectations": {
      completed: `Pricing discussed with ${seller}`,
      "in-progress": "Discussing pricing with seller...",
      pending: "Will discuss pricing expectations",
    },
    "sign-dorts-intake": {
      completed: "DORTS signed at intake",
      "in-progress": "Awaiting DORTS signature...",
      pending: "Will collect DORTS signature",
    },
    "property-assessment": {
      completed: `BC Assessment data pulled for ${addr}`,
      "in-progress": "Connecting to BC Assessment...",
      pending: "Will pull property assessment data",
    },
    "tax-records": {
      completed: "Tax records retrieved",
      "in-progress": "Fetching tax records from municipality...",
      pending: "Will retrieve tax records",
    },
    "title-search": {
      completed: "Title search complete via LTSA",
      "in-progress": "Running title search on LTSA...",
      pending: "Will search title via LTSA",
    },
    "strata-docs": {
      completed: "Strata documents collected",
      "in-progress": "Requesting strata docs from management...",
      pending: "Will request strata docs if applicable",
    },
    "pull-comparables": {
      completed: "Comparable sales pulled from MLS",
      "in-progress": "Pulling comparable sales from MLS...",
      pending: "Will pull comparable sales",
    },
    "analyze-trends": {
      completed: "Market trends analyzed for area",
      "in-progress": `Analyzing market trends near ${addr}...`,
      pending: "Will analyze local market trends",
    },
    "generate-cma-report": {
      completed: "CMA report generated",
      "in-progress": "Generating CMA report...",
      pending: "Will generate CMA report",
    },
    "present-to-seller": {
      completed: `CMA presented to ${seller}`,
      "in-progress": "Preparing CMA presentation...",
      pending: "Will present CMA to seller",
    },
    "confirm-list-price": {
      completed: price ? `List price set at ${price}` : "List price confirmed",
      "in-progress": "Confirming list price...",
      pending: "Will confirm list price",
    },
    "set-marketing-strategy": {
      completed: "Marketing strategy defined",
      "in-progress": "Setting marketing strategy...",
      pending: "Will define marketing strategy",
    },
    "review-listing-details": {
      completed: "Listing details reviewed",
      "in-progress": `Reviewing listing details for ${addr}...`,
      pending: "Will review listing details",
    },
    "approve-photos": {
      completed: "Photos and descriptions approved",
      "in-progress": "Reviewing photos and descriptions...",
      pending: "Will approve photos & descriptions",
    },
    "fill-fintrac": {
      completed: "FINTRAC form completed",
      "in-progress": "Auto-filling FINTRAC fields...",
      pending: "Will generate FINTRAC form",
    },
    "fill-dorts": {
      completed: "DORTS form completed",
      "in-progress": "Auto-filling DORTS fields...",
      pending: "Will generate DORTS form",
    },
    "fill-pds": {
      completed: "PDS form completed",
      "in-progress": "Auto-filling Property Disclosure...",
      pending: "Will generate PDS form",
    },
    "fill-mlc": {
      completed: "MLC form completed",
      "in-progress": "Auto-filling Listing Contract...",
      pending: "Will generate MLC form",
    },
    "send-docs-seller": {
      completed: `Documents sent to ${seller}`,
      "in-progress": "Sending documents via DocuSign...",
      pending: "Will send documents to seller",
    },
    "seller-signs": {
      completed: `${seller} signed all documents`,
      "in-progress": `Awaiting ${seller}'s signature...`,
      pending: "Will await seller signature",
    },
    "agent-countersigns": {
      completed: "Agent counter-signed",
      "in-progress": "Awaiting agent counter-signature...",
      pending: "Will collect agent counter-signature",
    },
    "archive-signed": {
      completed: "Signed documents archived",
      "in-progress": "Archiving signed copies...",
      pending: "Will archive signed copies",
    },
    "pro-photos": {
      completed: "Professional photos uploaded",
      "in-progress": "Scheduling professional photography...",
      pending: "Will arrange professional photos",
    },
    "property-desc": {
      completed: "Property description written",
      "in-progress": "Drafting property description...",
      pending: "Will write property description",
    },
    "feature-sheet": {
      completed: "Feature sheet created",
      "in-progress": `Generating feature sheet for ${addr}...`,
      pending: "Will create feature sheet",
    },
    "virtual-tour": {
      completed: "Virtual tour ready",
      "in-progress": "Processing virtual tour media...",
      pending: "Will set up virtual tour",
    },
    "enter-mls-data": {
      completed: "MLS data entered",
      "in-progress": "Entering listing data into MLS...",
      pending: "Will enter data into MLS",
    },
    "verify-listing": {
      completed: "Listing verified on MLS",
      "in-progress": "Verifying listing accuracy...",
      pending: "Will verify listing details",
    },
    "submit-to-board": {
      completed: "Submitted to real estate board",
      "in-progress": "Submitting to real estate board...",
      pending: "Will submit to board",
    },
    "confirm-live": {
      completed: `Live on MLS as ${mls}`,
      "in-progress": "Confirming listing is live...",
      pending: "Will confirm live on MLS",
    },
    "schedule-showings": {
      completed: "Showings being managed",
      "in-progress": "Coordinating showing schedule...",
      pending: "Will schedule showings",
    },
    "review-offers": {
      completed: `Offers reviewed with ${seller}`,
      "in-progress": "Monitoring incoming offers...",
      pending: "Will review incoming offers",
    },
    "negotiate-terms": {
      completed: "Terms negotiated and accepted",
      "in-progress": "Negotiating terms with buyers...",
      pending: "Will negotiate terms",
    },
    "close-transaction": {
      completed: "Transaction closed",
      "in-progress": "Finalizing closing paperwork...",
      pending: "Will close transaction",
    },
  };

  return messages[substepId]?.[substepStatus] ?? "";
}

export function getStepDataSections(stepId: string, ctx: StepDataContext): DataSection[] | null {
  const { seller, listing, documents, formStatuses, stepFormData } = ctx;
  const price = listing.list_price
    ? formatPrice(listing.list_price)
    : "Not set";

  switch (stepId) {
    case "seller-intake":
      return [
        {
          title: "Seller Identity",
          fields: [
            { label: "Full Name", value: seller?.name ?? "—", editKey: "name", editTarget: "contact" },
            { label: "Phone", value: seller?.phone ?? "—", editKey: "phone", editTarget: "contact" },
            { label: "Email", value: seller?.email ?? "—", editKey: "email", editTarget: "contact" },
            { label: "Seller Type", value: (stepFormData?.["step-seller-intake"]?.seller_type as string) ?? (seller?.type ? seller.type.charAt(0).toUpperCase() + seller.type.slice(1) : "—") },
          ],
        },
        {
          title: "Property",
          fields: [
            { label: "Address", value: listing.address ?? "—", editKey: "address", editTarget: "listing" },
            { label: "Lockbox Code", value: listing.lockbox_code ?? "—", editKey: "lockbox_code", editTarget: "listing" },
          ],
        },
        {
          title: "Pricing & Terms",
          fields: [
            { label: "List Price", value: price, editKey: "list_price", editTarget: "listing", inputType: "number" },
            { label: "Status", value: listing.status.charAt(0).toUpperCase() + listing.status.slice(1) },
            ...(listing.notes ? [{ label: "Notes", value: listing.notes, editKey: "notes", editTarget: "listing" as const }] : [{ label: "Notes", value: "—", editKey: "notes", editTarget: "listing" as const }]),
          ],
        },
      ];

    case "data-enrichment": {
      const de = stepFormData?.["step-data-enrichment"] ?? {};
      const val = (key: string) => {
        const v = de[key];
        return v != null && v !== "" ? String(v) : "—";
      };
      return [
        {
          title: "Property Assessment",
          fields: [
            { label: "Assessed Value", value: val("assessed_value") },
            { label: "Assessment Year", value: val("assessment_year") },
            { label: "Lot Size", value: val("lot_size") },
            { label: "Year Built", value: val("year_built") },
          ],
        },
        {
          title: "Tax & Title",
          fields: [
            { label: "Annual Taxes", value: val("annual_taxes") },
            { label: "PID", value: val("pid") },
            { label: "Title Number", value: val("title_number") },
          ],
        },
        {
          title: "Dwelling Classification",
          fields: [
            { label: "Type", value: val("dwelling_type") },
            { label: "Style", value: val("dwelling_style") },
            { label: "Bedrooms", value: val("bedrooms") },
            { label: "Bathrooms", value: val("bathrooms") },
          ],
        },
        {
          title: "Floor Area",
          fields: [
            { label: "Total", value: val("total_floor_area") },
            { label: "Main", value: val("main_floor_area") },
            { label: "Upper", value: val("upper_floor_area") },
            { label: "Basement", value: val("basement_area") },
          ],
        },
        {
          title: "Construction & Systems",
          fields: [
            { label: "Foundation", value: val("foundation_type") },
            { label: "Roof", value: val("roof_type") },
            { label: "Heating", value: val("heating_type") },
            { label: "Fuel", value: val("fuel_type") },
          ],
        },
      ];
    }

    case "cma":
      return [
        {
          title: "Market Analysis",
          fields: [
            { label: "Area", value: listing.address ?? "—" },
            { label: "Comparable Sales", value: "✓ Pulled from MLS" },
            { label: "Market Trends", value: "✓ Analyzed" },
            { label: "CMA Report", value: "✓ Generated" },
            { label: "Presented To", value: seller?.name ?? "Seller" },
          ],
        },
      ];

    case "pricing-review":
      return [
        {
          title: "Pricing",
          fields: [
            { label: "List Price", value: price, editKey: "list_price", editTarget: "listing", inputType: "number" },
            { label: "Marketing Strategy", value: "✓ Defined" },
          ],
        },
        {
          title: "Review",
          fields: [
            { label: "Listing Details", value: "✓ Reviewed" },
            { label: "Photos & Descriptions", value: "✓ Approved" },
            { label: "Showing Start", value: listing.showing_window_start ?? "Not set", editKey: "showing_window_start", editTarget: "listing", inputType: "time" },
            { label: "Showing End", value: listing.showing_window_end ?? "Not set", editKey: "showing_window_end", editTarget: "listing", inputType: "time" },
          ],
        },
      ];

    case "form-generation": {
      const formNames: Record<string, string> = {
        fintrac: "FINTRAC",
        dorts: "DORTS",
        pds: "PDS",
        mlc: "MLC",
      };
      const fields: FieldItem[] = Object.entries(formNames).map(([key, name]) => {
        const s = formStatuses[key];
        return {
          label: name,
          value: s === "completed" ? "✓ Completed" : s === "draft" ? "◐ Draft" : "○ Pending",
        };
      });
      return [{ title: "BC Standard Forms", fields }];
    }

    case "e-signature": {
      const docCount = documents.length;
      return [
        {
          title: "Document Signing",
          fields: [
            { label: "Documents Sent", value: `✓ Sent to ${seller?.name ?? "seller"}` },
            { label: "Seller Signature", value: "✓ Signed" },
            { label: "Agent Counter-Sign", value: "✓ Counter-signed" },
            { label: "Archived", value: `✓ ${docCount} document${docCount !== 1 ? "s" : ""} archived` },
          ],
        },
      ];
    }

    case "mls-prep":
      return [
        {
          title: "Listing Media",
          fields: [
            { label: "Professional Photos", value: "✓ Uploaded" },
            { label: "Property Description", value: "✓ Written" },
            { label: "Feature Sheet", value: "✓ Created" },
            { label: "Virtual Tour", value: "✓ Ready" },
          ],
        },
      ];

    case "mls-submission":
      return [
        {
          title: "MLS Details",
          fields: [
            { label: "MLS Number", value: listing.mls_number ?? "—", editKey: "mls_number", editTarget: "listing" },
            { label: "Status", value: "✓ Live on MLS" },
            { label: "Submitted To", value: "Real Estate Board" },
            { label: "Listing Address", value: listing.address ?? "—" },
          ],
        },
      ];

    case "post-listing": {
      const showings = ctx.showingsCount ?? 0;
      const isSold = listing.status === "sold";
      const isPending = listing.status === "pending";
      return [
        {
          title: "Transaction Progress",
          fields: [
            { label: "Showings", value: showings > 0 ? `${showings} showing${showings !== 1 ? "s" : ""} managed` : "No showings yet" },
            { label: "Offers", value: isSold || isPending ? "✓ Reviewed" : "Pending" },
            { label: "Negotiation", value: isSold ? "✓ Accepted" : isPending ? "In progress" : "Pending" },
            { label: "Closing", value: isSold ? "✓ Transaction closed" : "Pending" },
          ],
        },
      ];
    }

    default:
      return null;
  }
}
