import { describe, it, expect } from "vitest";
import {
  deriveStepStatuses,
  deriveSubstepStatuses,
  getSubstepMessage,
  formatPrice,
  getStepDataSections,
  WORKFLOW_STEPS,
  type StepDataContext,
} from "./listingWorkflowUtils";

describe("formatPrice", () => {
  it("formats a price in CAD with no decimals", () => {
    expect(formatPrice(899000)).toBe("$899,000");
  });

  it("formats zero", () => {
    expect(formatPrice(0)).toBe("$0");
  });
});

describe("deriveStepStatuses", () => {
  const baseListing = { status: "active", mls_number: null, list_price: null };

  it("marks all steps completed for sold listings", () => {
    const statuses = deriveStepStatuses(
      { status: "sold", mls_number: "R123", list_price: 500000 },
      [],
      {}
    );
    Object.values(statuses).forEach((s) => expect(s).toBe("completed"));
  });

  it("seller-intake is always completed", () => {
    const statuses = deriveStepStatuses(baseListing, [], {});
    expect(statuses["seller-intake"]).toBe("completed");
  });

  it("data-enrichment is in-progress when no price set", () => {
    const statuses = deriveStepStatuses(baseListing, [], {});
    expect(statuses["data-enrichment"]).toBe("in-progress");
  });

  it("data-enrichment is completed when price is set", () => {
    const statuses = deriveStepStatuses(
      { ...baseListing, list_price: 500000 },
      [],
      {}
    );
    expect(statuses["data-enrichment"]).toBe("completed");
  });

  it("form-generation is in-progress when price set but no forms", () => {
    const statuses = deriveStepStatuses(
      { ...baseListing, list_price: 500000 },
      [],
      {}
    );
    expect(statuses["form-generation"]).toBe("in-progress");
  });

  it("form-generation is completed when all required forms completed", () => {
    const statuses = deriveStepStatuses(
      { ...baseListing, list_price: 500000 },
      [],
      { fintrac: "completed", dorts: "completed", pds: "completed", mlc: "completed" }
    );
    expect(statuses["form-generation"]).toBe("completed");
  });

  it("mls-submission is completed when mls_number present", () => {
    const statuses = deriveStepStatuses(
      { ...baseListing, list_price: 500000, mls_number: "R123456" },
      [],
      { fintrac: "completed", dorts: "completed", pds: "completed", mlc: "completed" }
    );
    expect(statuses["mls-submission"]).toBe("completed");
  });

  it("enforces sequential ordering — later steps cant be completed if earlier are pending", () => {
    // Price is set but forms not complete → form-generation in-progress
    // e-signature should be pending (not completed) because form-generation not done
    const statuses = deriveStepStatuses(
      { ...baseListing, list_price: 500000 },
      [],
      {}
    );
    expect(statuses["e-signature"]).toBe("pending");
  });

  it("post-listing is in-progress when status is pending", () => {
    const statuses = deriveStepStatuses(
      { status: "pending", mls_number: "R123", list_price: 500000 },
      [],
      { fintrac: "completed", dorts: "completed", pds: "completed", mlc: "completed" }
    );
    expect(statuses["post-listing"]).toBe("in-progress");
  });
});

