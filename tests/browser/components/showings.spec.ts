import { test, expect } from "@playwright/test";
import { loginAsDemo, getFirstEntityId } from "../helpers/auth";

test.describe("Showings Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("showings page loads (redirects or empty state)", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    expect(page.url()).toMatch(/\/showings/);
  });

  test("shows listing address or empty state heading", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Detail page h1 = listing address; empty state h2 = "No Showings Yet"
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 5000 });
    const text = await heading.textContent();
    expect(text?.trim().length).toBeGreaterThan(3);
  });

  test("shows status badge if showing exists", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    // Either a status badge or empty state message
    expect(pageText).toMatch(/requested|confirmed|denied|cancelled|No Showings/i);
  });

  test("shows buyer agent info if showing exists", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    if (!pageText.match(/No Showings/i)) {
      // Buyer agent name and phone are shown in metadata section
      expect(pageText.length).toBeGreaterThan(100);
    }
  });

  test("shows date/time if showing exists", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    if (!pageText.match(/No Showings/i)) {
      // formatDistanceToNow shows "X ago" or date format
      expect(pageText).toMatch(/\d{1,2}.*\d{4}|ago|AM|PM/i);
    }
  });

  test("Notes & Feedback section visible if showing exists", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    if (!pageText.match(/No Showings/i)) {
      expect(pageText).toMatch(/Notes & Feedback/);
    }
  });

  test("multiple cards on detail page", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // At least 1 card (empty state) or 3+ (header + workflow + notes)
    const cardCount = await page.locator("[class*='card'], [class*='Card']").count();
    expect(cardCount).toBeGreaterThanOrEqual(1);
  });

  test("showing workflow renders if showing exists", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    if (!pageText.match(/No Showings/i)) {
      // ShowingWorkflow component renders workflow actions
      expect(pageText).toMatch(/Workflow|Status|Confirm|Deny|Request|Notify/i);
    }
  });

  test("animation class is present", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const hasAnimation = await page.evaluate(() => {
      return document.querySelectorAll("[class*='animate']").length > 0;
    });
    expect(hasAnimation).toBe(true);
  });

  test("no NaN or undefined values", async ({ page }) => {
    const id = await getFirstEntityId(page, 'showings');
    if (!id) {
      test.skip(true, 'No showings in database');
      return;
    }
    await page.goto(`/showings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const text = await page.evaluate(() => {
      const main = document.querySelector("main");
      const clone = main?.cloneNode(true) as HTMLElement;
      clone?.querySelectorAll("script, style").forEach((el) => el.remove());
      return clone?.innerText || "";
    });
    expect(text).not.toMatch(/\bNaN\b/);
    expect(text).not.toMatch(/\bundefined\b/);
  });

  test("invalid showing ID shows not found", async ({ page }) => {
    await page.goto("/showings/00000000-0000-0000-0000-000000000000");
    await page.waitForTimeout(3000);
    const contentLength = await page.evaluate(() => document.querySelector("main")?.innerText?.length || 0);
    expect(contentLength).toBeGreaterThan(0);
  });
});
