"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Eye, Mail, Ban, AlertTriangle } from "lucide-react";

type NewsletterEvent = {
  id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Newsletter = {
  id: string;
  subject: string;
  email_type: string;
  status: string;
  html_body: string | null;
  sent_at: string | null;
  created_at: string;
  quality_score: number | null;
  ai_context: Record<string, unknown> | null;
  events: NewsletterEvent[];
};

type Props = {
  newsletters: Newsletter[];
  filter?: "all" | "sent" | "suppressed";
};

const EMAIL_TYPE_LABELS: Record<string, string> = {
  welcome: "Welcome",
  listing_alert: "Listing Alert",
  market_update: "Market Update",
  just_sold: "Just Sold",
  open_house: "Open House",
  neighbourhood_guide: "Area Guide",
  home_anniversary: "Anniversary",
  new_listing_alert: "New Listing",
};

const STATUS_STYLES: Record<string, { label: string; class: string }> = {
  sent: { label: "Sent", class: "bg-brand-muted text-brand-dark" },
  draft: { label: "Pending", class: "bg-amber-100 text-amber-700" },
  failed: { label: "Failed", class: "bg-red-100 text-red-700" },
  suppressed: { label: "Held Back", class: "bg-gray-100 text-gray-600" },
};

export function EmailHistoryTimeline({ newsletters, filter = "all" }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const filtered = newsletters.filter((nl) => {
    if (filter === "sent") return nl.status === "sent";
    if (filter === "suppressed")
      return nl.status === "suppressed" || (nl.ai_context as Record<string, unknown>)?.blocked;
    return true;
  });

  if (filtered.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No emails {filter !== "all" ? `(${filter})` : ""} found for this contact.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {filtered.map((nl) => {
        const isExpanded = expandedId === nl.id;
        const isPreview = previewId === nl.id;
        const opens = nl.events.filter((e) => e.event_type === "opened");
        const clicks = nl.events.filter((e) => e.event_type === "clicked");
        const bounces = nl.events.filter((e) => e.event_type === "bounced");
        const statusInfo = STATUS_STYLES[nl.status] || STATUS_STYLES.sent;
        const aiCtx = nl.ai_context as Record<string, unknown> | null;
        const isSuppressed = nl.status === "suppressed" || aiCtx?.blocked === true;
        const date = nl.sent_at || nl.created_at;

        return (
          <Card
            key={nl.id}
            className={`transition-all ${isSuppressed ? "opacity-60 border-dashed" : ""}`}
          >
            <CardContent className="p-3">
              {/* Header row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {isSuppressed ? (
                    <Ban className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  ) : nl.status === "failed" ? (
                    <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  ) : (
                    <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{nl.subject}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">
                        {new Date(date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}{" "}
                        ·{" "}
                        {new Date(date).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {EMAIL_TYPE_LABELS[nl.email_type] || nl.email_type}
                      </Badge>
                      <Badge className={`text-[10px] px-1.5 py-0 ${statusInfo.class}`}>
                        {statusInfo.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  {nl.status === "sent" && (
                    <>
                      {opens.length > 0 && (
                        <span className="text-xs text-brand font-medium">
                          {opens.length} open{opens.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {clicks.length > 0 && (
                        <span className="text-xs text-brand-dark font-medium">
                          {clicks.length} click{clicks.length > 1 ? "s" : ""}
                        </span>
                      )}
                      {bounces.length > 0 && (
                        <span className="text-xs text-red-600 font-medium">
                          Bounced
                        </span>
                      )}
                    </>
                  )}
                  {nl.quality_score && (
                    <span className="text-xs text-muted-foreground">
                      Q:{nl.quality_score}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => setExpandedId(isExpanded ? null : nl.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Expanded: click details + suppression reason */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-border">
                  {/* Suppression reason */}
                  {isSuppressed && nl.ai_context && (
                    <div className="bg-muted/50 rounded p-2 mb-2 text-xs text-muted-foreground">
                      <strong>Held back:</strong>{" "}
                      {(() => {
                        const ctx = nl.ai_context as Record<string, unknown> | null;
                        const reasons = ctx?.block_reasons;
                        return Array.isArray(reasons) ? (reasons as string[]).join(", ") : "AI decided not to send this email";
                      })()}
                    </div>
                  )}

                  {/* Click details */}
                  {clicks.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {clicks.map((click) => {
                        const meta = click.metadata as Record<string, string> | null;
                        const link = meta?.link || meta?.url || "unknown link";
                        const isHot =
                          link.includes("showing") ||
                          link.includes("cma") ||
                          link.includes("book");
                        return (
                          <div
                            key={click.id}
                            className="flex items-center gap-2 text-xs"
                          >
                            <span className="text-brand">→</span>
                            <span className={isHot ? "text-red-600 font-medium" : "text-foreground"}>
                              Clicked: {link.replace(/https?:\/\/[^/]+/, "")}
                              {isHot && " 🔥"}
                            </span>
                            <span className="text-muted-foreground">
                              {new Date(click.created_at).toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Open timing */}
                  {opens.length > 0 && nl.sent_at && (
                    <div className="text-xs text-muted-foreground mb-2">
                      Opened{" "}
                      {Math.round(
                        (new Date(opens[0].created_at).getTime() -
                          new Date(nl.sent_at).getTime()) /
                          60000
                      )}{" "}
                      min after send
                    </div>
                  )}

                  {/* Preview button */}
                  {nl.html_body && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 text-xs"
                      onClick={() => setPreviewId(isPreview ? null : nl.id)}
                    >
                      <Eye className="w-3 h-3" />
                      {isPreview ? "Hide preview" : "Preview email"}
                    </Button>
                  )}

                  {/* Email preview iframe */}
                  {isPreview && nl.html_body && (
                    <div className="mt-2 rounded border border-border overflow-hidden">
                      <iframe
                        srcDoc={nl.html_body}
                        className="w-full h-[400px] bg-white"
                        sandbox="allow-same-origin"
                        title={`Preview: ${nl.subject}`}
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
