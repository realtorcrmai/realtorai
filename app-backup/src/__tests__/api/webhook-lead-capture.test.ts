import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockSupabase } from "../setup";

// Mock workflow triggers
vi.mock("@/lib/workflow-triggers", () => ({
  fireTrigger: vi.fn().mockResolvedValue(undefined),
}));

const WEBHOOK_SECRET = "test-webhook-secret-123";

// Set env before importing
vi.stubEnv("WEBHOOK_SECRET", WEBHOOK_SECRET);

const { POST } = await import("@/app/api/webhooks/lead-capture/route");

function makeWebhookRequest(body: unknown, secret?: string): NextRequest {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (secret !== undefined) {
    headers["X-Webhook-Secret"] = secret;
  }
  return new NextRequest(new URL("http://localhost:3000/api/webhooks/lead-capture"), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/webhooks/lead-capture", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when X-Webhook-Secret header is missing", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/webhooks/lead-capture"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test", phone: "+16045551234" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("returns 401 when X-Webhook-Secret is wrong", async () => {
    const res = await POST(makeWebhookRequest({ name: "Test", phone: "+16045551234" }, "wrong-secret"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("Unauthorized");
  });

  it("returns 422 when name is missing", async () => {
    const res = await POST(makeWebhookRequest({ phone: "+16045551234" }, WEBHOOK_SECRET));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toBeDefined();
  });

  it("returns 422 when phone is missing", async () => {
    const res = await POST(makeWebhookRequest({ name: "Test Lead" }, WEBHOOK_SECRET));
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 422 when phone is too short", async () => {
    const res = await POST(makeWebhookRequest({ name: "Test", phone: "123" }, WEBHOOK_SECRET));
    expect(res.status).toBe(422);
  });

  it("returns 422 when phone has invalid characters", async () => {
    const res = await POST(makeWebhookRequest({ name: "Test", phone: "abc-def-ghij" }, WEBHOOK_SECRET));
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid type value", async () => {
    const res = await POST(makeWebhookRequest(
      { name: "Test", phone: "+16045551234", type: "landlord" },
      WEBHOOK_SECRET,
    ));
    expect(res.status).toBe(422);
  });

  it("returns 422 for invalid email format", async () => {
    const res = await POST(makeWebhookRequest(
      { name: "Test", phone: "+16045551234", email: "not-an-email" },
      WEBHOOK_SECRET,
    ));
    expect(res.status).toBe(422);
  });

  it("accepts empty string email", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-id" }, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain as never);

    const res = await POST(makeWebhookRequest(
      { name: "Test", phone: "+16045551234", email: "" },
      WEBHOOK_SECRET,
    ));
    expect(res.status).toBe(201);
  });

  it("creates contact and returns 201 with contact_id for valid data", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "new-contact-id" }, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain as never);

    const res = await POST(makeWebhookRequest(
      { name: "New Lead", phone: "+16045551234", email: "lead@example.com", type: "buyer" },
      WEBHOOK_SECRET,
    ));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.contact_id).toBe("new-contact-id");
  });

  it("inserts with correct default values (lead_status, pref_channel, source)", async () => {
    const insertFn = vi.fn().mockReturnThis();
    const chain = {
      insert: insertFn,
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: "id-1" }, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain as never);

    await POST(makeWebhookRequest(
      { name: "Lead", phone: "+16045551234" },
      WEBHOOK_SECRET,
    ));

    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      lead_status: "new",
      pref_channel: "sms",
      source: "webhook",
      type: "buyer", // default
    }));
  });

  it("returns 500 when supabase insert fails", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "duplicate key" } }),
    };
    mockSupabase.from.mockReturnValue(chain as never);

    const res = await POST(makeWebhookRequest(
      { name: "Lead", phone: "+16045551234" },
      WEBHOOK_SECRET,
    ));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to create contact");
  });
});
