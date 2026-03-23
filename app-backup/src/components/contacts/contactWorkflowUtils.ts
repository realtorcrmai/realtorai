import type { Contact, Listing, Communication } from "@/types";

export type StepStatus = "completed" | "in-progress" | "pending";

export type SubStep = {
  id: string;
  name: string;
};

export type ContactStep = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  substeps: SubStep[];
};

// Deal shape passed from the contact page
export type BuyerDeal = {
  id: string;
  title: string;
  stage: string;
  status: string;
  value: number | null;
  close_date: string | null;
  possession_date: string | null;
  subject_removal_date: string | null;
  notes: string | null;
  listings: {
    id: string;
    address: string;
    mls_number: string | null;
    list_price: number | null;
    status: string;
    notes: string | null;
  } | null;
};

export type MessageContext = {
  contactName: string;
  contactType: string;
  listingsCount: number;
  communicationsCount: number;
  hasNotes: boolean;
  hasEmail: boolean;
  listingAddresses: string[];
  // Buyer deal context
  bestDealAddress: string | null;
  bestDealValue: number | null;
  bestDealCloseDate: string | null;
  bestDealStatus: string | null;
  dealsCount: number;
};

export type FieldItem = { label: string; value: string };
export type DataSection = { title: string; fields: FieldItem[] };

export const CONTACT_STEPS: ContactStep[] = [
  {
    id: "new-lead",
    name: "New Lead",
    desc: "Contact added, basic info captured",
    icon: "👤",
    substeps: [
      { id: "capture-name", name: "Capture contact name" },
      { id: "capture-phone", name: "Capture phone number" },
      { id: "capture-email", name: "Capture email address" },
      { id: "set-channel", name: "Set preferred channel" },
    ],
  },
  {
    id: "qualification",
    name: "Qualification",
    desc: "Needs assessment, budget determined",
    icon: "🎯",
    substeps: [
      { id: "assess-needs", name: "Assess client needs" },
      { id: "determine-budget", name: "Determine budget range" },
      { id: "identify-timeline", name: "Identify timeline" },
      { id: "capture-notes", name: "Capture qualification notes" },
    ],
  },
  {
    id: "active-search",
    name: "Active Search",
    desc: "Viewing properties, making offers",
    icon: "🔍",
    substeps: [
      { id: "link-listings", name: "Link to listings" },
      { id: "schedule-viewings", name: "Schedule property viewings" },
      { id: "gather-feedback", name: "Gather feedback" },
      { id: "prepare-offers", name: "Prepare offers" },
    ],
  },
  {
    id: "transaction",
    name: "Transaction",
    desc: "Under contract, conditions pending",
    icon: "📝",
    substeps: [
      { id: "accept-offer", name: "Offer accepted" },
      { id: "manage-conditions", name: "Manage conditions" },
      { id: "coordinate-inspection", name: "Coordinate inspections" },
      { id: "finalize-financing", name: "Finalize financing" },
    ],
  },
  {
    id: "post-close",
    name: "Post-Close",
    desc: "Completed, follow-up & referrals",
    icon: "🏠",
    substeps: [
      { id: "confirm-closing", name: "Confirm closing" },
      { id: "send-followup", name: "Send follow-up" },
      { id: "request-review", name: "Request review/testimonial" },
      { id: "add-referral-network", name: "Add to referral network" },
    ],
  },
];

