"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { updateRealtorSettings } from "@/actions/config";

type Props = {
  enabled?: boolean;
};

/**
 * ListingBlastAutomation — shows on the Automation tab.
 * Displays the automated listing alert blast configuration with enable/disable toggle.
 */
export function ListingBlastAutomation({ enabled: initialEnabled = true }: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleToggle() {
    const newValue = !enabled;
    setEnabled(newValue);
    startTransition(async () => {
      const result = await updateRealtorSettings({
        listing_blast_enabled: newValue,
      });
      if (result.success) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        // Revert on failure
        setEnabled(!newValue);
      }
    });
  }

  return (
    <Card className={`border-primary/20 ${enabled ? "bg-gradient-to-r from-primary/5 to-[#0F7694]/5" : "bg-muted/30"}`}>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏠</span>
            <div>
              <h3 className="text-sm font-bold">Listing Blast Automation</h3>
              <p className="text-xs text-muted-foreground">
                Auto-send new listing alerts to matching buyer contacts
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-[10px] text-brand font-medium">Saved</span>
            )}
            <button
              onClick={handleToggle}
              disabled={isPending}
              className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? "bg-brand" : "bg-gray-300"} ${isPending ? "opacity-50" : ""}`}
              aria-label="Toggle listing blast automation"
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? "left-[26px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>

        <div className={`grid grid-cols-3 gap-3 text-center transition-opacity ${enabled ? "" : "opacity-50"}`}>
          <div className="bg-white/60 rounded-lg p-3 border">
            <p className="text-lg font-bold text-primary">Auto</p>
            <p className="text-[10px] text-muted-foreground">
              Triggers on new listing
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-3 border">
            <p className="text-lg font-bold text-primary">Match</p>
            <p className="text-[10px] text-muted-foreground">
              By area, price, type
            </p>
          </div>
          <div className="bg-white/60 rounded-lg p-3 border">
            <p className="text-lg font-bold text-primary">AI</p>
            <p className="text-[10px] text-muted-foreground">
              Personalized content
            </p>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-3">
          {enabled
            ? "When a new listing is created, the AI automatically identifies matching buyer contacts and sends personalized listing alerts. Each email is quality-scored before sending."
            : "Listing blast automation is currently paused. Enable the toggle above to resume automatic listing alerts."}
        </p>
      </CardContent>
    </Card>
  );
}
