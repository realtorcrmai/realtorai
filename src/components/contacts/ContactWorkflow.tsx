"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import type { Contact, Listing, Communication } from "@/types";

type StepDef = {
  id: string;
  name: string;
  desc: string;
  icon: string;
};

const SELLER_STEPS: StepDef[] = [
  {
    id: "initial-contact",
    name: "Initial Contact",
    desc: "Seller onboarded, basic info captured",
    icon: "\u{1F464}",
  },
  {
    id: "listing-agreement",
    name: "Listing Agreement",
    desc: "Listing created, documents prepared",
    icon: "\u{1F4DD}",
  },
  {
    id: "property-listed",
    name: "Property Listed",
    desc: "Active on MLS, showings scheduled",
    icon: "\u{1F3E0}",
  },
  {
    id: "offer-accepted",
    name: "Offer Accepted",
    desc: "Pending sale, conditions in progress",
    icon: "\u{1F91D}",
  },
  {
    id: "closing-complete",
    name: "Closing Complete",
    desc: "Transaction closed, commission earned",
    icon: "\u{1F3C6}",
  },
];

const BUYER_STEPS: StepDef[] = [
  {
    id: "initial-contact",
    name: "Initial Contact",
    desc: "Buyer onboarded, basic info captured",
    icon: "\u{1F464}",
  },
  {
    id: "preferences-set",
    name: "Preferences Set",
    desc: "Budget, areas, property type defined",
    icon: "\u{1F3AF}",
  },
  {
    id: "property-showings",
    name: "Property Showings",
    desc: "Viewing properties, narrowing choices",
    icon: "\u{1F50D}",
  },
  {
    id: "offer-submitted",
    name: "Offer Submitted",
    desc: "Offer made, negotiation in progress",
    icon: "\u{1F4DD}",
  },
  {
    id: "closing-complete",
    name: "Closing Complete",
    desc: "Purchase closed, keys handed over",
    icon: "\u{1F3C6}",
  },
];

type StepStatus = "completed" | "in-progress" | "pending";

