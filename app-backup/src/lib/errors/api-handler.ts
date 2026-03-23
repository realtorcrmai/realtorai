import { NextRequest, NextResponse } from "next/server";
import { isAppError, AppError, ErrorCode } from "./types";
import { mapSupabaseError } from "./supabase-mapper";

type ApiHandler = (req: NextRequest, context?: unknown) => Promise<NextResponse>;

/**
 * Wraps an API route handler with consistent error handling.
 * Catches thrown errors, maps them to proper HTTP responses, and logs them.
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (req: NextRequest, context?: unknown) => {
    try {
      return await handler(req, context);
    } catch (error: unknown) {
      // Already an AppError — use its status and user message
      if (isAppError(error)) {
        console.error(`[API ${req.method} ${req.nextUrl.pathname}]`, error.message);
        return NextResponse.json(
          { error: error.userMessage, code: error.code },
          { status: error.statusCode }
        );
      }

      // Supabase PostgrestError shape (has `.code` from PG)
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        "message" in error
      ) {
        const mapped = mapSupabaseError(error as { code: string; message: string });
        console.error(`[API ${req.method} ${req.nextUrl.pathname}]`, (error as unknown as Error).message);
        return NextResponse.json(
          { error: mapped.userMessage, code: mapped.code },
          { status: mapped.statusCode }
        );
      }

      // Generic Error
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";
      console.error(`[API ${req.method} ${req.nextUrl.pathname}]`, message);

      return NextResponse.json(
        { error: "An unexpected error occurred. Please try again.", code: ErrorCode.UNKNOWN },
        { status: 500 }
      );
    }
  };
}
