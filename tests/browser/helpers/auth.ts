import { Page } from '@playwright/test';

/**
 * Login is handled globally by auth.setup.ts + storageState.
 * This function is now a no-op — kept for backward compatibility.
 * Tests automatically have the session cookie from storageState.
 */
export async function loginAsDemo(page: Page) {
  // Auth is pre-loaded via playwright.config.ts storageState —
  // no browser login needed per test.
  //
  // VoiceAgentWidget auto-requests microphone on mount (getUserMedia).
  // In WebKit (mobile project) this surfaces an OS-level permission
  // prompt that can't be auto-dismissed via Playwright's `permissions`
  // array (WebKit-unsupported). Stub it so the widget resolves immediately
  // without any dialog.
  await page.addInitScript(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      // @ts-expect-error - overriding for tests
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException("NotAllowedError", "NotAllowedError"));
    }
    // Pre-accept PIPEDA cookie consent + dismiss onboarding overlays so no
    // fixed-position element covers MobileNav / dashboard tiles on mobile.
    //   - cookie-consent dialog is `fixed bottom-0 z-[9999]` (blocks everything)
    //   - OnboardingNPS is `fixed bottom-4 left-4 z-40 w-80` (covers left column on mobile)
    //   - OnboardingBanner inlines at the top of /, but can shift layout
    //   - WelcomeConfetti triggers a guided tour on first visit
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("cookie-consent", "accepted");
        localStorage.setItem("cookie-consent-date", new Date().toISOString());
        localStorage.setItem("lf-nps-dismissed", "1");
        localStorage.setItem("lf-banner-dismissed", JSON.stringify({ at: Date.now() }));
        localStorage.setItem("lf-welcome-tour-seen", "1");
      }
    } catch {
      // localStorage may be unavailable pre-navigation; components re-check on mount
    }
  });
}

/**
 * Get a valid entity ID from the database via API.
 */
export async function getFirstEntityId(page: Page, table: string): Promise<string> {
  const response = await page.request.get(`/api/${table}?limit=1`);
  const data = await response.json();
  return data?.[0]?.id || '';
}

/**
 * For routes that server-redirect (e.g. /listings -> /listings/[id]),
 * resolve to a direct entity URL to avoid page.goto hanging.
 */
export async function getEntityUrl(page: Page, route: string): Promise<string> {
  const REDIRECT_ROUTES: Record<string, string> = {
    '/listings': 'listings',
    '/contacts': 'contacts',
    '/showings': 'showings',
    '/pipeline': 'listings',
    '/content': 'listings',
  };
  const table = REDIRECT_ROUTES[route];
  if (table) {
    const id = await getFirstEntityId(page, table);
    return id ? `${route}/${id}` : route;
  }
  return route;
}
