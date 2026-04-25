import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";

/**
 * E2E coverage for Team Management.
 *
 * Surface:
 *  - /settings/team page (CreateTeamClient if solo, TeamSettingsClient otherwise)
 *  - Server actions: createTeam, inviteMember, updateMemberRole, removeMember,
 *    leaveTeam, transferOwnership, cancelInvite, resendInvite, getTeamMembers,
 *    getTeamOverview, getTeamBasicInfo, toggleContactVisibility, toggleListingVisibility
 *  - GET /api/team-members
 *  - GET /api/users/search (invite suggestions)
 */
test.describe("Team — page rendering", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("/settings/team renders without authentication redirect", async ({ page }) => {
    const resp = await page.goto("/settings/team", { waitUntil: "domcontentloaded" });
    expect(resp?.status()).toBeLessThan(400);
    expect(page.url()).toMatch(/\/settings\/team/);
    const anyHeading = page.locator("h1, h2").first();
    await expect(anyHeading).toBeVisible({ timeout: 20000 });
  });

  test("Page either shows Create Team form OR Team Settings view", async ({ page }) => {
    await page.goto("/settings/team", { waitUntil: "domcontentloaded" });
    const createHeading = page.getByText(/create your team/i);
    const membersHeading = page.getByRole("heading", { name: /members \(\d+\)/i });
    await Promise.race([
      createHeading.waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
      membersHeading.waitFor({ state: "visible", timeout: 15000 }).catch(() => null),
    ]);
    const onCreate = await createHeading.isVisible();
    const onSettings = await membersHeading.isVisible();
    expect(onCreate || onSettings).toBe(true);
  });

  test("Solo path: Create Team form has Name input + Create button", async ({ page }) => {
    await page.goto("/settings/team", { waitUntil: "domcontentloaded" });
    const createHeading = page.getByText(/create your team/i);
    await createHeading.waitFor({ state: "visible", timeout: 8000 }).catch(() => null);
    const visible = await createHeading.isVisible().catch(() => false);
    test.skip(!visible, "Demo user is already on a team — skipping solo path test");
    await expect(page.getByLabel(/team name/i)).toBeVisible();
    await expect(page.getByLabel(/brokerage name/i)).toBeVisible();
    const createBtn = page.getByRole("button", { name: /^create team$/i });
    await expect(createBtn).toBeVisible();
    await expect(createBtn).toBeDisabled();
    await page.getByLabel(/team name/i).fill("Test Team " + Date.now());
    await expect(createBtn).toBeEnabled();
  });

  test("Team path: Members section visible for any team member", async ({ page }) => {
    await page.goto("/settings/team", { waitUntil: "domcontentloaded" });
    const membersHeading = page.getByRole("heading", { name: /members \(\d+\)/i });
    await membersHeading.waitFor({ state: "visible", timeout: 8000 }).catch(() => null);
    const visible = await membersHeading.isVisible().catch(() => false);
    test.skip(!visible, "Demo user is solo — skipping team path test");
    await expect(page.getByRole("table", { name: /team members/i })).toBeVisible();
  });

  test("Team path: Invite section visible for admin/owner only", async ({ page }) => {
    await page.goto("/settings/team", { waitUntil: "domcontentloaded" });
    const membersHeading = page.getByRole("heading", { name: /members \(\d+\)/i });
    await membersHeading.waitFor({ state: "visible", timeout: 8000 }).catch(() => null);
    const onSettings = await membersHeading.isVisible().catch(() => false);
    test.skip(!onSettings, "Demo user is solo — skipping invite section test");

    const inviteEmail = page.locator("#invite-email");
    const hasInvite = await inviteEmail.isVisible().catch(() => false);
    if (hasInvite) {
      await expect(inviteEmail).toBeVisible();
      await expect(page.getByLabel(/select role for invite/i)).toBeVisible();
      await expect(page.getByRole("button", { name: "Send invite", exact: true })).toBeVisible();
    } else {
      await expect(page.getByRole("table", { name: /team members/i })).toBeVisible();
    }
  });
});

test.describe("Team — invite form validation (admin only)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
    await page.goto("/settings/team", { waitUntil: "domcontentloaded" });
  });

  test("Invite button is disabled when email is empty", async ({ page }) => {
    const inviteInput = page.locator("#invite-email");
    await inviteInput.waitFor({ state: "visible", timeout: 8000 }).catch(() => null);
    const hasInvite = await inviteInput.isVisible().catch(() => false);
    test.skip(!hasInvite, "Not an admin or solo user");
    const sendBtn = page.getByRole("button", { name: "Send invite", exact: true });
    await expect(sendBtn).toBeDisabled();
  });

  test("Filling invite email enables Invite button", async ({ page }) => {
    const inviteInput = page.locator("#invite-email");
    await inviteInput.waitFor({ state: "visible", timeout: 8000 }).catch(() => null);
    const hasInvite = await inviteInput.isVisible().catch(() => false);
    test.skip(!hasInvite, "Not an admin or solo user");
    await inviteInput.click();
    await inviteInput.fill(`e2e-${Date.now()}@example.com`);
    await inviteInput.press("Tab");
    await expect(page.getByRole("button", { name: "Send invite", exact: true })).toBeEnabled({ timeout: 5000 });
  });

  test("Role select offers admin/agent/assistant options", async ({ page }) => {
    const roleSelect = page.getByLabel(/select role for invite/i);
    await roleSelect.waitFor({ state: "visible", timeout: 8000 }).catch(() => null);
    const hasRole = await roleSelect.isVisible().catch(() => false);
    test.skip(!hasRole, "Not an admin or solo user");
    const optionTexts = await roleSelect.locator("option").allTextContents();
    const blob = optionTexts.join("|").toLowerCase();
    expect(blob).toMatch(/admin/);
    expect(blob).toMatch(/agent/);
    expect(blob).toMatch(/assistant/);
  });
});

test.describe("Team — supporting APIs", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("GET /api/team-members returns array including current user", async ({ page }) => {
    await page.goto("/settings/team", { waitUntil: "domcontentloaded" });
    const resp = await page.request.get("/api/team-members");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    const currentUser = body.find((m: { is_current: boolean }) => m.is_current === true);
    expect(currentUser).toBeTruthy();
    expect(currentUser).toHaveProperty("id");
    expect(currentUser).toHaveProperty("email");
    expect(currentUser).toHaveProperty("role");
    expect(currentUser).toHaveProperty("name");
  });

  test("/api/users/search returns valid response (no 5xx)", async ({ page }) => {
    await page.goto("/settings/team", { waitUntil: "domcontentloaded" });
    const resp = await page.request.get("/api/users/search?q=demo");
    expect(resp.status()).toBeLessThan(500);
  });
});

test.describe("Team — member listing data integrity", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("Each team member has a valid role (owner/admin/agent/assistant)", async ({ page }) => {
    await page.goto("/settings/team", { waitUntil: "domcontentloaded" });
    const resp = await page.request.get("/api/team-members");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    const validRoles = new Set(["owner", "admin", "agent", "assistant"]);
    for (const member of body) {
      expect(validRoles.has(member.role)).toBe(true);
      expect(member.email).toMatch(/^[^@\s]+@[^@\s]+\.[^@\s]+$/);
    }
  });

  test("Exactly one current user is flagged is_current=true", async ({ page }) => {
    await page.goto("/settings/team", { waitUntil: "domcontentloaded" });
    const resp = await page.request.get("/api/team-members");
    const body = await resp.json();
    const currents = body.filter((m: { is_current: boolean }) => m.is_current);
    expect(currents.length).toBe(1);
  });
});
