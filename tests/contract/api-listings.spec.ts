/**
 * L3 Contract Tests — Listings API Shape Verification
 *
 * Verifies that the listing Zod schema matches what the API actually returns.
 * Catches frontend/backend drift before it becomes a runtime error.
 */

import { describe, test, expect } from "vitest";
import { listingSchema, type ListingFormData } from "@/lib/schemas/listing";
import { LISTING_STATUSES } from "@/lib/constants/listings";

describe("Listing API Contract", () => {
  // ── TC-LC-001: REQ-LISTING-001 GET /api/listings returns array ────

  test("REQ-LISTING-001 TC-LC-001: listingSchema has all expected fields @p0", () => {
    const shape = listingSchema.shape;
    const expectedFields = [
      "address",
      "seller_id",
      "lockbox_code",
      "status",
      "property_type",
      "mls_number",
      "list_price",
      "showing_window_start",
      "showing_window_end",
      "notes",
    ];

    for (const field of expectedFields) {
      expect(shape).toHaveProperty(field);
    }
  });

  test("REQ-LISTING-001 TC-LC-001b: valid create payload parses successfully @p0", () => {
    const payload: ListingFormData = {
      address: "123 Main Street, Vancouver, BC",
      seller_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      lockbox_code: "1234",
      status: "active",
    };
    expect(() => listingSchema.parse(payload)).not.toThrow();
  });

  test("REQ-LISTING-001 TC-LC-001c: invalid payload is rejected @p0", () => {
    const invalid = { address: "Hi" }; // Too short, missing required fields
    const result = listingSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  // ── TC-LC-002: REQ-LISTING-005 status enum contract ──────────────

  test("REQ-LISTING-005 TC-LC-002: listing status field matches valid enum values @p0", () => {
    const validStatuses = ["active", "pending", "conditional", "sold", "cancelled", "expired", "withdrawn"];

    // All expected statuses parse successfully
    for (const status of validStatuses) {
      const result = listingSchema.safeParse({
        address: "123 Main Street, Vancouver, BC",
        seller_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        lockbox_code: "1234",
        status,
      });
      expect(result.success).toBe(true);
    }

    // LISTING_STATUSES constant matches expected values
    expect([...LISTING_STATUSES]).toEqual(validStatuses);
  });

  test("REQ-LISTING-005 TC-LC-002b: invalid status is rejected @p0", () => {
    const result = listingSchema.safeParse({
      address: "123 Main Street, Vancouver, BC",
      seller_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      lockbox_code: "1234",
      status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });

  // ── TC-LC-003: REQ-LISTING-008 property detail fields ────────────

  test("REQ-LISTING-008 TC-LC-003: listing response includes property detail fields @p1", () => {
    const payload: ListingFormData = {
      address: "456 Oak Avenue, Burnaby, BC",
      seller_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      lockbox_code: "5678",
      status: "active",
      property_type: "Condo/Apartment",
      mls_number: "R2987654",
      list_price: 899000,
      showing_window_start: "09:00",
      showing_window_end: "17:00",
      notes: "Corner unit with mountain view",
    };

    const result = listingSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.property_type).toBe("Condo/Apartment");
      expect(result.data.mls_number).toBe("R2987654");
      expect(result.data.list_price).toBe(899000);
      expect(result.data.notes).toBe("Corner unit with mountain view");
    }
  });

  test("REQ-LISTING-008 TC-LC-003b: property_type enum validates correctly @p1", () => {
    const validTypes = ["Residential", "Condo/Apartment", "Townhouse", "Land", "Commercial", "Multi-Family"];
    for (const propertyType of validTypes) {
      const result = listingSchema.safeParse({
        address: "123 Main Street, Vancouver, BC",
        seller_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        lockbox_code: "1234",
        property_type: propertyType,
      });
      expect(result.success).toBe(true);
    }
  });

  // ── API response shape — DB-only fields ──────────────────────────

  test("REQ-LISTING-008 TC-LC-003c: DB-only fields are not in input schema @p1", () => {
    const dbOnlyFields = [
      "id",
      "realtor_id",
      "created_at",
      "updated_at",
      "deleted_at",
      "is_sample",
    ];

    for (const field of dbOnlyFields) {
      expect(listingSchema.shape).not.toHaveProperty(field);
    }
  });

  // ── list_price validation ────────────────────────────────────────

  test("REQ-LISTING-008 TC-LC-003d: list_price must be positive number @p1", () => {
    const negative = listingSchema.safeParse({
      address: "123 Main Street, Vancouver, BC",
      seller_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      lockbox_code: "1234",
      list_price: -100,
    });
    expect(negative.success).toBe(false);

    const zero = listingSchema.safeParse({
      address: "123 Main Street, Vancouver, BC",
      seller_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      lockbox_code: "1234",
      list_price: 0,
    });
    expect(zero.success).toBe(false);
  });
});
