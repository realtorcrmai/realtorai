import { test, expect } from "@playwright/test";
import { loginAsDemo } from "../helpers/auth";

/**
 * E2E coverage for the Task Management feature.
 *
 * Surface:
 *  - GET/POST/PATCH/DELETE /api/tasks
 *  - /tasks page (list/board/calendar views, filters, search, bulk)
 *  - TaskForm dialog
 *  - /api/tasks/bulk-complete
 *  - /api/team-members (assignee picker)
 */
test.describe("Tasks — API contract", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("GET /api/tasks returns paginated list", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const resp = await page.request.get("/api/tasks?per_page=10&page=1");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(body).toHaveProperty("data");
    expect(body).toHaveProperty("pagination");
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.pagination).toMatchObject({ page: 1, per_page: 10 });
    expect(typeof body.pagination.total).toBe("number");
  });

  test("GET /api/tasks honours status filter", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const resp = await page.request.get("/api/tasks?status=pending&per_page=50");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    for (const t of body.data) expect(t.status).toBe("pending");
  });

  test("GET /api/tasks honours priority filter", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const resp = await page.request.get("/api/tasks?priority=urgent,high&per_page=50");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    for (const t of body.data) expect(["urgent", "high"]).toContain(t.priority);
  });

  test("POST /api/tasks rejects empty title", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const resp = await page.request.post("/api/tasks", {
      data: { title: "", priority: "medium", category: "general" },
    });
    expect(resp.status()).toBe(400);
    const body = await resp.json();
    expect(body.error).toBeTruthy();
  });

  test("POST → PATCH → DELETE task lifecycle", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const ts = Date.now();
    const createResp = await page.request.post("/api/tasks", {
      data: {
        title: `e2e-task-${ts}`,
        description: "lifecycle test",
        priority: "high",
        category: "follow_up",
        status: "pending",
        visibility: "private",
      },
    });
    expect(createResp.status()).toBe(201);
    const created = await createResp.json();
    expect(created.id).toBeTruthy();
    expect(created.title).toBe(`e2e-task-${ts}`);
    expect(created.priority).toBe("high");

    const patchResp = await page.request.patch("/api/tasks", {
      data: { id: created.id, status: "in_progress", priority: "urgent" },
    });
    expect(patchResp.status()).toBe(200);
    const patched = await patchResp.json();
    expect(patched.status).toBe("in_progress");
    expect(patched.priority).toBe("urgent");

    const completeResp = await page.request.patch("/api/tasks", {
      data: { id: created.id, status: "completed" },
    });
    expect(completeResp.status()).toBe(200);
    const completed = await completeResp.json();
    expect(completed.status).toBe("completed");
    expect(completed.completed_at).toBeTruthy();

    const delResp = await page.request.delete(`/api/tasks?id=${created.id}`);
    expect(delResp.status()).toBe(200);
    expect((await delResp.json()).success).toBe(true);

    const verify = await page.request.get(`/api/tasks?per_page=100`);
    const ids = (await verify.json()).data.map((t: { id: string }) => t.id);
    expect(ids).not.toContain(created.id);
  });

  test("PATCH rejects unknown task id", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const resp = await page.request.patch("/api/tasks", {
      data: { id: "00000000-0000-0000-0000-000000000000", status: "completed" },
    });
    expect(resp.status()).toBe(404);
  });

  test("PATCH requires id", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const resp = await page.request.patch("/api/tasks", { data: { status: "completed" } });
    expect(resp.status()).toBe(400);
  });

  test("DELETE requires id query param", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const resp = await page.request.delete(`/api/tasks`);
    expect(resp.status()).toBe(400);
  });

  test("GET /api/tasks?search filters by term", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const ts = Date.now();
    const create = await page.request.post("/api/tasks", {
      data: { title: `searchable-${ts}`, priority: "medium", category: "general" },
    });
    const created = await create.json();
    try {
      const resp = await page.request.get(`/api/tasks?search=searchable-${ts}`);
      expect(resp.status()).toBe(200);
      const body = await resp.json();
      const found = body.data.find((t: { id: string }) => t.id === created.id);
      expect(found).toBeTruthy();
    } finally {
      await page.request.delete(`/api/tasks?id=${created.id}`);
    }
  });

  test("Subtask: parent_id propagation", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const ts = Date.now();
    const parentResp = await page.request.post("/api/tasks", {
      data: { title: `parent-${ts}`, priority: "medium", category: "general" },
    });
    const parent = await parentResp.json();
    const childResp = await page.request.post("/api/tasks", {
      data: {
        title: `child-${ts}`,
        priority: "low",
        category: "general",
        parent_id: parent.id,
      },
    });
    expect(childResp.status()).toBe(201);
    const child = await childResp.json();
    expect(child.parent_id).toBe(parent.id);

    const listResp = await page.request.get(`/api/tasks?parent_id=${parent.id}`);
    const list = await listResp.json();
    expect(list.data.find((t: { id: string }) => t.id === child.id)).toBeTruthy();

    await page.request.delete(`/api/tasks?id=${child.id}`);
    await page.request.delete(`/api/tasks?id=${parent.id}`);
  });

  test("Bulk complete via /api/tasks/bulk-complete", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const ts = Date.now();
    const ids: string[] = [];
    for (let i = 0; i < 3; i++) {
      const r = await page.request.post("/api/tasks", {
        data: { title: `bulk-${ts}-${i}`, priority: "low", category: "general" },
      });
      ids.push((await r.json()).id);
    }
    const bulkResp = await page.request.post("/api/tasks/bulk-complete", {
      data: { ids, action: "complete" },
    });
    expect(bulkResp.status()).toBe(200);
    const result = await bulkResp.json();
    expect(result.updated ?? result.count ?? ids.length).toBeGreaterThanOrEqual(1);

    const listResp = await page.request.get(`/api/tasks?per_page=200&status=completed`);
    const completedIds = new Set((await listResp.json()).data.map((x: { id: string }) => x.id));
    for (const id of ids) expect(completedIds.has(id)).toBe(true);

    for (const id of ids) await page.request.delete(`/api/tasks?id=${id}`);
  });

  test("Archive via PATCH archived_at", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const ts = Date.now();
    const create = await page.request.post("/api/tasks", {
      data: { title: `arch-${ts}`, priority: "low", category: "general" },
    });
    const t = await create.json();
    try {
      const archResp = await page.request.patch("/api/tasks", {
        data: { id: t.id, archived_at: new Date().toISOString() },
      });
      expect(archResp.status()).toBe(200);
      const list = await page.request.get(`/api/tasks?per_page=200`);
      const ids = (await list.json()).data.map((x: { id: string }) => x.id);
      expect(ids).not.toContain(t.id);
      const archList = await page.request.get(`/api/tasks?archived=true&per_page=200`);
      const archIds = (await archList.json()).data.map((x: { id: string }) => x.id);
      expect(archIds).toContain(t.id);
    } finally {
      await page.request.delete(`/api/tasks?id=${t.id}`);
    }
  });
});

