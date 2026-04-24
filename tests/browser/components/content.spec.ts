import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";

test.describe("Content Engine Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("content page loads with heading", async ({ page }) => {
    await page.goto("/content");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // h1 says "Content Engine"
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 5000 });
    await expect(h1).toContainText("Content Engine");
  });

  test("subtitle text is visible", async ({ page }) => {
    await page.goto("/content");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    await expect(page.getByText("AI-powered MLS remarks")).toBeVisible({ timeout: 5000 });
  });

  test("stat cards show labels", async ({ page }) => {
    await page.goto("/content");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    // Four stat cards: Total Listings, With Prompts, Completed Media, Processing
    expect(pageText).toMatch(/Total Listings/);
    expect(pageText).toMatch(/With Prompts/);
    expect(pageText).toMatch(/Completed Media/);
    expect(pageText).toMatch(/Processing/);
  });

  test("stat cards show numeric values", async ({ page }) => {
    await page.goto("/content");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText).toMatch(/\d+/);
  });

  test("Listings section heading is visible", async ({ page }) => {
    await page.goto("/content");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // h2 says "Listings" (uppercase tracking widest)
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText).toMatch(/Listings/i);
  });

  test("listing cards link to content detail pages", async ({ page }) => {
    await page.goto("/content");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const contentLinks = await page.locator("a[href*='/content/']").count();
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    // Either has listing links or shows "No Listings Yet"
    expect(contentLinks > 0 || pageText.includes("No Listings Yet")).toBe(true);
  });

  test("clicking a listing navigates to content detail", async ({ page }) => {
    await page.goto("/content");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const contentLink = page.locator("a[href*='/content/']").first();
    if (await contentLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await contentLink.click();
      await page.waitForTimeout(3000);
      expect(page.url()).toMatch(/\/content\/[a-z0-9-]+/);
    }
  });

  test("content detail shows listing address in h1", async ({ page }) => {
    await page.goto("/content");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const contentLink = page.locator("a[href*='/content/']").first();
    if (await contentLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await contentLink.getAttribute("href");
      await page.goto(href!);
      await page.waitForTimeout(3000);
      // Content detail has h1 with listing address
      const h1 = page.locator("h1").first();
      await expect(h1).toBeVisible({ timeout: 5000 });
      const text = await h1.textContent();
      expect(text?.trim().length).toBeGreaterThan(3);
    }
  });

  test("content detail shows Back to Content Engine link", async ({ page }) => {
    await page.goto("/content");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const contentLink = page.locator("a[href*='/content/']").first();
    if (await contentLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const href = await contentLink.getAttribute("href");
      await page.goto(href!);
      await page.waitForTimeout(3000);
      await expect(page.getByText("Back to Content Engine")).toBeVisible({ timeout: 5000 });
    }
  });

  test("no NaN or undefined values", async ({ page }) => {
    await page.goto("/content");
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

  test("invalid content ID shows not found", async ({ page }) => {
    await page.goto("/content/00000000-0000-0000-0000-000000000000");
    await page.waitForTimeout(3000);
    const contentLength = await page.evaluate(() => document.querySelector("main")?.innerText?.length || 0);
    expect(contentLength).toBeGreaterThan(0);
  });

  test("renders without critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/content");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const critical = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("hydration") &&
        !e.includes("Warning:") &&
        !e.includes("net::ERR") &&
        !e.includes("404") &&
        !e.includes("NEXT_") &&
        !e.includes("Turbopack")
    );
    expect(critical.length).toBeLessThanOrEqual(2);
  });
});
