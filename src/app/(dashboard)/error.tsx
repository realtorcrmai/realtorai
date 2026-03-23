"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center p-12">
      <Card className="max-w-md w-full animate-float-in">
        <CardContent className="flex flex-col items-center text-center p-8">
          <div className="rounded-full bg-destructive/10 p-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            {error.message || "An unexpected error occurred."}
          </p>
          <Button onClick={reset} className="mt-6 gap-2">
            <RotateCcw className="h-4 w-4" />
            Try again
          </Button>

          {/* Dev-only error details */}
          {process.env.NODE_ENV === "development" && (
            <details className="mt-6 w-full text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer">
                Error details
              </summary>
              <pre className="mt-2 rounded-md bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
                {error.stack ?? error.message}
                {error.digest && `\n\nDigest: ${error.digest}`}
              </pre>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
