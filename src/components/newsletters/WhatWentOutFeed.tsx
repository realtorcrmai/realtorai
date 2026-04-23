"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FeedItem = {
  id: string;
  contact_id: string;
  contact_name: string;
  subject: string;
  email_type: string;
  source: "ai_nurture" | "workflow" | "editorial" | "ai_agent" | "greeting";
  sent_at: string;
  status: "sent" | "opened" | "clicked";
};

const SOURCE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  ai_nurture: { label: "AI Nurture", icon: "🤖", color: "bg-blue-50 text-blue-700 border-blue-200" },
  workflow: { label: "Workflow", icon: "⚙️", color: "bg-slate-50 text-slate-700 border-slate-200" },
  editorial: { label: "Campaign", icon: "📰", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ai_agent: { label: "AI Autopilot", icon: "🧠", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  greeting: { label: "Greeting", icon: "🎂", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

function formatTimeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return "";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function WhatWentOutFeed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No emails sent yet. Once the AI starts sending, they will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <h4 className="text-sm font-semibold mb-3">What went out</h4>
        <div className="space-y-2">
          {items.map((item) => {
            const src = SOURCE_LABELS[item.source] || SOURCE_LABELS.ai_nurture;
            return (
              <div key={item.id} className="flex items-center gap-3 py-1.5 border-b border-border last:border-0">
                <span className="text-base shrink-0">{src.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium truncate">{item.contact_name}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${src.color}`}>
                      {src.label}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{item.subject}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-muted-foreground">{formatTimeAgo(item.sent_at)}</span>
                  {item.status === "opened" && <span className="block text-[10px] text-blue-600">opened</span>}
                  {item.status === "clicked" && <span className="block text-[10px] text-green-600">clicked</span>}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
