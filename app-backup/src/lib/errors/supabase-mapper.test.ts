import { describe, it, expect } from "vitest";
import { mapSupabaseError } from "./supabase-mapper";
import { ErrorCode } from "./types";

describe("mapSupabaseError", () => {
  it("maps PGRST116 to NOT_FOUND with 404", () => {
    const err = mapSupabaseError({ code: "PGRST116", message: "Row not found" });
    expect(err.code).toBe(ErrorCode.NOT_FOUND);
    expect(err.statusCode).toBe(404);
    expect(err.userMessage).toBe("The requested record could not be found.");
    expect(err.message).toContain("Row not found");
  });

  it("maps 23505 (unique violation) to VALIDATION_ERROR with 409", () => {
    const err = mapSupabaseError({ code: "23505", message: "duplicate key" });
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(err.statusCode).toBe(409);
    expect(err.userMessage).toBe("A record with this information already exists.");
  });

  it("maps 23503 (foreign key violation) to VALIDATION_ERROR with 400", () => {
    const err = mapSupabaseError({ code: "23503", message: "fk violation" });
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(err.statusCode).toBe(400);
    expect(err.userMessage).toContain("references data that does not exist");
  });

  it("maps 42P01 (table not found) to DATABASE_ERROR with 500 and isOperational false", () => {
    const err = mapSupabaseError({ code: "42P01", message: "relation does not exist" });
    expect(err.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(err.statusCode).toBe(500);
    expect(err.isOperational).toBe(false);
    expect(err.userMessage).toContain("database configuration error");
  });

  it("maps 23502 (not-null violation) to VALIDATION_ERROR with 400", () => {
    const err = mapSupabaseError({ code: "23502", message: "null value in column" });
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(err.statusCode).toBe(400);
    expect(err.userMessage).toContain("required field is missing");
  });

  it("maps 23514 (check constraint violation) to VALIDATION_ERROR with 400", () => {
    const err = mapSupabaseError({ code: "23514", message: "check constraint" });
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(err.statusCode).toBe(400);
    expect(err.userMessage).toContain("does not meet the required constraints");
  });

  it("maps unknown error codes to DATABASE_ERROR with 500", () => {
    const err = mapSupabaseError({ code: "99999", message: "weird error" });
    expect(err.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(err.statusCode).toBe(500);
    expect(err.userMessage).toBe("A database error occurred. Please try again.");
  });

  it("handles missing code as unknown error", () => {
    const err = mapSupabaseError({ message: "no code" });
    expect(err.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(err.statusCode).toBe(500);
  });

  it("handles missing message gracefully", () => {
    const err = mapSupabaseError({ code: "23505" });
    expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
    expect(err.message).toContain("undefined");
  });

  it("handles completely empty error object", () => {
    const err = mapSupabaseError({});
    expect(err.code).toBe(ErrorCode.DATABASE_ERROR);
    expect(err.message).toBe("Unknown database error");
  });

  it("returns an AppError instance for every case", () => {
    const codes = ["PGRST116", "23505", "23503", "42P01", "23502", "23514", "UNKNOWN"];
    for (const code of codes) {
      const err = mapSupabaseError({ code, message: "test" });
      expect(err.name).toBe("AppError");
    }
  });

  it("includes the original message in the error message for PGRST116", () => {
    const err = mapSupabaseError({ code: "PGRST116", message: "exact row count" });
    expect(err.message).toBe("Record not found: exact row count");
  });
});
