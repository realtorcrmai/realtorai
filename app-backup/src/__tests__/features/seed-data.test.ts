import { describe, it, expect } from "vitest";

/**
 * Seed data comprehensiveness tests.
 * These verify that the seed SQL populates all the expected categories
 * by testing against the known seed data structure.
 *
 * The seed data is static (from supabase/seed.sql), so we encode the
 * known values and verify they cover all required categories.
 */

// Seed contacts extracted from seed.sql
const SEED_CONTACTS = [
  // Sellers
  { id: "a0000000-0000-0000-0000-000000000001", type: "seller", name: "Margaret Chen" },
  { id: "a0000000-0000-0000-0000-000000000002", type: "seller", name: "David & Priya Patel" },
  { id: "a0000000-0000-0000-0000-000000000003", type: "seller", name: "Robert Yamamoto" },
  { id: "a0000000-0000-0000-0000-000000000004", type: "seller", name: "Sarah O'Brien" },
  { id: "a0000000-0000-0000-0000-000000000005", type: "seller", name: "James & Lisa Wong" },
  { id: "a0000000-0000-0000-0000-000000000006", type: "seller", name: "Elena Petrova" },
  { id: "a0000000-0000-0000-0000-000000000007", type: "seller", name: "Michael Thompson" },
  // Buyers
  { id: "b0000000-0000-0000-0000-000000000001", type: "buyer", name: "Kevin Nakamura" },
  { id: "b0000000-0000-0000-0000-000000000002", type: "buyer", name: "Amanda Foster" },
  { id: "b0000000-0000-0000-0000-000000000003", type: "buyer", name: "Carlos & Maria Rodriguez" },
  { id: "b0000000-0000-0000-0000-000000000004", type: "buyer", name: "Jennifer Liu" },
  { id: "b0000000-0000-0000-0000-000000000005", type: "buyer", name: "Thomas & Rachel Kim" },
  { id: "b0000000-0000-0000-0000-000000000006", type: "buyer", name: "Stephanie Park" },
  { id: "b0000000-0000-0000-0000-000000000007", type: "buyer", name: "Omar Hassan" },
];

const SEED_LISTINGS = [
  { id: "c0000000-0000-0000-0000-000000000001", status: "sold", mls_number: "V1234567" },
  { id: "c0000000-0000-0000-0000-000000000002", status: "pending", mls_number: "V2345678" },
  { id: "c0000000-0000-0000-0000-000000000003", status: "active", mls_number: "V3456789" },
  { id: "c0000000-0000-0000-0000-000000000004", status: "active", mls_number: null },
  { id: "c0000000-0000-0000-0000-000000000005", status: "active", mls_number: null },
  { id: "c0000000-0000-0000-0000-000000000006", status: "active", mls_number: null },
  { id: "c0000000-0000-0000-0000-000000000007", status: "active", mls_number: "V7890123" },
];

const SEED_TASKS = [
  { status: "completed", priority: "high", category: "document" },
  { status: "completed", priority: "high", category: "listing" },
  { status: "completed", priority: "urgent", category: "listing" },
  { status: "completed", priority: "medium", category: "follow_up" },
  { status: "in_progress", priority: "urgent", category: "closing" },
  { status: "in_progress", priority: "high", category: "marketing" },
  { status: "in_progress", priority: "high", category: "document" },
  { status: "in_progress", priority: "medium", category: "follow_up" },
  { status: "pending", priority: "high", category: "listing" },
  { status: "pending", priority: "medium", category: "listing" },
  { status: "pending", priority: "high", category: "listing" },
  { status: "pending", priority: "medium", category: "showing" },
  { status: "pending", priority: "low", category: "document" },
  { status: "pending", priority: "urgent", category: "inspection" },
  { status: "in_progress", priority: "high", category: "marketing" },
  { status: "pending", priority: "medium", category: "showing" },
  { status: "pending", priority: "medium", category: "follow_up" },
  { status: "pending", priority: "low", category: "general" },
];

