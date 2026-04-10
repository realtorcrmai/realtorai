"use client";

import { useState } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

// BC MLS boards (hardcoded for Phase 1)
const BC_BOARDS = [
  { value: "REBGV", label: "Real Estate Board of Greater Vancouver (REBGV)" },
  { value: "FVREB", label: "Fraser Valley Real Estate Board (FVREB)" },
  { value: "BCNREB", label: "BC Northern Real Estate Board (BCNREB)" },
  { value: "VIREB", label: "Vancouver Island Real Estate Board (VIREB)" },
  { value: "OMREB", label: "Okanagan Mainline Real Estate Board (OMREB)" },
  { value: "KOOTENAY", label: "Kootenay Real Estate Board" },
  { value: "OTHER", label: "Other" },
];

interface MLSConnectionStepProps {
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

/**
 * Onboarding Step 6: MLS Connection (I4).
 * Conditional — only shown if persona != "new_agent".
 * Board dropdown + area selector.
 */
export function MLSConnectionStep({ onNext, onBack, onSkip }: MLSConnectionStepProps) {
  const [board, setBoard] = useState("");
  const [noMLS, setNoMLS] = useState(false);

  return (
    <div className="space-y-5">
      <div className="text-center">
        <h2 className="text-xl font-bold">Connect your MLS</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Import your listings and stay synced with your board
        </p>
      </div>

      <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-muted bg-muted/30">
        <Building2 className="h-6 w-6 text-primary shrink-0" />
        <div>
          <p className="text-sm font-medium">MLS integration is in beta</p>
          <p className="text-xs text-muted-foreground">
            Select your board — we'll notify you when auto-sync is ready for your area
          </p>
        </div>
      </div>

      {!noMLS && (
        <div className="space-y-3">
          <div>
            <Label>Your MLS Board</Label>
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              className="w-full h-11 rounded-md border bg-background px-3 text-sm mt-1"
            >
              <option value="">Select your board...</option>
              {BC_BOARDS.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={noMLS}
          onChange={(e) => setNoMLS(e.target.checked)}
          className="rounded border-gray-300"
        />
        I don&apos;t have MLS access yet
      </label>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button className="flex-1" onClick={onNext}>
          {board || noMLS ? "Continue" : "Continue without MLS"}
        </Button>
      </div>
      <button onClick={onSkip} className="w-full text-xs text-muted-foreground hover:underline text-center">
        Skip for now
      </button>
    </div>
  );
}
