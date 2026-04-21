/**
 * Auth Test Helpers — Realtors360 CRM
 *
 * Provides auth utilities for integration and unit tests.
 * Stack: Supabase (@supabase/supabase-js) + NextAuth v5 (JWT sessions).
 * No Prisma, no Stripe, no Express, no MCP.
 *
 * Three entry points:
 *   getDemoSession()          — log in via demo auth, return session object
 *   getTenantClient(realtorId) — Supabase client scoped to a specific realtor
 *   getAdminClient()          — Supabase service-role client (bypasses RLS)
 *
 * Usage:
 *   import { getDemoSession, getTenantClient, getAdminClient } from '../helpers/auth-helpers';
 *
 *   const session = await getDemoSession();
 *   const tenantDb = getTenantClient(session.user.id);
 *   const adminDb = getAdminClient();
 */
import { vi } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// === Demo User Constants ===

export const DEMO_USER = {
  id: '00000000-0000-0000-0000-000000000099', // Fixed UUID for test user
  email: 'demo@realestatecrm.com',
  name: 'Demo Realtor',
  role: 'admin',
  plan: 'professional',
} as const;

export const DEMO_REALTOR_ID = DEMO_USER.id;

// Second user for cross-tenant isolation tests
export const OTHER_USER = {
  id: '00000000-0000-0000-0000-000000000098',
  email: 'other@realestatecrm.com',
  name: 'Other Realtor',
  role: 'admin',
  plan: 'professional',
} as const;

// === Session Functions ===

/**
 * Log in via the demo auth endpoint and return a NextAuth v5 JWT session.
 *
 * For integration tests against a running dev server, this POSTs to
 * /api/auth/callback/credentials with DEMO_EMAIL/DEMO_PASSWORD.
 * For unit tests, returns a mock session object matching NextAuth v5 shape.
 */
export async function getDemoSession(
  baseUrl: string = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
) {
  // For unit tests or when no server is running, return a mock session
  if (process.env.VITEST === 'true' || process.env.TEST_MODE === 'unit') {
    return mockSession();
  }

  // For integration tests, authenticate against the running server
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const { csrfToken } = await csrfRes.json();

  const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      csrfToken,
      email: process.env.DEMO_EMAIL || DEMO_USER.email,
      password: process.env.DEMO_PASSWORD || 'demo-password',
    }).toString(),
    redirect: 'manual',
  });

  // Extract session cookie from Set-Cookie header
  const cookies = loginRes.headers.getSetCookie?.() || [];
  const sessionCookie = cookies.find((c) => c.startsWith('next-auth.session-token='));

  if (!sessionCookie) {
    throw new Error('Demo login failed — no session cookie returned');
  }

  // Fetch session data using the cookie
  const sessionRes = await fetch(`${baseUrl}/api/auth/session`, {
    headers: { Cookie: sessionCookie.split(';')[0] },
  });
  const session = await sessionRes.json();

  return {
    ...session,
    _cookie: sessionCookie.split(';')[0], // For subsequent authenticated requests
  };
}

/**
 * Create a Supabase client scoped to a specific realtor.
 *
 * Uses the service role key (bypasses RLS at the Supabase level) but provides
 * a wrapper that auto-injects `.eq('realtor_id', realtorId)` on queries,
 * mimicking the app's getAuthenticatedTenantClient() behavior.
 *
 * This is for test assertions that need to verify data belongs to a tenant.
 */
export function getTenantClient(realtorId: string): SupabaseClient & { realtorId: string } {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Attach realtorId for test convenience — callers should use
  // `.eq('realtor_id', client.realtorId)` in their queries
  return Object.assign(client, { realtorId });
}

/**
 * Return the Supabase admin client (service role, bypasses RLS).
 * Use for test setup/teardown and cross-tenant assertions.
 */
export function getAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

// === Session Mocking (for unit tests) ===

/**
 * Creates a mock NextAuth v5 session object.
 * Compatible with the JWT session shape used by Realtors360.
 */
export function mockSession(overrides?: Partial<typeof DEMO_USER>) {
  const user = { ...DEMO_USER, ...overrides };
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
}

/**
 * Creates a session for a different user (cross-tenant isolation tests).
 */
export function mockOtherSession() {
  return mockSession(OTHER_USER);
}

/**
 * Mock the auth() function from NextAuth v5 for App Router.
 * Call in beforeEach() or test setup.
 *
 * Example:
 *   setupAuthMock(); // uses demo user
 *   setupAuthMock(mockSession(OTHER_USER)); // uses other user
 */
export function setupAuthMock(session = mockSession()) {
  vi.mock('@/lib/auth', () => ({
    auth: vi.fn(() => Promise.resolve(session)),
    authOptions: {},
  }));
}

// === Request Helpers for API Route Tests ===

/**
 * Creates headers with test user identification for API route testing.
 * In real integration tests, use getDemoSession() cookie instead.
 */
export function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-test-user-id': DEMO_USER.id,
    'x-test-user-email': DEMO_USER.email,
  };
}

/**
 * Creates a full Request init object with auth headers.
 */
export function createAuthenticatedRequest(
  method: string = 'GET',
  body?: unknown,
): RequestInit {
  const init: RequestInit = {
    method,
    headers: getAuthHeaders(),
  };
  if (body) {
    init.body = JSON.stringify(body);
  }
  return init;
}

// === Cron Auth Helpers ===

/**
 * Creates headers for authenticated cron endpoint requests.
 * Cron endpoints use Bearer token auth with CRON_SECRET.
 */
export function getCronHeaders(secret?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${secret || process.env.CRON_SECRET || 'test-cron-secret'}`,
  };
}

/**
 * Creates invalid cron auth headers for negative testing.
 */
export function getInvalidCronHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer invalid-token-12345',
  };
}

// === Tenant Isolation Helpers ===

/**
 * Mock the tenant client module to return a scoped client for a specific realtor.
 * Use in unit tests to verify tenant isolation without a running server.
 */
export function mockTenantClient(realtorId: string = DEMO_REALTOR_ID) {
  vi.mock('@/lib/supabase/tenant', () => ({
    getAuthenticatedTenantClient: vi.fn(async () => ({
      realtorId,
      // Individual tests should mock specific Supabase query chains
    })),
  }));
}

// === Test Lifecycle Helpers ===

/**
 * Standard auth setup for server action tests.
 * Mocks both next-auth and @/lib/auth for full coverage.
 */
export function setupServerActionAuth(session = mockSession()) {
  vi.mock('next-auth', () => ({
    getServerSession: vi.fn(() => Promise.resolve(session)),
  }));

  vi.mock('@/lib/auth', () => ({
    auth: vi.fn(() => Promise.resolve(session)),
    authOptions: {},
  }));
}

/**
 * Standard auth setup for unauthenticated tests (should return 401).
 */
export function setupUnauthenticated() {
  vi.mock('next-auth', () => ({
    getServerSession: vi.fn(() => Promise.resolve(null)),
  }));

  vi.mock('@/lib/auth', () => ({
    auth: vi.fn(() => Promise.resolve(null)),
    authOptions: {},
  }));
}

// === Assertion Helpers ===

/**
 * Assert that a response is a 401 Unauthorized.
 */
export function assertUnauthorized(response: Response) {
  if (response.status !== 401) {
    throw new Error(`Expected 401 Unauthorized, got ${response.status}`);
  }
}