describe("deriveSubstepStatuses", () => {
  it("marks all seller-intake substeps as completed", () => {
    const stepStatuses = deriveStepStatuses(
      { status: "active", mls_number: null, list_price: null },
      [],
      {}
    );
    const sub = deriveSubstepStatuses(
      { status: "active", mls_number: null, list_price: null },
      [],
      {},
      stepStatuses
    );
    expect(sub["verify-seller-id"]).toBe("completed");
    expect(sub["confirm-address"]).toBe("completed");
    expect(sub["pricing-expectations"]).toBe("completed");
    expect(sub["sign-dorts-intake"]).toBe("completed");
  });

  it("derives form substeps from formStatuses", () => {
    const stepStatuses = deriveStepStatuses(
      { status: "active", mls_number: null, list_price: 500000 },
      [],
      { fintrac: "completed", dorts: "draft", pds: "draft", mlc: "draft" }
    );
    const sub = deriveSubstepStatuses(
      { status: "active", mls_number: null, list_price: 500000 },
      [],
      { fintrac: "completed", dorts: "draft", pds: "draft", mlc: "draft" },
      stepStatuses
    );
    expect(sub["fill-fintrac"]).toBe("completed");
    expect(sub["fill-dorts"]).toBe("in-progress");
  });

  it("marks all post-listing substeps completed when sold", () => {
    const stepStatuses = deriveStepStatuses(
      { status: "sold", mls_number: "R123", list_price: 500000 },
      [],
      {}
    );
    const sub = deriveSubstepStatuses(
      { status: "sold", mls_number: "R123", list_price: 500000 },
      [],
      {},
      stepStatuses
    );
    expect(sub["schedule-showings"]).toBe("completed");
    expect(sub["close-transaction"]).toBe("completed");
  });
});

describe("getSubstepMessage", () => {
  const ctx = {
    address: "123 Main St",
    sellerName: "John",
    listPrice: 500000,
    mlsNumber: "R123",
    status: "active",
    documentCount: 3,
    formStatuses: {} as Record<string, "draft" | "completed">,
  };

  it("returns completed message with seller name", () => {
    const msg = getSubstepMessage("verify-seller-id", "completed", ctx);
    expect(msg).toBe("Seller verified — John");
  });

  it("returns in-progress message", () => {
    const msg = getSubstepMessage("title-search", "in-progress", ctx);
    expect(msg).toBe("Running title search on LTSA...");
  });

  it("returns pending message", () => {
    const msg = getSubstepMessage("fill-fintrac", "pending", ctx);
    expect(msg).toBe("Will generate FINTRAC form");
  });

  it("includes price in confirm-list-price message", () => {
    const msg = getSubstepMessage("confirm-list-price", "completed", ctx);
    expect(msg).toContain("$500,000");
  });

  it("returns empty string for unknown substep", () => {
    const msg = getSubstepMessage("unknown-id", "completed", ctx);
    expect(msg).toBe("");
  });
});

describe("getStepDataSections", () => {
  const baseCtx: StepDataContext = {
    seller: { name: "John", phone: "604-555-1234", email: "john@test.com", type: "seller" },
    listing: {
      status: "active",
      address: "123 Main St",
      list_price: 500000,
      mls_number: null,
      lockbox_code: "1234",
      notes: "Test notes",
    },
    documents: [],
    formStatuses: {},
    showingsCount: 3,
    stepFormData: {},
  };

  it("returns seller identity for seller-intake", () => {
    const sections = getStepDataSections("seller-intake", baseCtx);
    expect(sections).not.toBeNull();
    expect(sections![0].title).toBe("Seller Identity");
    expect(sections![0].fields[0].value).toBe("John");
  });

  it("returns form statuses for form-generation", () => {
    const ctx = { ...baseCtx, formStatuses: { fintrac: "completed" as const, dorts: "draft" as const } };
    const sections = getStepDataSections("form-generation", ctx);
    expect(sections).not.toBeNull();
    expect(sections![0].title).toBe("BC Standard Forms");
  });

  it("returns null for unknown step", () => {
    const sections = getStepDataSections("unknown", baseCtx);
    expect(sections).toBeNull();
  });

  it("shows showing count in post-listing", () => {
    const sections = getStepDataSections("post-listing", baseCtx);
    expect(sections).not.toBeNull();
    expect(sections![0].fields[0].value).toContain("3 showings");
  });
});

describe("WORKFLOW_STEPS", () => {
  it("has 9 steps", () => {
    expect(WORKFLOW_STEPS).toHaveLength(9);
  });

  it("each step has substeps", () => {
    WORKFLOW_STEPS.forEach((step) => {
      expect(step.substeps.length).toBeGreaterThan(0);
    });
  });

  it("all substep IDs are unique", () => {
    const ids = WORKFLOW_STEPS.flatMap((s) => s.substeps.map((sub) => sub.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
