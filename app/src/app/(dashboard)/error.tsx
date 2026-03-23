"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center p-12">
      <Card className={cn("max-w-md w-full animate-float-in")}>
        <CardContent className="flex flex-col items-center text-center space-y-4">
          <div className="flex items-center justify-center size-12 rounded-full bg-destructive/10">
            <AlertTriangle className="size-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Please try again or contact support
              if the problem persists.
            </p>
          </div>
          {process.env.NODE_ENV === "development" && error.message && (
            <pre className="w-full rounded-lg bg-muted p-3 text-left text-xs text-destructive overflow-auto max-h-28">
              {error.message}
            </pre>
          )}
          <Button onClick={reset} variant="outline" className="gap-2">
            <RefreshCw className="size-4" />
            Try again
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
