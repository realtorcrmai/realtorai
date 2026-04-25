/**
 * Canonical UUIDs for E2E test fixtures.
 *
 * These IDs are seeded into the demo realtor's data by global-setup.ts
 * before any test runs. Tests reference these IDs directly instead of
 * picking whichever entity happens to be first in the DB — which makes
 * test outcomes deterministic regardless of other data in the DB.
 *
 * All fixture rows belong to the demo realtor (E2E_REALTOR_ID) and are
 * upserted idempotently, so running the suite is safe and does not
 * pollute real data.
 */

// Demo realtor account — same user logged in by tests/browser/auth.setup.ts
export const E2E_REALTOR_ID = "e044c0c6-5523-49bc-a7e4-9fc93bfa8c3a";

// Canonical seeded entities — UUIDs chosen to be visually distinct
// from real data so they're easy to spot in the DB.
export const E2E_CONTACT_ID = "e2e0c0c0-0000-4000-8000-000000000001";
export const E2E_LISTING_ID = "e2e0c0c0-0000-4000-8000-000000000002";
export const E2E_SHOWING_ID = "e2e0c0c0-0000-4000-8000-000000000003";
export const E2E_TASK_ID = "e2e0c0c0-0000-4000-8000-000000000004";
export const E2E_COMMUNICATION_ID = "e2e0c0c0-0000-4000-8000-000000000005";
