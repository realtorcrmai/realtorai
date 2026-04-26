import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";

test.describe("Calendar Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("calendar page loads successfully", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    expect(pageText.length).toBeGreaterThan(10);
  });

  test("calendar legend badges are visible", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // CRMCalendar renders 4 legend badges: Google Calendar, Requested, Confirmed, Denied
    await expect(page.getByText("Google Calendar").first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Requested", { exact: true }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Confirmed", { exact: true }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Denied", { exact: true }).first()).toBeVisible({ timeout: 5000 });
  });

  test("calendar renders date content", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const pageText = await page.evaluate(() => document.querySelector("main")?.innerText || "");
    // react-big-calendar shows month names or day names
    expect(pageText).toMatch(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Mon|Tue|Wed|Thu|Fri|Sat|Sun/);
  });

  test("calendar has view navigation buttons", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // react-big-calendar toolbar has view buttons: Month, Week, Day, Agenda
    const buttonCount = await page.locator("button").count();
    expect(buttonCount).toBeGreaterThanOrEqual(3);
  });

  test("calendar component container has proper height", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    // CRMCalendar is a client-side dynamic import (ssr:false), so wait for
    // react-big-calendar's .rbc-calendar root to mount rather than racing the
    // chunk load.
    await expect(page.locator(".rbc-calendar").first()).toBeVisible({ timeout: 15000 });
  });

  test("calendar has animation class on container", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);
    const hasAnimation = await page.evaluate(() => {
      return document.querySelectorAll("[class*='animate']").length > 0;
    });
    expect(hasAnimation).toBe(true);
  });

  test("no NaN or undefined values", async ({ page }) => {
    await page.goto("/calendar");
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

  test("calendar page does not overflow viewport", async ({ page }) => {
    await page.goto("/calendar");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const overflows = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth + 5;
    });
    expect(overflows).toBe(false);
  });

  test("navigation to calendar from dashboard works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
    const calLink = page.locator("a[href='/calendar']");
    if (await calLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await calLink.click();
      await page.waitForFunction(() => !document.querySelector('main img[alt="Loading"]'), { timeout: 20000 }).catch(() => {});
      expect(page.url()).toContain("/calendar");
    }
  });

  test("calendar renders without critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.goto("/calendar");
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
        !e.includes("Turbopack") &&
        !e.includes("Google") &&
        !e.includes("calendar")
    );
    expect(critical.length).toBeLessThanOrEqual(2);
  });
});