const STATUS_STYLES = {
  completed: {
    circle: "bg-[#00C875] shadow-sm shadow-[#00C875]/30",
    connector: "bg-[#00C875]",
    text: "text-foreground",
    badge:
      "bg-[#0F7694]/15 text-[#0A6880] dark:bg-[#00C875]/15 dark:text-[#00C875]",
    badgeLabel: "COMPLETE",
  },
  "in-progress": {
    circle:
      "border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/50",
    connector: "bg-muted-foreground/15",
    text: "text-orange-600 dark:text-orange-400",
    badge:
      "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
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

function deriveSellerStatuses(
  contact: Contact,
  listings: Listing[],
): Record<string, StepStatus> {
  const statuses: Record<string, StepStatus> = {};

  // initial-contact: always completed (contact exists)
  statuses["initial-contact"] = "completed";

  // listing-agreement: completed if has any listing
  const hasListings = listings.length > 0;
  statuses["listing-agreement"] = hasListings ? "completed" : "in-progress";

  // property-listed: completed if any listing is active/pending/sold
  const hasActiveListing = listings.some((l) => l.status === "active");
  const hasPendingOrSold = listings.some(
    (l) => l.status === "pending" || l.status === "sold"
  );
  if (hasActiveListing || hasPendingOrSold) {
    statuses["property-listed"] = "completed";
  } else if (hasListings) {
    statuses["property-listed"] = "in-progress";
  } else {
    statuses["property-listed"] = "pending";
  }

  // offer-accepted: completed if any listing pending or sold (has sold_price)
  const hasAcceptedOffer = listings.some(
    (l) => l.status === "pending" || l.status === "sold" || (l.sold_price && Number(l.sold_price) > 0)
  );
  if (hasAcceptedOffer) {
    statuses["offer-accepted"] = "completed";
  } else if (statuses["property-listed"] === "completed") {
    statuses["offer-accepted"] = "in-progress";
  } else {
    statuses["offer-accepted"] = "pending";
  }

  // closing-complete: completed if any listing sold
  const hasSold = listings.some((l) => l.status === "sold");
  if (hasSold) {
    statuses["closing-complete"] = "completed";
  } else if (statuses["offer-accepted"] === "completed") {
    statuses["closing-complete"] = "in-progress";
  } else {
    statuses["closing-complete"] = "pending";
  }

  // Sequential enforcement
  const sellerStepOrder = ["initial-contact", "listing-agreement", "property-listed", "offer-accepted", "closing-complete"];
  for (let i = 1; i < sellerStepOrder.length; i++) {
    const prev = statuses[sellerStepOrder[i - 1]];
    const curr = statuses[sellerStepOrder[i]];
    if (prev !== "completed") {
      if (curr === "completed") statuses[sellerStepOrder[i]] = "pending";
      if (curr === "in-progress" && prev === "pending") statuses[sellerStepOrder[i]] = "pending";
    }
  }

  return statuses;
}

function deriveBuyerStatuses(
  contact: Contact,
  listings: Listing[],
  communications: Communication[]
): Record<string, StepStatus> {
  const statuses: Record<string, StepStatus> = {};

  // initial-contact: always completed
  statuses["initial-contact"] = "completed";

  // preferences-set: completed if buyer_preferences is set
  const hasPreferences =
    contact.buyer_preferences &&
    typeof contact.buyer_preferences === "object" &&
    Object.keys(contact.buyer_preferences as Record<string, unknown>).length > 0;
  statuses["preferences-set"] = hasPreferences ? "completed" : "in-progress";

  // property-showings: completed if has communications or any linked listings
  const hasActivity = communications.length > 0 || listings.length > 0;
  if (hasActivity && hasPreferences) {
    statuses["property-showings"] = "completed";
  } else if (hasActivity) {
    statuses["property-showings"] = "in-progress";
  } else {
    statuses["property-showings"] = "pending";
  }

  // offer-submitted: completed if linked to a listing with pending/sold
  const hasOffer = listings.some(
    (l) => l.status === "pending" || l.status === "sold"
  );
  if (hasOffer) {
    statuses["offer-submitted"] = "completed";
  } else if (statuses["property-showings"] === "completed") {
    statuses["offer-submitted"] = "in-progress";
  } else {
    statuses["offer-submitted"] = "pending";
  }

  // closing-complete: completed if linked listing is sold
  const hasPurchased = listings.some((l) => l.status === "sold");
  if (hasPurchased) {
    statuses["closing-complete"] = "completed";
  } else if (statuses["offer-submitted"] === "completed") {
    statuses["closing-complete"] = "in-progress";
  } else {
    statuses["closing-complete"] = "pending";
  }

  // Sequential enforcement
  const buyerStepOrder = ["initial-contact", "preferences-set", "property-showings", "offer-submitted", "closing-complete"];
  for (let i = 1; i < buyerStepOrder.length; i++) {
    const prev = statuses[buyerStepOrder[i - 1]];
    const curr = statuses[buyerStepOrder[i]];
    if (prev !== "completed") {
      if (curr === "completed") statuses[buyerStepOrder[i]] = "pending";
      if (curr === "in-progress" && prev === "pending") statuses[buyerStepOrder[i]] = "pending";
    }
  }

  return statuses;
}

export function ContactWorkflow({
  contact,
  listings,
  communications,
  buyerListings = [],
}: {
  contact: Contact;
  listings: Listing[];
  communications: Communication[];
  buyerListings?: Listing[];
}) {
  const isSeller = contact.type === "seller";
  const steps = isSeller ? SELLER_STEPS : BUYER_STEPS;
  const relevantListings = isSeller ? listings : buyerListings;

  const statuses = isSeller
    ? deriveSellerStatuses(contact, relevantListings)
    : deriveBuyerStatuses(contact, relevantListings, communications);

  const completedCount = Object.values(statuses).filter(
    (s) => s === "completed"
  ).length;
  const allComplete = completedCount === steps.length;

  const [collapsed, setCollapsed] = useState(false);

  // Don't render if lifecycle is fully completed
  if (allComplete) return null;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">
            {isSeller ? "Seller" : "Buyer"} Lifecycle
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {completedCount}/{steps.length} steps
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-[#0F7694]/50 transition-all duration-500"
          style={{
            width: `${(completedCount / steps.length) * 100}%`,
          }}
        />
      </div>

      {/* Timeline — collapsible */}
      {!collapsed && (
        <div className="relative">
          {steps.map((step, i) => {
            const status = statuses[step.id];
            const styles = STATUS_STYLES[status];
            const isLast = i === steps.length - 1;
            const stepNumber = i + 1;

            return (
              <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
                {/* Timeline connector + circle */}
                <div className="flex flex-col items-center">
                  {status === "completed" ? (
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}
                    >
                      <Check className="h-5 w-5 text-white" />
                    </div>
                  ) : status === "in-progress" ? (
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}
                    >
                      <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
                        {stepNumber}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}
                    >
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

                {/* Content */}
                <div className="pb-2 min-w-0 pt-1.5 flex-1">
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
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-7">
                    {step.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
