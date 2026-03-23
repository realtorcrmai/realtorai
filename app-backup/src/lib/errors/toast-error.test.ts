import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import { showErrorToast } from "./toast-error";
import { AppError, ErrorCode } from "./types";

describe("showErrorToast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the userMessage for an AppError", () => {
    const err = new AppError({
      message: "internal detail",
      code: ErrorCode.NOT_FOUND,
      userMessage: "Record not found.",
    });
    showErrorToast(err);
    expect(toast.error).toHaveBeenCalledWith("Record not found.");
  });

  it("shows the message for a plain Error", () => {
    showErrorToast(new Error("Something failed"));
    expect(toast.error).toHaveBeenCalledWith("Something failed");
  });

  it("shows the string directly when a string is passed", () => {
    showErrorToast("Custom error text");
    expect(toast.error).toHaveBeenCalledWith("Custom error text");
  });

  it("shows a generic fallback for an unknown type (number)", () => {
    showErrorToast(42);
    expect(toast.error).toHaveBeenCalledWith(
      "An unexpected error occurred. Please try again."
    );
  });

  it("shows a generic fallback for null", () => {
    showErrorToast(null);
    expect(toast.error).toHaveBeenCalledWith(
      "An unexpected error occurred. Please try again."
    );
  });

  it("shows a generic fallback for undefined", () => {
    showErrorToast(undefined);
    expect(toast.error).toHaveBeenCalledWith(
      "An unexpected error occurred. Please try again."
    );
  });

  it("shows a generic fallback for a plain object", () => {
    showErrorToast({ foo: "bar" });
    expect(toast.error).toHaveBeenCalledWith(
      "An unexpected error occurred. Please try again."
    );
  });

  it("calls toast.error exactly once per invocation", () => {
    showErrorToast("one call");
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