test.describe("Tasks — UI", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("/tasks page loads with PageHeader and Create button", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /tasks/i, level: 1 })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /create task/i })).toBeVisible();
  });

  test("Search input accepts a term", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    // Wait for full hydration (Filters button + initial task fetch) so the controlled
    // input doesn't get re-mounted while we type. Two inputs share this placeholder
    // (TaskSidebar + page header) — pick the visible one and assert via inputValue
    // (not toHaveValue, which re-resolves the locator and races React re-renders).
    await page.getByRole("button", { name: /^filters$/i }).waitFor({ state: "visible", timeout: 15000 });
    await page.waitForLoadState("networkidle").catch(() => null);
    const search = page.locator('input[placeholder="Search tasks..."]:visible').last();
    await expect(search).toBeVisible({ timeout: 15000 });
    const term = "neverMatchZ" + Date.now();
    await search.click();
    await search.pressSequentially(term, { delay: 20 });
    expect(await search.inputValue()).toBe(term);
  });

  test("View toggle: list → board → calendar", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: /create task/i })).toBeVisible({ timeout: 15000 });
    await page.locator('button[title="Board view"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[title="Calendar view"]').click();
    await page.waitForTimeout(300);
    await page.locator('button[title="List view"]').click();
    await page.waitForTimeout(300);
  });

  test("Create dialog opens and validates required title", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /create task/i }).click();
    await expect(page.getByText(/create new task/i)).toBeVisible({ timeout: 5000 });
    const submitBtn = page.getByRole("button", { name: /^create task$/i }).last();
    await expect(submitBtn).toBeDisabled();
  });

  test("Create task end-to-end via dialog", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /create task/i }).first().click();
    await expect(page.getByText(/create new task/i)).toBeVisible({ timeout: 5000 });
    const ts = Date.now();
    const title = `ui-task-${ts}`;
    await page.getByPlaceholder(/what needs to be done/i).fill(title);
    await page.getByRole("button", { name: /^create task$/i }).last().click();
    await expect(page.getByText(/create new task/i)).toBeHidden({ timeout: 10000 });
    const list = await page.request.get(`/api/tasks?search=${encodeURIComponent(title)}`);
    const found = (await list.json()).data.find((t: { title: string }) => t.title === title);
    if (found) await page.request.delete(`/api/tasks?id=${found.id}`);
  });

  test("Filters bar opens when Filters clicked", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^filters$/i }).click();
    // Match the labelled chip groups in TaskFiltersBar (e.g., "Status:" with colon)
    // — avoids matching task titles that happen to contain "status".
    await expect(page.getByText(/^status:$/i).first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Team Members API (assignee picker)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsDemo(page);
  });

  test("GET /api/team-members returns at least the current user", async ({ page }) => {
    await page.goto("/tasks", { waitUntil: "domcontentloaded" });
    const resp = await page.request.get("/api/team-members");
    expect(resp.status()).toBe(200);
    const body = await resp.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThanOrEqual(1);
    const me = body.find((m: { is_current: boolean }) => m.is_current);
    expect(me).toBeTruthy();
    expect(me.email).toBeTruthy();
  });
});
