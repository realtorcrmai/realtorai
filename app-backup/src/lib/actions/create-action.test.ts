import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { createAction } from "./create-action";

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock errors module
vi.mock("@/lib/errors", () => ({
  isAppError: (err: unknown) =>
    err !== null &&
    typeof err === "object" &&
    "name" in (err as Record<string, unknown>) &&
    (err as Record<string, unknown>).name === "AppError",
  mapSupabaseError: (err: { code: string; message: string }) => ({
    userMessage:
      err.code === "23505"
        ? "A record with this information already exists."
        : "A database error occurred. Please try again.",
  }),
}));

// Mock Supabase admin client
const mockSupabase = { from: vi.fn() };
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockSupabase,
}));

const testSchema = z.object({
  name: z.string().min(1),
  value: z.number(),
});

describe("createAction", () => {
  it("returns a function", () => {
    const action = createAction({
      schema: testSchema,
      handler: async () => ({}),
    });
    expect(typeof action).toBe("function");
  });

  it("returns success result when handler succeeds", async () => {
    const action = createAction({
      schema: testSchema,
      handler: async (data) => ({ created: data }),
    });

    const result = await action({ name: "test", value: 42 });
    expect(result).toEqual({ success: true, created: { name: "test", value: 42 } });
  });

  it("returns error when validation fails", async () => {
    const action = createAction({
      schema: testSchema,
      handler: async () => ({}),
    });

    const result = await action({ name: "", value: 42 });
    expect(result).toHaveProperty("error", "Invalid form data");
    expect(result).toHaveProperty("issues");
    expect("success" in result && result.success).toBeFalsy();
  });

  it("returns error when schema fields are missing", async () => {
    const action = createAction({
      schema: testSchema,
      handler: async () => ({}),
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await action({ name: "test" } as any);
    expect(result).toHaveProperty("error", "Invalid form data");
  });

  it("returns error message when handler throws a plain Error", async () => {
    const action = createAction({
      schema: testSchema,
      handler: async () => {
        throw new Error("Something broke");
      },
    });

    const result = await action({ name: "test", value: 1 });
    expect(result).toHaveProperty("error", "Something broke");
  });

  it("returns generic message when handler throws a non-Error", async () => {
    const action = createAction({
      schema: testSchema,
      handler: async () => {
        throw "string error";
      },
    });

    const result = await action({ name: "test", value: 1 });
    expect(result).toHaveProperty("error", "An unexpected error occurred");
  });

  it("maps Supabase errors with code and message", async () => {
    const action = createAction({
      schema: testSchema,
      handler: async () => {
        throw { code: "23505", message: "duplicate key" };
      },
    });

    const result = await action({ name: "test", value: 1 });
    expect(result).toHaveProperty("error", "A record with this information already exists.");
  });

  it("maps unknown Supabase error codes to generic database message", async () => {
    const action = createAction({
      schema: testSchema,
      handler: async () => {
        throw { code: "99999", message: "unknown pg error" };
      },
    });

    const result = await action({ name: "test", value: 1 });
    expect(result).toHaveProperty("error", "A database error occurred. Please try again.");
  });

  it("handles AppError with userMessage", async () => {
    const action = createAction({
      schema: testSchema,
      handler: async () => {
        const err = Object.assign(new Error("internal"), {
          name: "AppError",
          userMessage: "Contact not found",
        });
        throw err;
      },
    });

    const result = await action({ name: "test", value: 1 });
    expect(result).toHaveProperty("error", "Contact not found");
  });

  it("calls revalidatePath for each path on success", async () => {
    const { revalidatePath } = await import("next/cache");

    const action = createAction({
      schema: testSchema,
      handler: async () => ({ id: "abc" }),
      revalidate: ["/listings", "/dashboard"],
    });

    await action({ name: "test", value: 1 });
    expect(revalidatePath).toHaveBeenCalledWith("/listings");
    expect(revalidatePath).toHaveBeenCalledWith("/dashboard");
  });

  it("does not call revalidatePath when handler throws", async () => {
    const { revalidatePath } = await import("next/cache");
    (revalidatePath as ReturnType<typeof vi.fn>).mockClear();

    const action = createAction({
      schema: testSchema,
      handler: async () => {
        throw new Error("fail");
      },
      revalidate: ["/listings"],
    });

    await action({ name: "test", value: 1 });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
