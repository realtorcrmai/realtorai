"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { History, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function FetchPreviousListingButton({
  address,
  listingId,
  onDataFetched,
}: {
  address: string;
  listingId: string;
  onDataFetched: (data: Record<string, string>) => void;
}) {
  const [loading, setLoading] = useState(false);

  async function handleFetch() {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/listings/previous-data?address=${encodeURIComponent(address)}&listingId=${encodeURIComponent(listingId)}`
      );
      const json = await res.json();

      if (json.data && typeof json.data === "object") {
        // Convert all values to strings for form compatibility
        const stringData: Record<string, string> = {};
        for (const [key, value] of Object.entries(json.data)) {
          if (value !== null && value !== undefined && value !== "") {
            stringData[key] = String(value);
          }
        }
        onDataFetched(stringData);
        toast.success("Previous listing data loaded — review and save");
      } else {
        toast.info("No previous listing data found for this address");
      }
    } catch {
      toast.error("Failed to fetch previous listing data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className="h-7 text-xs px-2.5 gap-1.5"
      onClick={handleFetch}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <History className="h-3 w-3" />
      )}
      Fetch Previous
    </Button>
  );
}
