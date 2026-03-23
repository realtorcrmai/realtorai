import { describe, it, expect } from "vitest";
import { taskSchema } from "./task";

const validTask = {
  title: "Follow up with buyer",
  status: "pending" as const,
  priority: "medium" as const,
  category: "follow_up" as const,
};

describe("taskSchema", () => {
  // ── Valid data ──────────────────────────────────────────────

  it("accepts valid task data", () => {
    const result = taskSchema.safeParse(validTask);
    expect(result.success).toBe(true);
  });

  it("accepts task with all optional fields", () => {
    const result = taskSchema.safeParse({
      ...validTask,
      description: "Call buyer to discuss offer",
      due_date: "2026-04-01",
      contact_id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      listing_id: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    });
    expect(result.success).toBe(true);
  });

  // ── Title ───────────────────────────────────────────────────

  it("fails when title is missing", () => {
    const { title: _, ...noTitle } = validTask;
    const result = taskSchema.safeParse(noTitle);
    expect(result.success).toBe(false);
  });

  it("fails when title is empty string", () => {
    const result = taskSchema.safeParse({ ...validTask, title: "" });
    expect(result.success).toBe(false);
  });

  // ── Status enum ─────────────────────────────────────────────

  it("accepts all valid status values", () => {
    for (const status of ["pending", "in_progress", "completed"]) {
      const result = taskSchema.safeParse({ ...validTask, status });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid status", () => {
    const result = taskSchema.safeParse({ ...validTask, status: "cancelled" });
    expect(result.success).toBe(false);
  });

  it("defaults status to 'pending'", () => {
    const { status: _, ...noStatus } = validTask;
    const result = taskSchema.safeParse(noStatus);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("pending");
    }
  });

  // ── Priority enum ───────────────────────────────────────────

  it("accepts all valid priority values", () => {
    for (const priority of ["low", "medium", "high", "urgent"]) {
      const result = taskSchema.safeParse({ ...validTask, priority });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid priority", () => {
    const result = taskSchema.safeParse({ ...validTask, priority: "critical" });
    expect(result.success).toBe(false);
  });

  // ── Category enum ───────────────────────────────────────────

  it("accepts all valid category values", () => {
    for (const category of ["follow_up", "showing", "document", "listing", "marketing", "inspection", "closing", "general"]) {
      const result = taskSchema.safeParse({ ...validTask, category });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid category", () => {
    const result = taskSchema.safeParse({ ...validTask, category: "finance" });
    expect(result.success).toBe(false);
  });

  // ── Optional UUID fields ────────────────────────────────────

  it("rejects non-UUID contact_id", () => {
    const result = taskSchema.safeParse({ ...validTask, contact_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });

  it("rejects non-UUID listing_id", () => {
    const result = taskSchema.safeParse({ ...validTask, listing_id: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});
