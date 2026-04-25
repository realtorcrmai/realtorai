"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ScheduledEmail {
  id: string;
  contactId: string;
  contactName: string;
  contactType: string;
  emailType: string;
  scheduledAt: string;
  phase?: string;
}

export function UpcomingSendsCard({
  items,
  templatePreviews,
}: {
  items: ScheduledEmail[];
  templatePreviews?: Record<string, string>;
}) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No upcoming sends. Enroll contacts in journeys to get started.</p>
        </CardContent>
      </Card>
    );
  }

  // Default: next 2 days
  const twoDaysOut = new Date();
  twoDaysOut.setDate(twoDaysOut.getDate() + 2);
  twoDaysOut.setHours(23, 59, 59, 999);

  const nearItems = items.filter(item => new Date(item.scheduledAt).getTime() <= twoDaysOut.getTime());
  const visibleItems = showAll ? items : nearItems;
  const hiddenCount = items.length - nearItems.length;

  // Group by date
  const grouped: Record<string, ScheduledEmail[]> = {};
  for (const item of visibleItems) {
    const d = new Date(item.scheduledAt);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    let label: string;
    if (d.toDateString() === now.toDateString()) label = "Today";
    else if (d.toDateString() === tomorrow.toDateString()) label = "Tomorrow";
    else label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(item);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Upcoming Sends</h4>
          <span className="text-[10px] text-muted-foreground">
            {showAll ? `${items.length} emails` : `Next 2 days · ${nearItems.length} email${nearItems.length !== 1 ? "s" : ""}`}
          </span>
        </div>

        <div className="space-y-3">
          {Object.entries(grouped).map(([dateLabel, dateItems]) => (
            <div key={dateLabel}>
              <p className="text-[11px] font-semibold text-primary mb-1.5 pl-1">{dateLabel}</p>
              <div className="space-y-1">
                {dateItems.map((item) => {
                  const previewHtml = templatePreviews?.[item.emailType];
                  const isExpanded = expandedId === item.id;
                  const isSeller = item.contactType === "seller";

                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : item.id)}
                        className="w-full flex items-center gap-2.5 py-2 px-2.5 rounded-md hover:bg-muted/40 transition-colors text-left"
                      >
                        {/* Time */}
                        <span className="text-[11px] font-semibold text-foreground w-14 shrink-0">
                          {new Date(item.scheduledAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
                        </span>

                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                            isSeller
                              ? "bg-gradient-to-br from-primary to-brand"
                              : "bg-gradient-to-br from-primary to-purple-500"
                          }`}
                        >
                          {item.contactName.charAt(0).toUpperCase()}
                        </div>

                        {/* Name */}
                        <span className="text-xs font-medium flex-1 truncate">
                          {item.contactName}
                        </span>

                        {/* Email type */}
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                          {item.emailType.replace(/_/g, " ")}
                        </Badge>

                        {/* Contact type */}
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                          isSeller
                            ? "bg-orange-100 text-orange-700"
                            : "bg-blue-100 text-blue-700"
                        }`}>
                          {item.contactType.toUpperCase()}
                        </span>

                        {/* Expand indicator */}
                        {previewHtml && (
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        )}
                      </button>

                      {/* Template preview */}
                      {isExpanded && previewHtml && (
                        <div className="ml-14 mr-2 mt-1 mb-2 border border-primary/20 rounded-lg overflow-hidden">
                          <div className="px-3 py-1.5 bg-muted/30 border-b border-border flex items-center justify-between">
                            <span className="text-[11px] font-medium text-muted-foreground">Template Preview</span>
                            <span className="text-[10px] text-muted-foreground italic">AI will personalize this for {item.contactName}</span>
                          </div>
                          <iframe
                            srcDoc={previewHtml}
                            className="w-full border-0 bg-white"
                            style={{ height: 420 }}
                            sandbox="allow-same-origin"
                            title={`Preview: ${item.emailType}`}
                          />
                        </div>
                      )}
                      {isExpanded && !previewHtml && (
                        <div className="ml-14 mr-2 mt-1 mb-2 px-3 py-4 bg-muted/30 rounded-lg text-center">
                          <p className="text-xs text-muted-foreground">No preview available for this email type.</p>
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
          <p className="text-xs text-muted-foreground text-center py-4">No emails scheduled in the next 2 days.</p>
        )}

        {hiddenCount > 0 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 text-xs text-primary font-medium hover:underline"
          >
            {showAll ? "Show next 2 days only" : `Show all ${items.length} scheduled (${hiddenCount} more)`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}
