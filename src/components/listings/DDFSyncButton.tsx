"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { syncDDFListing } from "@/actions/ddf";
import { Button } from "@/components/ui/button";
import { RefreshCw, Check, AlertCircle } from "lucide-react";

export function DDFSyncButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  function handleSync() {
    setStatus("idle");
    startTransition(async () => {
      const res = await syncDDFListing(listingId);
      if ("error" in res) {
        setStatus("error");
        setMessage(res.error ?? "Sync failed");
      } else {
        setStatus("success");
        setMessage(`Synced ${res.fields_updated} fields from DDF`);
        router.refresh();
        setTimeout(() => setStatus("idle"), 3000);
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={isPending}
        className="gap-1.5"
      >
        {isPending ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : status === "success" ? (
          <Check className="h-3.5 w-3.5 text-brand" />
        ) : status === "error" ? (
          <AlertCircle className="h-3.5 w-3.5 text-red-600" />
        ) : (
          <RefreshCw className="h-3.5 w-3.5" />
        )}
        {isPending ? "Syncing..." : "Sync DDF"}
      </Button>
      {message && status !== "idle" && (
        <span
          className={`text-xs ${
            status === "error" ? "text-red-600" : "text-brand"
          }`}
        >
          {message}
        </span>
      )}
    </div>
  );
}
