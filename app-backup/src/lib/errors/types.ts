/**
 * Application error codes for consistent error classification.
 */
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  UNAUTHORIZED: "UNAUTHORIZED",
  DATABASE_ERROR: "DATABASE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  UNKNOWN: "UNKNOWN",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Structured application error with user-friendly messaging.
 */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly userMessage: string;
  readonly isOperational: boolean;

  constructor(options: {
    message: string;
    code: ErrorCode;
    statusCode?: number;
    userMessage?: string;
    isOperational?: boolean;
    cause?: unknown;
  }) {
    super(options.message, { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode ?? 500;
    this.userMessage = options.userMessage ?? "Something went wrong. Please try again.";
    this.isOperational = options.isOperational ?? true;
  }
}

/**
 * Type guard to check if an error is an AppError.
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convenience factory for creating AppErrors.
 */
export function createAppError(
  code: ErrorCode,
  message: string,
  options?: {
    statusCode?: number;
    userMessage?: string;
    cause?: unknown;
  }
): AppError {
  const statusCodeDefaults: Record<ErrorCode, number> = {
    VALIDATION_ERROR: 400,
    NOT_FOUND: 404,
    UNAUTHORIZED: 401,
    DATABASE_ERROR: 500,
    NETWORK_ERROR: 503,
    UNKNOWN: 500,
  };

  return new AppError({
    message,
    code,
    statusCode: options?.statusCode ?? statusCodeDefaults[code],
    userMessage: options?.userMessage,
    cause: options?.cause,
  });
}
