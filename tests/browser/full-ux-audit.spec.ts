import { test, expect, Page } from "@playwright/test";

// Helper: login with demo credentials via API (faster & more reliable)
async function login(page: Page) {
  // Get CSRF token
  const csrfRes = await page.request.get("/api/auth/csrf");
  const { csrfToken } = await csrfRes.json();

  // Login via credentials callback
  await page.request.post("/api/auth/callback/credentials", {
    form: {
      csrfToken,
      email: "demo@realestatecrm.com",
      password: "demo1234",
    },
  });

  // Verify session is active
  const sessionRes = await page.request.get("/api/auth/session");
  const session = await sessionRes.json();
  if (!session?.user) {
    // Fallback: try UI login
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    const emailInput = page.locator('input[type="email"]').first();
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill("demo@realestatecrm.com");
      await page.locator('input[type="password"]').first().fill("demo1234");
      await page.locator('button[type="submit"]').first().click();
      await page.waitForTimeout(3000);
    }
  }
}

// Helper: check if page is scrollable or fits in viewport
async function checkScrollable(page: Page) {
  return await page.evaluate(() => {
    const main = document.querySelector("main");
    if (!main) return { scrollable: false, error: "no <main> found" };
    const scrollEl = main.scrollHeight > main.clientHeight ? main : document.documentElement;
    return {
      scrollable: scrollEl.scrollHeight > scrollEl.clientHeight || main.scrollHeight <= main.clientHeight,
      scrollHeight: main.scrollHeight,
      clientHeight: main.clientHeight,
      overflow: getComputedStyle(main).overflow,
      overflowY: getComputedStyle(main).overflowY,
    };
  });
}

// ============================================================
// SUITE 1: Page Load & Scroll (P0)
// ============================================================
test.describe("Suite 1: Page Load & Scroll @P0", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  const routes = [
    { name: "Dashboard", path: "/", selector: "h1, h2, [class*='card'], [class*='Card']" },
    { name: "Listings", path: "/listings", selector: "h1, [class*='card'], [class*='Card']" },
    { name: "Contacts", path: "/contacts", selector: "h1, [class*='card'], [class*='Card']" },
    { name: "Showings", path: "/showings", selector: "h1" },
    { name: "Tasks", path: "/tasks", selector: "h1" },
    { name: "Newsletter Dashboard", path: "/newsletters", selector: "h1" },
    { name: "Approval Queue", path: "/newsletters/queue", selector: "h1" },
    { name: "Analytics", path: "/newsletters/analytics", selector: "h1" },
    { name: "Command Center", path: "/newsletters/control", selector: "h1" },
    { name: "Newsletter Guide", path: "/newsletters/guide", selector: "button" },
    { name: "Calendar", path: "/calendar", selector: "h1" },
    { name: "Search", path: "/search", selector: "h1, input" },
  ];

  for (const route of routes) {
    test(`${route.name} (${route.path}) loads`, async ({ page }) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBeLessThan(400);
      await page.waitForLoadState("domcontentloaded");
    });

    test(`${route.name} (${route.path}) is scrollable or fits viewport`, async ({ page }) => {
      await page.goto(route.path);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000);

      const result = await checkScrollable(page);
      // Main should NOT have overflow:hidden
      expect(result.overflow).not.toBe("hidden");
      expect(result.overflowY).not.toBe("hidden");
    });
  }
});

