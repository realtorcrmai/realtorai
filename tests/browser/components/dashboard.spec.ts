import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";

// Current dashboard (src/app/(dashboard)/page.tsx):
//   Header: "Good morning/afternoon/evening, {name}" h1 + weekday/date subtitle (PageHeader).
//   KPI grid: 4 Cards — Active Listings (→/listings), Pending Showings (→/showings),
//   Open Tasks (→/tasks), Total Contacts (→/contacts). No "Your Workspace" heading,
//   no "Manage property" / "Buyers" / "schedule" tile copy anymore.

test.describe("Dashboard Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("page loads and shows greeting", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 5000 });
    const text = await h1.textContent();
    expect(text).toMatch(/Good (morning|afternoon|evening)/);
  });

  test("page displays a weekday name in the subtitle", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // PageHeader renders subtitle as <p class="text-sm text-muted-foreground mt-0.5">
    const headerText = await page.locator("h1").first().locator("xpath=..").innerText();
    expect(headerText).toMatch(/Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday/);
  });

  test("KPI grid has Active Listings card linking to /listings", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const card = page.locator("a[href^='/listings']").filter({ hasText: /Active Listings/i }).first();
    await expect(card).toBeVisible({ timeout: 5000 });
  });

  test("KPI grid has Total Contacts card linking to /contacts", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const card = page.locator("a[href='/contacts']").filter({ hasText: /Total Contacts/i }).first();
    await expect(card).toBeVisible({ timeout: 5000 });
  });

  test("KPI grid has Pending Showings card linking to /showings", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const card = page.locator("a[href='/showings']").filter({ hasText: /Pending Showings/i }).first();
    await expect(card).toBeVisible({ timeout: 5000 });
  });

  test("KPI grid has Open Tasks card linking to /tasks", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const card = page.locator("a[href='/tasks']").filter({ hasText: /Open Tasks/i }).first();
    await expect(card).toBeVisible({ timeout: 5000 });
  });

  test("Active Listings card click navigates to /listings", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const card = page.locator("a[href^='/listings']").filter({ hasText: /Active Listings/i }).first();
    await card.click();
    // Next Link SPA navigation — must wait for URL, not DOM load.
    await page.waitForURL(/\/listings/, { timeout: 10000 });
    expect(page.url()).toContain("/listings");
  });

  test("pipeline snapshot shows stage labels", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText).toMatch(/New Leads|Qualified|Active|Under Contract|Closed/);
  });

  test("no NaN or undefined values on dashboard", async ({ page }) => {
    await page.goto("/");
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

  test("at least 5 internal navigation links", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
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
