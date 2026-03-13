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

export function ListingWorkflow({
  listing,
  documents,
  formStatuses = {},
}: {
  listing: { status: string; mls_number?: string | null; list_price?: number | null };
  documents: ListingDocument[];
  formStatuses?: Record<string, "draft" | "completed">;
}) {
  const statuses = deriveStepStatuses(listing, documents);
  const substepStatuses = deriveSubstepStatuses(listing, documents, formStatuses, statuses);

  // In-progress steps start expanded, others collapsed
  const initialExpanded = useMemo(() => {
    const expanded = new Set<string>();
    for (const step of WORKFLOW_STEPS) {
      if (statuses[step.id] === "in-progress") {
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

                {/* Expandable substep list */}
                {hasSubsteps && (
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                    style={{
                      gridTemplateRows: isExpanded ? "1fr" : "0fr",
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="ml-7 mt-3 space-y-1.5">
                        {step.substeps.map((sub) => {
                          const subStatus = substepStatuses[sub.id];
                          return (
                            <div
                              key={sub.id}
                              className="flex items-center gap-2.5 py-1"
                            >
                              {/* Substep indicator */}
                              {subStatus === "completed" ? (
                                <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              ) : subStatus === "in-progress" ? (
                                <div className="h-5 w-5 rounded-full border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center shrink-0">
                                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                                </div>
                              ) : (
                                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/25 bg-muted/50 shrink-0" />
                              )}
                              {/* Substep name */}
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
                            </div>
                          );
                        })}
                      </div>
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
