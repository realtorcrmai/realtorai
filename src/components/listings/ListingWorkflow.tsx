"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { ListingDocument } from "@/types";

type StepStatus = "completed" | "in-progress" | "pending";

type SubStep = {
  id: string;
  name: string;
};

type WorkflowStep = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  substeps: SubStep[];
};

const WORKFLOW_STEPS: WorkflowStep[] = [
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

const STATUS_STYLES = {
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
};

function deriveStepStatuses(
  listing: { status: string; mls_number?: string | null; list_price?: number | null },
  documents: ListingDocument[]
): Record<string, StepStatus> {
  const docTypes = new Set(documents.map((d) => d.doc_type));
  const hasRequiredDocs =
    docTypes.has("FINTRAC") && docTypes.has("DORTS") && docTypes.has("PDS");
  const hasPrice = listing.list_price != null;
  const hasMls = !!listing.mls_number;
  const isSold = listing.status === "sold";
  const isPending = listing.status === "pending";

  const statuses: Record<string, StepStatus> = {};

  statuses["seller-intake"] = "completed";
  statuses["data-enrichment"] = hasPrice ? "completed" : "in-progress";
  statuses["cma"] = hasPrice ? "completed" : "pending";
  statuses["pricing-review"] = hasPrice ? "completed" : "pending";
  statuses["form-generation"] = hasRequiredDocs
    ? "completed"
    : hasPrice
      ? "in-progress"
      : "pending";
  statuses["e-signature"] = hasRequiredDocs ? "completed" : "pending";
  statuses["mls-prep"] = hasMls ? "completed" : hasRequiredDocs ? "in-progress" : "pending";
  statuses["mls-submission"] = hasMls ? "completed" : "pending";
  statuses["post-listing"] = isSold
    ? "completed"
    : isPending
      ? "in-progress"
      : hasMls
        ? "in-progress"
        : "pending";

  return statuses;
}

function deriveSubstepStatuses(
  listing: { status: string; mls_number?: string | null; list_price?: number | null },
  documents: ListingDocument[],
  formStatuses: Record<string, "draft" | "completed">,
  stepStatuses: Record<string, StepStatus>
): Record<string, StepStatus> {
  const hasMls = !!listing.mls_number;
  const isSold = listing.status === "sold";
  const isPending = listing.status === "pending";

  const sub: Record<string, StepStatus> = {};

  // Helper: when parent is completed, all substeps complete.
  // When in-progress, first substep in-progress, rest pending.
  // When pending, all pending.
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

  // Data Enrichment
  deriveFromParent("data-enrichment", [
    "property-assessment",
    "tax-records",
    "title-search",
    "strata-docs",
  ]);

  // CMA
  deriveFromParent("cma", [
    "pull-comparables",
    "analyze-trends",
    "generate-cma-report",
    "present-to-seller",
  ]);

  // Pricing & Review
  deriveFromParent("pricing-review", [
    "confirm-list-price",
    "set-marketing-strategy",
    "review-listing-details",
    "approve-photos",
  ]);

  // Form Generation — has real granular data from formStatuses!
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

  // E-Signature
  deriveFromParent("e-signature", [
    "send-docs-seller",
    "seller-signs",
    "agent-countersigns",
    "archive-signed",
  ]);

  // MLS Preparation
  deriveFromParent("mls-prep", [
    "pro-photos",
    "property-desc",
    "feature-sheet",
    "virtual-tour",
  ]);

  // MLS Submission
  deriveFromParent("mls-submission", [
    "enter-mls-data",
    "verify-listing",
    "submit-to-board",
    "confirm-live",
  ]);

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

// --- Activity Messages ---

type MessageContext = {
  address?: string;
  sellerName?: string;
  listPrice?: number | null;
  mlsNumber?: string | null;
  status: string;
  documentCount: number;
  formStatuses: Record<string, "draft" | "completed">;
};

function formatPrice(price: number): string {
  return Number(price).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

function getSubstepMessage(
  substepId: string,
  substepStatus: StepStatus,
  ctx: MessageContext
): string {
  const seller = ctx.sellerName ?? "seller";
  const addr = ctx.address ?? "property";
  const price = ctx.listPrice ? formatPrice(ctx.listPrice) : null;
  const mls = ctx.mlsNumber ?? "MLS";

  const messages: Record<string, Record<StepStatus, string>> = {
    // Seller Intake
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
    // Data Enrichment
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
    // CMA
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
    // Pricing & Review
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
    // Form Generation
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
    // E-Signature
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
    // MLS Preparation
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
    // MLS Submission
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
    // Post-Listing
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

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:0ms]" />
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:150ms]" />
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

// --- Step Data Panels (show actual data for completed steps) ---

type FieldItem = { label: string; value: string };
type DataSection = { title: string; fields: FieldItem[] };

type StepDataContext = {
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
};

function getStepDataSections(stepId: string, ctx: StepDataContext): DataSection[] | null {
  const { seller, listing, documents, formStatuses } = ctx;
  const price = listing.list_price
    ? formatPrice(listing.list_price)
    : "Not set";

  switch (stepId) {
    case "seller-intake":
      return [
        {
          title: "Seller Identity",
          fields: [
            { label: "Full Name", value: seller?.name ?? "—" },
            { label: "Phone", value: seller?.phone ?? "—" },
            { label: "Email", value: seller?.email ?? "—" },
            { label: "Type", value: seller?.type ? seller.type.charAt(0).toUpperCase() + seller.type.slice(1) : "—" },
          ],
        },
        {
          title: "Property",
          fields: [
            { label: "Address", value: listing.address ?? "—" },
            { label: "Lockbox Code", value: listing.lockbox_code ?? "—" },
          ],
        },
        {
          title: "Pricing & Terms",
          fields: [
            { label: "List Price", value: price },
            { label: "Status", value: listing.status.charAt(0).toUpperCase() + listing.status.slice(1) },
            ...(listing.notes ? [{ label: "Notes", value: listing.notes }] : []),
          ],
        },
      ];

    case "data-enrichment":
      return [
        {
          title: "Property Assessment",
          fields: [
            { label: "Address", value: listing.address ?? "—" },
            { label: "Source", value: "BC Assessment" },
            { label: "Status", value: "✓ Retrieved" },
          ],
        },
        {
          title: "Records & Search",
          fields: [
            { label: "Tax Records", value: "✓ Retrieved from municipality" },
            { label: "Title Search", value: "✓ Complete via LTSA" },
            { label: "Strata Docs", value: "Collected (if applicable)" },
          ],
        },
      ];

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
            { label: "List Price", value: price },
            { label: "Marketing Strategy", value: "✓ Defined" },
          ],
        },
        {
          title: "Review",
          fields: [
            { label: "Listing Details", value: "✓ Reviewed" },
            { label: "Photos & Descriptions", value: "✓ Approved" },
            ...(listing.showing_window_start
              ? [{ label: "Showing Window", value: `${listing.showing_window_start} — ${listing.showing_window_end ?? "Open"}` }]
              : []),
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
            { label: "MLS Number", value: listing.mls_number ?? "—" },
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

function StepDataPanel({ sections }: { sections: DataSection[] }) {
  return (
    <div className="ml-7 mt-3 space-y-4">
      {sections.map((section) => (
        <div key={section.title}>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {section.title}
          </h4>
          <div className="grid grid-cols-2 gap-x-6 gap-y-2">
            {section.fields.map((field) => (
              <div key={field.label} className={field.value.length > 40 ? "col-span-2" : ""}>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground/70">
                  {field.label}
                </dt>
                <dd className="text-sm text-foreground mt-0.5">
                  {field.value}
                </dd>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// --- Component ---

export function ListingWorkflow({
  listing,
  documents,
  formStatuses = {},
  seller,
  showingsCount,
}: {
  listing: {
    status: string;
    mls_number?: string | null;
    list_price?: number | null;
    address?: string;
    seller_name?: string;
    lockbox_code?: string;
    notes?: string | null;
    showing_window_start?: string | null;
    showing_window_end?: string | null;
    created_at?: string;
  };
  documents: ListingDocument[];
  formStatuses?: Record<string, "draft" | "completed">;
  seller?: { name: string; phone: string; email: string | null; type?: string };
  showingsCount?: number;
}) {
  const statuses = deriveStepStatuses(listing, documents);
  const substepStatuses = deriveSubstepStatuses(listing, documents, formStatuses, statuses);

  const messageCtx = useMemo<MessageContext>(
    () => ({
      address: listing.address,
      sellerName: listing.seller_name ?? seller?.name,
      listPrice: listing.list_price,
      mlsNumber: listing.mls_number,
      status: listing.status,
      documentCount: documents.length,
      formStatuses,
    }),
    [listing, documents.length, formStatuses, seller]
  );

  const stepDataCtx = useMemo<StepDataContext>(
    () => ({
      seller,
      listing,
      documents,
      formStatuses,
      showingsCount,
    }),
    [seller, listing, documents, formStatuses, showingsCount]
  );

  // Completed and in-progress steps start expanded to show activity messages
  const initialExpanded = useMemo(() => {
    const expanded = new Set<string>();
    for (const step of WORKFLOW_STEPS) {
      if (statuses[step.id] !== "pending") {
        expanded.add(step.id);
      }
    }
    return expanded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(initialExpanded);

  function toggleStep(stepId: string) {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepId)) {
        next.delete(stepId);
      } else {
        next.add(stepId);
      }
      return next;
    });
  }

  const completedCount = Object.values(statuses).filter(
    (s) => s === "completed"
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Listing Workflow</h2>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{WORKFLOW_STEPS.length} steps complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{
            width: `${(completedCount / WORKFLOW_STEPS.length) * 100}%`,
          }}
        />
      </div>

      {/* Timeline */}
      <div className="relative">
        {WORKFLOW_STEPS.map((step, i) => {
          const status = statuses[step.id];
          const styles = STATUS_STYLES[status];
          const isLast = i === WORKFLOW_STEPS.length - 1;
          const stepNumber = i + 1;
          const isExpanded = expandedSteps.has(step.id);
          const hasSubsteps = step.substeps.length > 0;

          const completedSubsteps = step.substeps.filter(
            (s) => substepStatuses[s.id] === "completed"
          ).length;

          return (
            <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
              {/* Timeline connector + circle */}
              <div className="flex flex-col items-center">
                {status === "completed" ? (
                  <button
                    type="button"
                    onClick={() => hasSubsteps && toggleStep(step.id)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-110 ${styles.circle}`}
                  >
                    <Check className="h-5 w-5 text-white" />
                  </button>
                ) : status === "in-progress" ? (
                  <button
                    type="button"
                    onClick={() => hasSubsteps && toggleStep(step.id)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-110 ${styles.circle}`}
                  >
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {stepNumber}
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => hasSubsteps && toggleStep(step.id)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-transform hover:scale-110 ${styles.circle}`}
                  >
                    <span className="text-sm font-medium text-muted-foreground/50">
                      {stepNumber}
                    </span>
                  </button>
                )}
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 mt-1.5 ${styles.connector}`}
                  />
                )}
              </div>

              {/* Content: clickable header + expandable substeps */}
              <div className="pb-2 min-w-0 pt-1.5 flex-1">
                {/* Step header — clickable */}
                <button
                  type="button"
                  onClick={() => hasSubsteps && toggleStep(step.id)}
                  className={`w-full text-left ${hasSubsteps ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base">{step.icon}</span>
                    <p
                      className={`text-base font-semibold leading-6 ${styles.text}`}
                    >
                      {step.name}
                    </p>
                    {styles.badgeLabel && (
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${styles.badge}`}
                      >
                        {styles.badgeLabel}
                      </span>
                    )}
                    {/* Substep progress + chevron */}
                    {hasSubsteps && (
                      <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1.5">
                        <span className="tabular-nums">
                          {completedSubsteps}/{step.substeps.length}
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-7">
                    {step.desc}
                  </p>
                </button>

                {/* Expandable content: data panel for completed, substeps for in-progress/pending */}
                {hasSubsteps && (
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                    style={{
                      gridTemplateRows: isExpanded ? "1fr" : "0fr",
                    }}
                  >
                    <div className="overflow-hidden">
                      {status === "completed" && (() => {
                        const sections = getStepDataSections(step.id, stepDataCtx);
                        return sections ? (
                          <div className="border border-border/50 rounded-lg bg-muted/20 p-4 mt-3 ml-7">
                            <StepDataPanel sections={sections} />
                          </div>
                        ) : null;
                      })()}
                      {status !== "completed" && (
                        <div className="ml-7 mt-3 space-y-1.5">
                          {step.substeps.map((sub) => {
                            const subStatus = substepStatuses[sub.id];
                            const message = getSubstepMessage(sub.id, subStatus, messageCtx);
                            return (
                              <div
                                key={sub.id}
                                className="flex items-start gap-2.5 py-1.5"
                              >
                                {/* Substep indicator */}
                                <div className="mt-0.5 shrink-0">
                                  {subStatus === "completed" ? (
                                    <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  ) : subStatus === "in-progress" ? (
                                    <div className="h-5 w-5 rounded-full border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center">
                                      <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                    </div>
                                  ) : (
                                    <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/25 bg-muted/50" />
                                  )}
                                </div>
                                {/* Substep name + activity message */}
                                <div className="min-w-0">
                                  <span
                                    className={`text-sm ${
                                      subStatus === "completed"
                                        ? "text-foreground"
                                        : subStatus === "in-progress"
                                          ? "text-orange-600 dark:text-orange-400 font-medium"
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    {sub.name}
                                  </span>
                                  {message && (
                                    <p
                                      className={`text-xs mt-0.5 ${
                                        subStatus === "completed"
                                          ? "text-muted-foreground"
                                          : subStatus === "in-progress"
                                            ? "text-orange-600/80 dark:text-orange-400/80"
                                            : "text-muted-foreground/60"
                                      }`}
                                    >
                                      {message}
                                      {subStatus === "in-progress" && <TypingDots />}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
