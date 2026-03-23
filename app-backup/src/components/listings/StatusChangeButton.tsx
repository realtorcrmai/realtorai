"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateListingStatus } from "@/actions/listings";
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

const TRANSITIONS: Record<
  string,
  { label: string; emoji: string; target: "active" | "pending" | "sold"; className: string; confirmTitle: string; confirmDesc: string }[]
> = {
  active: [
    {
      label: "Mark as Sold",
      emoji: "✅",
      target: "sold",
      className: "bg-green-600 hover:bg-green-700 text-white",
      confirmTitle: "Mark listing as Sold?",
      confirmDesc:
        "This will mark the property as sold and complete the workflow. This cannot be undone.",
    },
  ],
  pending: [
    {
      label: "Mark as Sold",
      emoji: "✅",
      target: "sold",
      className: "bg-green-600 hover:bg-green-700 text-white",
      confirmTitle: "Mark listing as Sold?",
      confirmDesc:
        "This will mark the property as sold and complete the workflow. This cannot be undone.",
    },
    {
      label: "Revert to Active",
      emoji: "↩️",
      target: "active",
      className: "border border-input bg-background hover:bg-accent text-foreground",
      confirmTitle: "Revert to Active?",
      confirmDesc:
        "This will revert the listing back to active status.",
    },
  ],
  sold: [],
};

export function StatusChangeButton({
  listingId,
  currentStatus,
}: {
  listingId: string;
  currentStatus: string;
}) {
  const transitions = TRANSITIONS[currentStatus] ?? [];
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (transitions.length === 0) return null;

  async function handleStatusChange(target: "active" | "pending" | "sold") {
    setError(null);
    startTransition(async () => {
      const result = await updateListingStatus(listingId, target);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {transitions.map((t) => (
        <AlertDialog key={t.target}>
          <AlertDialogTrigger
            disabled={isPending}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${t.className}`}
          >
            <span>{t.emoji}</span>
            {t.label}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.confirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.confirmDesc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => handleStatusChange(t.target)}
                disabled={isPending}
              >
                {isPending ? "Updating..." : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ))}
      {error && (
        <span className="text-xs text-red-500">{error}</span>
      )}
    </div>
  );
}
