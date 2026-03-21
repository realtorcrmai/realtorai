"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { acceptRecommendation, dismissRecommendation } from "@/actions/recommendations";

interface Recommendation {
  id: string;
  action_type: string;
  reasoning: string;
  priority: string;
  contacts: { id: string; name: string; email: string; phone: string; type: string; stage_bar: string | null } | null;
}

const priorityConfig: Record<string, { emoji: string; color: string; label: string }> = {
  hot: { emoji: "\uD83D\uDD25", color: "#dc2626", label: "Act Today" },
  warm: { emoji: "\u26A0\uFE0F", color: "#f59e0b", label: "This Week" },
  info: { emoji: "\uD83D\uDCA1", color: "#4f35d2", label: "FYI" },
};

const actionLabels: Record<string, string> = {
  call: "Call Now",
  send_email: "Send Email",
  send_sms: "Send SMS",
  advance_stage: "Advance Stage",
  create_task: "Create Task",
  add_tag: "Add Tag",
  reengage: "Re-engage",
  enroll_workflow: "Enroll in Workflow",
};

export default function AIRecommendations({ recommendations }: { recommendations: Recommendation[] }) {
  const [recs, setRecs] = useState(recommendations);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!recs.length) return null;

  const handleAccept = (id: string, actionType: string) => {
    startTransition(async () => {
      const result = await acceptRecommendation(id);
      setRecs(r => r.filter(rec => rec.id !== id));
      if (actionType === "send_email") {
        router.push("/newsletters/queue");
      } else {
        router.refresh();
      }
    });
  };

  const handleDismiss = (id: string) => {
    startTransition(async () => {
      await dismissRecommendation(id);
      setRecs(r => r.filter(rec => rec.id !== id));
    });
  };

  return (
    <div className="glass rounded-xl p-4 elevation-2">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">{"\uD83E\uDDE0"}</span>
          <h2 className="text-sm font-semibold text-foreground">AI Recommendations</h2>
          <span className="text-xs font-bold text-white bg-indigo-600 rounded-full px-2 py-0.5">
            {recs.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {recs.map(rec => {
          const config = priorityConfig[rec.priority] || priorityConfig.info;
          return (
            <div key={rec.id} className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border border-border/50">
              <span className="text-lg shrink-0 mt-0.5">{config.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-foreground">{rec.contacts?.name || "Unknown"}</span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: `${config.color}15`, color: config.color }}>
                    {config.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">{rec.reasoning}</p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => handleAccept(rec.id, rec.action_type)}
                    disabled={pending}
                    className="text-xs font-medium px-2.5 py-1 rounded-md text-white"
                    style={{ background: config.color }}
                  >
                    {actionLabels[rec.action_type] || rec.action_type}
                  </button>
                  <button
                    onClick={() => handleDismiss(rec.id)}
                    disabled={pending}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
