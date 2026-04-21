/**
 * L7 — Resilience Testing: External Service Failures
 *
 * Infrastructure needed: nock for HTTP failure injection, running dev server.
 * These tests verify the app degrades gracefully when external services fail.
 *
 * Skip-not-omit: all tests are present but skipped until infrastructure is ready.
 */
import { describe, it } from 'vitest';

describe('L7 — External service resilience', () => {
  it.skip('REQ-RESILIENCE-001 TC-RS-001: app handles Twilio 500 gracefully @p1', () => {
    // TODO: Stub Twilio to return 500, verify showing request still saves to DB
  });

  it.skip('REQ-RESILIENCE-002 TC-RS-002: app handles Resend rate limit gracefully @p1', () => {
    // TODO: Stub Resend to return 429, verify newsletter marked as deferred not failed
  });

  it.skip('REQ-RESILIENCE-003 TC-RS-003: app handles Anthropic timeout gracefully @p1', () => {
    // TODO: Stub Claude API to timeout, verify MLS remarks generation returns fallback
  });

  it.skip('REQ-RESILIENCE-004 TC-RS-004: app handles Supabase connection drop gracefully @p2', () => {
    // TODO: This requires toxiproxy or similar. Deferred until staging env available.
  });
});
