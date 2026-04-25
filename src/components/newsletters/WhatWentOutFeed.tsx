"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type FeedItem = {
  id: string;
  contact_id: string;
  contact_name: string;
  contact_type?: string;
  subject: string;
  email_type: string;
  source: "ai_nurture" | "workflow" | "editorial" | "ai_agent" | "greeting";
  sent_at: string;
  status: "sent" | "opened" | "clicked";
  html_body?: string | null;
  open_count?: number;
  click_count?: number;
};

const SOURCE_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  ai_nurture: { label: "AI Nurture", icon: "🤖", color: "bg-blue-50 text-blue-700 border-blue-200" },
  workflow: { label: "Workflow", icon: "⚙️", color: "bg-slate-50 text-slate-700 border-slate-200" },
  editorial: { label: "Campaign", icon: "📰", color: "bg-purple-50 text-purple-700 border-purple-200" },
  ai_agent: { label: "AI Autopilot", icon: "🧠", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  greeting: { label: "Greeting", icon: "🎂", color: "bg-amber-50 text-amber-700 border-amber-200" },
};

function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function WhatWentOutFeed({ items }: { items: FeedItem[] }) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No emails sent yet. Once the AI starts sending, they will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  // Default: show last 2 days only
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(0, 0, 0, 0);

  const recentItems = items.filter(item => item.sent_at && new Date(item.sent_at).getTime() >= twoDaysAgo.getTime());
  const visibleItems = showAll ? items : recentItems;
  const hiddenCount = items.length - recentItems.length;

  // Group by date
  const grouped: Record<string, FeedItem[]> = {};
  for (const item of visibleItems) {
    if (!item.sent_at) continue;
    const label = getDateLabel(item.sent_at);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(item);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">What went out</h4>
          <span className="text-[10px] text-muted-foreground">
            {showAll ? `${items.length} emails` : `Last 2 days · ${recentItems.length} email${recentItems.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="space-y-3">
          {Object.entries(grouped).map(([dateLabel, dateItems]) => (
            <div key={dateLabel}>
              <p className="text-[11px] font-semibold text-primary mb-1.5 pl-1">{dateLabel}</p>
              <div className="space-y-1">
                {dateItems.map((item) => {
                  const src = SOURCE_LABELS[item.source] || SOURCE_LABELS.ai_nurture;
                  const isExpanded = expandedId === item.id;
                  const isBuyer = item.contact_type === "buyer" || item.contact_type === "customer";

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-md hover:bg-muted/40 transition-colors text-left"
                      >
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                            isBuyer
                              ? "bg-gradient-to-br from-primary to-purple-500"
                              : "bg-gradient-to-br from-primary to-brand"
                          }`}
                        >
                          {item.contact_name.charAt(0).toUpperCase()}
                        </div>

                        {/* Name + subject */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">{item.contact_name}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${src.color}`}>
                              {src.label}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{item.subject}</p>
                        </div>

                        {/* Email type */}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {item.email_type.replace(/_/g, " ")}
                        </Badge>

                        {/* Stats */}
                        <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-muted-foreground">
                          {(item.open_count ?? 0) > 0 && <span title="Opens">👁 {item.open_count}</span>}
                          {(item.click_count ?? 0) > 0 && <span title="Clicks" className="text-green-600">🖱 {item.click_count}</span>}
                        </div>

                        {/* Status */}
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
                          item.status === "clicked" ? "bg-green-100 text-green-700" :
                          item.status === "opened" ? "bg-blue-100 text-blue-700" :
                          "bg-gray-100 text-gray-600"
                        }`}>
                          {item.status}
                        </span>

                        {/* Time */}
                        <span className="text-[10px] text-muted-foreground shrink-0 w-14 text-right">
                          {new Date(item.sent_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                        </span>

                        {/* Expand indicator */}
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </button>

                      {/* Expanded email preview */}
                      {isExpanded && item.html_body && (
                        <div className="ml-10 mr-2 mt-1 mb-2 border border-primary/20 rounded-lg overflow-hidden">
                          <div className="px-3 py-1.5 bg-muted/30 border-b border-border flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">Email Preview</span>
                            <a
                              href={`/contacts/${item.contact_id}`}
                              className="text-[10px] text-primary hover:underline"
                            >
                              View Contact →
                            </a>
                          </div>
                          <iframe
                            srcDoc={item.html_body}
                            className="w-full border-0 bg-white"
                            style={{ height: 420 }}
                            sandbox="allow-same-origin"
                            title={`Preview: ${item.subject}`}
                          />
                        </div>
                      )}
                      {isExpanded && !item.html_body && (
                        <div className="ml-10 mr-2 mt-1 mb-2 px-3 py-4 bg-muted/30 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">No preview available for this email.</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {visibleItems.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No emails sent in the last 2 days.</p>
        )}

        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 text-xs text-primary font-medium hover:underline"
          >
            {showAll ? "Show last 2 days only" : `Show all ${items.length} sent (${hiddenCount} older)`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
