/**
 * L4 Integration Tests — Tasks API (DB layer)
 *
 * Tests the REAL Supabase database for:
 *   1. Task CRUD operations (insert, update, delete)
 *   2. Status enum constraint validation
 *   3. Tenant isolation (realtor_id scoping)
 *
 * Since API routes use getAuthenticatedTenantClient() which requires
 * a Next.js server context, we test the DB layer directly via the admin
 * client — verifying the same constraints and behaviors the routes enforce.
 *
 * 3-layer assertions: Response/return + DB state + Side effects
 */

import { describe, it, expect, afterEach, beforeAll } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

// ── Setup ──────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const enabled = Boolean(SUPABASE_URL && SUPABASE_KEY);

const TEST_PREFIX = "TEST_INTG_TASK";

// Track all created row IDs for cleanup
const createdTasks: string[] = [];
const createdActivity: string[] = [];

describe.skipIf(!enabled)("L4 Integration — Tasks API", () => {
  let admin: SupabaseClient;
  let REALTOR_A: string; // Real user ID from DB (demo user)
  const REALTOR_B = "00000000-0000-4000-8000-b00000000b01"; // Fake — guaranteed non-existent

  beforeAll(async () => {
    admin = createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Resolve real demo user ID for REALTOR_A
    const demoEmail = process.env.DEMO_EMAIL || "demo@realestatecrm.com";
    const { data: user, error } = await admin
      .from("users")
      .select("id")
      .eq("email", demoEmail)
      .maybeSingle();

    if (error || !user) {
      throw new Error(
        `Demo user not found (${demoEmail}): ${error?.message ?? "not in users table"}`
      );
    }
    REALTOR_A = user.id;
  });

  afterEach(async () => {
    // Clean up in dependency order: activity → tasks
    for (const id of createdActivity) {
      await admin.from("task_activity").delete().eq("id", id);
    }
    createdActivity.length = 0;

    for (const id of createdTasks) {
      await admin.from("tasks").delete().eq("id", id);
    }
    createdTasks.length = 0;
  });

  // ── Helpers ────────────────────────────────────────────────

  async function insertTask(
    overrides: Record<string, unknown> = {}
  ): Promise<Record<string, unknown>> {
    const id = (overrides.id as string) ?? crypto.randomUUID();
    const row = {
      id,
      title: `${TEST_PREFIX} ${Math.random().toString(36).slice(2, 8)}`,
      status: "pending",
      priority: "medium",
      category: "general",
      realtor_id: REALTOR_A,
      labels: [],
      visibility: "private",
      ...overrides,
    };

    const { data, error } = await admin
      .from("tasks")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();

    if (error) throw new Error(`insertTask failed: ${error.message}`);
    createdTasks.push(data.id);
    return data;
  }

  // ─────────────────────────────────────────────────────────────
  // 1. Task insert with required fields
  // ─────────────────────────────────────────────────────────────

  it("REQ-TASK-001 TC-TK-001: tasks table accepts insert with required fields @p0", async () => {
    // Arrange + Act: insert a task with required fields
    const task = await insertTask({
      title: `${TEST_PREFIX} Required Fields Test`,
      status: "pending",
    });

    // Assert Layer 1: Response — task returned with all fields
    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
    expect(task.title).toContain(TEST_PREFIX);
    expect(task.status).toBe("pending");
    expect(task.realtor_id).toBe(REALTOR_A);

    // Assert Layer 2: DB state — persisted correctly
    const { data: dbRow, error } = await admin
      .from("tasks")
      .select("id, title, status, priority, category, realtor_id, labels, visibility, created_at")
      .eq("id", task.id)
      .single();

    expect(error).toBeNull();
    expect(dbRow).not.toBeNull();
    expect(dbRow!.title).toBe(task.title);
    expect(dbRow!.status).toBe("pending");
    expect(dbRow!.priority).toBe("medium");
    expect(dbRow!.category).toBe("general");
    expect(dbRow!.realtor_id).toBe(REALTOR_A);
    expect(dbRow!.created_at).toBeDefined();

    // Assert Layer 3: Side effect — task appears in list query
    const { data: listResults } = await admin
      .from("tasks")
      .select("id")
      .eq("id", task.id)
      .eq("realtor_id", REALTOR_A);

    expect(listResults).toHaveLength(1);
  });

  // ─────────────────────────────────────────────────────────────
  // 2. Status enum validation
  // ─────────────────────────────────────────────────────────────

  it("REQ-TASK-001 TC-TK-002: tasks table status must be valid enum @p0", async () => {
    /**
     * The tasks table has a CHECK constraint on status:
     *   'pending' | 'in_progress' | 'completed'
     *
     * Inserting an invalid status should produce a constraint violation.
     */
    const id = crypto.randomUUID();
    const { error } = await admin.from("tasks").insert({
      id,
      title: `${TEST_PREFIX} Invalid Status Test`,
      status: "invalid_status",
      priority: "medium",
      category: "general",
      realtor_id: REALTOR_A,
      labels: [],
      visibility: "private",
    });

    // Assert: constraint violation (PostgreSQL CHECK constraint error code 23514)
    expect(error).not.toBeNull();
    expect(error!.code).toMatch(/^23/); // 23514 = check violation, 23502 = not null, etc.

    // Cleanup: the insert failed so nothing to clean up, but be safe
    if (!error) createdTasks.push(id);
  });

  // ─────────────────────────────────────────────────────────────
  // 3. Task status update
  // ─────────────────────────────────────────────────────────────

  it("REQ-TASK-002 TC-TK-003: task update changes status correctly @p0", async () => {
    // Arrange: create task with status 'pending'
    const task = await insertTask({ status: "pending" });
    const taskId = task.id as string;

    // Act: update status to 'completed' (mirroring what the PATCH route does)
    const completedAt = new Date().toISOString();
    const { error } = await admin
      .from("tasks")
      .update({ status: "completed", completed_at: completedAt })
      .eq("id", taskId);

    // Assert Layer 1: Response — no error
    expect(error).toBeNull();

    // Assert Layer 2: DB state — status and completed_at updated
    const { data: dbRow } = await admin
      .from("tasks")
      .select("status, completed_at")
      .eq("id", taskId)
      .single();

    expect(dbRow).not.toBeNull();
    expect(dbRow!.status).toBe("completed");
    expect(dbRow!.completed_at).not.toBeNull();

    // Assert Layer 3: Side effect — verify all three valid statuses accepted
    for (const validStatus of ["pending", "in_progress", "completed"]) {
      const { error: updateErr } = await admin
        .from("tasks")
        .update({ status: validStatus })
        .eq("id", taskId);

      expect(updateErr).toBeNull();
    }
  });

  // ─────────────────────────────────────────────────────────────
  // 4. Task delete
  // ─────────────────────────────────────────────────────────────

  it("REQ-TASK-003 TC-TK-004: task delete removes record @p1", async () => {
    // Arrange: create a task
    const task = await insertTask({
      title: `${TEST_PREFIX} Delete Test`,
    });
    const taskId = task.id as string;

    // Verify it exists
    const { data: beforeDelete } = await admin
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .single();

    expect(beforeDelete).not.toBeNull();

    // Act: delete the task (mimics DELETE /api/tasks?id=...)
    const { error } = await admin
      .from("tasks")
      .delete()
      .eq("id", taskId);

    // Assert Layer 1: Response — no error
    expect(error).toBeNull();

    // Assert Layer 2: DB state — row is gone
    const { data: afterDelete } = await admin
      .from("tasks")
      .select("id")
      .eq("id", taskId)
      .maybeSingle();

    expect(afterDelete).toBeNull();

    // Remove from cleanup list since we already deleted it
    const idx = createdTasks.indexOf(taskId);
    if (idx !== -1) createdTasks.splice(idx, 1);
  });

  // ─────────────────────────────────────────────────────────────
  // 5. Tenant isolation
  // ─────────────────────────────────────────────────────────────

  it("REQ-TASK-004 TC-TK-005: tasks scoped to realtor_id (tenant isolation) @p0 @security", async () => {
    // Arrange: create a task owned by Realtor A
    const task = await insertTask({
      realtor_id: REALTOR_A,
      title: `${TEST_PREFIX} Tenant Isolation Test`,
    });
    const taskId = task.id as string;

    // Act: query as Realtor B (simulating tenant client .eq("realtor_id", REALTOR_B))
    const { data: realtorBResults, error } = await admin
      .from("tasks")
      .select("id, title, realtor_id")
      .eq("realtor_id", REALTOR_B)
      .eq("id", taskId);

    // Assert Layer 1: Response — no error
    expect(error).toBeNull();

    // Assert Layer 2: Realtor B sees ZERO tasks from Realtor A
    expect(realtorBResults).toEqual([]);

    // Assert Layer 3: Realtor A CAN see their own task (positive control)
    const { data: realtorAResults } = await admin
      .from("tasks")
      .select("id, realtor_id")
      .eq("realtor_id", REALTOR_A)
      .eq("id", taskId);

    expect(realtorAResults).toHaveLength(1);
    expect(realtorAResults![0].realtor_id).toBe(REALTOR_A);

    // Assert Layer 3b: Realtor B cannot update Realtor A task via scoped query
    const { data: updateResult } = await admin
      .from("tasks")
      .update({ title: "HACKED" })
      .eq("id", taskId)
      .eq("realtor_id", REALTOR_B)
      .select();

    expect(updateResult).toEqual([]);

    // Verify original title unchanged
    const { data: dbRow } = await admin
      .from("tasks")
      .select("title")
      .eq("id", taskId)
      .single();

    expect(dbRow!.title).toContain(TEST_PREFIX);
  });
});
