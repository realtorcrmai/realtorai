import { Check } from "lucide-react";
import type { Contact, Listing, Communication } from "@/types";

const CONTACT_STEPS = [
  {
    id: "new-lead",
    name: "New Lead",
    desc: "Contact added, basic info captured",
    icon: "\u{1F464}",
  },
  {
    id: "qualification",
    name: "Qualification",
    desc: "Needs assessment, budget determined",
    icon: "\u{1F3AF}",
  },
  {
    id: "active-search",
    name: "Active Search",
    desc: "Viewing properties, making offers",
    icon: "\u{1F50D}",
  },
  {
    id: "transaction",
    name: "Transaction",
    desc: "Under contract, conditions pending",
    icon: "\u{1F4DD}",
  },
  {
    id: "post-close",
    name: "Post-Close",
    desc: "Completed, follow-up & referrals",
    icon: "\u{1F3E0}",
  },
];

type StepStatus = "completed" | "in-progress" | "pending";

const STATUS_STYLES = {
  completed: {
    circle: "bg-green-500 shadow-sm shadow-green-500/30",
    connector: "bg-green-500",
    text: "text-foreground",
    badge:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
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

function deriveStepStatuses(
  contact: Contact,
  listings: Listing[],
  communications: Communication[]
): Record<string, StepStatus> {
  const statuses: Record<string, StepStatus> = {};

  // new-lead: always completed (contact exists)
  statuses["new-lead"] = "completed";

  // qualification: completed if contact has notes OR listings.length > 0
  const hasNotes = !!contact.notes;
  const hasListings = listings.length > 0;
  statuses["qualification"] =
    hasNotes || hasListings ? "completed" : "in-progress";

  // active-search: completed if listings have any showings (appointments),
  // or seller with active listing; in-progress if has listings but no activity
  const hasActiveListing = listings.some((l) => l.status === "active");
  const hasPendingOrSold = listings.some(
    (l) => l.status === "pending" || l.status === "sold"
  );
  const isSellerWithActive =
    contact.type === "seller" && hasActiveListing;

  if (hasPendingOrSold || isSellerWithActive) {
    statuses["active-search"] = "completed";
  } else if (hasListings) {
    statuses["active-search"] = "in-progress";
  } else {
    statuses["active-search"] = "pending";
  }

  // transaction: completed if any listing has status "pending" or "sold";
  // in-progress if active-search is completed
  if (hasPendingOrSold) {
    statuses["transaction"] = "completed";
  } else if (statuses["active-search"] === "completed") {
    statuses["transaction"] = "in-progress";
  } else {
    statuses["transaction"] = "pending";
  }

  // post-close: completed if any listing has status "sold";
  // in-progress if any listing status "pending"
  const hasSold = listings.some((l) => l.status === "sold");
  const hasPending = listings.some((l) => l.status === "pending");

  if (hasSold) {
    statuses["post-close"] = "completed";
  } else if (hasPending) {
    statuses["post-close"] = "in-progress";
  } else {
    statuses["post-close"] = "pending";
  }

  return statuses;
}

export function ContactWorkflow({
  contact,
  listings,
  communications,
}: {
  contact: Contact;
  listings: Listing[];
  communications: Communication[];
}) {
  const statuses = deriveStepStatuses(contact, listings, communications);

  const completedCount = Object.values(statuses).filter(
    (s) => s === "completed"
  ).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contact Lifecycle</h2>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{CONTACT_STEPS.length} steps complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-green-500 transition-all duration-500"
          style={{
            width: `${(completedCount / CONTACT_STEPS.length) * 100}%`,
          }}
        />
      </div>

      {/* Timeline */}
      <div className="relative">
        {CONTACT_STEPS.map((step, i) => {
          const status = statuses[step.id];
          const styles = STATUS_STYLES[status];
          const isLast = i === CONTACT_STEPS.length - 1;
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

              {/* Content: icon + name + badge + description */}
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
    </div>
  );
}
