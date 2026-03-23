import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { mockSupabase } from "../setup";

// Mock api-auth module
const mockRequireAuth = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

// Import after mocks
const { GET, POST } = await import("@/app/api/contacts/route");

function makeRequest(url: string, init?: RequestInit): NextRequest {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

describe("GET /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ session: { user: { email: "test@test.com" } }, unauthorized: null });
  });

  it("returns 401 when unauthenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireAuth.mockResolvedValue({
      session: null,
      unauthorized: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await GET(makeRequest("http://localhost:3000/api/contacts"));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("Authentication required");
  });

  it("returns contacts list on success", async () => {
    const contacts = [
      { id: "1", name: "Alice", phone: "+16045551000", type: "buyer" },
      { id: "2", name: "Bob", phone: "+16045551001", type: "seller" },
    ];

    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };
    // Make it thenable to resolve with data
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve({ data: contacts, error: null }),
    });
    mockSupabase.from.mockReturnValue(chain as never);

    const res = await GET(makeRequest("http://localhost:3000/api/contacts"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(contacts);
  });

  it("calls supabase.from('contacts') with correct table", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
    });
    mockSupabase.from.mockReturnValue(chain as never);

    await GET(makeRequest("http://localhost:3000/api/contacts"));
    expect(mockSupabase.from).toHaveBeenCalledWith("contacts");
  });

  it("orders contacts by created_at descending", async () => {
    const orderFn = vi.fn().mockReturnThis();
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: orderFn,
      then: vi.fn(),
    };
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
    });
    mockSupabase.from.mockReturnValue(chain as never);

    await GET(makeRequest("http://localhost:3000/api/contacts"));
    expect(orderFn).toHaveBeenCalledWith("created_at", { ascending: false });
  });

  it("applies search filter when search param is provided", async () => {
    const orFn = vi.fn().mockReturnThis();
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: orFn,
      eq: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
    });
    mockSupabase.from.mockReturnValue(chain as never);

    await GET(makeRequest("http://localhost:3000/api/contacts?search=Alice"));
    expect(orFn).toHaveBeenCalledWith("name.ilike.%Alice%,phone.ilike.%Alice%,email.ilike.%Alice%");
  });

  it("filters by type=buyer when type param is provided", async () => {
    const eqFn = vi.fn().mockReturnThis();
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: eqFn,
      then: vi.fn(),
    };
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
    });
    mockSupabase.from.mockReturnValue(chain as never);

    await GET(makeRequest("http://localhost:3000/api/contacts?type=buyer"));
    expect(eqFn).toHaveBeenCalledWith("type", "buyer");
  });

  it("filters by type=seller when type param is seller", async () => {
    const eqFn = vi.fn().mockReturnThis();
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: eqFn,
      then: vi.fn(),
    };
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
    });
    mockSupabase.from.mockReturnValue(chain as never);

    await GET(makeRequest("http://localhost:3000/api/contacts?type=seller"));
    expect(eqFn).toHaveBeenCalledWith("type", "seller");
  });

  it("ignores invalid type param (partner is not filtered)", async () => {
    const eqFn = vi.fn().mockReturnThis();
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      eq: eqFn,
      then: vi.fn(),
    };
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve({ data: [], error: null }),
    });
    mockSupabase.from.mockReturnValue(chain as never);

    await GET(makeRequest("http://localhost:3000/api/contacts?type=partner"));
    expect(eqFn).not.toHaveBeenCalledWith("type", "partner");
  });

  it("returns 500 when supabase returns an error", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve({ data: null, error: { message: "DB error" } }),
    });
    mockSupabase.from.mockReturnValue(chain as never);

    const res = await GET(makeRequest("http://localhost:3000/api/contacts"));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB error");
  });

  it("returns empty array when data is null", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      then: vi.fn(),
    };
    Object.defineProperty(chain, "then", {
      value: (resolve: (v: unknown) => void) => resolve({ data: null, error: null }),
    });
    mockSupabase.from.mockReturnValue(chain as never);

    const res = await GET(makeRequest("http://localhost:3000/api/contacts"));
    const body = await res.json();
    expect(body).toEqual([]);
  });
});

describe("POST /api/contacts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ session: { user: { email: "test@test.com" } }, unauthorized: null });
  });

  it("returns 401 when unauthenticated", async () => {
    const { NextResponse } = await import("next/server");
    mockRequireAuth.mockResolvedValue({
      session: null,
      unauthorized: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    });

    const res = await POST(makeRequest("http://localhost:3000/api/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Test", phone: "+16045551234", type: "buyer" }),
    }));
    expect(res.status).toBe(401);
  });

  it("creates a contact with valid data and returns 201", async () => {
    const newContact = { id: "abc", name: "Test User", phone: "+16045551234", type: "buyer" };
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: newContact, error: null }),
    };
    mockSupabase.from.mockReturnValue(chain as never);

    const res = await POST(makeRequest("http://localhost:3000/api/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Test User", phone: "+16045551234", type: "buyer" }),
    }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.name).toBe("Test User");
  });

  it("returns 400 for invalid data (missing name)", async () => {
    const res = await POST(makeRequest("http://localhost:3000/api/contacts", {
      method: "POST",
      body: JSON.stringify({ phone: "+16045551234", type: "buyer" }),
    }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });

  it("returns 400 for invalid phone number", async () => {
    const res = await POST(makeRequest("http://localhost:3000/api/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Test", phone: "abc", type: "buyer" }),
    }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when supabase insert fails", async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "Insert failed" } }),
    };
    mockSupabase.from.mockReturnValue(chain as never);

    const res = await POST(makeRequest("http://localhost:3000/api/contacts", {
      method: "POST",
      body: JSON.stringify({ name: "Test User", phone: "+16045551234", type: "buyer" }),
    }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Insert failed");
  });
});
