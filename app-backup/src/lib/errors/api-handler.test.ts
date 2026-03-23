import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling } from "./api-handler";
import { AppError, ErrorCode } from "./types";

// Silence console.error in tests
beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

function createMockRequest(method = "GET", path = "/api/test"): NextRequest {
  return new NextRequest(new URL(`http://localhost${path}`), { method });
}

describe("withErrorHandling", () => {
  it("returns the handler's response on success", async () => {
    const handler = vi.fn().mockResolvedValue(
      NextResponse.json({ data: "ok" }, { status: 200 })
    );
    const wrapped = withErrorHandling(handler);
    const res = await wrapped(createMockRequest());
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data).toBe("ok");
  });

  it("passes the request and context to the handler", async () => {
    const handler = vi.fn().mockResolvedValue(NextResponse.json({}));
    const wrapped = withErrorHandling(handler);
    const req = createMockRequest("POST", "/api/listings");
    const ctx = { params: { id: "123" } };
    await wrapped(req, ctx);
    expect(handler).toHaveBeenCalledWith(req, ctx);
  });

  it("returns correct status and userMessage for a thrown AppError", async () => {
    const handler = vi.fn().mockRejectedValue(
      new AppError({
        message: "Record not found in DB",
        code: ErrorCode.NOT_FOUND,
        statusCode: 404,
        userMessage: "Listing not found.",
      })
    );
    const wrapped = withErrorHandling(handler);
    const res = await wrapped(createMockRequest());
    const body = await res.json();
    expect(res.status).toBe(404);
    expect(body.error).toBe("Listing not found.");
    expect(body.code).toBe("NOT_FOUND");
  });

  it("maps a Supabase-shaped error via mapSupabaseError", async () => {
    const supabaseError = { code: "23505", message: "duplicate key value" };
    const handler = vi.fn().mockRejectedValue(supabaseError);
    const wrapped = withErrorHandling(handler);
    const res = await wrapped(createMockRequest());
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("A record with this information already exists.");
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("maps a Supabase foreign key error correctly", async () => {
    const handler = vi.fn().mockRejectedValue({
      code: "23503",
      message: "foreign key constraint",
    });
    const wrapped = withErrorHandling(handler);
    const res = await wrapped(createMockRequest());
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.code).toBe("VALIDATION_ERROR");
  });

  it("returns 500 for a plain Error", async () => {
    const handler = vi.fn().mockRejectedValue(new Error("unexpected crash"));
    const wrapped = withErrorHandling(handler);
    const res = await wrapped(createMockRequest());
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.error).toBe("An unexpected error occurred. Please try again.");
    expect(body.code).toBe("UNKNOWN");
  });

  it("returns 500 for a thrown string", async () => {
    const handler = vi.fn().mockRejectedValue("something went wrong");
    const wrapped = withErrorHandling(handler);
    const res = await wrapped(createMockRequest());
    const body = await res.json();
    expect(res.status).toBe(500);
    expect(body.code).toBe("UNKNOWN");
  });

  it("returns 500 for a thrown null", async () => {
    const handler = vi.fn().mockRejectedValue(null);
    const wrapped = withErrorHandling(handler);
    const res = await wrapped(createMockRequest());
    const body = await res.json();
    expect(res.status).toBe(500);
  });

  it("logs the error message to console.error", async () => {
    const handler = vi.fn().mockRejectedValue(
      new AppError({
        message: "DB timeout",
        code: ErrorCode.DATABASE_ERROR,
        statusCode: 500,
      })
    );
    const wrapped = withErrorHandling(handler);
    await wrapped(createMockRequest("POST", "/api/contacts"));
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("[API POST /api/contacts]"),
      "DB timeout"
    );
  });

  it("returns a valid NextResponse object in every error path", async () => {
    const errors = [
      new AppError({ message: "a", code: ErrorCode.UNAUTHORIZED, statusCode: 401 }),
      { code: "PGRST116", message: "not found" },
      new Error("plain"),
      "string error",
    ];
    for (const error of errors) {
      const handler = vi.fn().mockRejectedValue(error);
      const wrapped = withErrorHandling(handler);
      const res = await wrapped(createMockRequest());
      const body = await res.json();
      expect(body).toHaveProperty("error");
      expect(body).toHaveProperty("code");
      expect(typeof res.status).toBe("number");
    }
  });
});
