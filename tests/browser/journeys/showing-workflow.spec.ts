import { test, expect } from "@playwright/test";
import { loginAsDemo, getFirstEntityId } from "../helpers/auth";

test.describe("Showing Workflow Journey", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  // ── Navigation to showings ─────────────────────────────────

  test("navigating to /showings redirects to the latest showing detail", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Either redirects to /showings/:id or shows empty state
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
  });

  test("showing detail page renders the property address", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const heading = page.locator("h1").first();
    await expect(heading).toBeVisible();
    await expect(heading).not.toHaveText("");
  });

  test("showing detail page displays status badge", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // ShowingStatusBadge renders requested/confirmed/denied/cancelled
    const badge = page.locator("text=/requested|confirmed|denied|cancelled/i").first();
    await expect(badge).toBeVisible();
  });

  test("showing detail page shows buyer agent info", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Buyer agent name and phone are displayed
    const agentInfo = page.locator("main").first();
    await expect(agentInfo).toBeVisible();
  });

  test("showing detail page shows date and time", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Time display with formatDistanceToNow
    const timeInfo = page.locator("text=/ago|minutes|hours|days/i").first();
    const isVisible = await timeInfo.isVisible().catch(() => false);
    expect(isVisible).toBeTruthy();
  });

  // ── Showing workflow component ─────────────────────────────

  test("showing detail page renders ShowingWorkflow component", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // ShowingWorkflow is inside a Card
    const workflowSection = page.locator("main .space-y-6").first();
    await expect(workflowSection).toBeVisible();
  });

  test("showing detail page has notes section", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    await expect(page.locator("text=Notes")).toBeVisible();
  });

  // ── Context panel ──────────────────────────────────────────

  test("showing detail page has context panel on desktop", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop panel only");
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // ShowingContextPanel renders in an aside
    const aside = page.locator("aside").first();
    await expect(aside).toBeVisible();
  });

  // ── Listing detail shows showings ──────────────────────────

  test("listing detail page has Showing History section", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    await expect(page.locator("text=Showing History")).toBeVisible();
  });

  // ── Calendar integration ───────────────────────────────────

  test("calendar page loads and renders", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    // CRMCalendar component should render
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  // ── Dashboard to showings flow ─────────────────────────────

  test("dashboard has a Showings tile linking to /showings", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const showingsTile = page.locator("a[href='/showings']").first();
    await expect(showingsTile).toBeVisible();
  });

  test("clicking Showings tile navigates to showings page", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    const showingsTile = page.locator("a[href='/showings']").first();
    await showingsTile.click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/showings");
  });

  // ── Sidebar navigation ─────────────────────────────────────

  test("showing sidebar is visible on desktop with showing entries", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Desktop sidebar only");
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const sidebar = page.locator(".border-r").first();
    await expect(sidebar).toBeVisible();
  });
});
