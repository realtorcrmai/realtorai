import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import type { z, ZodSchema } from "zod";
import type { ActionResult } from "./types";

interface CreateActionOptions<TSchema extends ZodSchema, TResult extends object> {
  schema: TSchema;
  handler: (
    data: z.infer<TSchema>,
    supabase: ReturnType<typeof createAdminClient>
  ) => Promise<TResult>;
  revalidate?: string[];
}

/**
 * Creates a standardized server action with Zod validation,
 * Supabase client injection, and path revalidation.
 *
 * Usage:
 * ```ts
 * export const createListing = createAction({
 *   schema: listingSchema,
 *   revalidate: ["/listings"],
 *   handler: async (data, supabase) => {
 *     const { data: listing, error } = await supabase.from("listings").insert(data).select().single();
 *     if (error) throw new Error("Failed to create listing");
 *     return { listing };
 *   },
 * });
 * ```
 */
export function createAction<TSchema extends ZodSchema, TResult extends object>(
  options: CreateActionOptions<TSchema, TResult>
) {
  return async (formData: z.infer<TSchema>): Promise<ActionResult<TResult>> => {
    const parsed = options.schema.safeParse(formData);
    if (!parsed.success) {
      return { error: "Invalid form data", issues: parsed.error.issues };
    }

    try {
      const supabase = createAdminClient();
      const result = await options.handler(parsed.data, supabase);

      if (options.revalidate) {
        for (const path of options.revalidate) {
          revalidatePath(path);
        }
      }

      return { success: true, ...result };
    } catch (err) {
      console.error("Action failed:", err);
      return {
        error: err instanceof Error ? err.message : "An unexpected error occurred",
      };
    }
  };
}
