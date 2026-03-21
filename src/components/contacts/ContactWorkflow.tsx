"use client";

import { useState, useMemo } from "react";
import { Check, ChevronDown } from "lucide-react";
import type { Contact, Listing, Communication } from "@/types";

type StepStatus = "completed" | "in-progress" | "pending";

type SubStep = {
  id: string;
  name: string;
};

type ContactStep = {
  id: string;
  name: string;
  desc: string;
  icon: string;
  substeps: SubStep[];
};

// Deal shape passed from the contact page
type BuyerDeal = {
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

const CONTACT_STEPS: ContactStep[] = [
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

// Buyer pipeline stage ordering for comparison
const BUYER_STAGE_ORDER: Record<string, number> = {
  new_lead: 0,
  qualified: 1,
  showing: 2,
  offer: 3,
  conditional: 4,
  subject_removal: 5,
  closing: 6,
  closed: 7,
};

function getBestBuyerDeal(deals: BuyerDeal[]): BuyerDeal | null {
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

function buyerStageAtLeast(deal: BuyerDeal, minStage: string): boolean {
  return (
    (BUYER_STAGE_ORDER[deal.stage] ?? 0) >=
    (BUYER_STAGE_ORDER[minStage] ?? 0)
  );
}

function deriveStepStatuses(
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

function deriveSubstepStatuses(
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

// --- Activity Messages ---

type MessageContext = {
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

function getSubstepMessage(
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

function TypingDots() {
  return (
    <span className="inline-flex items-center gap-0.5 ml-1">
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:0ms]" />
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:150ms]" />
      <span className="h-1 w-1 rounded-full bg-orange-500 animate-bounce [animation-delay:300ms]" />
    </span>
  );
}

// --- Step Data Panels ---

type FieldItem = { label: string; value: string };
type DataSection = { title: string; fields: FieldItem[] };

function getStepDataSections(
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

// --- Component ---

export function ContactWorkflow({
  contact,
  listings,
  communications,
  deals = [],
}: {
  contact: Contact;
  listings: Listing[];
  communications: Communication[];
  deals?: BuyerDeal[];
}) {
  const statuses = deriveStepStatuses(contact, listings, communications, deals);
  const substepStatuses = deriveSubstepStatuses(
    contact,
    listings,
    communications,
    statuses,
    deals
  );

  const bestDeal = contact.type === "buyer" ? getBestBuyerDeal(deals) : null;

  const messageCtx = useMemo<MessageContext>(
    () => ({
      contactName: contact.name,
      contactType: contact.type,
      listingsCount: listings.length,
      communicationsCount: communications.length,
      hasNotes: !!contact.notes,
      hasEmail: !!contact.email,
      listingAddresses: listings.map((l) => l.address),
      bestDealAddress: bestDeal?.listings?.address ?? null,
      bestDealValue: bestDeal?.value ?? null,
      bestDealCloseDate: bestDeal?.close_date ?? null,
      bestDealStatus: bestDeal?.status ?? null,
      dealsCount: deals.length,
    }),
    [contact, listings, communications, bestDeal, deals.length]
  );

  // Only the in-progress step starts expanded by default
  const initialExpanded = useMemo(() => {
    const expanded = new Set<string>();
    for (const step of CONTACT_STEPS) {
      if (statuses[step.id] === "in-progress") {
        expanded.add(step.id);
      }
    }
    return expanded;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [expandedSteps, setExpandedSteps] =
    useState<Set<string>>(initialExpanded);

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
          const isExpanded = expandedSteps.has(step.id);
          const hasSubsteps = step.substeps.length > 0;

          const completedSubsteps = step.substeps.filter(
            (s) => substepStatuses[s.id] === "completed"
          ).length;

          const sections = getStepDataSections(
            step.id,
            contact,
            listings,
            communications,
            deals
          );

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

                {/* Expandable content: data panel + substeps */}
                {hasSubsteps && (
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-in-out"
                    style={{
                      gridTemplateRows: isExpanded ? "1fr" : "0fr",
                    }}
                  >
                    <div className="overflow-hidden">
                      {/* Data panel */}
                      {sections && (
                        <div className="border border-border/50 rounded-lg bg-muted/20 p-4 mt-3 ml-7">
                          <div className="space-y-4">
                            {sections.map((section) => (
                              <div key={section.title}>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                  {section.title}
                                </h4>
                                <dl className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                                  {section.fields.map((field, idx) => (
                                    <div
                                      key={`${section.title}-${field.label}-${idx}`}
                                      className={
                                        field.label === "Notes" ||
                                        field.value.length > 40
                                          ? "col-span-2"
                                          : ""
                                      }
                                    >
                                      <dt className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                                        {field.label}
                                      </dt>
                                      <dd className="text-sm text-foreground mt-0.5 truncate">
                                        {field.value}
                                      </dd>
                                    </div>
                                  ))}
                                </dl>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Activity messages (substeps) */}
                      <div className="ml-7 mt-3 space-y-1.5">
                        {step.substeps.map((sub) => {
                          const subStatus = substepStatuses[sub.id];
                          const message = getSubstepMessage(
                            sub.id,
                            subStatus,
                            messageCtx
                          );
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
                                    {subStatus === "in-progress" && (
                                      <TypingDots />
                                    )}
                                  </p>
                                )}
                              </div>
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
