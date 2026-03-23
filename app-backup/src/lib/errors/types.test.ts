import { describe, it, expect } from "vitest";
import { AppError, ErrorCode, isAppError, createAppError } from "./types";

describe("ErrorCode", () => {
  it("has VALIDATION_ERROR code", () => {
    expect(ErrorCode.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
  });

  it("has NOT_FOUND code", () => {
    expect(ErrorCode.NOT_FOUND).toBe("NOT_FOUND");
  });

  it("has UNAUTHORIZED code", () => {
    expect(ErrorCode.UNAUTHORIZED).toBe("UNAUTHORIZED");
  });

  it("has DATABASE_ERROR code", () => {
    expect(ErrorCode.DATABASE_ERROR).toBe("DATABASE_ERROR");
  });

  it("has NETWORK_ERROR code", () => {
    expect(ErrorCode.NETWORK_ERROR).toBe("NETWORK_ERROR");
  });

  it("has UNKNOWN code", () => {
    expect(ErrorCode.UNKNOWN).toBe("UNKNOWN");
  });

  it("contains exactly 6 error codes", () => {
    expect(Object.keys(ErrorCode)).toHaveLength(6);
  });
});

describe("AppError", () => {
  it("creates an error with required fields", () => {
    const err = new AppError({
      message: "Something broke",
      code: ErrorCode.DATABASE_ERROR,
    });
    expect(err.message).toBe("Something broke");
    expect(err.code).toBe("DATABASE_ERROR");
    expect(err.name).toBe("AppError");
  });

  it("extends the native Error class", () => {
    const err = new AppError({ message: "test", code: ErrorCode.UNKNOWN });
    expect(err).toBeInstanceOf(Error);
  });

  it("defaults statusCode to 500", () => {
    const err = new AppError({ message: "test", code: ErrorCode.UNKNOWN });
    expect(err.statusCode).toBe(500);
  });

  it("defaults userMessage to a generic message", () => {
    const err = new AppError({ message: "test", code: ErrorCode.UNKNOWN });
    expect(err.userMessage).toBe("Something went wrong. Please try again.");
  });

  it("defaults isOperational to true", () => {
    const err = new AppError({ message: "test", code: ErrorCode.UNKNOWN });
    expect(err.isOperational).toBe(true);
  });

  it("accepts custom statusCode, userMessage, and isOperational", () => {
    const err = new AppError({
      message: "internal",
      code: ErrorCode.DATABASE_ERROR,
      statusCode: 503,
      userMessage: "Service unavailable",
      isOperational: false,
    });
    expect(err.statusCode).toBe(503);
    expect(err.userMessage).toBe("Service unavailable");
    expect(err.isOperational).toBe(false);
  });

  it("stores a cause when provided", () => {
    const cause = new Error("root cause");
    const err = new AppError({
      message: "wrapper",
      code: ErrorCode.UNKNOWN,
      cause,
    });
    expect(err.cause).toBe(cause);
  });
});

describe("isAppError", () => {
  it("returns true for an AppError instance", () => {
    const err = new AppError({ message: "x", code: ErrorCode.NOT_FOUND });
    expect(isAppError(err)).toBe(true);
  });

  it("returns false for a plain Error", () => {
    expect(isAppError(new Error("plain"))).toBe(false);
  });

  it("returns false for a string", () => {
    expect(isAppError("not an error")).toBe(false);
  });

  it("returns false for null", () => {
    expect(isAppError(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isAppError(undefined)).toBe(false);
  });
});

describe("createAppError", () => {
  it("creates a VALIDATION_ERROR with statusCode 400", () => {
    const err = createAppError(ErrorCode.VALIDATION_ERROR, "bad input");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.statusCode).toBe(400);
  });

  it("creates a NOT_FOUND with statusCode 404", () => {
    const err = createAppError(ErrorCode.NOT_FOUND, "missing");
    expect(err.statusCode).toBe(404);
  });

  it("creates an UNAUTHORIZED with statusCode 401", () => {
    const err = createAppError(ErrorCode.UNAUTHORIZED, "no auth");
    expect(err.statusCode).toBe(401);
  });

  it("creates a DATABASE_ERROR with statusCode 500", () => {
    const err = createAppError(ErrorCode.DATABASE_ERROR, "db fail");
    expect(err.statusCode).toBe(500);
  });

  it("creates a NETWORK_ERROR with statusCode 503", () => {
    const err = createAppError(ErrorCode.NETWORK_ERROR, "timeout");
    expect(err.statusCode).toBe(503);
  });

  it("creates an UNKNOWN error with statusCode 500", () => {
    const err = createAppError(ErrorCode.UNKNOWN, "mystery");
    expect(err.statusCode).toBe(500);
  });

  it("allows overriding the default statusCode", () => {
    const err = createAppError(ErrorCode.VALIDATION_ERROR, "bad", {
      statusCode: 422,
    });
    expect(err.statusCode).toBe(422);
  });

  it("allows setting a custom userMessage", () => {
    const err = createAppError(ErrorCode.NOT_FOUND, "missing record", {
      userMessage: "We could not find that listing.",
    });
    expect(err.userMessage).toBe("We could not find that listing.");
  });

  it("passes the cause through to AppError", () => {
    const cause = new Error("original");
    const err = createAppError(ErrorCode.UNKNOWN, "wrapped", { cause });
    expect(err.cause).toBe(cause);
  });

  it("returns an instance of AppError", () => {
    const err = createAppError(ErrorCode.UNKNOWN, "test");
    expect(isAppError(err)).toBe(true);
    expect(err).toBeInstanceOf(AppError);
  });
});
