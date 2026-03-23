import { AppError, ErrorCode } from "./types";

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

/**
 * Maps common Supabase/PostgreSQL error codes to user-friendly AppErrors.
 */
export function mapSupabaseError(error: SupabaseError): AppError {
  const code = error.code ?? "";

  switch (code) {
    // PostgREST: row not found
    case "PGRST116":
      return new AppError({
        message: `Record not found: ${error.message}`,
        code: ErrorCode.NOT_FOUND,
        statusCode: 404,
        userMessage: "The requested record could not be found.",
      });

    // PostgreSQL: unique constraint violation
    case "23505":
      return new AppError({
        message: `Unique violation: ${error.message}`,
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 409,
        userMessage: "A record with this information already exists.",
      });

    // PostgreSQL: foreign key violation
    case "23503":
      return new AppError({
        message: `Foreign key violation: ${error.message}`,
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
        userMessage: "This record references data that does not exist or cannot be removed.",
      });

    // PostgreSQL: table not found
    case "42P01":
      return new AppError({
        message: `Table not found: ${error.message}`,
        code: ErrorCode.DATABASE_ERROR,
        statusCode: 500,
        userMessage: "A database configuration error occurred. Please contact support.",
        isOperational: false,
      });

    // PostgreSQL: not-null violation
    case "23502":
      return new AppError({
        message: `Not-null violation: ${error.message}`,
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
        userMessage: "A required field is missing. Please fill in all required fields.",
      });

    // PostgreSQL: check constraint violation
    case "23514":
      return new AppError({
        message: `Check constraint violation: ${error.message}`,
        code: ErrorCode.VALIDATION_ERROR,
        statusCode: 400,
        userMessage: "The provided data does not meet the required constraints.",
      });

    default:
      return new AppError({
        message: error.message ?? "Unknown database error",
        code: ErrorCode.DATABASE_ERROR,
        statusCode: 500,
        userMessage: "A database error occurred. Please try again.",
      });
  }
}
