/**
 * Contact CRUD — 4-Layer Assertion E2E Tests
 *
 * Proof-of-concept demonstrating the full testing pattern:
 *   Layer 1: UI assertion (Playwright)
 *   Layer 2: DB assertion (Supabase admin client)
 *   Layer 3: Integration assertion (stub captures)
 *   Layer 4: Side-effect assertion (notifications, communications)
 *
 * Coverage matrix: tests/e2e/coverage/contact-crud.matrix.md
 */

import { test, expect } from "@playwright/test";
import {
  getAdminClient,
  getById,
  getWhere,
  countWhere,
  deleteWhere,
  getDemoRealtorId,
} from "../helpers/db";
import { installStubs, assertNoExternalCalls, type StubCapture } from "../helpers/stubs";

// Deterministic test data — unique enough to not collide with real data
const TEST_PREFIX = "E2ETEST";
const TEST_CONTACT = {
  name: `${TEST_PREFIX} Jane Smith`,
  phone: "+16045559901",
  email: "e2etest-jane@example.com",
  type: "buyer" as const,
};

test.describe("REQ-CONTACT: Contact CRUD — 4-Layer Assertions", () => {
  let capture: StubCapture;
  let realtorId: string;

  test.beforeAll(async () => {
    realtorId = await getDemoRealtorId();
  });

  test.beforeEach(async ({ page }) => {
    capture = await installStubs(page);
  });

  test.afterAll(async () => {
    // Clean up all test-created contacts
    await deleteWhere("contacts", { email: TEST_CONTACT.email });
    // Clean up by name prefix as fallback
    const testRows = await getWhere("contacts", {});
    const toDelete = testRows.filter(
      (r) => typeof r.name === "string" && r.name.startsWith(TEST_PREFIX)
    );
    for (const row of toDelete) {
      await getAdminClient().from("contacts").delete().eq("id", row.id);
    }
  });

  // ── READ: View existing contact ──────────────────────────────

  test("REQ-CONTACT-001 TC-CR-001: viewing contact detail shows correct data from DB @p0", async ({
    page,
  }) => {
    // Get a real contact from DB for comparison
    const contacts = await getWhere("contacts", { realtor_id: realtorId });
    test.skip(contacts.length === 0, "No contacts in database");
    const dbContact = contacts[0];

    await page.goto(`/contacts/${dbContact.id}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // ── Layer 1: UI assertion ──────────────────────────────────
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible({ timeout: 5000 });
    const displayedName = await h1.textContent();
    expect(displayedName?.trim()).toBe(dbContact.name);

    // ── Layer 2: DB assertion ──────────────────────────────────
    // Verify the row we're looking at actually exists with correct realtor_id
    const freshRow = await getById("contacts", dbContact.id as string);
    expect(freshRow).toBeTruthy();
    expect(freshRow!.realtor_id).toBe(realtorId);

    // ── Layer 3: Integration assertion ─────────────────────────
    // Read-only operation — no external calls expected
    assertNoExternalCalls(capture);

    // ── Layer 4: Side-effect assertion ─────────────────────────
    // No side effects on read
  });

  // ── READ: Contact detail tabs are functional ──────────────────

  test("REQ-CONTACT-002 TC-CR-002: all contact tabs are present and switchable @p0", async ({
    page,
  }) => {
    const contacts = await getWhere("contacts", { realtor_id: realtorId });
    test.skip(contacts.length === 0, "No contacts in database");

    await page.goto(`/contacts/${contacts[0].id}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // ── Layer 1: UI assertion ──────────────────────────────────
    // Tabs have emoji prefixes: 📋 Overview, 💬 Activity, 🏠 Deals
    const expectedTabs = ["Overview", "Activity", "Deals"];
    for (const tabName of expectedTabs) {
      const tab = page
        .locator("[role='tab']")
        .filter({ hasText: new RegExp(tabName, "i") })
        .first();
      await expect(tab).toBeVisible({ timeout: 5000 });
    }

    // Click Activity tab and verify it activates
    const activityTab = page
      .locator("[role='tab']")
      .filter({ hasText: /activity/i })
      .first();
    await activityTab.click();
    await page.waitForTimeout(500);
    const state = await activityTab.getAttribute("data-state");
    expect(state).toBe("active");

    // ── Layer 2: DB assertion ──────────────────────────────────
    // N/A — tab switching is UI-only
    // ── Layer 3: Integration assertion ─────────────────────────
    assertNoExternalCalls(capture);
    // ── Layer 4: Side-effect assertion ─────────────────────────
    // N/A — no side effects
  });

  // ── READ: Invalid contact ID shows graceful error ─────────────

  test("REQ-CONTACT-003 TC-CR-003: invalid contact ID shows error, not crash @p1", async ({
    page,
  }) => {
    await page.goto("/contacts/00000000-0000-0000-0000-000000000000");
    await page.waitForTimeout(3000);

    // ── Layer 1: UI assertion ──────────────────────────────────
    // Should show some content (error message or redirect), not blank/crash
    const content = await page.evaluate(
      () => document.querySelector("main")?.innerText?.length || 0
    );
    expect(content).toBeGreaterThan(0);

    // Should NOT show NaN or undefined
    const mainText = await page.evaluate(
      () => document.querySelector("main")?.innerText || ""
    );
    expect(mainText).not.toMatch(/\bNaN\b/);
    expect(mainText).not.toMatch(/\bundefined\b/);

    // ── Layer 2: DB assertion ──────────────────────────────────
    const row = await getById("contacts", "00000000-0000-0000-0000-000000000000");
    expect(row).toBeNull(); // Confirms the ID truly doesn't exist

    // ── Layer 3: Integration assertion ─────────────────────────
    assertNoExternalCalls(capture);
    // ── Layer 4: Side-effect assertion ─────────────────────────
    // N/A
  });

  // ── TENANT ISOLATION: Cannot view other tenant's contacts ────

  test("REQ-CONTACT-010 TC-CR-010: contact list only shows current tenant data @p0", async ({
    page,
  }) => {
    // Get all contacts visible via the API (should be tenant-scoped)
    const response = await page.request.get("/api/contacts?limit=200");
    const apiContacts = await response.json();

    // ── Layer 1: UI assertion ──────────────────────────────────
    expect(response.status()).toBe(200);
    expect(Array.isArray(apiContacts)).toBeTruthy();

    // ── Layer 2: DB assertion ──────────────────────────────────
    // Every contact returned by API must belong to demo user's realtor_id
    if (apiContacts.length > 0) {
      for (const contact of apiContacts.slice(0, 10)) {
        // Spot-check first 10
        const dbRow = await getById("contacts", contact.id);
        expect(dbRow).toBeTruthy();
        expect(dbRow!.realtor_id).toBe(realtorId);
      }
    }

    // Check that DB has contacts for other tenants that were NOT returned
    const allContacts = await getAdminClient()
      .from("contacts")
      .select("id, realtor_id")
      .neq("realtor_id", realtorId)
      .limit(1);
    if (allContacts.data && allContacts.data.length > 0) {
      // There are other tenant's contacts — verify they're not in the API response
      const otherTenantId = allContacts.data[0].id;
      const leaked = apiContacts.find(
        (c: { id: string }) => c.id === otherTenantId
      );
      expect(leaked).toBeUndefined();
    }

    // ── Layer 3: Integration assertion ─────────────────────────
    assertNoExternalCalls(capture);
    // ── Layer 4: Side-effect assertion ─────────────────────────
    // N/A
  });

  // ── DATA INTEGRITY: No NaN/undefined in contact display ───────

  test("REQ-CONTACT-020 TC-CR-020: no data corruption artifacts in contact detail @p1", async ({
    page,
  }) => {
    const contacts = await getWhere("contacts", { realtor_id: realtorId });
    test.skip(contacts.length === 0, "No contacts in database");

    // Check first 3 contacts for data corruption
    const toCheck = contacts.slice(0, 3);

    for (const contact of toCheck) {
      await page.goto(`/contacts/${contact.id}`);
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(2000);

      // ── Layer 1: UI assertion ────────────────────────────────
      const text = await page.evaluate(() => {
        const main = document.querySelector("main");
        const clone = main?.cloneNode(true) as HTMLElement;
        clone?.querySelectorAll("script, style").forEach((el) => el.remove());
        return clone?.innerText || "";
      });
      expect(text).not.toMatch(/\bNaN\b/);
      expect(text).not.toMatch(/\bundefined\b/);
      expect(text).not.toMatch(/\bnull\b(?!.*consent)/i); // null OK in consent context

      // ── Layer 2: DB assertion ────────────────────────────────
      const dbRow = await getById("contacts", contact.id as string);
      expect(dbRow).toBeTruthy();
      expect(dbRow!.name).toBeTruthy();
      expect(typeof dbRow!.name).toBe("string");
      expect((dbRow!.name as string).length).toBeGreaterThan(0);
    }

    // ── Layer 3: Integration assertion ─────────────────────────
    assertNoExternalCalls(capture);
    // ── Layer 4: Side-effect assertion ─────────────────────────
    // N/A
  });

  // ── DB-UI CONSISTENCY: Displayed data matches database ────────

  test("REQ-CONTACT-021 TC-CR-021: contact phone displayed matches DB value @p1", async ({
    page,
  }) => {
    const contacts = await getWhere("contacts", { realtor_id: realtorId });
    test.skip(contacts.length === 0, "No contacts in database");
    const contact = contacts[0];

    await page.goto(`/contacts/${contact.id}`);
    await page.waitForLoadState("domcontentloaded");
    await page.waitForTimeout(2000);

    // ── Layer 1: UI assertion ──────────────────────────────────
    const pageText = await page.evaluate(
      () => document.querySelector("main")?.innerText || ""
    );

    // ── Layer 2: DB assertion ──────────────────────────────────
    const dbRow = await getById("contacts", contact.id as string);
    expect(dbRow).toBeTruthy();

    // The phone in DB is stored as-is, UI renders via tel: href
    const dbPhone = dbRow!.phone as string;
    if (dbPhone) {
      const phoneLink = page.locator(`a[href^="tel:"]`).first();
      const isPhoneVisible = await phoneLink.isVisible().catch(() => false);
      if (isPhoneVisible) {
        const href = await phoneLink.getAttribute("href");
        // tel: href contains the raw digits — should contain the DB phone digits
        const hrefDigits = (href ?? "").replace(/\D/g, "");
        const dbDigits = dbPhone.replace(/\D/g, "");
        expect(hrefDigits).toContain(dbDigits);
      }
    }

    // ── Layer 3: Integration assertion ─────────────────────────
    assertNoExternalCalls(capture);
    // ── Layer 4: Side-effect assertion ─────────────────────────
    // N/A
  });
});
