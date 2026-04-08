"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown, ChevronRight, Mail, MailOpen, MousePointerClick,
  AlertTriangle, Eye, ExternalLink, TrendingUp, Clock,
} from "lucide-react";

type SentEmail = {
  id: string;
  subject: string;
  email_type: string;
  status: string;
  sent_at: string | null;
  contact_id: string;
  contacts: any;
  html_body?: string | null;
  events: { event_type: string; metadata?: any; created_at?: string }[];
};

type ContactGroup = {
  contactId: string;
  contactName: string;
  contactType: string;
  emails: SentEmail[];
  totalOpens: number;
  totalClicks: number;
  hasBounce: boolean;
  openRate: number;
  lastActivity: string | null;
};

function getContactInfo(nl: SentEmail) {
  const c = Array.isArray(nl.contacts) ? nl.contacts[0] : nl.contacts;
  return { name: c?.name || "Unknown", type: c?.type || "buyer" };
}

function getResponseTime(sentAt: string | null, events: SentEmail["events"]): string | null {
  if (!sentAt) return null;
  const firstOpen = events.find(e => e.event_type === "opened");
  if (!firstOpen?.created_at) return null;
  const diffMs = new Date(firstOpen.created_at).getTime() - new Date(sentAt).getTime();
  if (diffMs < 0) return null;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "<1 min";
  if (diffMin < 60) return `${diffMin} min`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.round(diffHr / 24)}d`;
}

export function SentByAIList({ newsletters }: { newsletters: SentEmail[] }) {
  const [expandedContact, setExpandedContact] = useState<string | null>(null);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // Group emails by contact
  const grouped = useMemo<ContactGroup[]>(() => {
    const map = new Map<string, SentEmail[]>();
    for (const nl of newsletters) {
      const key = nl.contact_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(nl);
    }

    return Array.from(map.entries()).map(([contactId, emails]) => {
      const info = getContactInfo(emails[0]);
      let totalOpens = 0;
      let totalClicks = 0;
      let hasBounce = false;
      let lastActivity: string | null = null;

      for (const email of emails) {
        for (const e of email.events || []) {
          if (e.event_type === "opened") totalOpens++;
          if (e.event_type === "clicked") totalClicks++;
          if (e.event_type === "bounced") hasBounce = true;
          if (e.created_at && (!lastActivity || e.created_at > lastActivity)) {
            lastActivity = e.created_at;
          }
        }
      }

      const emailsWithOpens = emails.filter(e => e.events?.some(ev => ev.event_type === "opened")).length;
      const openRate = emails.length > 0 ? Math.round((emailsWithOpens / emails.length) * 100) : 0;

      return {
        contactId,
        contactName: info.name,
        contactType: info.type,
        emails: emails.sort((a, b) => (b.sent_at || "").localeCompare(a.sent_at || "")),
        totalOpens,
        totalClicks,
        hasBounce,
        openRate,
        lastActivity,
      };
    }).sort((a, b) => {
      // Sort by most recent activity first, then by email count
      if (b.lastActivity && a.lastActivity) return b.lastActivity.localeCompare(a.lastActivity);
      return b.emails.length - a.emails.length;
    });
  }, [newsletters]);

  if (newsletters.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <h4 className="text-sm font-semibold mb-3">📨 Sent by AI</h4>
          <p className="text-xs text-muted-foreground text-center py-3">No emails sent yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold">📨 Sent by AI</h4>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px]">{grouped.length} contacts</Badge>
            <Badge variant="outline" className="text-[10px]">{newsletters.length} emails</Badge>
          </div>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">{newsletters.length}</div>
            <div className="text-[10px] text-muted-foreground">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-[#0F7694]">{grouped.reduce((a, g) => a + g.totalOpens, 0)}</div>
            <div className="text-[10px] text-muted-foreground">Opens</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-primary">{grouped.reduce((a, g) => a + g.totalClicks, 0)}</div>
            <div className="text-[10px] text-muted-foreground">Clicks</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-foreground">
              {newsletters.length > 0 ? Math.round((newsletters.filter(n => n.events?.some(e => e.event_type === "opened")).length / newsletters.length) * 100) : 0}%
            </div>
            <div className="text-[10px] text-muted-foreground">Open Rate</div>
          </div>
        </div>

        {/* Contact groups */}
        <div className="space-y-1">
          {grouped.map((group) => {
            const isExpanded = expandedContact === group.contactId;

            return (
              <div key={group.contactId} className={`rounded-lg transition-colors ${isExpanded ? "bg-muted/20 ring-1 ring-border" : ""}`}>
                {/* Contact row */}
                <button
                  onClick={() => setExpandedContact(isExpanded ? null : group.contactId)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                      group.contactType === "seller" ? "bg-[#0F7694]" : "bg-gradient-to-br from-primary to-[#1a1535]"
                    }`}>
                      {group.contactName[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate">{group.contactName}</p>
                        <Badge variant="outline" className="text-[10px] capitalize shrink-0">{group.contactType}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {group.emails.length} email{group.emails.length > 1 ? "s" : ""} sent
                        {group.lastActivity && <> · Last activity {new Date(group.lastActivity).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 ml-3">
                    {/* Engagement stats */}
                    <div className="flex items-center gap-2.5">
                      <div className="flex items-center gap-1" title="Opens">
                        <MailOpen className={`h-3.5 w-3.5 ${group.totalOpens > 0 ? "text-[#0F7694]" : "text-muted-foreground/40"}`} />
                        <span className={`text-xs font-medium ${group.totalOpens > 0 ? "text-[#0F7694]" : "text-muted-foreground"}`}>{group.totalOpens}</span>
                      </div>
                      <div className="flex items-center gap-1" title="Clicks">
                        <MousePointerClick className={`h-3.5 w-3.5 ${group.totalClicks > 0 ? "text-primary" : "text-muted-foreground/40"}`} />
                        <span className={`text-xs font-medium ${group.totalClicks > 0 ? "text-primary" : "text-muted-foreground"}`}>{group.totalClicks}</span>
                      </div>
                      {/* Open rate bar */}
                      <div className="hidden md:flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${group.openRate >= 70 ? "bg-[#0F7694]/50" : group.openRate >= 40 ? "bg-amber-500" : "bg-red-400"}`}
                            style={{ width: `${group.openRate}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground w-8">{group.openRate}%</span>
                      </div>
                    </div>
                    {group.hasBounce && <AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded: individual emails */}
                {isExpanded && (
                  <div className="px-3 pb-3 space-y-1">
                    {/* Contact action bar */}
                    <div className="flex items-center gap-2 px-3 py-2 mb-2">
                      <a
                        href={`/contacts/${group.contactId}`}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                      >
                        <Eye className="h-3 w-3" /> View Full Profile
                      </a>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
                        <TrendingUp className="h-3 w-3" />
                        Open rate: <span className={`font-medium ${group.openRate >= 70 ? "text-[#0F7694]" : group.openRate >= 40 ? "text-amber-600" : "text-red-500"}`}>{group.openRate}%</span>
                      </div>
                    </div>

                    {/* Individual emails */}
                    {group.emails.map((nl) => {
                      const opens = nl.events?.filter(e => e.event_type === "opened") || [];
                      const clicks = nl.events?.filter(e => e.event_type === "clicked") || [];
                      const bounces = nl.events?.filter(e => e.event_type === "bounced") || [];
                      const isEmailExpanded = expandedEmail === nl.id;

                      return (
                        <div key={nl.id} className={`rounded-md border ${isEmailExpanded ? "border-primary/30 bg-background" : "border-border/50 bg-background/50"}`}>
                          <button
                            onClick={() => setExpandedEmail(isEmailExpanded ? null : nl.id)}
                            className="w-full flex items-center justify-between p-2.5 text-left hover:bg-muted/20 rounded-md transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${
                                bounces.length > 0 ? "bg-red-500" :
                                clicks.length > 0 ? "bg-[#0F7694]" :
                                opens.length > 0 ? "bg-[#0F7694]/50" :
                                "bg-muted-foreground/30"
                              }`} />
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{nl.subject}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Badge variant="outline" className="text-[9px] capitalize px-1 py-0">{nl.email_type?.replace(/_/g, " ")}</Badge>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                    <Clock className="h-2.5 w-2.5" />
                                    {nl.sent_at ? new Date(nl.sent_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              {bounces.length > 0 ? (
                                <span className="text-[10px] text-red-500 font-medium">Bounced</span>
                              ) : (
                                <>
                                  {opens.length > 0 && <span className="text-[10px] text-[#0F7694] font-medium">✓ {opens.length > 1 ? `${opens.length}x` : "Opened"}</span>}
                                  {clicks.length > 0 && <span className="text-[10px] text-primary font-medium">{clicks.length} click{clicks.length > 1 ? "s" : ""}</span>}
                                  {opens.length === 0 && clicks.length === 0 && <span className="text-[10px] text-muted-foreground">No engagement</span>}
                                </>
                              )}
                              {isEmailExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                            </div>
                          </button>

                          {/* Email engagement detail */}
                          {isEmailExpanded && (
                            <div className="px-3 pb-3 pt-1 border-t border-border/50">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Engagement Timeline</p>
                              <div className="space-y-1.5 ml-1">
                                {/* Sent */}
                                <TimelineRow
                                  color="bg-[#0F7694]/50"
                                  icon={<Mail className="h-3 w-3 text-muted-foreground" />}
                                  label="Delivered"
                                  time={nl.sent_at}
                                />

                                {/* Opens */}
                                {opens.map((e, i) => (
                                  <TimelineRow
                                    key={"o" + i}
                                    color="bg-[#0F7694]"
                                    icon={<MailOpen className="h-3 w-3 text-[#0F7694]" />}
                                    label={`Opened${opens.length > 1 ? ` (${i + 1}/${opens.length})` : ""}`}
                                    time={e.created_at}
                                  />
                                ))}

                                {/* Clicks */}
                                {clicks.map((e, i) => (
                                  <TimelineRow
                                    key={"c" + i}
                                    color="bg-[#0F7694]/50"
                                    icon={<MousePointerClick className="h-3 w-3 text-primary" />}
                                    label="Clicked"
                                    detail={e.metadata?.link?.replace(/https?:\/\/(www\.)?/, "").slice(0, 50)}
                                    badge={e.metadata?.click_type?.replace(/_/g, " ")}
                                    time={e.created_at}
                                  />
                                ))}

                                {/* Bounces */}
                                {bounces.map((e, i) => (
                                  <TimelineRow
                                    key={"b" + i}
                                    color="bg-red-500"
                                    icon={<AlertTriangle className="h-3 w-3 text-red-500" />}
                                    label="Bounced"
                                    time={e.created_at}
                                    isError
                                  />
                                ))}

                                {nl.events.length === 0 && (
                                  <p className="text-xs text-muted-foreground ml-4">No engagement recorded yet.</p>
                                )}
                              </div>

                              {/* Response time + Preview button */}
                              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/50">
                                {(() => {
                                  const rt = getResponseTime(nl.sent_at, nl.events);
                                  return rt ? (
                                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-2.5 w-2.5" /> Opened in {rt}
                                    </span>
                                  ) : null;
                                })()}
                                {nl.html_body && (
                                  <button
                                    onClick={() => setPreviewHtml(nl.html_body!)}
                                    className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border hover:bg-muted font-medium ml-auto"
                                  >
                                    <ExternalLink className="h-2.5 w-2.5" /> Preview Email
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Email Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewHtml(null)}>
          <div className="bg-background rounded-xl shadow-2xl w-[90vw] max-w-[700px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h4 className="text-sm font-semibold">Email Preview</h4>
              <button onClick={() => setPreviewHtml(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">&times;</button>
            </div>
            <div className="flex-1 overflow-auto p-1">
              <iframe
                srcDoc={previewHtml}
                className="w-full border-0 rounded-b-xl"
                style={{ minHeight: "500px", height: "70vh" }}
                sandbox="allow-same-origin"
                title="Email preview"
              />
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

function TimelineRow({ color, icon, label, detail, badge, time, isError }: {
  color: string; icon: React.ReactNode; label: string;
  detail?: string; badge?: string; time?: string | null; isError?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className={`w-1.5 h-1.5 rounded-full ${color} shrink-0`} />
      <span className="shrink-0">{icon}</span>
      <span className={`font-medium ${isError ? "text-red-600" : ""}`}>{label}</span>
      {detail && <span className="text-[10px] text-muted-foreground truncate max-w-[180px]">{detail}</span>}
      {badge && <Badge variant="outline" className="text-[9px] px-1 py-0 capitalize">{badge}</Badge>}
      {time && (
        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
          {new Date(time).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </span>
      )}
    </div>
  );
}
