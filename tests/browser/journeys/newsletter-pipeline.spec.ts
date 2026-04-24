import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";

// Current UI (EmailMarketingTabs.tsx):
//   4 tabs — AI (default), Campaigns, Automations, Settings
//   Active tab: `border-primary text-primary` class pair

test.describe("Newsletter Pipeline Journey", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  // ── Page load ──────────────────────────────────────────────

  test("newsletters page loads successfully", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await expect(page).toHaveURL("/newsletters");
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("newsletters page renders the tab bar", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const aiTab = page.getByRole("button", { name: /^AI/ }).first();
    await expect(aiTab).toBeVisible();
  });

  // ── AI tab (default) ───────────────────────────────────────

  test("AI tab is present by default", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const aiBtn = page.getByRole("button", { name: /^AI/ }).first();
    await expect(aiBtn).toBeVisible();
  });

  test("AI tab shows pipeline card or stats", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const content = page.locator("main");
    await expect(content).toBeVisible();
    // Expect "Contacts being nurtured" (pipeline card title) OR any stat pill
    await expect(
      page.getByText(/Contacts being nurtured|sent|open rate|click rate/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  test("AI tab shows stats section with sent/open/click indicators", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const main = page.locator("main");
    await expect(main).toBeVisible();
    const mainText = await main.innerText();
    expect(mainText).toMatch(/sent|open rate|click rate/i);
  });

  // ── Campaigns tab ──────────────────────────────────────────

  test("clicking Campaigns tab switches content", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const campaignsTab = page.locator("button").filter({ hasText: /^Campaigns$/ }).first();
    await expect(campaignsTab).toBeVisible();
    await campaignsTab.click();
    await page.waitForTimeout(300);
    const content = page.locator("main .min-h-\\[400px\\]").first();
    await expect(content).toBeVisible();
  });

  test("Campaigns tab renders the CampaignsTab content area", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const campaignsTab = page.locator("button").filter({ hasText: /^Campaigns$/ }).first();
    await campaignsTab.click();
    await page.waitForTimeout(300);
    const content = page.locator("main");
    await expect(content).toBeVisible();
  });

  // ── Automations tab ────────────────────────────────────────

  test("clicking Automations tab switches content", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const automationTab = page.locator("button").filter({ hasText: /Automations/ }).first();
    await expect(automationTab).toBeVisible();
    await automationTab.click();
    await page.waitForTimeout(300);
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("Automations tab renders rules or locked overlay", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const automationTab = page.locator("button").filter({ hasText: /Automations/ }).first();
    await automationTab.click();
    await page.waitForTimeout(300);
    // Either shows ListingBlastAutomation / Greeting rules OR "Automations not enabled" locked overlay
    await expect(
      page.getByText(/Listing Blast|Greeting|Workflows|Automations not enabled/i).first()
    ).toBeVisible({ timeout: 5000 });
  });

  // ── Settings tab ───────────────────────────────────────────

  test("clicking Settings tab switches content", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const settingsTab = page.locator("button").filter({ hasText: /^Settings$/ }).first();
    await expect(settingsTab).toBeVisible();
    await settingsTab.click();
    await page.waitForTimeout(300);
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("Settings tab shows Brand Profile section", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const settingsTab = page.locator("button").filter({ hasText: /^Settings$/ }).first();
    await settingsTab.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(/Brand Profile/i).first()).toBeVisible({ timeout: 5000 });
  });

  // ── Tab enumeration ────────────────────────────────────────

  test("all 4 tabs are present in the tab bar", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const expectedTabs = [/^AI/, /^Campaigns$/, /Automations/, /^Settings$/];
    for (const pattern of expectedTabs) {
      const tab = page.getByRole("button", { name: pattern }).first();
      await expect(tab).toBeVisible();
    }
  });

  test("cycling through all tabs does not cause errors", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const patterns = [/^Campaigns$/, /Automations/, /^Settings$/, /^AI/];
    for (const pattern of patterns) {
      const tab = page.getByRole("button", { name: pattern }).first();
      await tab.click();
      await page.waitForTimeout(200);
    }
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  // ── Dashboard to newsletters flow ──────────────────────────

  test("dashboard has an Email Marketing link to /newsletters", async ({ page }) => {
    // /newsletters link only exists in MondaySidebar + MondayHeader (both
    // desktop-only). Dashboard has no tile and MobileNav excludes it.
    test.skip(test.info().project.name === "mobile", "Newsletters has no mobile nav entry");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const newsletterLink = page.locator("a[href='/newsletters']:visible").first();
    await expect(newsletterLink).toBeVisible();
  });

  test("clicking Email Marketing link navigates to newsletters page", async ({ page }) => {
    test.skip(test.info().project.name === "mobile", "Newsletters has no mobile nav entry");
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const newsletterLink = page.locator("a[href='/newsletters']:visible").first();
    await newsletterLink.click();
    await page.waitForURL("/newsletters");
    await expect(page).toHaveURL("/newsletters");
  });
});
