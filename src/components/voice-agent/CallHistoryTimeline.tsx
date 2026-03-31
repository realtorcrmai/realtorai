"use client";

import { useEffect, useState } from "react";
import type { VoiceCall } from "@/types/voice-agent";

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function CallHistoryTimeline({ contactId }: { contactId: string }) {
  const [calls, setCalls] = useState<VoiceCall[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/voice-agent/calls?contact_id=${contactId}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_VOICE_AGENT_API_KEY || ""}`,
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setCalls(data.calls ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [contactId]);

  if (loading) {
    return <div className="text-sm text-[var(--lf-muted)] py-2">Loading voice calls...</div>;
  }

  if (calls.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-[var(--lf-muted)] uppercase tracking-wider">
        📞 Voice Calls
      </h4>
      {calls.map((call) => (
        <div key={call.id} className="lf-card p-3">
          <button
            onClick={() => setExpanded(expanded === call.id ? null : call.id)}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>📞</span>
                <span className="text-sm font-medium">
                  {call.summary?.slice(0, 80) || "Voice call"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--lf-muted)]">
                <span>{formatDuration(call.duration_seconds)}</span>
                <span>
                  {new Date(call.started_at).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
            {call.compliance_flagged && (
              <span className="lf-badge lf-badge-blocked text-xs mt-1">FINTRAC Flagged</span>
            )}
          </button>

          {expanded === call.id && (
            <div className="mt-3 pt-3 border-t border-[var(--lf-border)] space-y-2">
              {call.transcript && (
                <div>
                  <div className="text-xs font-semibold text-[var(--lf-muted)] mb-1">Transcript</div>
                  <div className="text-sm whitespace-pre-wrap max-h-40 overflow-y-auto">
                    {call.transcript}
                  </div>
                </div>
              )}
              <div className="flex gap-4 text-xs text-[var(--lf-muted)]">
                <span>Provider: {call.llm_provider ?? "N/A"}</span>
                <span>Cost: ${call.cost_usd?.toFixed(4) ?? "0"}</span>
                <span>Tokens: {(call.total_input_tokens ?? 0) + (call.total_output_tokens ?? 0)}</span>
              </div>
              {call.tool_calls_used && Array.isArray(call.tool_calls_used) && (call.tool_calls_used as string[]).length > 0 && (
                <div className="text-xs text-[var(--lf-muted)]">
                  Tools: {(call.tool_calls_used as string[]).join(", ")}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
