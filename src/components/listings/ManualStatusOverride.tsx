"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { overrideListingStatus, type ListingStatusOverride } from "@/actions/listings";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LISTING_STATUS_COLORS, LISTING_STATUSES } from "@/lib/constants";

const STATUS_LABELS: Record<ListingStatusOverride, string> = {
  active: "Active",
  pending: "Pending",
  conditional: "Conditional",
  sold: "Sold",
  cancelled: "Cancelled",
  expired: "Expired",
  withdrawn: "Withdrawn",
};

export function ManualStatusOverride({
  listingId,
  currentStatus,
}: {
  listingId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pendingStatus, setPendingStatus] = useState<ListingStatusOverride | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  function handleSelectChange(value: string | null) {
    if (!value || value === currentStatus) return;
    setPendingStatus(value as ListingStatusOverride);
    setDialogOpen(true);
  }

  function handleConfirm() {
    if (!pendingStatus) return;
    setError(null);
    startTransition(async () => {
      const result = await overrideListingStatus(listingId, pendingStatus);
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
      setDialogOpen(false);
      setPendingStatus(null);
    });
  }

  function handleDialogOpenChange(open: boolean) {
    if (!open) {
      setPendingStatus(null);
    }
    setDialogOpen(open);
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Select
          value={currentStatus}
          onValueChange={handleSelectChange}
          disabled={isPending}
        >
          <SelectTrigger
            className={`h-7 w-36 text-xs font-medium border px-2 ${
              LISTING_STATUS_COLORS[currentStatus as keyof typeof LISTING_STATUS_COLORS] ??
              "bg-gray-100 text-gray-700 border-gray-200"
            }`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LISTING_STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                <span
                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                    LISTING_STATUS_COLORS[s as keyof typeof LISTING_STATUS_COLORS]
                  }`}
                >
                  {STATUS_LABELS[s as ListingStatusOverride] ?? s}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Override workflow status?</AlertDialogTitle>
            <AlertDialogDescription>
              This will manually set the listing status to{" "}
              <strong>{pendingStatus ? STATUS_LABELS[pendingStatus] : ""}</strong>, bypassing
              the sequential workflow. The workflow checklist will not be affected — only
              the displayed status changes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isPending}>
              {isPending ? "Updating…" : "Override Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
