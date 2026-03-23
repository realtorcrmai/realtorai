"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { markStepComplete } from "@/actions/workflow";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface SkipStepButtonProps {
  listingId: string;
  stepId: string;
  stepName: string;
}

export function SkipStepButton({ listingId, stepId, stepName }: SkipStepButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await markStepComplete(listingId, stepId);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      <AlertDialog>
        <AlertDialogTrigger
          disabled={isPending}
          className="text-[11px] px-2 py-0.5 rounded border border-dashed border-muted-foreground/40 text-muted-foreground hover:border-orange-400 hover:text-orange-600 transition-colors disabled:opacity-50"
        >
          {isPending ? "Skipping…" : "Skip to here"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark &ldquo;{stepName}&rdquo; as complete?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark <strong>{stepName}</strong> (and all earlier incomplete steps)
              as done, bypassing their prerequisites. Use this when work was completed outside
              the CRM. The workflow checklist will reflect the new state immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Updating…" : "Mark Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {error && <span className="text-[11px] text-red-500">{error}</span>}
    </span>
  );
}
