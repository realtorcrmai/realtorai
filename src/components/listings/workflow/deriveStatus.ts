import type { ListingDocument } from "@/types";
import type { StepStatus } from "./constants";

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

  // Sequential enforcement
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

  // Seller Intake
  sub["verify-seller-id"] = "completed";
  sub["confirm-address"] = "completed";
  sub["property-details"] = "completed";
  sub["pricing-expectations"] = "completed";
  sub["sign-dorts-intake"] = "completed";

  // Data Enrichment
  deriveFromParent("data-enrichment", [
    "property-assessment", "tax-records", "title-search", "strata-docs",
  ]);

  // CMA
  deriveFromParent("cma", [
    "pull-comparables", "analyze-trends", "generate-cma-report", "present-to-seller",
  ]);

  // Pricing & Review
  deriveFromParent("pricing-review", [
    "confirm-list-price", "set-marketing-strategy", "review-listing-details", "approve-photos",
  ]);

  // Form Generation
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
    "send-docs-seller", "seller-signs", "agent-countersigns", "archive-signed",
  ]);

  // MLS Preparation
  deriveFromParent("mls-prep", [
    "pro-photos", "property-desc", "feature-sheet", "virtual-tour",
  ]);

  // MLS Submission
  deriveFromParent("mls-submission", [
    "enter-mls-data", "verify-listing", "submit-to-board", "confirm-live",
  ]);

  // Post-Listing
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
