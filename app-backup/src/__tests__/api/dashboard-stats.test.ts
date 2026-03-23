import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockSupabase } from "../setup";

// Mock api-auth module
const mockRequireAuth = vi.fn();
vi.mock("@/lib/api-auth", () => ({
  requireAuth: () => mockRequireAuth(),
}));

const { GET } = await import("@/app/api/dashboard/stats/route");

/**
 * Helper: configure mockSupabase.from to return different data per table.
 * The dashboard stats route calls supabase.from() 6 times via Promise.all.
 */
function setupSupabaseMock(overrides: {
  activeListingsCount?: number;
  pendingShowingsCount?: number;
  tasks?: { id: string; status: string }[];
  allListings?: { id: string; status: string }[];
  allDocs?: { listing_id: string; doc_type: string }[];
  totalContactsCount?: number;
} = {}) {
  const {
    activeListingsCount = 0,
    pendingShowingsCount = 0,
    tasks = [],
    allListings = [],
    allDocs = [],
    totalContactsCount = 0,
  } = overrides;

  let callIndex = 0;
  mockSupabase.from.mockImplementation(() => {
    callIndex++;
    const current = callIndex;

    const makeChain = (resolveValue: unknown) => {
      const chain: Record<string, unknown> = {};
      const handler = {
        get(_target: unknown, prop: string) {
          if (prop === "then") {
            return (resolve: (v: unknown) => void) => resolve(resolveValue);
          }
          // All chainable methods return the proxy
          return () => new Proxy({}, handler);
        },
      };
      return new Proxy(chain, handler);
    };

    switch (current) {
      case 1: // listings count (active)
        return makeChain({ count: activeListingsCount, data: null, error: null });
      case 2: // appointments count (requested)
        return makeChain({ count: pendingShowingsCount, data: null, error: null });
      case 3: // tasks (non-completed)
        return makeChain({ data: tasks, error: null });
      case 4: // all listings
        return makeChain({ data: allListings, error: null });
      case 5: // listing_documents
        return makeChain({ data: allDocs, error: null });
      case 6: // contacts count
        return makeChain({ count: totalContactsCount, data: null, error: null });
      default:
        return makeChain({ data: null, error: null, count: 0 });
    }
  });
}

describe("GET /api/dashboard/stats", () => {
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

    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns all expected stats fields", async () => {
    setupSupabaseMock();
    const res = await GET();
    const body = await res.json();
    expect(body).toHaveProperty("activeListings");
    expect(body).toHaveProperty("openTasks");
    expect(body).toHaveProperty("pendingShowings");
    expect(body).toHaveProperty("missingDocs");
    expect(body).toHaveProperty("totalContacts");
    expect(body).toHaveProperty("newLeadsToday");
  });

  it("returns correct activeListings count", async () => {
    setupSupabaseMock({ activeListingsCount: 5 });
    const res = await GET();
    const body = await res.json();
    expect(body.activeListings).toBe(5);
  });

  it("returns correct openTasks count (non-completed tasks)", async () => {
    setupSupabaseMock({
      tasks: [
        { id: "t1", status: "pending" },
        { id: "t2", status: "in_progress" },
        { id: "t3", status: "pending" },
      ],
    });
    const res = await GET();
    const body = await res.json();
    expect(body.openTasks).toBe(3);
  });

  it("returns correct pendingShowings count", async () => {
    setupSupabaseMock({ pendingShowingsCount: 3 });
    const res = await GET();
    const body = await res.json();
    expect(body.pendingShowings).toBe(3);
  });

  it("returns correct missingDocs count for active listings", async () => {
    setupSupabaseMock({
      allListings: [
        { id: "L1", status: "active" },
        { id: "L2", status: "active" },
        { id: "L3", status: "sold" }, // sold listings should not count
      ],
      allDocs: [
        { listing_id: "L1", doc_type: "FINTRAC" },
        { listing_id: "L1", doc_type: "DORTS" },
        { listing_id: "L1", doc_type: "PDS" },
        // L2 is missing DORTS and PDS
        { listing_id: "L2", doc_type: "FINTRAC" },
      ],
    });
    const res = await GET();
    const body = await res.json();
    // L1 has all 3 docs -> 0 missing, L2 is missing 2 types -> 1 listing with missing docs
    expect(body.missingDocs).toBe(1);
  });

  it("handles empty database gracefully (all zeros)", async () => {
    setupSupabaseMock();
    const res = await GET();
    const body = await res.json();
    expect(body.activeListings).toBe(0);
    expect(body.openTasks).toBe(0);
    expect(body.pendingShowings).toBe(0);
    expect(body.missingDocs).toBe(0);
    expect(body.totalContacts).toBe(0);
    expect(body.newLeadsToday).toBe(0);
  });

  it("returns totalContacts count", async () => {
    setupSupabaseMock({ totalContactsCount: 14 });
    const res = await GET();
    const body = await res.json();
    expect(body.totalContacts).toBe(14);
  });
});