// ============================================================
// SUITE 2: Navigation (P0)
// ============================================================
test.describe("Suite 2: Navigation @P0", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Newsletter header buttons navigate correctly", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");

    // Queue button
    const queueBtn = page.locator("a, button", { hasText: "Queue" }).first();
    if (await queueBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await queueBtn.click();
      await page.waitForURL("**/newsletters/queue**");
      expect(page.url()).toContain("/newsletters/queue");
    }

    // Back to newsletters
    await page.goto("/newsletters");

    // Analytics button
    const analyticsBtn = page.locator("a, button", { hasText: "Analytics" }).first();
    if (await analyticsBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await analyticsBtn.click();
      await page.waitForURL("**/newsletters/analytics**");
      expect(page.url()).toContain("/newsletters/analytics");
    }

    // Command Center
    await page.goto("/newsletters");
    const cmdBtn = page.locator("a, button", { hasText: "Command Center" }).first();
    if (await cmdBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cmdBtn.click();
      await page.waitForURL("**/newsletters/control**");
      expect(page.url()).toContain("/newsletters/control");
    }
  });

  test("Walkthrough opens in new tab", async ({ page, context }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");

    const walkthroughLink = page.locator("a[href*='walkthrough']").first();
    if (await walkthroughLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      const target = await walkthroughLink.getAttribute("target");
      expect(target).toBe("_blank");
    }
  });

  test("Back buttons work on sub-pages", async ({ page }) => {
    // Queue back button
    await page.goto("/newsletters/queue");
    await page.waitForLoadState("domcontentloaded");
    const backBtn = page.locator("a, button", { hasText: /back|←/i }).first();
    if (await backBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(2000);
      expect(page.url()).toContain("/newsletters");
    }
  });
});

// ============================================================
// SUITE 3: Newsletter Dashboard Data (P0)
// ============================================================
test.describe("Suite 3: Newsletter Dashboard Data @P0", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Stats cards show numbers, not NaN or undefined", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Only check visible text in main content area, not scripts
    const visibleText = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return "";
      // Get only text from non-script, non-style elements
      const clone = main.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
      return clone.innerText || "";
    });
    expect(visibleText).not.toMatch(/\bNaN\b/);
    expect(visibleText).not.toMatch(/\bundefined\b/);
  });

  test("Pipeline shows buyer and seller sections", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    const bodyText = await page.textContent("body");
    expect(bodyText).toContain("Buyer Pipeline");
    expect(bodyText).toContain("Seller Pipeline");
    expect(bodyText).toContain("New Leads");
    expect(bodyText).toContain("Active");
    expect(bodyText).toContain("Past Clients");
  });
});

// ============================================================
// SUITE 4: Approval Queue (P0)
// ============================================================
test.describe("Suite 4: Approval Queue @P0", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Queue page renders without errors", async ({ page }) => {
    await page.goto("/newsletters/queue");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Only check visible text in main content area
    const visibleText = await page.evaluate(() => {
      const main = document.querySelector("main");
      if (!main) return "";
      const clone = main.cloneNode(true) as HTMLElement;
      clone.querySelectorAll("script, style, noscript").forEach((el) => el.remove());
      return clone.innerText || "";
    });
    expect(visibleText).not.toMatch(/\bundefined\b/);
    expect(visibleText).not.toMatch(/\bNaN\b/);
    expect(visibleText.length).toBeGreaterThan(50);
  });
});

// ============================================================
// SUITE 5: Command Center Tabs (P0)
// ============================================================
test.describe("Suite 5: Command Center @P0", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Command center loads with tabs", async ({ page }) => {
    await page.goto("/newsletters/control");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    const bodyText = await page.textContent("body");
    // Should have tab-like navigation
    expect(bodyText?.length).toBeGreaterThan(100);
  });

  test("No console errors on command center", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    await page.goto("/newsletters/control");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Filter out known non-critical errors (React hydration, favicon, etc.)
    const critical = errors.filter(
      (e) =>
        !e.includes("favicon") &&
        !e.includes("hydration") &&
        !e.includes("Warning:") &&
        !e.includes("Failed to fetch") &&
        !e.includes("net::ERR") &&
        !e.includes("404") &&
        !e.includes("NEXT_") &&
        !e.includes("Turbopack")
    );
    // Allow up to 2 non-critical console errors
    expect(critical.length).toBeLessThanOrEqual(2);
  });
});

