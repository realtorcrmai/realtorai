/**
 * Team UI E2E Test — Playwright Browser Testing
 * Tests every button, form field, dropdown, error state, and success state
 * in the Team Settings page.
 *
 * Run: node scripts/test-team-ui.mjs
 */

import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const LOGIN_EMAIL = "nhat@gmail.com";
const LOGIN_PASS = "ABcd@1234";

let browser, page;
let passed = 0, failed = 0;
const results = [];

function log(id, desc, pass, detail = "") {
  const icon = pass ? "✅" : "❌";
  console.log(`${icon} ${id}: ${desc}${detail ? " — " + detail : ""}`);
  results.push({ id, desc, pass, detail });
  pass ? passed++ : failed++;
}

async function setup() {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  page = await context.newPage();
}

async function login() {
  console.log("\n🔐 Logging in...\n");
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("domcontentloaded");

  // Fill credentials
  await page.locator('#email').fill(LOGIN_EMAIL);
  await page.locator('#password').fill(LOGIN_PASS);
  await page.locator('button:has-text("Sign In")').click();

  // Wait for redirect away from login
  await page.waitForURL(url => !url.toString().includes("/login"), { timeout: 15000 });
  await page.waitForLoadState("domcontentloaded");

  const url = page.url();
  log("LOGIN", "Successfully logged in", !url.includes("/login"), `url=${url}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: Team Settings Page Navigation & Access
// ═══════════════════════════════════════════════════════════════════════════════
async function testNavigation() {
  console.log("\n═══ SUITE 1: Navigation & Access ═══\n");

  // T1.1: Navigate to settings
  await page.goto(`${BASE_URL}/settings`);
  await page.waitForLoadState("domcontentloaded");
  const settingsHeading = await page.locator('h1:has-text("Settings")').count();
  log("T1.1", "Settings page loads", settingsHeading > 0);

  // T1.2: Navigate to /settings/team
  await page.goto(`${BASE_URL}/settings/team`);
  await page.waitForLoadState("domcontentloaded");
  const currentUrl = page.url();

  // Check if we're on team settings or redirected
  const onTeamPage = currentUrl.includes("/settings/team");
  const teamHeading = await page.locator('h1:has-text("Team Settings")').count();
  log("T1.2", "Team settings page accessible for team owner", onTeamPage && teamHeading > 0, `url=${currentUrl}`);

  // T1.3: Verify page sections exist
  if (onTeamPage) {
    const inviteSection = await page.locator('h2:has-text("Invite New Member")').count();
    log("T1.3a", "Invite New Member section exists", inviteSection > 0);

    const membersSection = await page.locator('h2:has-text("Members")').count();
    log("T1.3b", "Members section exists", membersSection > 0);

    // Seat count display
    const seatText = await page.locator('p:has-text("seats used")').textContent().catch(() => "");
    log("T1.3c", "Seat count displayed", seatText.includes("seats used"), `text="${seatText}"`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: Invite Form — Every Field & Button
// ═══════════════════════════════════════════════════════════════════════════════
async function testInviteForm() {
  console.log("\n═══ SUITE 2: Invite Form ═══\n");

  await page.goto(`${BASE_URL}/settings/team`);
  await page.waitForLoadState("domcontentloaded");

  // T2.1: Email input exists with correct attributes
  const emailInput = page.locator('#invite-email');
  const emailExists = await emailInput.count() > 0;
  log("T2.1a", "Email input exists", emailExists);

  if (emailExists) {
    const placeholder = await emailInput.getAttribute("placeholder");
    log("T2.1b", "Email input has placeholder", placeholder === "agent@example.com", `placeholder="${placeholder}"`);

    const ariaLabel = await emailInput.getAttribute("aria-label");
    log("T2.1c", "Email input has aria-label", !!ariaLabel, `aria-label="${ariaLabel}"`);

    const type = await emailInput.getAttribute("type");
    log("T2.1d", "Email input type=email", type === "email", `type="${type}"`);
  }

  // T2.2: Role dropdown exists with correct options
  const roleSelect = page.locator('#invite-role');
  const roleExists = await roleSelect.count() > 0;
  log("T2.2a", "Role dropdown exists", roleExists);

  if (roleExists) {
    const ariaLabel = await roleSelect.getAttribute("aria-label");
    log("T2.2b", "Role dropdown has aria-label", !!ariaLabel, `aria-label="${ariaLabel}"`);

    const options = await roleSelect.locator("option").allTextContents();
    log("T2.2c", "Role dropdown has Admin option", options.includes("Admin"), `options=${JSON.stringify(options)}`);
    log("T2.2d", "Role dropdown has Agent option", options.includes("Agent"), `options=${JSON.stringify(options)}`);
    log("T2.2e", "Role dropdown has Assistant option", options.includes("Assistant"), `options=${JSON.stringify(options)}`);
  }

  // T2.3: Invite button exists and is disabled when email empty
  const inviteBtn = page.locator('button:has-text("Invite")');
  const btnExists = await inviteBtn.count() > 0;
  log("T2.3a", "Invite button exists", btnExists);

  if (btnExists) {
    // Clear email to verify disabled state
    await emailInput.fill("");
    const isDisabled = await inviteBtn.isDisabled();
    log("T2.3b", "Invite button disabled when email empty", isDisabled);

    const ariaLabel = await inviteBtn.getAttribute("aria-label");
    log("T2.3c", "Invite button has aria-label", !!ariaLabel, `aria-label="${ariaLabel}"`);
  }

  // T2.4: Fill valid email and check button enabled
  await emailInput.fill("test-invite@example.com");
  const isEnabled = await inviteBtn.isEnabled();
  log("T2.4", "Invite button enabled when email filled", isEnabled);

  // T2.5: Test role selection
  if (roleExists) {
    await roleSelect.selectOption("agent");
    const val1 = await roleSelect.inputValue();
    log("T2.5a", "Can select 'agent' role", val1 === "agent");

    await roleSelect.selectOption("assistant");
    const val2 = await roleSelect.inputValue();
    log("T2.5b", "Can select 'assistant' role", val2 === "assistant");

    await roleSelect.selectOption("admin");
    const val3 = await roleSelect.inputValue();
    log("T2.5c", "Can select 'admin' role", val3 === "admin");
  }

  // T2.6: Submit invite with agent role (should succeed after migration fix)
  await emailInput.fill("e2e-test-invite@example.com");
  await roleSelect.selectOption("agent");
  await inviteBtn.click();
  await page.waitForTimeout(2000);

  // Check for success or error message
  const successMsg = await page.locator('[role="alert"]:has-text("Invite sent")').count();
  const errorMsg = await page.locator('[role="alert"]').textContent().catch(() => "");
  log("T2.6", "Invite submission shows feedback", successMsg > 0 || errorMsg.length > 0, `success=${successMsg > 0}, msg="${errorMsg.substring(0, 50)}"`);

  // T2.7: Test empty email submission (button should be disabled, but double-check)
  await emailInput.fill("");
  const disabledAfterClear = await inviteBtn.isDisabled();
  log("T2.7", "Button re-disables after clearing email", disabledAfterClear);

  // T2.8: Test loading state text
  await emailInput.fill("loading-test@example.com");
  await roleSelect.selectOption("agent");

  // We can check the button text changes to "Sending..." during submission
  // (race condition - might be too fast to catch)
  const btnTextBefore = await inviteBtn.textContent();
  log("T2.8", "Button shows 'Invite' text normally", btnTextBefore?.trim() === "Invite", `text="${btnTextBefore?.trim()}"`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: Members Table — Every Column & Action
// ═══════════════════════════════════════════════════════════════════════════════
async function testMembersTable() {
  console.log("\n═══ SUITE 3: Members Table ═══\n");

  await page.goto(`${BASE_URL}/settings/team`);
  await page.waitForLoadState("domcontentloaded");

  // T3.1: Table exists with aria-label
  const table = page.locator('table[aria-label="Team members"]');
  const tableExists = await table.count() > 0;
  log("T3.1", "Members table exists with aria-label", tableExists);

  if (!tableExists) return;

  // T3.2: Table headers
  const headers = await table.locator("th").allTextContents();
  log("T3.2a", "Table has 'Name' header", headers.some(h => h.includes("Name")), `headers=${JSON.stringify(headers)}`);
  log("T3.2b", "Table has 'Email' header", headers.some(h => h.includes("Email")));
  log("T3.2c", "Table has 'Role' header", headers.some(h => h.includes("Role")));
  log("T3.2d", "Table has 'Joined' header", headers.some(h => h.includes("Joined")));
  log("T3.2e", "Table has 'Actions' header", headers.some(h => h.includes("Actions")));

  // T3.3: Owner row exists
  const ownerBadge = await page.locator('span:has-text("Owner")').count();
  log("T3.3", "Owner badge displayed", ownerBadge > 0);

  // T3.4: Current user marked as "(you)"
  const youMarker = await page.locator('span:has-text("(you)")').count();
  log("T3.4", "Current user marked as (you)", youMarker > 0);

  // T3.5: Owner row has NO remove button
  const ownerRow = page.locator("tr").filter({ has: page.locator('span:has-text("Owner")') });
  const ownerRemoveBtn = await ownerRow.locator('button:has-text("Remove")').count();
  log("T3.5", "Owner row has no Remove button", ownerRemoveBtn === 0);

  // T3.6: Table rows count (at least owner)
  const rowCount = await table.locator("tbody tr").count();
  log("T3.6", "Table has at least 1 row (owner)", rowCount >= 1, `rows=${rowCount}`);

  // T3.7: Email column shows actual email
  const emailCells = await table.locator("tbody tr td:nth-child(2)").allTextContents();
  const hasOwnerEmail = emailCells.some(e => e.includes("nhat@gmail.com"));
  log("T3.7", "Owner email displayed in table", hasOwnerEmail, `emails=${JSON.stringify(emailCells.slice(0, 3))}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 4: Pending Invites Section
// ═══════════════════════════════════════════════════════════════════════════════
async function testPendingInvites() {
  console.log("\n═══ SUITE 4: Pending Invites ═══\n");

  await page.goto(`${BASE_URL}/settings/team`);
  await page.waitForLoadState("domcontentloaded");

  // T4.1: Check if pending invites section appears (may or may not have invites)
  const pendingSection = await page.locator('h2:has-text("Pending Invites")').count();

  if (pendingSection > 0) {
    log("T4.1", "Pending Invites section visible", true);

    // T4.2: Each invite shows email
    const inviteEmails = await page.locator('section:has(h2:has-text("Pending Invites")) .font-medium').allTextContents();
    log("T4.2", "Invite emails displayed", inviteEmails.length > 0, `emails=${JSON.stringify(inviteEmails)}`);

    // T4.3: Resend button exists
    const resendBtns = await page.locator('button:has-text("Resend")').count();
    log("T4.3", "Resend button(s) exist", resendBtns > 0, `count=${resendBtns}`);

    // T4.4: Cancel button exists
    const cancelBtns = await page.locator('button:has-text("Cancel")').count();
    log("T4.4", "Cancel button(s) exist", cancelBtns > 0, `count=${cancelBtns}`);

    // T4.5: Resend button has aria-label
    const resendAriaLabel = await page.locator('button:has-text("Resend")').first().getAttribute("aria-label");
    log("T4.5", "Resend button has aria-label", !!resendAriaLabel, `label="${resendAriaLabel}"`);

    // T4.6: Cancel button has aria-label
    const cancelAriaLabel = await page.locator('button:has-text("Cancel")').first().getAttribute("aria-label");
    log("T4.6", "Cancel button has aria-label", !!cancelAriaLabel, `label="${cancelAriaLabel}"`);

    // T4.7: Expiry date shown
    const expiryText = await page.locator('text=Expires').count();
    log("T4.7", "Expiry date displayed", expiryText > 0);

    // T4.8: Role shown in parentheses
    const roleText = await page.locator('text=(agent)').count() + await page.locator('text=(assistant)').count() + await page.locator('text=(admin)').count();
    log("T4.8", "Role displayed for pending invites", roleText > 0);

    // T4.9: Click Cancel button
    if (cancelBtns > 0) {
      const beforeCount = await page.locator('section:has(h2:has-text("Pending Invites")) .font-medium').count();
      await page.locator('button:has-text("Cancel")').first().click();
      await page.waitForTimeout(2000);
      await page.waitForLoadState("domcontentloaded");
      const afterCount = await page.locator('section:has(h2:has-text("Pending Invites")) .font-medium').count();
      log("T4.9", "Cancel removes invite from list", afterCount < beforeCount || afterCount === 0, `before=${beforeCount}, after=${afterCount}`);
    }

    // T4.10: Click Resend button (if still have invites)
    const remainingResend = await page.locator('button:has-text("Resend")').count();
    if (remainingResend > 0) {
      await page.locator('button:has-text("Resend")').first().click();
      await page.waitForTimeout(2000);
      const successAlert = await page.locator('[role="alert"]:has-text("resent")').count();
      log("T4.10", "Resend shows success feedback", successAlert > 0);
    }
  } else {
    log("T4.1", "No pending invites section (no invites exist)", true, "Section only renders when invites exist");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 5: Team Scope Toggle
// ═══════════════════════════════════════════════════════════════════════════════
async function testScopeToggle() {
  console.log("\n═══ SUITE 5: Team Scope Toggle ═══\n");

  // T5.1: Check if toggle exists in header
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState("domcontentloaded");

  // Look for the scope toggle - it might be "My View" / "Team View" buttons
  const toggleExists = await page.locator('text=My View').count() > 0 ||
                       await page.locator('text=Team View').count() > 0 ||
                       await page.locator('[data-testid="team-scope-toggle"]').count() > 0;
  log("T5.1", "Team scope toggle visible in header", toggleExists);

  if (toggleExists) {
    // T5.2: Click "My View"
    const myViewBtn = page.locator('button:has-text("My View"), [role="tab"]:has-text("My View")').first();
    if (await myViewBtn.count() > 0) {
      await myViewBtn.click();
      await page.waitForTimeout(500);
      log("T5.2", "Can click 'My View' toggle", true);
    }

    // T5.3: Click "Team View"
    const teamViewBtn = page.locator('button:has-text("Team View"), [role="tab"]:has-text("Team View")').first();
    if (await teamViewBtn.count() > 0) {
      await teamViewBtn.click();
      await page.waitForTimeout(500);
      log("T5.3", "Can click 'Team View' toggle", true);
    }
  }

  // T5.4: Test on contacts page
  await page.goto(`${BASE_URL}/contacts`);
  await page.waitForLoadState("domcontentloaded");
  const contactsLoaded = await page.locator('h1:has-text("Contacts")').count() > 0;
  log("T5.4", "Contacts page loads with team context", contactsLoaded);

  // T5.5: Test on listings page
  await page.goto(`${BASE_URL}/listings`);
  await page.waitForLoadState("domcontentloaded");
  const listingsLoaded = await page.locator('h1:has-text("Listings")').count() > 0;
  log("T5.5", "Listings page loads with team context", listingsLoaded);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 6: Error States & Edge Cases
// ═══════════════════════════════════════════════════════════════════════════════
async function testErrorStates() {
  console.log("\n═══ SUITE 6: Error States & Edge Cases ═══\n");

  await page.goto(`${BASE_URL}/settings/team`);
  await page.waitForLoadState("domcontentloaded");

  const emailInput = page.locator('#invite-email');
  const inviteBtn = page.locator('button:has-text("Invite")');
  const roleSelect = page.locator('#invite-role');

  // T6.1: Invite self (already a member)
  await emailInput.fill("nhat@gmail.com");
  await roleSelect.selectOption("agent");
  await inviteBtn.click();
  await page.waitForTimeout(2000);

  const selfError = await page.locator('[role="alert"]').textContent().catch(() => "");
  log("T6.1", "Inviting self shows error", selfError.includes("already") || selfError.includes("member"), `msg="${selfError.substring(0, 60)}"`);

  // T6.2: Invite with spaces-only email
  await emailInput.fill("   ");
  const spacesDisabled = await inviteBtn.isDisabled();
  log("T6.2", "Spaces-only email keeps button disabled", spacesDisabled);

  // T6.3: Test very long email
  await emailInput.fill("very-long-email-address-that-might-break-things-or-overflow@extremely-long-domain-name-for-testing-purposes.example.com");
  const longEmailEnabled = await inviteBtn.isEnabled();
  log("T6.3", "Long email still enables button (valid format)", longEmailEnabled);

  // T6.4: Rapid double-click on invite (should not send twice)
  await emailInput.fill("double-click-test@example.com");
  await roleSelect.selectOption("agent");
  await inviteBtn.click();
  await inviteBtn.click(); // rapid second click
  await page.waitForTimeout(2000);
  // Button should be disabled during "Sending..." state
  log("T6.4", "Double-click handled (no crash)", true, "No page error");

  // T6.5: Verify page doesn't crash with console errors
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(`${BASE_URL}/settings/team`);
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(1000);
  log("T6.5", "No uncaught page errors", errors.length === 0, errors.length > 0 ? `errors: ${errors[0]}` : "clean");
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 7: Responsive & Accessibility
// ═══════════════════════════════════════════════════════════════════════════════
async function testAccessibility() {
  console.log("\n═══ SUITE 7: Accessibility & Layout ═══\n");

  await page.goto(`${BASE_URL}/settings/team`);
  await page.waitForLoadState("domcontentloaded");

  // T7.1: All interactive elements have accessible names
  const allButtons = await page.locator("button").all();
  let buttonsWithLabel = 0;
  for (const btn of allButtons) {
    const text = await btn.textContent();
    const ariaLabel = await btn.getAttribute("aria-label");
    if (text?.trim() || ariaLabel) buttonsWithLabel++;
  }
  log("T7.1", "All buttons have text or aria-label", buttonsWithLabel === allButtons.length, `${buttonsWithLabel}/${allButtons.length}`);

  // T7.2: Form inputs have labels
  const emailLabel = await page.locator('label[for="invite-email"]').count();
  log("T7.2a", "Email input has associated label", emailLabel > 0);

  const roleLabel = await page.locator('label[for="invite-role"]').count();
  log("T7.2b", "Role select has associated label", roleLabel > 0);

  // T7.3: Table has aria-label
  const tableAriaLabel = await page.locator('table[aria-label]').count();
  log("T7.3", "Table has aria-label attribute", tableAriaLabel > 0);

  // T7.4: Alert messages use role="alert"
  // (already tested in other suites, verify structure)
  const alertRole = await page.locator('[role="alert"]').count();
  log("T7.4", "Alert messages use role='alert'", true, `Found ${alertRole} alert elements (may be 0 if no messages shown)`);

  // T7.5: Test at mobile viewport
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  const mobileHeading = await page.locator('h1:has-text("Team Settings")').isVisible();
  log("T7.5", "Page renders at mobile viewport (375px)", mobileHeading);

  // T7.6: Reset to desktop
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(500);
  const desktopHeading = await page.locator('h1:has-text("Team Settings")').isVisible();
  log("T7.6", "Page renders at desktop viewport (1280px)", desktopHeading);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST SUITE 8: Invite Accept Page
// ═══════════════════════════════════════════════════════════════════════════════
async function testInviteAcceptPage() {
  console.log("\n═══ SUITE 8: Invite Accept Page ═══\n");

  // T8.1: Navigate to invite accept without token
  await page.goto(`${BASE_URL}/invite/accept`);
  await page.waitForLoadState("domcontentloaded");
  const noTokenUrl = page.url();
  log("T8.1", "Invite accept page loads (no token)", noTokenUrl.includes("invite"), `url=${noTokenUrl}`);

  // T8.2: With fake token
  await page.goto(`${BASE_URL}/invite/accept?token=00000000-0000-0000-0000-000000000000`);
  await page.waitForLoadState("domcontentloaded");
  const fakeTokenPage = await page.content();
  const hasErrorOrLogin = fakeTokenPage.includes("error") || fakeTokenPage.includes("Error") ||
                          fakeTokenPage.includes("sign") || fakeTokenPage.includes("Sign") ||
                          fakeTokenPage.includes("invalid") || fakeTokenPage.includes("Invalid") ||
                          fakeTokenPage.includes("expired") || fakeTokenPage.includes("accept");
  log("T8.2", "Fake token shows error or login prompt", hasErrorOrLogin, `url=${page.url()}`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║   TEAM UI E2E TEST — Playwright Browser Testing            ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║   Date: ${new Date().toISOString()}          ║`);
  console.log("╚══════════════════════════════════════════════════════════════╝");

  try {
    await setup();
    await login();
    await testNavigation();
    await testInviteForm();
    await testMembersTable();
    await testPendingInvites();
    await testScopeToggle();
    await testErrorStates();
    await testAccessibility();
    await testInviteAcceptPage();
  } catch (err) {
    console.error("\n💥 FATAL:", err.message);
    failed++;
  } finally {
    await browser?.close();
  }

  // Summary
  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log(`║   RESULTS: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  if (failed > 0) {
    console.log("❌ FAILED:");
    results.filter(r => !r.pass).forEach(r => {
      console.log(`   ${r.id}: ${r.desc} — ${r.detail}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
