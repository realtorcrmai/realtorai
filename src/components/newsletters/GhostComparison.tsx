"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GhostDraft {
  id: string;
  contact_id: string;
  email_type: string;
  subject: string;
  reasoning: string;
  created_at: string;
  contact?: { name: string; type: string };
}

interface GhostComparison {
  ghost: GhostDraft;
  actual: { subject: string; sent_at: string; opened: boolean; clicked: boolean } | null;
  match: boolean;
}

/**
 * GhostComparison — shows what the AI would have sent (ghost mode)
 * compared to what was actually sent. Helps evaluate AI accuracy
 * before promoting trust level.
 */
export function GhostComparisonPanel() {
  const [comparisons, setComparisons] = useState<GhostComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  useEffect(() => {
    loadComparisons();
  }, [days]);

  async function loadComparisons() {
    setLoading(true);
    try {
      const res = await fetch(`/api/rag/knowledge?_ghost_comparisons=${days}`);
      // Fallback: use agent-decisions action if available
      // For now, load ghost_drafts directly
      const ghostRes = await fetch(`/api/rag/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: "ghost drafts comparison",
          filters: { content_type: ["email"] },
          top_k: 0,
        }),
      });
      // Simple stub — in production this calls getGhostComparisons() server action
      setComparisons([]);
    } catch {
      setComparisons([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">👻</span>
            <div>
              <h3 className="text-sm font-bold">Ghost Mode Comparison</h3>
              <p className="text-xs text-muted-foreground">
                What the AI would have sent vs what was actually sent
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {[7, 14, 30].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  days === d
                    ? "bg-brand text-white"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <p className="text-xs text-muted-foreground">Loading comparisons...</p>
          </div>
        ) : comparisons.length === 0 ? (
          <div className="text-center py-8 bg-muted/30 rounded-lg">
            <p className="text-sm text-muted-foreground">No ghost drafts yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Ghost mode stores invisible drafts. Promote to Copilot to start AI-assisted sending.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-brand-muted rounded-lg p-2.5 border border-brand/20">
                <p className="text-lg font-bold text-brand-dark">
                  {comparisons.filter((c) => c.match).length}
                </p>
                <p className="text-[10px] text-brand">AI Matched</p>
              </div>
              <div className="bg-amber-50 rounded-lg p-2.5 border border-amber-200">
                <p className="text-lg font-bold text-amber-700">
                  {comparisons.filter((c) => !c.match && c.actual).length}
                </p>
                <p className="text-[10px] text-amber-600">Different</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2.5 border">
                <p className="text-lg font-bold text-gray-700">
                  {comparisons.filter((c) => !c.actual).length}
                </p>
                <p className="text-[10px] text-gray-600">No Send</p>
              </div>
            </div>

            {/* Comparison list */}
            {comparisons.map((comp) => (
              <div key={comp.ghost.id} className="bg-muted/20 rounded-lg p-3 border space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold">
                      {comp.ghost.contact?.name || "Contact"}
                    </span>
                    <Badge variant="secondary" className="text-[10px]">
                      {comp.ghost.email_type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  {comp.match ? (
                    <Badge className="bg-brand-muted text-brand-dark text-[10px]">Match</Badge>
                  ) : comp.actual ? (
                    <Badge className="bg-amber-100 text-amber-700 text-[10px]">Different</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">No Send</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-brand-muted rounded p-2">
                    <p className="text-[10px] text-brand font-medium mb-0.5">AI Would Send:</p>
                    <p className="text-gray-700 truncate">{comp.ghost.subject}</p>
                  </div>
                  <div className="bg-brand-muted rounded p-2">
                    <p className="text-[10px] text-brand-dark font-medium mb-0.5">Actually Sent:</p>
                    <p className="text-gray-700 truncate">
                      {comp.actual?.subject || "Nothing sent"}
                    </p>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">{comp.ghost.reasoning}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
