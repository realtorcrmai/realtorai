import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("page loads and shows greeting", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 5000 });
    const text = await h1.textContent();
    expect(text).toMatch(/Good (morning|afternoon|evening)/);
  });

  test("page displays a weekday name in the date line", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    // The date <p> is directly above the h1 greeting
    const dateLine = page.locator("p.text-sm.font-medium.text-muted-foreground").first();
    await expect(dateLine).toBeVisible({ timeout: 5000 });
    const text = await dateLine.textContent();
    expect(text).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
  });

  test("Your Workspace heading is visible", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    // h2 with uppercase tracking text
    await expect(page.getByText("Your Workspace")).toBeVisible({ timeout: 5000 });
  });

  test("feature tiles include Listings tile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    // Target the tile card (has description text), not the nav link
    const tile = page.locator("a[href='/listings']:has-text('Manage property')");
    await expect(tile).toBeVisible({ timeout: 5000 });
  });

  test("feature tiles include Contacts tile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tile = page.locator("a[href='/contacts']:has-text('Buyers')");
    await expect(tile).toBeVisible({ timeout: 5000 });
  });

  test("feature tiles include Showings tile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tile = page.locator("a[href='/showings']:has-text('Showing')");
    await expect(tile).toBeVisible({ timeout: 5000 });
  });

  test("feature tiles include Calendar tile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tile = page.locator("a[href='/calendar']:has-text('schedule')");
    await expect(tile).toBeVisible({ timeout: 5000 });
  });

  test("feature tiles include Content Engine tile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tile = page.locator("a[href='/content']");
    await expect(tile).toBeVisible({ timeout: 5000 });
    await expect(tile).toContainText("Content Engine");
  });

  test("feature tiles include Email Marketing tile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const tile = page.locator("a[href='/newsletters']:has-text('Email Marketing')");
    await expect(tile).toBeVisible({ timeout: 5000 });
  });

  test("Listings tile click navigates to /listings", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    // Click the tile (with description), not the nav link
    await page.locator("a[href='/listings']:has-text('Manage property')").click();
    await page.waitForTimeout(3000);
    expect(page.url()).toContain("/listings");
  });

  test("pipeline snapshot shows stage labels", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    // PipelineSnapshot renders the 5 pipeline stages
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText).toMatch(/New Leads|Qualified|Active|Under Contract|Closed/);
  });

  test("no NaN or undefined values on dashboard", async ({ page }) => {
    await page.goto("/");
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

  test("at least 5 internal navigation links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);
    const count = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("a[href]"))
        .filter((a) => {
          const href = a.getAttribute("href") || "";
          return href.startsWith("/") && !href.includes("api") && !href.includes("login");
        }).length;
    });
    expect(count).toBeGreaterThanOrEqual(5);
  });
});
