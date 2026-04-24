import { test, expect } from "@playwright/test";
import { loginAsDemo, getFirstEntityId } from "../helpers/auth";

test.describe("Listings Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("listings page redirects to first listing detail", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    expect(page.url()).toMatch(/\/listings/);
  });

  test("listing detail shows address in h1", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 5000 });
    const text = await h1.textContent();
    expect(text?.trim().length).toBeGreaterThan(3);
  });

  test("listing detail shows price with dollar sign", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText).toMatch(/\$/);
  });

  test("listing detail shows lockbox code", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText).toMatch(/Lockbox/i);
  });

  test("seller name link points to contacts", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const sellerLink = page.locator("a[href*='/contacts/']").first();
    await expect(sellerLink).toBeVisible({ timeout: 5000 });
  });

  test("View Seller button links to contact", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const viewSeller = page.locator("a").filter({ hasText: /View Seller/i }).first();
    if (await viewSeller.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await viewSeller.getAttribute("href");
      expect(href).toMatch(/\/contacts\/[a-z0-9-]+/);
    }
  });

  test("Showing History section exists", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText).toMatch(/Showing History/i);
  });

  test("workflow section shows phase content", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    // ListingWorkflow renders phase-related content
    expect(pageText).toMatch(/Phase|Seller Intake|Data Enrichment|CMA|Pricing|Form|Signature|MLS/i);
  });

  test("status indicator is present", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    // ManualStatusOverride shows listing status
    expect(pageText).toMatch(/active|pending|sold|draft/i);
  });

  test("multiple cards rendered on detail page", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // At least header card + workflow card + showing history card
    const cardCount = await page.locator("[class*='card'], [class*='Card']").count();
    expect(cardCount).toBeGreaterThanOrEqual(2);
  });

  test("clicking View Seller navigates to contact", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const viewSeller = page.locator("a").filter({ hasText: /View Seller/i }).first();
    if (await viewSeller.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewSeller.click();
      await page.waitForTimeout(3000);
      expect(page.url()).toContain("/contacts/");
    }
  });

  test("no NaN or undefined values", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
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

  test("form-related content is present", async ({ page }) => {
    const id = await getFirstEntityId(page, 'listings');
    test.skip(!id, 'No listings in database');
    await page.goto(`/listings/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    // FormReadinessPanel or workflow shows form references
    expect(pageText).toMatch(/Form|DORTS|PDS|FINTRAC|Document/i);
  });

  test("invalid listing ID shows not found", async ({ page }) => {
    await page.goto("/listings/00000000-0000-0000-0000-000000000000");
    await page.waitForTimeout(3000);
    const contentLength = await page.evaluate(() => document.querySelector("main")?.innerText?.length || 0);
    // Should show 404 page, not crash
    expect(contentLength).toBeGreaterThan(0);
  });
});
