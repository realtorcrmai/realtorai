"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Globe, Zap, ExternalLink } from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";
import { createExtensionTask } from "@/actions/extension";
import { toast } from "sonner";

const PARAGON_URL = "https://bcres.paragonrels.com/";

type MLSIntegrationButtonsProps = {
  listingId: string;
  stepId: string;
  hasEnrichmentData?: boolean;
};

/**
 * MLS Integration buttons for Steps 7 (mls-prep) and 8 (mls-submission).
 *
 * Step 7: "Fetch from Previous MLS Listing" — creates an explore task,
 *         opens Paragon so the realtor can find the previous listing.
 *         Extension picks up the task and shows "Send to CRM Listing" FAB.
 *
 * Step 8: "Auto-Fill Paragon Form" — creates a fill task,
 *         opens Paragon so the realtor can create a new listing.
 *         Extension picks up the task and auto-fills the form.
 */
export function MLSIntegrationButtons({
  listingId,
  stepId,
  hasEnrichmentData = false,
}: MLSIntegrationButtonsProps) {
  const [loading, setLoading] = useState(false);

  const handleExplore = async () => {
    setLoading(true);
    try {
      const result = await createExtensionTask(listingId, "explore");
      if (result.error) {
        toast.error("Failed to create task: " + result.error);
        return;
      }
      toast.success("Opening Paragon MLS...", {
        description: "Find the previous listing and click 'Send to CRM Listing'",
      });
      window.open(PARAGON_URL, "_blank");
    } catch {
      toast.error("Failed to create extension task");
    } finally {
      setLoading(false);
    }
  };

  const handleFill = async () => {
    setLoading(true);
    try {
      const result = await createExtensionTask(listingId, "fill");
      if (result.error) {
        toast.error("Failed to create task: " + result.error);
        return;
      }
      toast.success("Opening Paragon MLS...", {
        description: "Open a new listing form — data will fill automatically",
      });
      window.open(PARAGON_URL, "_blank");
    } catch {
      toast.error("Failed to create extension task");
    } finally {
      setLoading(false);
    }
  };

  if (stepId === "mls-prep") {
    return (
      <div className="flex flex-col gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs px-2.5 gap-1.5"
          onClick={handleExplore}
          disabled={loading}
        >
          {loading ? (
            <LogoSpinner size={12} />
          ) : (
            <Globe className="h-3 w-3" />
          )}
          Fetch from Previous MLS Listing
          <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-50" />
        </Button>
        <p className="text-[10px] text-muted-foreground/60 leading-tight">
          Opens Paragon — find the previous listing and click &quot;Send to CRM Listing&quot;
        </p>
      </div>
    );
  }

  if (stepId === "mls-submission") {
    return (
      <div className="flex flex-col gap-1.5">
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs px-2.5 gap-1.5"
          onClick={handleFill}
          disabled={loading || !hasEnrichmentData}
          title={
            !hasEnrichmentData
              ? "Complete Step 7 (MLS Preparation) first to enable auto-fill"
              : "Open Paragon and auto-fill the new listing form"
          }
        >
          {loading ? (
            <LogoSpinner size={12} />
          ) : (
            <Zap className="h-3 w-3" />
          )}
          Auto-Fill Paragon Form
          <ExternalLink className="h-2.5 w-2.5 ml-0.5 opacity-50" />
        </Button>
        <p className="text-[10px] text-muted-foreground/60 leading-tight">
          {hasEnrichmentData
            ? "Opens Paragon — create a new listing and data fills automatically"
            : "Complete Step 7 first to enable auto-fill"}
        </p>
      </div>
    );
  }

  return null;
}
