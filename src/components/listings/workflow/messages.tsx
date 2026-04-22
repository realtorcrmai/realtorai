import type { StepStatus } from "./constants";

export type MessageContext = {
  address?: string;
  sellerName?: string;
  listPrice?: number | null;
  mlsNumber?: string | null;
  status: string;
  documentCount: number;
  formStatuses: Record<string, "draft" | "completed">;
};

export function formatPrice(price: number): string {
  return Number(price).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
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
    "property-details": {
      completed: "Property details entered",
      "in-progress": "Entering property details...",
      pending: "Will enter property details",
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

export function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:0ms]" />
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:150ms]" />
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:300ms]" />
    </span>
  );
}
