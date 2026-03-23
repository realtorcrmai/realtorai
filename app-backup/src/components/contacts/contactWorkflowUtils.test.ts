import { describe, it, expect } from "vitest";
import {
  deriveStepStatuses,
  deriveSubstepStatuses,
  getSubstepMessage,
  getStepDataSections,
  getBestBuyerDeal,
  buyerStageAtLeast,
  CONTACT_STEPS,
  BUYER_STAGE_ORDER,
  type BuyerDeal,
  type MessageContext,
} from "./contactWorkflowUtils";
import type { Contact, Listing, Communication } from "@/types";

// --- Test fixtures ---

const baseContact: Contact = {
  id: "c1",
  name: "Jane Doe",
  phone: "604-555-1234",
  email: "jane@test.com",
  type: "buyer",
  pref_channel: "sms",
  notes: "Good buyer",
  created_at: "2024-01-01T00:00:00Z",
} as Contact;

const sellerContact: Contact = {
  ...baseContact,
  id: "c2",
  name: "John Seller",
  type: "seller",
} as Contact;

const activeListing: Listing = {
  id: "l1",
  address: "123 Main St",
  status: "active",
  list_price: 500000,
} as Listing;

const soldListing: Listing = {
  ...activeListing,
  status: "sold",
} as Listing;

const baseDeal: BuyerDeal = {
  id: "d1",
  title: "123 Main St Purchase",
  stage: "qualified",
  status: "active",
  value: 500000,
  close_date: null,
  possession_date: null,
  subject_removal_date: null,
  notes: null,
  listings: {
    id: "l1",
    address: "123 Main St",
    mls_number: "R123",
    list_price: 500000,
    status: "active",
    notes: null,
  },
};

const wonDeal: BuyerDeal = {
  ...baseDeal,
  stage: "closed",
  status: "won",
  close_date: "2024-06-15",
};

const comm: Communication = {
  id: "comm1",
  contact_id: "c1",
  direction: "outbound",
  channel: "sms",
  body: "Hello",
} as Communication;

// --- Tests ---

describe("getBestBuyerDeal", () => {
  it("returns null for empty deals", () => {
    expect(getBestBuyerDeal([])).toBeNull();
  });

  it("prefers won deals", () => {
    const result = getBestBuyerDeal([baseDeal, wonDeal]);
    expect(result?.status).toBe("won");
  });

  it("returns highest stage active deal when no won deal", () => {
    const offerDeal = { ...baseDeal, stage: "offer" };
    const result = getBestBuyerDeal([baseDeal, offerDeal]);
    expect(result?.stage).toBe("offer");
  });
});

describe("buyerStageAtLeast", () => {
  it("returns true when deal is at or past the stage", () => {
    const deal = { ...baseDeal, stage: "offer" };
    expect(buyerStageAtLeast(deal, "qualified")).toBe(true);
    expect(buyerStageAtLeast(deal, "offer")).toBe(true);
  });

  it("returns false when deal is before the stage", () => {
    const deal = { ...baseDeal, stage: "qualified" };
    expect(buyerStageAtLeast(deal, "offer")).toBe(false);
  });
});

describe("BUYER_STAGE_ORDER", () => {
  it("has correct ordering (new_lead < qualified < showing < ... < closed)", () => {
    expect(BUYER_STAGE_ORDER["new_lead"]).toBeLessThan(BUYER_STAGE_ORDER["qualified"]);
    expect(BUYER_STAGE_ORDER["qualified"]).toBeLessThan(BUYER_STAGE_ORDER["showing"]);
    expect(BUYER_STAGE_ORDER["showing"]).toBeLessThan(BUYER_STAGE_ORDER["offer"]);
    expect(BUYER_STAGE_ORDER["offer"]).toBeLessThan(BUYER_STAGE_ORDER["closed"]);
  });
});

describe("deriveStepStatuses", () => {
  it("new-lead is always completed", () => {
    const statuses = deriveStepStatuses(baseContact, [], [], []);
    expect(statuses["new-lead"]).toBe("completed");
  });

  it("qualification is in-progress for new buyer with no notes/listings/deals", () => {
    const contact = { ...baseContact, notes: null } as Contact;
    const statuses = deriveStepStatuses(contact, [], [], []);
    expect(statuses["qualification"]).toBe("in-progress");
  });

  it("qualification is completed for buyer with deals", () => {
    const statuses = deriveStepStatuses(baseContact, [], [], [baseDeal]);
    expect(statuses["qualification"]).toBe("completed");
  });

  it("active-search is completed for buyer with deal past showing", () => {
    const deal = { ...baseDeal, stage: "showing" };
    const statuses = deriveStepStatuses(baseContact, [], [], [deal]);
    expect(statuses["active-search"]).toBe("completed");
  });

  it("transaction is in-progress for buyer with deal at offer stage", () => {
    const deal = { ...baseDeal, stage: "offer" };
    const statuses = deriveStepStatuses(baseContact, [], [], [deal]);
    expect(statuses["transaction"]).toBe("in-progress");
  });

  it("post-close is completed for buyer with won deal", () => {
    const statuses = deriveStepStatuses(baseContact, [], [], [wonDeal]);
    expect(statuses["post-close"]).toBe("completed");
  });

  // Seller logic
  it("active-search is completed for seller with active listing", () => {
    const statuses = deriveStepStatuses(sellerContact, [activeListing], [], []);
    expect(statuses["active-search"]).toBe("completed");
  });

  it("post-close is completed for seller with sold listing", () => {
    const statuses = deriveStepStatuses(sellerContact, [soldListing], [], []);
    expect(statuses["post-close"]).toBe("completed");
  });
});