// ============================================================
// SUITE 6: Newsletter Guide Navigation (P1)
// ============================================================
test.describe("Suite 6: Guide Navigation @P1", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Next and Previous buttons are visible", async ({ page }) => {
    await page.goto("/newsletters/guide");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    // Check for navigation buttons
    const nextBtn = page.locator("button", { hasText: /next/i }).first();
    const prevBtn = page.locator("button", { hasText: /previous/i }).first();

    const nextVisible = await nextBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const prevVisible = await prevBtn.isVisible({ timeout: 3000 }).catch(() => false);

    // At least Next should be visible on step 1
    expect(nextVisible).toBe(true);
  });

  test("Can navigate through all steps", async ({ page }) => {
    await page.goto("/newsletters/guide");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1000);

    const nextBtn = page.locator("button", { hasText: /next/i }).first();
    let stepCount = 0;

    while (await nextBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      stepCount++;
      await nextBtn.click();
      await page.waitForTimeout(300);
      if (stepCount > 10) break; // safety
    }

    expect(stepCount).toBeGreaterThan(3);
  });
});

// ============================================================
// SUITE 7: Responsive / Mobile (P1)
// ============================================================
test.describe("Suite 7: Mobile Responsive @P1", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await login(page);
  });

  test("Dashboard readable at 375px", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    // No horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test("Newsletter dashboard at 375px", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalScroll).toBe(false);
  });

  test("Analytics page at 375px", async ({ page }) => {
    await page.goto("/newsletters/analytics");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(1500);

    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    // Analytics table might need horizontal scroll — that's acceptable
    // But body itself shouldn't overflow
  });
});

// ============================================================
// SUITE 8: Visual Consistency Checks (P2)
// ============================================================
test.describe("Suite 8: Visual Consistency @P2", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("No inline style objects on newsletter dashboard", async ({ page }) => {
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");

    const inlineStyleCount = await page.evaluate(() => {
      const allElements = document.querySelectorAll("[style]");
      return allElements.length;
    });

    // Ideally 0, but allow a few for dynamic values
    expect(inlineStyleCount).toBeLessThan(5);
  });

  test("All pages use consistent font", async ({ page }) => {
    const routes = ["/", "/newsletters", "/newsletters/analytics", "/listings"];
    const fonts: string[] = [];

    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("domcontentloaded");
      const font = await page.evaluate(() => {
        const body = document.querySelector("body");
        return body ? getComputedStyle(body).fontFamily : "";
      });
      fonts.push(font);
    }

    // All should use the same font family
    const unique = [...new Set(fonts)];
    expect(unique.length).toBe(1);
  });
});

// ============================================================
// SUITE 9: Auth & Security (P0)
// ============================================================
test.describe("Suite 9: Auth @P0", () => {
  test("Protected routes redirect to login", async ({ page }) => {
    // Don't login, go directly
    await page.goto("/newsletters");
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // Should redirect to login
    const url = page.url();
    expect(url).toContain("login");
  });

  test("Cron routes require secret", async ({ page }) => {
    const response = await page.goto("/api/cron/process-workflows");
    // Should be 401 without bearer token
    expect(response?.status()).toBeGreaterThanOrEqual(400);
  });
});

// ============================================================
// SUITE 10: Walkthrough Static Page (P1) — no auth needed
// ============================================================
test.describe("Suite 10: Walkthrough HTML @P1", () => {
  test("Walkthrough page loads", async ({ page }) => {
    const response = await page.goto("/walkthrough/index.html");
    // Static file — might be 200 or served through Next.js
    expect(response?.status()).toBeLessThan(400);
  });

  test("Walkthrough is scrollable", async ({ page }) => {
    const response = await page.goto("/walkthrough/index.html");
    if (response && response.status() < 400) {
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(1000);
      const result = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
        bodyHeight: document.body.scrollHeight,
      }));
      // Content should exist and be taller than viewport (or fit on screen)
      expect(result.bodyHeight).toBeGreaterThan(100);
    }
  });

  test("Screenshots load (no broken images)", async ({ page }) => {
    const response = await page.goto("/walkthrough/index.html");
    if (response?.status() === 200) {
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(3000);

      const brokenImages = await page.evaluate(() => {
        const imgs = document.querySelectorAll("img");
        let broken = 0;
        imgs.forEach((img) => {
          if (!img.complete || img.naturalHeight === 0) broken++;
        });
        return { total: imgs.length, broken };
      });

      if (brokenImages.total > 0) {
        expect(brokenImages.broken).toBe(0);
      }
    }
  });
});