export const STATUS_STYLES = {
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

// Buyer pipeline stage ordering for comparison
export const BUYER_STAGE_ORDER: Record<string, number> = {
  new_lead: 0,
  qualified: 1,
  showing: 2,
  offer: 3,
  conditional: 4,
  subject_removal: 5,
  closing: 6,
  closed: 7,
};

export function getBestBuyerDeal(deals: BuyerDeal[]): BuyerDeal | null {
  if (deals.length === 0) return null;
  // Prefer won deals, then highest stage active deals, then any deal
  const won = deals.find((d) => d.status === "won");
  if (won) return won;
  const active = deals
    .filter((d) => d.status === "active")
    .sort(
      (a, b) =>
        (BUYER_STAGE_ORDER[b.stage] ?? 0) - (BUYER_STAGE_ORDER[a.stage] ?? 0)
    );
  return active[0] ?? deals[0];
}

export function buyerStageAtLeast(deal: BuyerDeal, minStage: string): boolean {
  return (
    (BUYER_STAGE_ORDER[deal.stage] ?? 0) >=
    (BUYER_STAGE_ORDER[minStage] ?? 0)
  );
}

export function deriveStepStatuses(
  contact: Contact,
  listings: Listing[],
  communications: Communication[],
  deals: BuyerDeal[]
): Record<string, StepStatus> {
  const statuses: Record<string, StepStatus> = {};
  const isBuyer = contact.type === "buyer";
  const bestDeal = isBuyer ? getBestBuyerDeal(deals) : null;
  const hasDeals = deals.length > 0;

  // new-lead: always completed (contact exists)
  statuses["new-lead"] = "completed";

  if (isBuyer && hasDeals) {
    // --- BUYER with deals: derive from deal stage/status ---

    // qualification: completed if we have a deal (means buyer is qualified)
    statuses["qualification"] = "completed";

    // active-search: completed if any deal is past qualified stage
    if (bestDeal && buyerStageAtLeast(bestDeal, "showing")) {
      statuses["active-search"] = "completed";
    } else if (bestDeal && buyerStageAtLeast(bestDeal, "qualified")) {
      statuses["active-search"] = "in-progress";
    } else {
      statuses["active-search"] = hasDeals ? "in-progress" : "pending";
    }

    // transaction: completed if deal is past offer stage
    if (bestDeal && (bestDeal.status === "won" || buyerStageAtLeast(bestDeal, "closing"))) {
      statuses["transaction"] = "completed";
    } else if (bestDeal && buyerStageAtLeast(bestDeal, "offer")) {
      statuses["transaction"] = "in-progress";
    } else {
      statuses["transaction"] = "pending";
    }

    // post-close: completed if deal status is won
    if (bestDeal && bestDeal.status === "won") {
      statuses["post-close"] = "completed";
    } else if (bestDeal && buyerStageAtLeast(bestDeal, "closing")) {
      statuses["post-close"] = "in-progress";
    } else {
      statuses["post-close"] = "pending";
    }
  } else {
    // --- SELLER logic (or buyer without deals) ---
    const hasNotes = !!contact.notes;
    const hasListings = listings.length > 0;
    statuses["qualification"] =
      hasNotes || hasListings || hasDeals ? "completed" : "in-progress";

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

    if (hasPendingOrSold) {
      statuses["transaction"] = "completed";
    } else if (statuses["active-search"] === "completed") {
      statuses["transaction"] = "in-progress";
    } else {
      statuses["transaction"] = "pending";
    }

    const hasSold = listings.some((l) => l.status === "sold");
    const hasPending = listings.some((l) => l.status === "pending");

    if (hasSold) {
      statuses["post-close"] = "completed";
    } else if (hasPending) {
      statuses["post-close"] = "in-progress";
    } else {
      statuses["post-close"] = "pending";
    }
  }

  return statuses;
}

export function deriveSubstepStatuses(
  contact: Contact,
  listings: Listing[],
  communications: Communication[],
  stepStatuses: Record<string, StepStatus>,
  deals: BuyerDeal[]
): Record<string, StepStatus> {
  const sub: Record<string, StepStatus> = {};
  const isBuyer = contact.type === "buyer";
  const bestDeal = isBuyer ? getBestBuyerDeal(deals) : null;

  function deriveFromParent(parentId: string, substepIds: string[]) {
    const parentStatus = stepStatuses[parentId];
    if (parentStatus === "completed") {
      substepIds.forEach((id) => (sub[id] = "completed"));
    } else if (parentStatus === "in-progress") {
      substepIds.forEach((id, idx) =>
        (sub[id] = idx === 0 ? "in-progress" : "pending")
      );
    } else {
      substepIds.forEach((id) => (sub[id] = "pending"));
    }
  }

  // New Lead — granular based on actual data
  sub["capture-name"] = contact.name ? "completed" : "in-progress";
  sub["capture-phone"] = contact.phone ? "completed" : "pending";
  sub["capture-email"] = contact.email ? "completed" : "pending";
  sub["set-channel"] = contact.pref_channel ? "completed" : "pending";

  if (isBuyer && bestDeal) {
    // --- BUYER sub-step logic ---

    // Qualification
    if (stepStatuses["qualification"] === "completed") {
      sub["assess-needs"] = "completed";
      sub["determine-budget"] = "completed";
      sub["identify-timeline"] = "completed";
      sub["capture-notes"] = "completed";
    } else {
      sub["assess-needs"] = deals.length > 0 ? "completed" : "in-progress";
      sub["determine-budget"] = bestDeal.value ? "completed" : "pending";
      sub["identify-timeline"] = "pending";
      sub["capture-notes"] = contact.notes ? "completed" : "pending";
    }

    // Active Search — based on deal stage
    const pastShowing = buyerStageAtLeast(bestDeal, "showing");
    const pastOffer = buyerStageAtLeast(bestDeal, "offer");

    if (stepStatuses["active-search"] === "completed") {
      sub["link-listings"] = "completed";
      sub["schedule-viewings"] = "completed";
      sub["gather-feedback"] = "completed";
      sub["prepare-offers"] = "completed";
    } else if (stepStatuses["active-search"] === "in-progress") {
      sub["link-listings"] = bestDeal.listings ? "completed" : "in-progress";
      sub["schedule-viewings"] = pastShowing ? "completed" : "in-progress";
      sub["gather-feedback"] = pastShowing ? "completed" : "pending";
      sub["prepare-offers"] = pastOffer ? "completed" : "pending";
    } else {
      sub["link-listings"] = "pending";
      sub["schedule-viewings"] = "pending";
      sub["gather-feedback"] = "pending";
      sub["prepare-offers"] = "pending";
    }

    // Transaction — based on deal stage
    const pastConditional = buyerStageAtLeast(bestDeal, "conditional");
    const pastSubjectRemoval = buyerStageAtLeast(bestDeal, "subject_removal");
    const isWon = bestDeal.status === "won";

    if (stepStatuses["transaction"] === "completed") {
      sub["accept-offer"] = "completed";
      sub["manage-conditions"] = "completed";
      sub["coordinate-inspection"] = "completed";
      sub["finalize-financing"] = "completed";
    } else if (stepStatuses["transaction"] === "in-progress") {
      sub["accept-offer"] = pastOffer ? "completed" : "in-progress";
      sub["manage-conditions"] = pastConditional ? "completed" : pastOffer ? "in-progress" : "pending";
      sub["coordinate-inspection"] = pastSubjectRemoval ? "completed" : pastConditional ? "in-progress" : "pending";
      sub["finalize-financing"] = pastSubjectRemoval ? "completed" : "pending";
    } else {
      sub["accept-offer"] = "pending";
      sub["manage-conditions"] = "pending";
      sub["coordinate-inspection"] = "pending";
      sub["finalize-financing"] = "pending";
    }

    // Post-Close
    if (isWon) {
      sub["confirm-closing"] = "completed";
      sub["send-followup"] = "completed";
      sub["request-review"] = "completed";
      sub["add-referral-network"] = "completed";
    } else if (stepStatuses["post-close"] === "in-progress") {
      sub["confirm-closing"] = "in-progress";
      sub["send-followup"] = "pending";
      sub["request-review"] = "pending";
      sub["add-referral-network"] = "pending";
    } else {
      sub["confirm-closing"] = "pending";
      sub["send-followup"] = "pending";
      sub["request-review"] = "pending";
      sub["add-referral-network"] = "pending";
    }
  } else {
    // --- SELLER sub-step logic (original) ---
    const hasNotes = !!contact.notes;
    const hasListings = listings.length > 0;

    if (stepStatuses["qualification"] === "completed") {
      sub["assess-needs"] = "completed";
      sub["determine-budget"] = "completed";
      sub["identify-timeline"] = "completed";
      sub["capture-notes"] = "completed";
    } else {
      sub["assess-needs"] = hasNotes || hasListings ? "completed" : "in-progress";
      sub["determine-budget"] = hasNotes ? "completed" : "pending";
      sub["identify-timeline"] = "pending";
      sub["capture-notes"] = hasNotes ? "completed" : "pending";
    }

    deriveFromParent("active-search", [
      "link-listings",
      "schedule-viewings",
      "gather-feedback",
      "prepare-offers",
    ]);
    if (hasListings) sub["link-listings"] = "completed";

    deriveFromParent("transaction", [
      "accept-offer",
      "manage-conditions",
      "coordinate-inspection",
      "finalize-financing",
    ]);

    deriveFromParent("post-close", [
      "confirm-closing",
      "send-followup",
      "request-review",
      "add-referral-network",
    ]);
  }

  return sub;
}

export function getSubstepMessage(
  substepId: string,
  substepStatus: StepStatus,
  ctx: MessageContext
): string {
  const name = ctx.contactName;
  const type = ctx.contactType;
  const listingCount = ctx.listingsCount;
  const firstAddr = ctx.listingAddresses[0] ?? "property";
  const dealAddr = ctx.bestDealAddress ?? "property";
  const dealValue = ctx.bestDealValue
    ? `$${ctx.bestDealValue.toLocaleString("en-CA")}`
    : "";
  const isBuyerWithDeal = type === "buyer" && ctx.dealsCount > 0;

  const messages: Record<string, Record<StepStatus, string>> = {
    // New Lead
    "capture-name": {
      completed: `Contact created — ${name}`,
      "in-progress": "Capturing contact name...",
      pending: "Will capture contact name",
    },
    "capture-phone": {
      completed: "Phone number recorded",
      "in-progress": "Capturing phone number...",
      pending: "Will capture phone number",
    },
    "capture-email": {
      completed: "Email address recorded",
      "in-progress": "Capturing email...",
      pending: "Will capture email address",
    },
    "set-channel": {
      completed: "Preferred channel set",
      "in-progress": "Setting preferred channel...",
      pending: "Will set preferred channel",
    },
    // Qualification
    "assess-needs": {
      completed: isBuyerWithDeal
        ? `Buying needs assessed for ${name}`
        : `${type === "seller" ? "Selling" : "Buying"} needs assessed for ${name}`,
      "in-progress": `Assessing ${name}'s needs...`,
      pending: "Will assess client needs",
    },
    "determine-budget": {
      completed: isBuyerWithDeal && dealValue
        ? `Budget established — ${dealValue}`
        : "Budget range determined",
      "in-progress": "Determining budget range...",
      pending: "Will determine budget range",
    },
    "identify-timeline": {
      completed: "Timeline identified",
      "in-progress": "Identifying timeline...",
      pending: "Will identify timeline",
    },
    "capture-notes": {
      completed: "Qualification notes captured",
      "in-progress": "Capturing qualification notes...",
      pending: "Will capture notes",
    },
    // Active Search
    "link-listings": {
      completed: isBuyerWithDeal
        ? `Linked to ${dealAddr}`
        : listingCount > 0
          ? `${listingCount} listing${listingCount !== 1 ? "s" : ""} linked`
          : "Listings linked",
      "in-progress": isBuyerWithDeal
        ? "Searching for properties..."
        : "Linking to listings...",
      pending: "Will link to listings",
    },
    "schedule-viewings": {
      completed: isBuyerWithDeal
        ? `Property viewings completed for ${dealAddr}`
        : "Property viewings scheduled",
      "in-progress": "Scheduling property viewings...",
      pending: "Will schedule viewings",
    },
    "gather-feedback": {
      completed: `Feedback gathered from ${name}`,
      "in-progress": "Gathering feedback...",
      pending: "Will gather feedback",
    },
    "prepare-offers": {
      completed: isBuyerWithDeal
        ? `Offer prepared for ${dealAddr}`
        : "Offers prepared",
      "in-progress": isBuyerWithDeal
        ? `Preparing offer for ${dealAddr}...`
        : `Preparing offers for ${firstAddr}...`,
      pending: "Will prepare offers",
    },
    // Transaction
    "accept-offer": {
      completed: isBuyerWithDeal && dealValue
        ? `Offer accepted at ${dealValue}`
        : "Offer accepted",
      "in-progress": "Awaiting offer acceptance...",
      pending: "Will finalize offer acceptance",
    },
    "manage-conditions": {
      completed: "Conditions managed — subjects cleared",
      "in-progress": "Managing subject conditions...",
      pending: "Will manage conditions",
    },
    "coordinate-inspection": {
      completed: "Inspections coordinated & completed",
      "in-progress": "Coordinating inspections...",
      pending: "Will coordinate inspections",
    },
    "finalize-financing": {
      completed: "Financing finalized — mortgage approved",
      "in-progress": "Finalizing financing...",
      pending: "Will finalize financing",
    },
    // Post-Close
    "confirm-closing": {
      completed: isBuyerWithDeal && ctx.bestDealCloseDate
        ? `Closing confirmed — ${new Date(ctx.bestDealCloseDate).toLocaleDateString("en-CA")}`
        : "Closing confirmed",
      "in-progress": "Confirming closing...",
      pending: "Will confirm closing",
    },
    "send-followup": {
      completed: `Follow-up sent to ${name}`,
      "in-progress": "Sending follow-up...",
      pending: "Will send follow-up",
    },
    "request-review": {
      completed: "Review/testimonial requested",
      "in-progress": "Requesting review...",
      pending: "Will request review",
    },
    "add-referral-network": {
      completed: `${name} added to referral network`,
      "in-progress": "Adding to referral network...",
      pending: "Will add to referral network",
    },
  };

  return messages[substepId]?.[substepStatus] ?? "";
}

export function getStepDataSections(
  stepId: string,
  contact: Contact,
  listings: Listing[],
  communications: Communication[],
  deals: BuyerDeal[]
): DataSection[] | null {
  const commCount = communications.length;
  const isBuyer = contact.type === "buyer";
  const bestDeal = isBuyer ? getBestBuyerDeal(deals) : null;

  switch (stepId) {
    case "new-lead":
      return [
        {
          title: "Contact Info",
          fields: [
            { label: "Full Name", value: contact.name },
            { label: "Phone", value: contact.phone },
            { label: "Email", value: contact.email ?? "—" },
            {
              label: "Type",
              value:
                contact.type.charAt(0).toUpperCase() + contact.type.slice(1),
            },
            { label: "Preferred Channel", value: contact.pref_channel },
            {
              label: "Created",
              value: new Date(contact.created_at).toLocaleDateString("en-CA"),
            },
          ],
        },
      ];

    case "qualification": {
      if (isBuyer && bestDeal) {
        return [
          {
            title: "Buyer Assessment",
            fields: [
              { label: "Client Type", value: "Buyer — looking to purchase" },
              { label: "Deal", value: bestDeal.title },
              {
                label: "Budget",
                value: bestDeal.value
                  ? `$${Number(bestDeal.value).toLocaleString("en-CA")}`
                  : "Not determined",
              },
              {
                label: "Active Deals",
                value: `${deals.filter((d) => d.status === "active").length} active, ${deals.filter((d) => d.status === "won").length} won`,
              },
              {
                label: "Communications",
                value:
                  commCount > 0
                    ? `${commCount} message${commCount !== 1 ? "s" : ""}`
                    : "None yet",
              },
              {
                label: "Notes",
                value: contact.notes ?? "No notes captured",
              },
            ],
          },
        ];
      }
      return [
        {
          title: "Assessment",
          fields: [
            {
              label: "Client Type",
              value:
                contact.type === "seller"
                  ? "Seller — looking to list"
                  : "Buyer — looking to purchase",
            },
            {
              label: "Listings Linked",
              value:
                listings.length > 0
                  ? `${listings.length} listing${listings.length !== 1 ? "s" : ""}`
                  : "None yet",
            },
            {
              label: "Communications",
              value:
                commCount > 0
                  ? `${commCount} message${commCount !== 1 ? "s" : ""}`
                  : "None yet",
            },
            {
              label: "Notes",
              value: contact.notes ?? "No notes captured",
            },
          ],
        },
      ];
    }

    case "active-search": {
      if (isBuyer && deals.length > 0) {
        const dealFields: FieldItem[] = deals.slice(0, 5).map((d) => ({
          label: d.status === "won" ? "Purchased" : d.stage.charAt(0).toUpperCase() + d.stage.slice(1).replace(/_/g, " "),
          value: d.listings?.address ?? d.title,
        }));
        return [
          {
            title: "Property Search",
            fields: [
              { label: "Total Deals", value: String(deals.length) },
              { label: "Won", value: String(deals.filter((d) => d.status === "won").length) },
              ...dealFields,
            ],
          },
        ];
      }

      const activeListings = listings.filter((l) => l.status === "active");
      const listingFields: FieldItem[] =
        listings.length > 0
          ? listings.slice(0, 5).map((l) => ({
              label: l.status.charAt(0).toUpperCase() + l.status.slice(1),
              value: l.address,
            }))
          : [{ label: "Listings", value: "No listings linked yet" }];

      return [
        {
          title: "Properties",
          fields: [
            { label: "Total Listings", value: String(listings.length) },
            { label: "Active", value: String(activeListings.length) },
            ...listingFields,
          ],
        },
      ];
    }

    case "transaction": {
      if (isBuyer && bestDeal) {
        const fields: FieldItem[] = [
          {
            label: "Deal",
            value: bestDeal.title,
          },
          {
            label: "Status",
            value: bestDeal.status === "won" ? "Completed" : bestDeal.stage.charAt(0).toUpperCase() + bestDeal.stage.slice(1).replace(/_/g, " "),
          },
        ];
        if (bestDeal.value) {
          fields.push({
            label: "Purchase Price",
            value: `$${Number(bestDeal.value).toLocaleString("en-CA")}`,
          });
        }
        if (bestDeal.close_date) {
          fields.push({
            label: "Close Date",
            value: new Date(bestDeal.close_date).toLocaleDateString("en-CA"),
          });
        }
        if (bestDeal.possession_date) {
          fields.push({
            label: "Possession Date",
            value: new Date(bestDeal.possession_date).toLocaleDateString("en-CA"),
          });
        }
        if (bestDeal.listings) {
          fields.push({
            label: "Property",
            value: bestDeal.listings.address,
          });
        }
        return [{ title: "Transaction Status", fields }];
      }

      const pendingListings = listings.filter(
        (l) => l.status === "pending" || l.status === "sold"
      );
      return [
        {
          title: "Transaction Status",
          fields:
            pendingListings.length > 0
              ? pendingListings.map((l) => ({
                  label: l.status.charAt(0).toUpperCase() + l.status.slice(1),
                  value: l.address,
                }))
              : [{ label: "Status", value: "No transactions yet" }],
        },
      ];
    }

    case "post-close": {
      if (isBuyer && deals.length > 0) {
        const wonDeals = deals.filter((d) => d.status === "won");
        return [
          {
            title: "Completed Purchases",
            fields:
              wonDeals.length > 0
                ? wonDeals.map((d) => ({
                    label: "Purchased",
                    value: d.listings?.address ?? d.title,
                  }))
                : [{ label: "Status", value: "No completed purchases yet" }],
          },
        ];
      }

      const soldListings = listings.filter((l) => l.status === "sold");
      return [
        {
          title: "Closed Transactions",
          fields:
            soldListings.length > 0
              ? soldListings.map((l) => ({
                  label: "Sold",
                  value: l.address,
                }))
              : [{ label: "Status", value: "No closed transactions yet" }],
        },
      ];
    }

    default:
      return null;
  }
}
