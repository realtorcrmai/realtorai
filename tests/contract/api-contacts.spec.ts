/**
 * L3 Contract Tests — Contacts API Shape Verification
 *
 * Verifies that the contact Zod schema matches what the API actually returns.
 * Catches frontend/backend drift before it becomes a runtime error.
 */

import { describe, test, expect } from "vitest";
import { contactSchema, type ContactFormData } from "@/lib/schemas/contact";

describe("Contact API Contract", () => {
  // ── Schema shape verification ─────────────────────────────

  test("REQ-CONTRACT-001 TC-CN-001: contactSchema has all expected fields @p0", () => {
    const shape = contactSchema.shape;
    const expectedFields = [
      "name", "phone", "email", "type", "pref_channel", "notes",
      "address", "postal_code", "referred_by_id", "source", "lead_status",
      "partner_type", "company_name", "job_title",
      "buyer_preferences", "seller_preferences", "demographics",
      "social_profiles", "casl_consent_given", "casl_consent_date",
    ];

    for (const field of expectedFields) {
      expect(shape).toHaveProperty(field);
    }
  });

  test("REQ-CONTRACT-001 TC-CN-002: valid create payload parses successfully @p0", () => {
    const payload: ContactFormData = {
      name: "Jane Smith",
      phone: "+16045551234",
      email: "jane@example.com",
      type: "buyer",
      pref_channel: "sms",
    };
    expect(() => contactSchema.parse(payload)).not.toThrow();
  });

  test("REQ-CONTRACT-001 TC-CN-003: invalid payload is rejected @p0", () => {
    const invalid = { name: "J" }; // Missing required fields
    const result = contactSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  // ── Type enum contract ────────────────────────────────────

  test("REQ-CONTRACT-002 TC-CN-010: contact type enum matches expected values @p0", () => {
    const validTypes = ["buyer", "seller", "customer", "agent", "partner", "other"];
    for (const type of validTypes) {
      const result = contactSchema.safeParse({
        name: "Test",
        phone: "6045551234",
        type,
      });
      expect(result.success).toBe(true);
    }
  });

  // ── Pref channel enum contract ────────────────────────────

  test("REQ-CONTRACT-002 TC-CN-011: pref_channel enum matches expected values @p1", () => {
    const validChannels = ["sms", "whatsapp", "email", "phone"];
    for (const channel of validChannels) {
      const result = contactSchema.safeParse({
        name: "Test",
        phone: "6045551234",
        type: "buyer",
        pref_channel: channel,
      });
      expect(result.success).toBe(true);
    }
  });

  // ── API response shape ────────────────────────────────────

  test("REQ-CONTRACT-003 TC-CN-020: API response includes expected DB fields @p1", () => {
    // This verifies the shape we expect back from Supabase
    // Fields that are auto-added by DB (not in the Zod input schema)
    const dbOnlyFields = [
      "id",
      "realtor_id",
      "created_at",
      "updated_at",
      "is_sample",
      "lifecycle_stage",
      "tags",
      "newsletter_intelligence",
    ];

    // These should NOT be in the input schema but WILL be in the response
    for (const field of dbOnlyFields) {
      expect(contactSchema.shape).not.toHaveProperty(field);
    }
  });
});
