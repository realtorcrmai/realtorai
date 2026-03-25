"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Mail, MailOpen, MousePointerClick, AlertTriangle, Eye, ExternalLink } from "lucide-react";

type SentEmail = {
  id: string;
  subject: string;
  email_type: string;
  status: string;
  sent_at: string | null;
  contact_id: string;
  contacts: any;
  events: { event_type: string; metadata?: any; created_at?: string }[];
};

export function SentByAIList({ newsletters }: { newsletters: SentEmail[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (newsletters.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <h4 className="text-sm font-semibold mb-3">📨 Sent by AI</h4>
          <p className="text-xs text-muted-foreground text-center py-3">No emails sent yet. AI will start sending as contacts progress.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">📨 Sent by AI</h4>
          <Badge variant="secondary" className="text-xs">{newsletters.length} emails</Badge>
        </div>

        {newsletters.map((nl) => {
          const contactName = Array.isArray(nl.contacts) ? nl.contacts[0]?.name : nl.contacts?.name;
          const contactType = Array.isArray(nl.contacts) ? nl.contacts[0]?.type : nl.contacts?.type;
          const opens = nl.events?.filter(e => e.event_type === "opened") || [];
          const clicks = nl.events?.filter(e => e.event_type === "clicked") || [];
          const bounces = nl.events?.filter(e => e.event_type === "bounced") || [];
          const delivered = nl.events?.filter(e => e.event_type === "delivered") || [];
          const isExpanded = expandedId === nl.id;
          const totalOpens = opens.length;
          const totalClicks = clicks.length;
          const isBounced = bounces.length > 0;

          return (
            <div key={nl.id} className={`border-b border-border last:border-0 ${isExpanded ? "bg-muted/10" : ""}`}>
              {/* Summary row — clickable */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : nl.id)}
                className="w-full flex items-center justify-between py-3 text-left hover:bg-muted/20 transition-colors px-1 rounded"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                    contactType === "seller" ? "bg-gradient-to-br from-primary to-orange-500" : "bg-gradient-to-br from-primary to-purple-500"
                  }`}>
                    {(contactName || "?")[0]}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{contactName || "Unknown"}</p>
                      <Badge variant="outline" className="text-[10px] capitalize shrink-0">{nl.email_type?.replace(/_/g, " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{nl.subject}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {/* Quick engagement indicators */}
                  {isBounced ? (
                    <span className="text-[10px] text-red-500 font-medium flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> Bounced</span>
                  ) : (
                    <>
                      <span className={`text-[10px] font-medium flex items-center gap-0.5 ${totalOpens > 0 ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {totalOpens > 0 ? <MailOpen className="h-3 w-3" /> : <Mail className="h-3 w-3" />}
                        {totalOpens > 0 ? totalOpens : "—"}
                      </span>
                      <span className={`text-[10px] font-medium flex items-center gap-0.5 ${totalClicks > 0 ? "text-primary" : "text-muted-foreground"}`}>
                        <MousePointerClick className="h-3 w-3" />
                        {totalClicks > 0 ? totalClicks : "—"}
                      </span>
                    </>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {nl.sent_at ? new Date(nl.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                  </span>
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="pl-11 pr-2 pb-3 space-y-3">
                  {/* Engagement timeline */}
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Engagement Timeline</p>
                    {nl.events.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No engagement yet.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {/* Delivered */}
                        <div className="flex items-center gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <Mail className="h-3 w-3 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Delivered</span>
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {nl.sent_at ? new Date(nl.sent_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                          </span>
                        </div>

                        {/* Opens */}
                        {opens.map((e, i) => (
                          <div key={"o" + i} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                            <MailOpen className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="font-medium">Opened</span>
                            {i === 0 && totalOpens > 1 && <Badge variant="secondary" className="text-[9px] px-1 py-0">{totalOpens}x</Badge>}
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {e.created_at ? new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                        ))}

                        {/* Clicks */}
                        {clicks.map((e, i) => (
                          <div key={"c" + i} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                            <MousePointerClick className="h-3 w-3 text-primary shrink-0" />
                            <span className="font-medium">Clicked</span>
                            {e.metadata?.link && (
                              <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                                {e.metadata.link.replace(/https?:\/\/(www\.)?/, "").slice(0, 40)}
                              </span>
                            )}
                            {e.metadata?.click_type && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{e.metadata.click_type.replace(/_/g, " ")}</Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {e.created_at ? new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                        ))}

                        {/* Bounces */}
                        {bounces.map((e, i) => (
                          <div key={"b" + i} className="flex items-center gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                            <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />
                            <span className="font-medium text-red-600">Bounced</span>
                            <span className="text-[10px] text-muted-foreground ml-auto">
                              {e.created_at ? new Date(e.created_at).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <a
                      href={`/contacts/${nl.contact_id}`}
                      className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                    >
                      <Eye className="h-3 w-3" /> View Contact
                    </a>
                    <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted font-medium">
                      <ExternalLink className="h-3 w-3" /> Preview Email
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
