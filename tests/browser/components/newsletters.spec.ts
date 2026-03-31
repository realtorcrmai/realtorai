import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";

test.describe("Newsletters Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("newsletter page loads with heading", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    // h1 says "Email Marketing"
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 5000 });
    await expect(h1).toContainText("Email Marketing");
  });

  test("subtitle is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    await expect(page.getByText("AI-powered email marketing")).toBeVisible({ timeout: 5000 });
  });

  test("Overview tab button is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    // EmailMarketingTabs renders custom buttons (not role="tab")
    const tab = page.locator("button").filter({ hasText: /^Overview$/i }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("AI Workflows tab button is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tab = page.locator("button").filter({ hasText: /AI Workflows/i }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("Performance tab button is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tab = page.locator("button").filter({ hasText: /Performance/i }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("Campaigns tab button is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tab = page.locator("button").filter({ hasText: /Campaigns/i }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("Automation tab button is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tab = page.locator("button").filter({ hasText: /Automation/i }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("Settings tab button is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tab = page.locator("button").filter({ hasText: /Settings/i }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("clicking AI Workflows tab activates it", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tab = page.locator("button").filter({ hasText: /AI Workflows/i }).first();
    await tab.click();
    await page.waitForTimeout(500);
    // Active tab gets bg-primary text-white classes
    const classes = await tab.getAttribute("class");
    expect(classes).toMatch(/bg-primary|text-white/);
  });

  test("clicking Performance tab activates it", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tab = page.locator("button").filter({ hasText: /Performance/i }).first();
    await tab.click();
    await page.waitForTimeout(500);
    const classes = await tab.getAttribute("class");
    expect(classes).toMatch(/bg-primary|text-white/);
  });

  test("clicking Campaigns tab activates it", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tab = page.locator("button").filter({ hasText: /Campaigns/i }).first();
    await tab.click();
    await page.waitForTimeout(500);
    const classes = await tab.getAttribute("class");
    expect(classes).toMatch(/bg-primary|text-white/);
  });

  test("overview tab shows Pipeline section", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    // Overview tab renders Pipeline card with "Pipeline" heading
    await expect(page.getByText("Pipeline", { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test("overview tab shows stat pills", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    // Stat pills show "sent", "opens", "clicks" with % values
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText).toMatch(/sent|opens|clicks/i);
  });

  test("no NaN or undefined values", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
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

  test("tab bar is scrollable container", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tabBar = page.locator("[class*='overflow-x-auto']").first();
    await expect(tabBar).toBeVisible({ timeout: 5000 });
  });
});
