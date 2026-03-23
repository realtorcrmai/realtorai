import type { ZodIssue } from "zod";

/**
 * Standard return type for all server actions.
 * Success: `{ success: true }` merged with optional extra data.
 * Failure: `{ error: string }` with optional Zod issues.
 */
export type ActionResult<T = object> =
  | ({ success: true } & T)
  | { success?: never; error: string; issues?: ZodIssue[] };
