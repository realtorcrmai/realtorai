import { describe, it, expect } from "vitest";
import { showingSchema } from "./showing";

const validShowing = {
  listingId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  startTime: "2026-03-25T10:00:00Z",
  endTime: "2026-03-25T11:00:00Z",
  buyerAgentName: "Alice Brown",
  buyerAgentPhone: "4165551234",
};

describe("showingSchema", () => {
  // ── Valid data ──────────────────────────────────────────────

  it("accepts valid showing data", () => {
    const result = showingSchema.safeParse(validShowing);
    expect(result.success).toBe(true);
  });

  it("accepts showing with optional buyerAgentEmail", () => {
    const result = showingSchema.safeParse({
      ...validShowing,
      buyerAgentEmail: "alice@realty.com",
    });
    expect(result.success).toBe(true);
  });

  // ── Required fields ─────────────────────────────────────────

  it("fails when listingId is missing", () => {
    const { listingId: _, ...noListingId } = validShowing;
    const result = showingSchema.safeParse(noListingId);
    expect(result.success).toBe(false);
  });

  it("fails when listingId is not a UUID", () => {
    const result = showingSchema.safeParse({ ...validShowing, listingId: "not-uuid" });
    expect(result.success).toBe(false);
  });

  it("fails when startTime is missing", () => {
    const { startTime: _, ...noStart } = validShowing;
    const result = showingSchema.safeParse(noStart);
    expect(result.success).toBe(false);
  });

  it("fails when startTime is not a valid datetime", () => {
    const result = showingSchema.safeParse({ ...validShowing, startTime: "not-a-date" });
    expect(result.success).toBe(false);
  });

  it("fails when endTime is missing", () => {
    const { endTime: _, ...noEnd } = validShowing;
    const result = showingSchema.safeParse(noEnd);
    expect(result.success).toBe(false);
  });

  it("fails when buyerAgentName is missing", () => {
    const { buyerAgentName: _, ...noName } = validShowing;
    const result = showingSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it("fails when buyerAgentName is too short (min 2)", () => {
    const result = showingSchema.safeParse({ ...validShowing, buyerAgentName: "A" });
    expect(result.success).toBe(false);
  });

  it("fails when buyerAgentPhone is missing", () => {
    const { buyerAgentPhone: _, ...noPhone } = validShowing;
    const result = showingSchema.safeParse(noPhone);
    expect(result.success).toBe(false);
  });

  it("fails when buyerAgentPhone has invalid format", () => {
    const result = showingSchema.safeParse({ ...validShowing, buyerAgentPhone: "abc-def-ghij" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid buyerAgentEmail", () => {
    const result = showingSchema.safeParse({ ...validShowing, buyerAgentEmail: "bad-email" });
    expect(result.success).toBe(false);
  });
});
