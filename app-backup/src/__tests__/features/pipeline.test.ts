import { describe, it, expect } from "vitest";

/**
 * Pipeline logic extracted from the dashboard page (src/app/(dashboard)/page.tsx).
 * We test the pure functions: toPipelineKey, getDealValueForContact, and GCI calculation.
 */

// Extracted from page.tsx lines 107-112
function toPipelineKey(stageBar: string | null): string {
  if (!stageBar) return "new";
  if (stageBar === "active_search" || stageBar === "active_listing") return "active";
  if (["new", "qualified", "under_contract", "closed"].includes(stageBar)) return stageBar;
  return "new"; // cold, contacted, nurturing, etc. map to "new"
}

// Extracted from page.tsx lines 125-137
interface Listing {
  id: string;
  seller_id: string | null;
  buyer_id: string | null;
  list_price: number | null;
  sold_price: number | null;
  commission_rate: number | null;
  commission_amount: number | null;
  status: string;
}

function getDealValueForContact(contactId: string, listings: Listing[]): number {
  let total = 0;
  for (const l of listings) {
    if (l.seller_id === contactId || l.buyer_id === contactId) {
      if (l.status === "sold" && l.sold_price) {
        total += l.sold_price;
      } else if (l.list_price) {
        total += l.list_price;
      }
    }
  }
  return total;
}

// GCI calculation from page.tsx lines 150-159
function calculateGCI(listings: Listing[]): number {
  let totalGCI = 0;
  for (const l of listings) {
    if (l.status === "active" || l.status === "pending") {
      if (l.commission_amount) {
        totalGCI += l.commission_amount;
      } else if (l.list_price) {
        totalGCI += l.list_price * ((l.commission_rate ?? 2.5) / 100);
      }
    }
  }
  return totalGCI;
}

describe("toPipelineKey", () => {
  it("maps null to 'new'", () => {
    expect(toPipelineKey(null)).toBe("new");
  });

  it("maps empty string to 'new' (falsy)", () => {
    expect(toPipelineKey("")).toBe("new");
  });

  it("maps 'active_search' to 'active'", () => {
    expect(toPipelineKey("active_search")).toBe("active");
  });

  it("maps 'active_listing' to 'active'", () => {
    expect(toPipelineKey("active_listing")).toBe("active");
  });

  it("maps 'qualified' to 'qualified'", () => {
    expect(toPipelineKey("qualified")).toBe("qualified");
  });

  it("maps 'under_contract' to 'under_contract'", () => {
    expect(toPipelineKey("under_contract")).toBe("under_contract");
  });

  it("maps 'closed' to 'closed'", () => {
    expect(toPipelineKey("closed")).toBe("closed");
  });

  it("maps 'new' to 'new'", () => {
    expect(toPipelineKey("new")).toBe("new");
  });

  it("maps 'cold' to 'new' (unmapped stage)", () => {
    expect(toPipelineKey("cold")).toBe("new");
  });

  it("maps unknown string 'contacted' to 'new'", () => {
    expect(toPipelineKey("contacted")).toBe("new");
  });

  it("maps 'nurturing' to 'new'", () => {
    expect(toPipelineKey("nurturing")).toBe("new");
  });
});

describe("getDealValueForContact", () => {
  const baseListing: Listing = {
    id: "L1",
    seller_id: null,
    buyer_id: null,
    list_price: null,
    sold_price: null,
    commission_rate: null,
    commission_amount: null,
    status: "active",
  };

  it("returns 0 for contact with no listings", () => {
    expect(getDealValueForContact("C1", [])).toBe(0);
  });

  it("returns 0 when contact is not associated with any listing", () => {
    const listings: Listing[] = [
      { ...baseListing, seller_id: "other", list_price: 500000 },
    ];
    expect(getDealValueForContact("C1", listings)).toBe(0);
  });

  it("sums sold_price for sold listings", () => {
    const listings: Listing[] = [
      { ...baseListing, seller_id: "C1", status: "sold", sold_price: 1200000, list_price: 1100000 },
    ];
    // Should use sold_price, not list_price
    expect(getDealValueForContact("C1", listings)).toBe(1200000);
  });

  it("uses list_price for non-sold listings", () => {
    const listings: Listing[] = [
      { ...baseListing, seller_id: "C1", status: "active", list_price: 800000 },
    ];
    expect(getDealValueForContact("C1", listings)).toBe(800000);
  });

  it("sums across multiple listings as seller and buyer", () => {
    const listings: Listing[] = [
      { ...baseListing, seller_id: "C1", status: "active", list_price: 500000 },
      { ...baseListing, id: "L2", buyer_id: "C1", status: "pending", list_price: 700000 },
    ];
    expect(getDealValueForContact("C1", listings)).toBe(1200000);
  });

  it("returns 0 for active listing with no list_price", () => {
    const listings: Listing[] = [
      { ...baseListing, seller_id: "C1", status: "active", list_price: null },
    ];
    expect(getDealValueForContact("C1", listings)).toBe(0);
  });
});

describe("GCI calculation", () => {
  const baseListing: Listing = {
    id: "L1",
    seller_id: null,
    buyer_id: null,
    list_price: null,
    sold_price: null,
    commission_rate: null,
    commission_amount: null,
    status: "active",
  };

  it("calculates GCI for active listings using default 2.5% rate", () => {
    const listings: Listing[] = [
      { ...baseListing, status: "active", list_price: 1000000 },
    ];
    expect(calculateGCI(listings)).toBe(25000); // 1M * 2.5%
  });

  it("calculates GCI for pending listings", () => {
    const listings: Listing[] = [
      { ...baseListing, status: "pending", list_price: 800000 },
    ];
    expect(calculateGCI(listings)).toBe(20000); // 800K * 2.5%
  });

  it("uses custom commission_rate when provided", () => {
    const listings: Listing[] = [
      { ...baseListing, status: "active", list_price: 1000000, commission_rate: 3.5 },
    ];
    expect(calculateGCI(listings)).toBe(35000); // 1M * 3.5%
  });

  it("uses commission_amount override when provided", () => {
    const listings: Listing[] = [
      { ...baseListing, status: "active", list_price: 1000000, commission_rate: 2.5, commission_amount: 50000 },
    ];
    // commission_amount takes priority
    expect(calculateGCI(listings)).toBe(50000);
  });

  it("ignores sold listings", () => {
    const listings: Listing[] = [
      { ...baseListing, status: "sold", list_price: 1000000, sold_price: 1100000 },
    ];
    expect(calculateGCI(listings)).toBe(0);
  });

  it("sums GCI across multiple active/pending listings", () => {
    const listings: Listing[] = [
      { ...baseListing, id: "L1", status: "active", list_price: 1000000 },
      { ...baseListing, id: "L2", status: "pending", list_price: 500000, commission_rate: 3.0 },
      { ...baseListing, id: "L3", status: "sold", list_price: 2000000 },
    ];
    // L1: 1M * 2.5% = 25K, L2: 500K * 3% = 15K, L3: skipped
    expect(calculateGCI(listings)).toBe(40000);
  });

  it("returns 0 for active listing with no list_price and no commission_amount", () => {
    const listings: Listing[] = [
      { ...baseListing, status: "active", list_price: null },
    ];
    expect(calculateGCI(listings)).toBe(0);
  });
});
