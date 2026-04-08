"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { backfillWorkflowEnrollments } from "@/actions/workflows";

export function BackfillButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    totalEnrolled: number;
    results: { workflow: string; enrolled: string[]; skipped: string[] }[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleBackfill() {
    setResult(null);
    setError(null);
    startTransition(async () => {
      try {
        const res = await backfillWorkflowEnrollments();
        if (!res.success) {
          setError("Backfill failed — check server logs");
          return;
        }
        setResult({ totalEnrolled: res.totalEnrolled, results: res.results });
        router.refresh();
      } catch (err) {
        setError(String(err));
      }
    });
  }

  return (
    <div className="space-y-3">
      <Button
        variant="outline"
        size="sm"
        onClick={handleBackfill}
        disabled={isPending}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4 mr-1.5" />
        )}
        {isPending ? "Scanning contacts..." : "Backfill Enrollments"}
      </Button>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-lg border bg-card p-4 space-y-2 text-sm animate-float-in">
          <div className="flex items-center gap-2 font-medium text-foreground">
            <CheckCircle2 className="h-4 w-4 text-[#0F7694]" />
            Backfill complete — {result.totalEnrolled} contact
            {result.totalEnrolled !== 1 ? "s" : ""} enrolled
          </div>
          {result.results
            .filter((r) => r.enrolled.length > 0)
            .map((r) => (
              <div key={r.workflow} className="ml-6 text-muted-foreground">
                <span className="font-medium text-foreground">
                  {r.workflow}
                </span>
                : {r.enrolled.join(", ")}
              </div>
            ))}
          {result.totalEnrolled === 0 && (
            <p className="ml-6 text-muted-foreground">
              All eligible contacts are already enrolled in their matching
              workflows.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
