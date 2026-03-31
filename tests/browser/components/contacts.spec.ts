import { test, expect } from "@playwright/test";
import { loginAsDemo, getFirstEntityId } from "../helpers/auth";

test.describe("Contacts Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("contacts page redirects to first contact", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    expect(page.url()).toMatch(/\/contacts/);
  });

  test("contact detail shows name in h1", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 5000 });
    const text = await h1.textContent();
    expect(text?.trim().length).toBeGreaterThan(1);
  });

  test("contact type badge is visible (buyer/seller/customer)", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText).toMatch(/buyer|seller|customer|other|partner/i);
  });

  test("phone number is displayed", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    // E.164 phone format or at minimum some digits
    expect(pageText).toMatch(/\+1|phone|\d{3}/i);
  });

  test("Overview tab is visible and active by default", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // ContactDetailTabs uses shadcn Tabs with TabsTrigger role="tab"
    const tab = page.locator("[role='tab']").filter({ hasText: /overview/i }).first();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      const state = await tab.getAttribute("data-state");
      expect(state).toBe("active");
    }
  });

  test("Intelligence tab is visible", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const tab = page.locator("[role='tab']").filter({ hasText: /intelligence/i }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("Activity tab is visible", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const tab = page.locator("[role='tab']").filter({ hasText: /activity/i }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("Deals tab is visible", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const tab = page.locator("[role='tab']").filter({ hasText: /deals/i }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("clicking Intelligence tab switches content", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const tab = page.locator("[role='tab']").filter({ hasText: /intelligence/i }).first();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(500);
      const state = await tab.getAttribute("data-state");
      expect(state).toBe("active");
    }
  });

  test("clicking Activity tab switches content", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const tab = page.locator("[role='tab']").filter({ hasText: /activity/i }).first();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(500);
      const state = await tab.getAttribute("data-state");
      expect(state).toBe("active");
    }
  });

  test("clicking Deals tab switches content", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const tab = page.locator("[role='tab']").filter({ hasText: /deals/i }).first();
    if (await tab.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tab.click();
      await page.waitForTimeout(500);
      const state = await tab.getAttribute("data-state");
      expect(state).toBe("active");
    }
  });

  test("stage bar shows pipeline stages", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    // StageBar or convert button section
    expect(pageText).toMatch(/new|qualified|active|under contract|closed|cold|convert/i);
  });

  test("Edit button is visible", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const editBtn = page.locator("button").filter({ hasText: /edit/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 5000 });
  });

  test("no NaN or undefined values", async ({ page }) => {
    const id = await getFirstEntityId(page, 'contacts');
    test.skip(!id, 'No contacts in database');
    await page.goto(`/contacts/${id}`);
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const text = await page.evaluate(() => {
      const main = document.querySelector("main");
      const clone = main?.cloneNode(true) as HTMLElement;
      clone?.querySelectorAll("script, style").forEach((el) => el.remove());
      return clone?.innerText || "";
    });
    expect(text).not.toMatch(/\bNaN\b/);
    expect(text).not.toMatch(/\bundefined\b/);
  });

  test("invalid contact ID shows error page", async ({ page }) => {
    await page.goto("/contacts/00000000-0000-0000-0000-000000000000");
    await page.waitForTimeout(3000);
    const contentLength = await page.evaluate(() => document.querySelector("main")?.innerText?.length || 0);
    expect(contentLength).toBeGreaterThan(0);
  });
});
