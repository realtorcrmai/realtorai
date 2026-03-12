"use client";

import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">
        {error.message || "An unexpected error occurred."}
      </p>
      <Button onClick={reset} className="mt-4">
        Try again
      </Button>
    </div>
  );
}
