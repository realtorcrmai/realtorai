import { describe, it, expect } from "vitest";
import { contactSchema } from "./contact";

const validBuyer = {
  name: "Jane Doe",
  phone: "1234567890",
  email: "jane@example.com",
  type: "buyer" as const,
  pref_channel: "sms" as const,
};

const validSeller = {
  name: "John Smith",
  phone: "(416) 555-1234",
  email: "john@example.com",
  type: "seller" as const,
  pref_channel: "whatsapp" as const,
};

describe("contactSchema", () => {
  // ── Valid data ──────────────────────────────────────────────

  it("accepts valid buyer data", () => {
    const result = contactSchema.safeParse(validBuyer);
    expect(result.success).toBe(true);
  });

  it("accepts valid seller data", () => {
    const result = contactSchema.safeParse(validSeller);
    expect(result.success).toBe(true);
  });

  it("accepts valid partner data with partner fields", () => {
    const result = contactSchema.safeParse({
      ...validBuyer,
      type: "partner",
      partner_type: "mortgage_broker",
      company_name: "ABC Mortgages",
      job_title: "Senior Broker",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid 'other' contact type", () => {
    const result = contactSchema.safeParse({ ...validBuyer, type: "other" });
    expect(result.success).toBe(true);
  });

  // ── Name validation ─────────────────────────────────────────

  it("fails when name is missing", () => {
    const { name: _, ...noName } = validBuyer;
    const result = contactSchema.safeParse(noName);
    expect(result.success).toBe(false);
  });

  it("fails when name is too short (min 2)", () => {
    const result = contactSchema.safeParse({ ...validBuyer, name: "J" });
    expect(result.success).toBe(false);
  });

  it("accepts a 2-character name", () => {
    const result = contactSchema.safeParse({ ...validBuyer, name: "Jo" });
    expect(result.success).toBe(true);
  });

  // ── Phone validation ────────────────────────────────────────

  it("fails when phone is missing", () => {
    const { phone: _, ...noPhone } = validBuyer;
    const result = contactSchema.safeParse(noPhone);
    expect(result.success).toBe(false);
  });

  it("fails when phone is too short", () => {
    const result = contactSchema.safeParse({ ...validBuyer, phone: "123" });
    expect(result.success).toBe(false);
  });

  it("fails when phone contains letters", () => {
    const result = contactSchema.safeParse({ ...validBuyer, phone: "123-abc-7890" });
    expect(result.success).toBe(false);
  });

  it("accepts phone with parentheses, dashes, and spaces", () => {
    const result = contactSchema.safeParse({ ...validBuyer, phone: "(416) 555-1234" });
    expect(result.success).toBe(true);
  });

  it("accepts phone with plus sign and dots", () => {
    const result = contactSchema.safeParse({ ...validBuyer, phone: "+1.416.555.1234" });
    expect(result.success).toBe(true);
  });

  // ── Email validation ────────────────────────────────────────

  it("fails when email is invalid", () => {
    const result = contactSchema.safeParse({ ...validBuyer, email: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid email", () => {
    const result = contactSchema.safeParse({ ...validBuyer, email: "test@test.com" });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for email (optional)", () => {
    const result = contactSchema.safeParse({ ...validBuyer, email: "" });
    expect(result.success).toBe(true);
  });

  it("accepts undefined email (optional)", () => {
    const { email: _, ...noEmail } = validBuyer;
    const result = contactSchema.safeParse(noEmail);
    expect(result.success).toBe(true);
  });

  // ── Type enum ───────────────────────────────────────────────

  it("rejects invalid contact type", () => {
    const result = contactSchema.safeParse({ ...validBuyer, type: "landlord" });
    expect(result.success).toBe(false);
  });

  it("accepts all valid contact types", () => {
    for (const type of ["buyer", "seller", "partner", "other"]) {
      const result = contactSchema.safeParse({ ...validBuyer, type });
      expect(result.success).toBe(true);
    }
  });

  // ── Pref channel ────────────────────────────────────────────

  it("accepts 'sms' pref_channel", () => {
    const result = contactSchema.safeParse({ ...validBuyer, pref_channel: "sms" });
    expect(result.success).toBe(true);
  });

  it("accepts 'whatsapp' pref_channel", () => {
    const result = contactSchema.safeParse({ ...validBuyer, pref_channel: "whatsapp" });
    expect(result.success).toBe(true);
  });

  it("rejects invalid pref_channel", () => {
    const result = contactSchema.safeParse({ ...validBuyer, pref_channel: "telegram" });
    expect(result.success).toBe(false);
  });

  // ── Optional fields ─────────────────────────────────────────

  it("accepts notes as optional string", () => {
    const result = contactSchema.safeParse({ ...validBuyer, notes: "VIP client" });
    expect(result.success).toBe(true);
  });

  it("accepts source as optional string", () => {
    const result = contactSchema.safeParse({ ...validBuyer, source: "Referral" });
    expect(result.success).toBe(true);
  });

  it("accepts lead_status with valid values", () => {
    for (const status of ["new", "contacted", "qualified", "nurturing", "active", "under_contract", "closed", "lost"]) {
      const result = contactSchema.safeParse({ ...validBuyer, lead_status: status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid lead_status", () => {
    const result = contactSchema.safeParse({ ...validBuyer, lead_status: "invalid_status" });
    expect(result.success).toBe(false);
  });

  // ── referred_by_id ──────────────────────────────────────────

  it("accepts a valid UUID for referred_by_id", () => {
    const result = contactSchema.safeParse({
      ...validBuyer,
      referred_by_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty string for referred_by_id", () => {
    const result = contactSchema.safeParse({ ...validBuyer, referred_by_id: "" });
    expect(result.success).toBe(true);
  });

  it("rejects non-UUID string for referred_by_id", () => {
    const result = contactSchema.safeParse({ ...validBuyer, referred_by_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  // ── Defaults ────────────────────────────────────────────────

  it("defaults pref_channel to 'sms' when not provided", () => {
    const { pref_channel: _, ...noPref } = validBuyer;
    const result = contactSchema.safeParse(noPref);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.pref_channel).toBe("sms");
    }
  });
});
