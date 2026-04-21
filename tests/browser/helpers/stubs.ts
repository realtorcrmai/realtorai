/**
 * Integration Stub Helpers for E2E Tests
 *
 * Intercepts outbound HTTP requests to third-party services during E2E tests.
 * Uses Playwright's route interception to capture and mock external calls.
 *
 * Stubs:
 *   - Twilio (SMS/WhatsApp)
 *   - Resend (email)
 *   - Claude AI (Anthropic)
 *   - Kling AI (video/image)
 *   - Google Calendar
 */

import { type Page, type Route } from "@playwright/test";

// ── Types ─────────────────────────────────────────────────────

export interface CapturedCall {
  url: string;
  method: string;
  body: unknown;
  timestamp: number;
}

export interface StubCapture {
  twilio: CapturedCall[];
  resend: CapturedCall[];
  claude: CapturedCall[];
  kling: CapturedCall[];
  calendar: CapturedCall[];
}

// ── Setup & Teardown ──────────────────────────────────────────

/**
 * Install all third-party stubs on a page.
 * Call in beforeEach, collect captures, assert in tests.
 *
 * @example
 * ```ts
 * let capture: StubCapture;
 * test.beforeEach(async ({ page }) => {
 *   capture = await installStubs(page);
 * });
 *
 * test('sends SMS on showing confirm', async ({ page }) => {
 *   // ... trigger showing confirmation ...
 *   expect(capture.twilio).toHaveLength(1);
 *   expect(capture.twilio[0].body).toMatchObject({ To: '+16045551234' });
 * });
 * ```
 */
export async function installStubs(page: Page): Promise<StubCapture> {
  const capture: StubCapture = {
    twilio: [],
    resend: [],
    claude: [],
    kling: [],
    calendar: [],
  };

  // Twilio — intercept SMS/WhatsApp API calls
  await page.route("**/api.twilio.com/**", async (route: Route) => {
    const request = route.request();
    capture.twilio.push({
      url: request.url(),
      method: request.method(),
      body: parseBody(request.postData()),
      timestamp: Date.now(),
    });
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        sid: `SM${randomHex(32)}`,
        status: "queued",
        to: extractField(request.postData(), "To"),
        body: extractField(request.postData(), "Body"),
      }),
    });
  });

  // Resend — intercept email sends
  await page.route("**/api.resend.com/**", async (route: Route) => {
    const request = route.request();
    capture.resend.push({
      url: request.url(),
      method: request.method(),
      body: parseBody(request.postData()),
      timestamp: Date.now(),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: `email_${randomHex(16)}` }),
    });
  });

  // Claude AI (Anthropic) — intercept message/completion calls
  await page.route("**/api.anthropic.com/**", async (route: Route) => {
    const request = route.request();
    capture.claude.push({
      url: request.url(),
      method: request.method(),
      body: parseBody(request.postData()),
      timestamp: Date.now(),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: `msg_${randomHex(16)}`,
        type: "message",
        content: [
          {
            type: "text",
            text: "Test stub response from Claude AI.",
          },
        ],
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 20 },
      }),
    });
  });

  // Kling AI — intercept video/image generation
  await page.route("**/api.klingai.com/**", async (route: Route) => {
    const request = route.request();
    capture.kling.push({
      url: request.url(),
      method: request.method(),
      body: parseBody(request.postData()),
      timestamp: Date.now(),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        task_id: `task_${randomHex(16)}`,
        status: "completed",
        output: { url: "https://example.com/stub-output.mp4" },
      }),
    });
  });

  // Google Calendar — intercept calendar API calls
  await page.route("**/googleapis.com/calendar/**", async (route: Route) => {
    const request = route.request();
    capture.calendar.push({
      url: request.url(),
      method: request.method(),
      body: parseBody(request.postData()),
      timestamp: Date.now(),
    });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: `evt_${randomHex(16)}`,
        status: "confirmed",
        htmlLink: "https://calendar.google.com/stub",
      }),
    });
  });

  return capture;
}

/**
 * Assert no unexpected third-party calls were made.
 * Useful as a sanity check in tests that shouldn't trigger integrations.
 */
export function assertNoExternalCalls(capture: StubCapture): void {
  const total =
    capture.twilio.length +
    capture.resend.length +
    capture.claude.length +
    capture.kling.length +
    capture.calendar.length;

  if (total > 0) {
    const details = Object.entries(capture)
      .filter(([, calls]) => calls.length > 0)
      .map(([service, calls]) => `${service}: ${calls.length} calls`)
      .join(", ");
    throw new Error(`[stubs] Expected no external calls but found: ${details}`);
  }
}

// ── Internal helpers ──────────────────────────────────────────

function parseBody(postData: string | null): unknown {
  if (!postData) return null;
  try {
    return JSON.parse(postData);
  } catch {
    // Twilio sends form-urlencoded
    return Object.fromEntries(new URLSearchParams(postData));
  }
}

function extractField(postData: string | null, field: string): string {
  if (!postData) return "";
  try {
    const json = JSON.parse(postData);
    return json[field] ?? "";
  } catch {
    return new URLSearchParams(postData).get(field) ?? "";
  }
}

function randomHex(length: number): string {
  return Array.from({ length }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}
