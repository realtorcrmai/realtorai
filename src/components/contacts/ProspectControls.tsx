"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pause, Play, Square, AlertTriangle } from "lucide-react";

type Journey = {
  id: string;
  journey_type: string;
  current_phase: string;
  is_paused: boolean;
  send_mode: string;
  next_email_at: string | null;
  trust_level: number;
};

type Props = {
  contactId: string;
  contactName: string;
  journey: Journey | null;
  aiContextNotes?: string | null;
  onUpdate?: () => void;
};

const EMAIL_TYPES = [
  { key: "listing_alert", label: "Listing Alerts" },
  { key: "market_update", label: "Market Updates" },
  { key: "neighbourhood_guide", label: "Neighbourhood Guides" },
  { key: "open_house", label: "Open House Invites" },
  { key: "home_anniversary", label: "Home Anniversary" },
  { key: "just_sold", label: "Just Sold" },
];

const TRUST_LABELS = [
  { level: 0, label: "Ghost", desc: "Review everything manually" },
  { level: 1, label: "Co-pilot", desc: "1-tap approve" },
  { level: 2, label: "Supervised", desc: "Auto-send, daily digest" },
  { level: 3, label: "Autonomous", desc: "AI handles everything" },
];

export function ProspectControls({
  contactId,
  contactName,
  journey,
  aiContextNotes,
  onUpdate,
}: Props) {
  const [notes, setNotes] = useState(aiContextNotes || "");
  const [notesSaved, setNotesSaved] = useState(false);
  const [frequency, setFrequency] = useState<string>("ai");
  const [updating, setUpdating] = useState(false);

  const saveNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/contacts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contactId, ai_context_notes: notes }),
      });
      if (res.ok) {
        setNotesSaved(true);
        setTimeout(() => setNotesSaved(false), 2000);
      }
    } catch { /* silent */ }
  }, [contactId, notes]);

  const updateJourney = useCallback(
    async (updates: Record<string, unknown>) => {
      if (!journey) return;
      setUpdating(true);
      try {
        const res = await fetch("/api/contacts/journey", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ journeyId: journey.id, ...updates }),
        });
        if (res.ok) onUpdate?.();
      } catch { /* silent */ }
      setUpdating(false);
    },
    [journey, onUpdate]
  );

  if (!journey) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          Not enrolled in any journey. Contact will not receive automated emails.
          <br />
          <Button variant="outline" size="sm" className="mt-2">
            Enroll in Journey
          </Button>
        </CardContent>
      </Card>
    );
  }

  const trustInfo = TRUST_LABELS[journey.trust_level] || TRUST_LABELS[0];

  return (
    <div className="space-y-4">
      {/* Journey Status */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Journey Status
          </h4>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  journey.is_paused ? "bg-amber-400" : "bg-emerald-500"
                }`}
              />
              <span className="text-sm font-medium">
                {journey.is_paused ? "Paused" : "Active"}
              </span>
              <Badge variant="outline" className="text-xs">
                {journey.current_phase}
              </Badge>
            </div>
            <div className="flex gap-1">
              {journey.is_paused ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => updateJourney({ is_paused: false })}
                  disabled={updating}
                >
                  <Play className="w-3 h-3" /> Resume
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs"
                  onClick={() => updateJourney({ is_paused: true })}
                  disabled={updating}
                >
                  <Pause className="w-3 h-3" /> Pause
                </Button>
              )}
            </div>
          </div>

          {/* Send mode */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Send mode:</span>
            <div className="flex gap-1">
              <button
                onClick={() => updateJourney({ send_mode: "review" })}
                className={`px-2 py-1 rounded text-xs border ${
                  journey.send_mode === "review"
                    ? "bg-primary text-white border-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                Review first
              </button>
              <button
                onClick={() => updateJourney({ send_mode: "auto" })}
                className={`px-2 py-1 rounded text-xs border ${
                  journey.send_mode === "auto"
                    ? "bg-primary text-white border-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                Auto-send
              </button>
            </div>
          </div>

          {/* Trust level */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Trust level:</span>
              <Badge variant="secondary" className="text-xs">
                L{journey.trust_level}: {trustInfo.label}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              {trustInfo.desc}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Frequency */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Frequency
          </h4>
          <div className="flex gap-1">
            {["1", "2", "3", "ai"].map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={`px-3 py-1.5 rounded text-xs border transition-all ${
                  frequency === f
                    ? "bg-primary text-white border-primary"
                    : "border-border hover:border-primary/50"
                }`}
              >
                {f === "ai" ? "AI decides" : `${f}/week`}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            AI recommends 2/week based on this contact&apos;s engagement pattern.
          </p>
        </CardContent>
      </Card>

      {/* Content Types */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Content Types
          </h4>
          <div className="space-y-2">
            {EMAIL_TYPES.map((type) => (
              <label
                key={type.key}
                className="flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="rounded" />
                  <span>{type.label}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  AI: recommended
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Notes to AI */}
      <Card>
        <CardContent className="p-4">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
            Notes to AI
          </h4>
          <p className="text-[10px] text-muted-foreground mb-2">
            Tell the AI something it can&apos;t learn from clicks. This context will be
            used in all future email generation for {contactName.split(" ")[0]}.
          </p>
          <textarea
            value={notes}
            onChange={(e) => { setNotes(e.target.value); setNotesSaved(false); }}
            placeholder="e.g., Has 2 kids, wants Kits Elementary catchment. Pre-approved $1.3M with TD. Lease ends July 31."
            className="w-full text-xs border border-border rounded p-2 bg-background min-h-[80px] resize-y"
          />
          <div className="flex items-center justify-between mt-2">
            <Button size="sm" variant="outline" className="text-xs" onClick={saveNotes}>
              Save notes
            </Button>
            {notesSaved && (
              <span className="text-xs text-emerald-600">Saved ✓</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardContent className="p-4">
          <h4 className="text-xs font-medium text-red-600 uppercase tracking-wide mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Danger Zone
          </h4>
          <div className="space-y-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs border-red-200 text-red-600 hover:bg-red-50"
              onClick={() => {
                if (confirm("Remove from all journeys? This stops all automated emails.")) {
                  updateJourney({ remove: true });
                }
              }}
            >
              <Square className="w-3 h-3 mr-1" /> Remove from all journeys
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
