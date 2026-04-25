"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JOURNEY_SCHEDULES } from "@/lib/constants/journey-schedules";
import { TEMPLATE_REGISTRY } from "@/lib/constants/template-registry";

export interface NurturedContact {
  journeyId: string;
  contactId: string;
  contactName: string;
  contactEmail: string | null;
  contactType: string;
  journeyType: string;
  phase: string;
  phaseEnteredAt: string | null;
  emailsSent: number;
  nextEmailAt: string | null;
  isPaused: boolean;
  sendMode: string;
  engagementScore: number | null;
}

const PHASE_ORDER = ["lead", "active", "under_contract", "past_client", "dormant"];

const PHASE_LABELS: Record<string, string> = {
  lead: "New Leads",
  active: "Active",
  under_contract: "Under Contract",
  past_client: "Past Clients",
  dormant: "Dormant",
};

const PHASE_ICONS: Record<string, string> = {
  lead: "🟢",
  active: "🔥",
  under_contract: "📝",
  past_client: "⭐",
  dormant: "❄️",
};

function getNextEmailType(journeyType: string, phase: string, emailsSent: number): string | null {
  const jType = journeyType as keyof typeof JOURNEY_SCHEDULES;
  const schedule = JOURNEY_SCHEDULES[jType]?.[phase as keyof (typeof JOURNEY_SCHEDULES)[typeof jType]] || [];
  if (emailsSent >= schedule.length) return null;
  return schedule[emailsSent].emailType;
}

function formatTimeInPhase(phaseEnteredAt: string | null): string {
  if (!phaseEnteredAt) return "";
  const days = Math.floor((Date.now() - new Date(phaseEnteredAt).getTime()) / 86400000);
  if (days === 0) return "today";
  if (days === 1) return "1 day";
  if (days < 7) return `${days} days`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week";
  return `${weeks} weeks`;
}

function formatNextSend(nextEmailAt: string | null): string {
  if (!nextEmailAt) return "—";
  const d = new Date(nextEmailAt);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs < 0) return "overdue";
  const hours = Math.floor(diffMs / 3600000);
  if (hours < 1) return "< 1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "tomorrow";
  return `${days} days`;
}

export function NurturePipelineCard({ contacts }: { contacts: NurturedContact[] }) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  // Group by phase
  const byPhase: Record<string, NurturedContact[]> = {};
  for (const c of contacts) {
    if (!byPhase[c.phase]) byPhase[c.phase] = [];
    byPhase[c.phase].push(c);
  }

  const totalContacts = contacts.length;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold">Contacts being nurtured</h4>
          <span className="text-xs text-muted-foreground">{totalContacts} total</span>
        </div>

        {totalContacts === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No contacts enrolled yet. Add a buyer or seller to get started.
          </p>
        ) : (
          <div className="space-y-1.5">
            {PHASE_ORDER.map((phase) => {
              const items = byPhase[phase] || [];
              if (items.length === 0) return null;
              const buyers = items.filter(c => c.journeyType === "buyer" || c.journeyType === "customer");
              const sellers = items.filter(c => c.journeyType === "seller");
              const isExpanded = expandedPhase === phase;

              return (
                <div key={phase} className="border border-border rounded-md overflow-hidden">
                  <button
                    onClick={() => setExpandedPhase(isExpanded ? null : phase)}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{PHASE_ICONS[phase]}</span>
                      <span className="text-xs font-medium">{PHASE_LABELS[phase]}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {items.length}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">
                        {buyers.length > 0 ? `${buyers.length} buyer` : ""}
                        {buyers.length > 0 && sellers.length > 0 ? " · " : ""}
                        {sellers.length > 0 ? `${sellers.length} seller` : ""}
                      </span>
                      <span className="text-muted-foreground text-[10px]">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-2.5 space-y-1">
                      {items.map((c) => {
                        const nextEmailType = getNextEmailType(c.journeyType, c.phase, c.emailsSent);
                        const templateEntry = nextEmailType ? TEMPLATE_REGISTRY[nextEmailType] : null;
                        const timeInPhase = formatTimeInPhase(c.phaseEnteredAt);
                        const nextSend = formatNextSend(c.nextEmailAt);
                        const score = c.engagementScore;

                        return (
                          <a
                            key={c.journeyId}
                            href={`/contacts/${c.contactId}`}
                            className="flex items-center gap-2.5 py-2 px-2 rounded-md hover:bg-muted/40 transition-colors group"
                          >
                            {/* Avatar */}
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
                                c.journeyType === "seller"
                                  ? "bg-gradient-to-br from-primary to-brand"
                                  : "bg-gradient-to-br from-primary to-purple-500"
                              }`}
                            >
                              {c.contactName.charAt(0).toUpperCase()}
                            </div>

                            {/* Name + details */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-medium truncate group-hover:text-primary transition-colors">
                                  {c.contactName}
                                </span>
                                <span className={`text-[9px] px-1 py-0.5 rounded font-bold shrink-0 ${
                                  c.journeyType === "seller"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}>
                                  {c.journeyType.toUpperCase()}
                                </span>
                                {score !== null && score > 0 && (
                                  <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                                    score >= 60 ? "bg-red-100 text-red-700" :
                                    score >= 30 ? "bg-amber-100 text-amber-700" :
                                    "bg-gray-100 text-gray-500"
                                  }`}>
                                    {score}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                {timeInPhase && <span>In phase {timeInPhase}</span>}
                                {c.emailsSent > 0 && <span>· {c.emailsSent} sent</span>}
                                {c.isPaused && <span className="text-amber-600 font-medium">· Paused</span>}
                              </div>
                            </div>

                            {/* Next email */}
                            <div className="text-right shrink-0">
                              {nextEmailType && templateEntry ? (
                                <>
                                  <span className="text-[10px] text-muted-foreground block">
                                    {templateEntry.icon} {templateEntry.displayName}
                                  </span>
                                  <span className={`text-[10px] block ${
                                    nextSend === "overdue" ? "text-red-600 font-medium" : "text-muted-foreground"
                                  }`}>
                                    {nextSend === "overdue" ? "Overdue" : `in ${nextSend}`}
                                  </span>
                                </>
                              ) : (
                                <span className="text-[10px] text-muted-foreground">Phase complete</span>
                              )}
                            </div>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
