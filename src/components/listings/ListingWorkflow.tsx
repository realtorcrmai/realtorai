"use client";

import { Check } from "lucide-react";
import type { ListingDocument } from "@/types";

const WORKFLOW_STEPS = [
  {
    id: "seller-intake",
    name: "Seller Intake",
    desc: "Seller identity, property address, pricing & disclosures",
    icon: "👤",
  },
  {
    id: "data-enrichment",
    name: "Data Enrichment",
    desc: "Geocoder → ParcelMap → LTSA → BC Assessment",
    icon: "🔍",
  },
  {
    id: "cma",
    name: "CMA",
    desc: "Comparable market analysis & suggested price range",
    icon: "📊",
  },
  {
    id: "pricing-review",
    name: "Pricing & Review",
    desc: "Agent confirms list price & marketing strategy",
    icon: "💰",
  },
  {
    id: "form-generation",
    name: "Form Generation",
    desc: "12 standard + conditional BCREA forms auto-filled",
    icon: "📄",
  },
  {
    id: "e-signature",
    name: "E-Signature",
    desc: "DocuSign routing to seller & agent",
    icon: "✍️",
  },
  {
    id: "mls-prep",
    name: "MLS Preparation",
    desc: "Photos, descriptions, feature sheets",
    icon: "📸",
  },
  {
    id: "mls-submission",
    name: "MLS Submission",
    desc: "Listed on MLS, marketing goes live",
    icon: "🚀",
  },
  {
    id: "post-listing",
    name: "Post-Listing",
    desc: "Showings, offers, negotiations, closing",
    icon: "🏠",
  },
];

type StepStatus = "completed" | "in-progress" | "pending";

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

export function ListingWorkflow({
  listing,
  documents,
}: {
  listing: { status: string; mls_number?: string | null; list_price?: number | null };
  documents: ListingDocument[];
}) {
  const statuses = deriveStepStatuses(listing, documents);

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

          return (
            <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
              {/* Timeline connector + circle */}
              <div className="flex flex-col items-center">
                {status === "completed" ? (
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}>
                    <Check className="h-5 w-5 text-white" />
                  </div>
                ) : status === "in-progress" ? (
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}>
                    <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {stepNumber}
                    </span>
                  </div>
                ) : (
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}>
                    <span className="text-sm font-medium text-muted-foreground/50">
                      {stepNumber}
                    </span>
                  </div>
                )}
                {!isLast && (
                  <div
                    className={`w-0.5 flex-1 mt-1.5 ${styles.connector}`}
                  />
                )}
              </div>

              {/* Content: icon + name + badge + description */}
              <div className="pb-2 min-w-0 pt-1.5 flex-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base">{step.icon}</span>
                  <p className={`text-base font-semibold leading-6 ${styles.text}`}>
                    {step.name}
                  </p>
                  {styles.badgeLabel && (
                    <span
                      className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${styles.badge}`}
                    >
                      {styles.badgeLabel}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1 ml-7">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