describe("deriveSubstepStatuses", () => {
  it("derives new-lead substeps from contact data", () => {
    const statuses = deriveStepStatuses(baseContact, [], [], []);
    const sub = deriveSubstepStatuses(baseContact, [], [], statuses, []);
    expect(sub["capture-name"]).toBe("completed");
    expect(sub["capture-phone"]).toBe("completed");
    expect(sub["capture-email"]).toBe("completed");
    expect(sub["set-channel"]).toBe("completed");
  });

  it("capture-name is in-progress when no name", () => {
    const contact = { ...baseContact, name: "" } as Contact;
    const statuses = deriveStepStatuses(contact, [], [], []);
    const sub = deriveSubstepStatuses(contact, [], [], statuses, []);
    expect(sub["capture-name"]).toBe("in-progress");
  });

  it("buyer deal substeps reflect deal stage", () => {
    const deal = { ...baseDeal, stage: "showing" };
    const statuses = deriveStepStatuses(baseContact, [], [], [deal]);
    const sub = deriveSubstepStatuses(baseContact, [], [], statuses, [deal]);
    expect(sub["link-listings"]).toBe("completed");
    expect(sub["schedule-viewings"]).toBe("completed");
  });
});

describe("getSubstepMessage", () => {
  const ctx: MessageContext = {
    contactName: "Jane",
    contactType: "buyer",
    listingsCount: 2,
    communicationsCount: 5,
    hasNotes: true,
    hasEmail: true,
    listingAddresses: ["123 Main St"],
    bestDealAddress: "456 Oak Ave",
    bestDealValue: 500000,
    bestDealCloseDate: "2024-06-15",
    bestDealStatus: "active",
    dealsCount: 1,
  };

  it("returns completed message with contact name", () => {
    const msg = getSubstepMessage("capture-name", "completed", ctx);
    expect(msg).toContain("Jane");
  });

  it("returns buyer-specific message when deal exists", () => {
    const msg = getSubstepMessage("link-listings", "completed", ctx);
    expect(msg).toContain("456 Oak Ave");
  });

  it("includes deal value for budget message", () => {
    const msg = getSubstepMessage("determine-budget", "completed", ctx);
    expect(msg).toContain("$500,000");
  });

  it("returns empty string for unknown substep", () => {
    expect(getSubstepMessage("unknown", "completed", ctx)).toBe("");
  });
});

describe("getStepDataSections", () => {
  it("returns contact info for new-lead step", () => {
    const sections = getStepDataSections("new-lead", baseContact, [], [], []);
    expect(sections).not.toBeNull();
    expect(sections![0].title).toBe("Contact Info");
    expect(sections![0].fields[0].value).toBe("Jane Doe");
  });

  it("returns buyer assessment for qualification with deal", () => {
    const sections = getStepDataSections("qualification", baseContact, [], [], [baseDeal]);
    expect(sections).not.toBeNull();
    expect(sections![0].title).toBe("Buyer Assessment");
  });

  it("returns seller assessment for qualification without deal", () => {
    const sections = getStepDataSections("qualification", sellerContact, [activeListing], [], []);
    expect(sections).not.toBeNull();
    expect(sections![0].title).toBe("Assessment");
  });

  it("returns null for unknown step", () => {
    expect(getStepDataSections("unknown", baseContact, [], [], [])).toBeNull();
  });
});

describe("CONTACT_STEPS", () => {
  it("has 5 steps", () => {
    expect(CONTACT_STEPS).toHaveLength(5);
  });

  it("steps are: new-lead, qualification, active-search, transaction, post-close", () => {
    expect(CONTACT_STEPS.map((s) => s.id)).toEqual([
      "new-lead",
      "qualification",
      "active-search",
      "transaction",
      "post-close",
    ]);
  });

  it("all substep IDs are unique", () => {
    const ids = CONTACT_STEPS.flatMap((s) => s.substeps.map((sub) => sub.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
