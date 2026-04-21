/**
 * L1 Unit Tests — Contact Zod Schema Validation
 *
 * Tests every validation rule in the contactSchema.
 * REQ-CONTACT-002: Contact data must be validated before persistence.
 */

import { describe, test, expect } from "vitest";
import { contactSchema } from "@/lib/schemas/contact";

describe("contactSchema", () => {
  // ── Happy paths ───────────────────────────────────────────

  test("REQ-CONTACT-002 TC-VL-001: accepts valid minimal contact @p0", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      type: "buyer",
    });
    expect(result.success).toBe(true);
  });

  test("REQ-CONTACT-002 TC-VL-002: accepts valid full contact @p1", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      email: "jane@example.com",
      type: "seller",
      pref_channel: "whatsapp",
      notes: "Interested in Kitsilano",
      address: "123 Main St, Vancouver, BC",
      postal_code: "V5K 0A1",
      lead_status: "qualified",
      casl_consent_given: true,
    });
    expect(result.success).toBe(true);
  });

  // ── Name validation ───────────────────────────────────────

  test("REQ-CONTACT-002 TC-VL-010: rejects name shorter than 2 chars @p0", () => {
    const result = contactSchema.safeParse({
      name: "J",
      phone: "+16045551234",
      type: "buyer",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("name");
  });

  test("REQ-CONTACT-002 TC-VL-011: rejects empty name @p0", () => {
    const result = contactSchema.safeParse({
      name: "",
      phone: "+16045551234",
      type: "buyer",
    });
    expect(result.success).toBe(false);
  });

  test("REQ-CONTACT-002 TC-VL-012: accepts name exactly 2 chars @p1", () => {
    const result = contactSchema.safeParse({
      name: "Jo",
      phone: "+16045551234",
      type: "buyer",
    });
    expect(result.success).toBe(true);
  });

  test("REQ-CONTACT-002 TC-VL-013: accepts unicode name @p2", () => {
    const result = contactSchema.safeParse({
      name: "李明 Smith",
      phone: "+16045551234",
      type: "buyer",
    });
    expect(result.success).toBe(true);
  });

  // ── Phone validation ──────────────────────────────────────

  test("REQ-CONTACT-002 TC-VL-020: rejects phone shorter than 10 digits @p0", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "12345",
      type: "buyer",
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toContain("phone");
  });

  test("REQ-CONTACT-002 TC-VL-021: accepts 10-digit phone @p0", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "6045551234",
      type: "buyer",
    });
    expect(result.success).toBe(true);
  });

  test("REQ-CONTACT-002 TC-VL-022: accepts E.164 format @p0", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      type: "buyer",
    });
    expect(result.success).toBe(true);
  });

  test("REQ-CONTACT-002 TC-VL-023: accepts formatted phone (604) 555-1234 @p1", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "(604) 555-1234",
      type: "buyer",
    });
    expect(result.success).toBe(true);
  });

  test("REQ-CONTACT-002 TC-VL-024: rejects phone with letters @p1", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "604-555-ABCD",
      type: "buyer",
    });
    expect(result.success).toBe(false);
  });

  // ── Email validation ──────────────────────────────────────

  test("REQ-CONTACT-002 TC-VL-030: accepts valid email @p0", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      email: "jane@example.com",
      type: "buyer",
    });
    expect(result.success).toBe(true);
  });

  test("REQ-CONTACT-002 TC-VL-031: accepts empty email (optional) @p1", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      email: "",
      type: "buyer",
    });
    expect(result.success).toBe(true);
  });

  test("REQ-CONTACT-002 TC-VL-032: rejects invalid email format @p0", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      email: "not-an-email",
      type: "buyer",
    });
    expect(result.success).toBe(false);
  });

  // ── Type validation ───────────────────────────────────────

  test("REQ-CONTACT-002 TC-VL-040: accepts all valid types @p0", () => {
    const types = ["buyer", "seller", "customer", "agent", "partner", "other"];
    for (const type of types) {
      const result = contactSchema.safeParse({
        name: "Jane Smith",
        phone: "+16045551234",
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  test("REQ-CONTACT-002 TC-VL-041: rejects invalid type @p0", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      type: "invalid_type",
    });
    expect(result.success).toBe(false);
  });

  // ── Postal code validation ────────────────────────────────

  test("REQ-CONTACT-002 TC-VL-050: accepts Canadian postal code @p1", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      type: "buyer",
      postal_code: "V5K 0A1",
    });
    expect(result.success).toBe(true);
  });

  test("REQ-CONTACT-002 TC-VL-051: accepts US zip code @p1", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      type: "buyer",
      postal_code: "98101",
    });
    expect(result.success).toBe(true);
  });

  test("REQ-CONTACT-002 TC-VL-052: rejects invalid postal code @p1", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      type: "buyer",
      postal_code: "INVALID",
    });
    expect(result.success).toBe(false);
  });

  test("REQ-CONTACT-002 TC-VL-053: accepts empty postal code (optional) @p2", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      type: "buyer",
      postal_code: "",
    });
    expect(result.success).toBe(true);
  });

  // ── Pref channel validation ───────────────────────────────

  test("REQ-CONTACT-002 TC-VL-060: defaults pref_channel to sms @p1", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      type: "buyer",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pref_channel).toBe("sms");
    }
  });

  // ── Referred by validation ────────────────────────────────

  test("REQ-CONTACT-002 TC-VL-070: accepts valid UUID for referred_by_id @p2", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      type: "buyer",
      referred_by_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  test("REQ-CONTACT-002 TC-VL-071: rejects non-UUID for referred_by_id @p2", () => {
    const result = contactSchema.safeParse({
      name: "Jane Smith",
      phone: "+16045551234",
      type: "buyer",
      referred_by_id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});
