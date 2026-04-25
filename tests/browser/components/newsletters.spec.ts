import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";

// Current UI (EmailMarketingTabs.tsx):
//   4 tabs — AI, Campaigns, Automations, Settings
//   Active tab uses `border-primary text-primary` (no bg-primary/text-white)
//   Tab bar: `flex items-center gap-1 border-b border-border` (no overflow-x-auto)
//   Page subtitle: "AI sends emails to your contacts automatically"

test.describe("Newsletters Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("newsletter page loads with heading", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 5000 });
    await expect(h1).toContainText("Email Marketing");
  });

  test("subtitle is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    await expect(page.getByText(/AI sends emails/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("AI tab button is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Button text may be "AI" alone, or "AI" + badge count child (e.g. "AI 24").
    // Match the accessible name starting with "AI" to handle both.
    const tab = page.getByRole("button", { name: /^AI/ }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("Campaigns tab button is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const tab = page.locator("button").filter({ hasText: /^Campaigns$/ }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("Automations tab button is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const tab = page.locator("button").filter({ hasText: /Automations/ }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("Settings tab button is visible", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const tab = page.locator("button").filter({ hasText: /^Settings$/ }).first();
    await expect(tab).toBeVisible({ timeout: 5000 });
  });

  test("clicking Campaigns tab activates it", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const tab = page.locator("button").filter({ hasText: /^Campaigns$/ }).first();
    await tab.click();
    await page.waitForTimeout(300);
    const classes = await tab.getAttribute("class");
    expect(classes).toMatch(/border-primary|text-primary/);
  });

  test("clicking Settings tab activates it", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const tab = page.locator("button").filter({ hasText: /^Settings$/ }).first();
    await tab.click();
    await page.waitForTimeout(300);
    const classes = await tab.getAttribute("class");
    expect(classes).toMatch(/border-primary|text-primary/);
  });

  test("AI tab shows contacts-being-nurtured section", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Default tab is AI — renders Pipeline snapshot card titled "Contacts being nurtured"
    await expect(page.getByText(/Contacts being nurtured/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("AI tab shows stat pills (sent/open rate/click rate)", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText).toMatch(/sent|open rate|click rate/i);
  });

  test("no NaN or undefined values", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
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

  test("tab bar exists below the page header", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // Tab bar is flex items-center with border-b — not overflow-x-auto
    const tabBar = page.locator("div.flex.border-b.border-border").first();
    await expect(tabBar).toBeVisible({ timeout: 5000 });
  });
});
