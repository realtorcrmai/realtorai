"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Phone, MessageSquare, Users, MapPin, X } from "lucide-react";

type RecentEmail = {
  id: string;
  subject: string;
  sent_at: string | null;
};

type Props = {
  contactId: string;
  contactName: string;
  recentEmails?: RecentEmail[];
  onLog?: (data: LogData) => void;
  onClose?: () => void;
  hideHeader?: boolean;
};

type LogData = {
  contactId: string;
  type: string;
  triggeredBy: string | null;
  notes: string;
  outcome: string;
};

const INTERACTION_TYPES = [
  { value: "call_inbound", label: "Inbound Call", icon: Phone },
  { value: "call_outbound", label: "Outbound Call", icon: Phone },
  { value: "text", label: "Text / SMS", icon: MessageSquare },
  { value: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { value: "visit", label: "Open House Visit", icon: MapPin },
  { value: "meeting", label: "In-Person Meeting", icon: Users },
  { value: "social_dm", label: "Social Media DM", icon: MessageSquare },
];

const OUTCOMES = [
  { value: "interested", label: "Interested" },
  { value: "not_ready", label: "Not Ready" },
  { value: "follow_up", label: "Follow Up Needed" },
  { value: "lost", label: "Lost / Not Interested" },
];

const SCORE_IMPACT: Record<string, number> = {
  call_inbound: 25,
  call_outbound: 20,
  text: 20,
  whatsapp: 20,
  visit: 15,
  meeting: 20,
  social_dm: 10,
};

export function QuickLogForm({
  contactId,
  contactName,
  recentEmails = [],
  onLog,
  onClose,
  hideHeader = false,
}: Props) {
  const [type, setType] = useState("call_inbound");
  const [triggeredBy, setTriggeredBy] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [outcome, setOutcome] = useState("interested");
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    setSaving(true);
    try {
      // Call server action or API to log the interaction
      const res = await fetch("/api/contacts/log-interaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          channel: type,
          triggeredByNewsletterId: triggeredBy,
          notes,
          outcome,
          scoreImpact: SCORE_IMPACT[type] || 15,
        }),
      });

      if (res.ok) {
        onLog?.({ contactId, type, triggeredBy, notes, outcome });
        onClose?.();
      }
    } catch {
      // Silently fail — toast would be better
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className={hideHeader ? "border-0 shadow-none" : "border-primary/20 shadow-lg"}>
      <CardContent className={hideHeader ? "p-0" : "p-4"}>
        {!hideHeader && (
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">
              Log Interaction — {contactName.split(" ")[0]}
            </h3>
            {onClose && (
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={onClose}>
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
        )}

        {/* Type */}
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Type
          </label>
          <div className="flex flex-wrap gap-1">
            {INTERACTION_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border transition-all ${
                  type === t.value
                    ? "bg-primary text-white border-primary"
                    : "bg-background border-border text-foreground hover:border-primary/50"
                }`}
              >
                <t.icon className="w-3 h-3" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Triggered by email */}
        {recentEmails.length > 0 && (
          <div className="mb-3">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              After receiving
            </label>
            <select
              value={triggeredBy || ""}
              onChange={(e) => setTriggeredBy(e.target.value || null)}
              className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background"
            >
              <option value="">None / Unknown</option>
              {recentEmails.map((email) => (
                <option key={email.id} value={email.id}>
                  {email.subject} (
                  {email.sent_at
                    ? new Date(email.sent_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })
                    : "draft"}
                  )
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Notes */}
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Quick note about the interaction..."
            className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background"
          />
        </div>

        {/* Outcome */}
        <div className="mb-3">
          <label className="text-xs font-medium text-muted-foreground mb-1 block">
            Result
          </label>
          <div className="flex gap-1">
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                onClick={() => setOutcome(o.value)}
                className={`px-2 py-1 rounded text-xs border transition-all ${
                  outcome === o.value
                    ? o.value === "interested"
                      ? "bg-brand/50 text-white border-emerald-500"
                      : o.value === "lost"
                      ? "bg-red-500 text-white border-red-500"
                      : "bg-primary text-white border-primary"
                    : "bg-background border-border text-foreground hover:border-primary/50"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Score impact */}
        <div className="text-[10px] text-muted-foreground mb-3">
          Engagement score: +{SCORE_IMPACT[type] || 15} points
        </div>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={saving}
          size="sm"
          className="w-full"
        >
          {saving ? "Saving..." : "Log Interaction"}
        </Button>
      </CardContent>
    </Card>
  );
}
