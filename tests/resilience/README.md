# L7 Resilience Tests

> **Status:** Scaffolded. Infrastructure needed: Nock for HTTP failure injection, test environment with configurable timeouts.

## Purpose

Test graceful degradation when external services fail:
- Twilio SMS/WhatsApp down → showing notifications queued
- Resend email down → newsletters queued for retry
- Google Calendar API down → showings created without calendar sync
- Claude AI (Anthropic) down → MLS remarks show fallback message
- Kling AI down → content generation shows error state
- Supabase slow (>5s response) → UI shows loading state, no crash

## When to implement

Phase 5 of the testing rollout (Week 6). Requires:
1. Nock stubs configured to simulate failures
2. Test environment with injectable timeouts
3. Backend error handling verified (try/catch patterns in server actions)

## Test pattern

```typescript
test('REQ-RESILIENCE-001: Twilio outage does not block showing creation @p1', async () => {
  // Configure Twilio stub to return 503
  nock('https://api.twilio.com').post(/.*/).reply(503);

  // Create showing — should succeed even though SMS fails
  const result = await createShowing(validInput);
  expect(result.success).toBe(true);

  // DB: showing exists
  const row = await getRow('appointments', result.id);
  expect(row).toBeTruthy();

  // Side effect: error logged but not thrown
  const logs = await getRows('communications', { related_id: result.id });
  expect(logs.some(l => l.channel === 'system' && l.body.includes('SMS failed'))).toBe(true);
});
```
