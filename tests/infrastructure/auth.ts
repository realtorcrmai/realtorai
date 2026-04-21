/**
 * Auth Helpers for Integration Tests (L4)
 *
 * For server action testing and API route testing where we need
 * to simulate authenticated requests without a browser.
 *
 * Strategies:
 * 1. For API routes: use the demo session cookie from auth.setup
 * 2. For server actions: mock getServerSession via vi.mock
 * 3. For admin operations: use Supabase admin client directly
 */

import { getDemoRealtorId } from "./db-setup";

// ── Session mock for server action tests ────────────────────

/**
 * Create a mock session object matching NextAuth v5 shape.
 * Use with vi.mock("next-auth") to simulate authenticated server actions.
 */
export async function buildMockSession(overrides: Record<string, unknown> = {}) {
  const realtorId = await getDemoRealtorId();
  return {
    user: {
      id: realtorId,
      email: process.env.DEMO_EMAIL || "demo@realestatecrm.com",
      name: "Demo Realtor",
      image: null,
      ...overrides,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Create a mock session for a DIFFERENT user (for tenant isolation tests).
 * Uses a deterministic ID that won't collide with real data.
 */
export function buildOtherTenantSession() {
  return {
    user: {
      id: "00000000-0000-0000-0000-000000000099",
      email: "other-tenant@test.example.com",
      name: "Other Tenant",
      image: null,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

// ── API request helpers ─────────────────────────────────────

/**
 * Build headers for authenticated API requests.
 * For use with fetch() in integration tests.
 */
export function authHeaders(sessionToken?: string) {
  return {
    "Content-Type": "application/json",
    Cookie: `authjs.session-token=${sessionToken || "test-session-token"}`,
  };
}

/**
 * Build headers for cron endpoint authentication.
 * Cron endpoints use Bearer token auth with CRON_SECRET.
 */
export function cronHeaders() {
  return {
    Authorization: `Bearer ${process.env.CRON_SECRET || "test-cron-secret"}`,
    "Content-Type": "application/json",
  };
}

/**
 * Build headers for unauthenticated requests (should get 401).
 */
export function unauthHeaders() {
  return {
    "Content-Type": "application/json",
  };
}
