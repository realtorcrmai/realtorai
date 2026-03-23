import { toast } from "sonner";
import { isAppError } from "./types";

/**
 * Extracts a user-friendly message from any error type and shows it as a toast.
 */
export function showErrorToast(error: unknown): void {
  let message: string;

  if (isAppError(error)) {
    message = error.userMessage;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === "string") {
    message = error;
  } else {
    message = "An unexpected error occurred. Please try again.";
  }

  toast.error(message);

  if (process.env.NODE_ENV === "development") {
    console.error("[showErrorToast]", error);
  }
}