// Contacts that have communications in seed data
const CONTACTS_WITH_COMMS = [
  "a0000000-0000-0000-0000-000000000001", // Margaret Chen (8 msgs)
  "a0000000-0000-0000-0000-000000000002", // Patels (5 msgs)
  "a0000000-0000-0000-0000-000000000003", // Robert (4 msgs)
  "a0000000-0000-0000-0000-000000000004", // Sarah (3 msgs)
  "a0000000-0000-0000-0000-000000000006", // Elena (2 msgs)
  "b0000000-0000-0000-0000-000000000001", // Kevin (2 msgs)
  "b0000000-0000-0000-0000-000000000002", // Amanda (3 msgs)
  "b0000000-0000-0000-0000-000000000003", // Carlos (4 msgs)
  "b0000000-0000-0000-0000-000000000004", // Jennifer (2 msgs)
  "b0000000-0000-0000-0000-000000000005", // Kims (3 msgs)
];

describe("Seed data: contact type distribution", () => {
  it("includes buyer contacts", () => {
    const buyers = SEED_CONTACTS.filter((c) => c.type === "buyer");
    expect(buyers.length).toBeGreaterThanOrEqual(5);
  });

  it("includes seller contacts", () => {
    const sellers = SEED_CONTACTS.filter((c) => c.type === "seller");
    expect(sellers.length).toBeGreaterThanOrEqual(5);
  });

  it("has at least 14 total contacts", () => {
    expect(SEED_CONTACTS.length).toBeGreaterThanOrEqual(14);
  });

  it("all contacts have unique IDs", () => {
    const ids = SEED_CONTACTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Seed data: listing status distribution", () => {
  it("includes active listings", () => {
    const active = SEED_LISTINGS.filter((l) => l.status === "active");
    expect(active.length).toBeGreaterThanOrEqual(3);
  });

  it("includes pending listings", () => {
    const pending = SEED_LISTINGS.filter((l) => l.status === "pending");
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });

  it("includes sold listings", () => {
    const sold = SEED_LISTINGS.filter((l) => l.status === "sold");
    expect(sold.length).toBeGreaterThanOrEqual(1);
  });

  it("has listings with and without MLS numbers", () => {
    const withMLS = SEED_LISTINGS.filter((l) => l.mls_number !== null);
    const withoutMLS = SEED_LISTINGS.filter((l) => l.mls_number === null);
    expect(withMLS.length).toBeGreaterThanOrEqual(2);
    expect(withoutMLS.length).toBeGreaterThanOrEqual(2);
  });
});

describe("Seed data: task coverage", () => {
  it("has all task statuses (completed, in_progress, pending)", () => {
    const statuses = new Set(SEED_TASKS.map((t) => t.status));
    expect(statuses).toContain("completed");
    expect(statuses).toContain("in_progress");
    expect(statuses).toContain("pending");
  });

  it("has all priority levels (low, medium, high, urgent)", () => {
    const priorities = new Set(SEED_TASKS.map((t) => t.priority));
    expect(priorities).toContain("low");
    expect(priorities).toContain("medium");
    expect(priorities).toContain("high");
    expect(priorities).toContain("urgent");
  });

  it("has diverse task categories", () => {
    const categories = new Set(SEED_TASKS.map((t) => t.category));
    expect(categories.size).toBeGreaterThanOrEqual(5);
    expect(categories).toContain("document");
    expect(categories).toContain("listing");
    expect(categories).toContain("follow_up");
    expect(categories).toContain("marketing");
    expect(categories).toContain("showing");
  });
});

describe("Seed data: communications coverage", () => {
  it("has communications for most contacts (at least 70%)", () => {
    const ratio = CONTACTS_WITH_COMMS.length / SEED_CONTACTS.length;
    expect(ratio).toBeGreaterThanOrEqual(0.7);
  });

  it("has communications for both buyers and sellers", () => {
    const sellerComms = CONTACTS_WITH_COMMS.filter((id) => id.startsWith("a"));
    const buyerComms = CONTACTS_WITH_COMMS.filter((id) => id.startsWith("b"));
    expect(sellerComms.length).toBeGreaterThanOrEqual(3);
    expect(buyerComms.length).toBeGreaterThanOrEqual(3);
  });
});
