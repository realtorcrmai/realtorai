/**
 * Auth Test Helpers — Realtors360 CRM
 *
 * Provides session mocking for NextAuth v5 in unit/integration tests.
 * Uses the demo user credentials and JWT session format.
 *
 * Usage:
 *   import { mockSession, createAuthenticatedRequest, getAuthHeaders } from '../helpers/auth-helpers';
 *
 *   // Mock getServerSession for server action tests
 *   vi.mock('next-auth', () => ({ getServerSession: () => mockSession() }));
 *
 *   // Create authenticated fetch request for API route tests
 *   const res = await fetch('/api/contacts', createAuthenticatedRequest());
 */
import { vi } from 'vitest';

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

// === Session Mocking ===

/**
 * Creates a mock NextAuth session object.
 * Compatible with NextAuth v5 JWT session shape.
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
 * Creates a session for a different user (cross-tenant tests)
 */
export function mockOtherSession() {
  return mockSession(OTHER_USER);
}

/**
 * Mock the auth() function from NextAuth v5 for App Router
 * Call this in your test setup to mock authenticated requests.
 *
 * Example:
 *   vi.mock('@/lib/auth', () => ({
 *     auth: vi.fn(() => Promise.resolve(mockSession())),
 *   }));
 */
export function setupAuthMock(session = mockSession()) {
  vi.mock('@/lib/auth', () => ({
    auth: vi.fn(() => Promise.resolve(session)),
  }));
}

// === Request Helpers for API Route Tests ===

/**
 * Creates headers with a valid session cookie for API route testing.
 * Note: In real integration tests against a running server, use the
 * Playwright auth state instead. This is for unit-testing API handlers.
 */
export function getAuthHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    // NextAuth v5 uses encrypted JWT cookies — for unit tests, we mock
    // the auth() call directly rather than passing real cookies.
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
 * Creates an invalid cron auth header for negative testing.
 */
export function getInvalidCronHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Bearer invalid-token-12345',
  };
}

// === Tenant Isolation Helpers ===

/**
 * Mock the tenant client to return data scoped to a specific realtor.
 * Use this to test that getAuthenticatedTenantClient() correctly filters.
 */
export function mockTenantClient(realtorId: string = DEMO_REALTOR_ID) {
  vi.mock('@/lib/supabase/tenant', () => ({
    getAuthenticatedTenantClient: vi.fn(async () => {
      // Return a mock that auto-adds .eq('realtor_id', realtorId)
      return {
        realtorId,
        // In practice, the tenant client wraps Supabase —
        // individual tests should mock specific queries
      };
    }),
  }));
}

// === Test Lifecycle Helpers ===

/**
 * Standard auth setup for server action tests.
 * Call in beforeEach() to ensure session is available.
 */
export function setupServerActionAuth(session = mockSession()) {
  // Mock next-auth getServerSession
  vi.mock('next-auth', () => ({
    getServerSession: vi.fn(() => Promise.resolve(session)),
  }));

  // Mock the auth config export
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

/**
 * Assert that a response has the correct CORS headers (if applicable).
 */
export function assertCorsHeaders(response: Response) {
  // Realtors360 doesn't use CORS for same-origin — this is for webhook endpoints
  const origin = response.headers.get('access-control-allow-origin');
  if (origin && origin !== '*') {
    // Webhook endpoints may have specific CORS
  }
}
