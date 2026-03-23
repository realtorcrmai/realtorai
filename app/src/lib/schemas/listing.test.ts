import { describe, it, expect } from "vitest";
import { listingSchema } from "./listing";

const validListing = {
  address: "123 Main Street, Toronto ON",
  seller_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  lockbox_code: "1234",
  status: "active" as const,
};

describe("listingSchema", () => {
  // ── Valid data ──────────────────────────────────────────────

  it("accepts valid listing data", () => {
    const result = listingSchema.safeParse(validListing);
    expect(result.success).toBe(true);
  });

  it("accepts listing with all optional fields", () => {
    const result = listingSchema.safeParse({
      ...validListing,
      mls_number: "W1234567",
      list_price: 599900,
      showing_window_start: "09:00",
      showing_window_end: "17:00",
      notes: "Corner unit with great view",
    });
    expect(result.success).toBe(true);
  });

  // ── Required fields ─────────────────────────────────────────

  it("fails when address is missing", () => {
    const { address: _, ...noAddress } = validListing;
    const result = listingSchema.safeParse(noAddress);
    expect(result.success).toBe(false);
  });

  it("fails when address is too short (min 5)", () => {
    const result = listingSchema.safeParse({ ...validListing, address: "123" });
    expect(result.success).toBe(false);
  });

  it("fails when seller_id is missing", () => {
    const { seller_id: _, ...noSeller } = validListing;
    const result = listingSchema.safeParse(noSeller);
    expect(result.success).toBe(false);
  });

  it("fails when seller_id is not a valid UUID", () => {
    const result = listingSchema.safeParse({ ...validListing, seller_id: "bad-id" });
    expect(result.success).toBe(false);
  });

  it("fails when lockbox_code is missing", () => {
    const { lockbox_code: _, ...noLockbox } = validListing;
    const result = listingSchema.safeParse(noLockbox);
    expect(result.success).toBe(false);
  });

  it("fails when lockbox_code is empty string", () => {
    const result = listingSchema.safeParse({ ...validListing, lockbox_code: "" });
    expect(result.success).toBe(false);
  });

  // ── Status enum ─────────────────────────────────────────────

  it("accepts 'active' status", () => {
    const result = listingSchema.safeParse({ ...validListing, status: "active" });
    expect(result.success).toBe(true);
  });

  it("accepts 'pending' status", () => {
    const result = listingSchema.safeParse({ ...validListing, status: "pending" });
    expect(result.success).toBe(true);
  });

  it("accepts 'sold' status", () => {
    const result = listingSchema.safeParse({ ...validListing, status: "sold" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const result = listingSchema.safeParse({ ...validListing, status: "expired" });
    expect(result.success).toBe(false);
  });

  it("defaults status to 'active' when not provided", () => {
    const { status: _, ...noStatus } = validListing;
    const result = listingSchema.safeParse(noStatus);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("active");
    }
  });

  // ── Optional numeric / string fields ────────────────────────

  it("accepts positive list_price", () => {
    const result = listingSchema.safeParse({ ...validListing, list_price: 450000 });
    expect(result.success).toBe(true);
  });

  it("rejects negative list_price", () => {
    const result = listingSchema.safeParse({ ...validListing, list_price: -100 });
    expect(result.success).toBe(false);
  });

  it("rejects zero list_price", () => {
    const result = listingSchema.safeParse({ ...validListing, list_price: 0 });
    expect(result.success).toBe(false);
  });

  it("accepts optional mls_number", () => {
    const result = listingSchema.safeParse({ ...validListing, mls_number: "C8012345" });
    expect(result.success).toBe(true);
  });

  it("accepts optional notes", () => {
    const result = listingSchema.safeParse({ ...validListing, notes: "Seller prefers morning showings" });
    expect(result.success).toBe(true);
  });
});
