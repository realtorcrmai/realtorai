"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Phone, Eye } from "lucide-react";

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  type: string;
  newsletter_intelligence: any;
};

type Props = {
  title: string;
  type: string;
  phaseCounts: Record<string, number>;
  contactsByPhase: Record<string, Contact[]>;
};

const phases = ["lead", "active", "under_contract", "past_client", "dormant"];
const phaseLabels: Record<string, string> = {
  lead: "New Leads", active: "Active", under_contract: "Under Contract",
  past_client: "Past Clients", dormant: "Dormant",
};
const phaseIcons: Record<string, string> = {
  lead: "🟢", active: "🔥", under_contract: "📝",
  past_client: "⭐", dormant: "❄️",
};

export function PipelineCard({ title, type, phaseCounts, contactsByPhase }: Props) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  return (
    <Card>
      <CardContent className="p-5">
        <h3 className="text-base font-semibold mb-4">{title}</h3>
        {phases.map((p) => {
          const count = phaseCounts[p] || 0;
          const isExpanded = expandedPhase === p;
          const contacts = contactsByPhase[p] || [];

          return (
            <div key={p}>
              <button
                onClick={() => {
                  if (count > 0) setExpandedPhase(isExpanded ? null : p);
                }}
                className={`w-full flex items-center justify-between py-2.5 border-b border-border last:border-0 text-left transition-colors ${
                  count > 0 ? "hover:bg-muted/30 cursor-pointer" : "cursor-default"
                } ${isExpanded ? "bg-muted/20" : ""}`}
              >
                <span className="text-sm flex items-center gap-1.5">
                  {phaseIcons[p]} {phaseLabels[p]}
                  {count > 0 && (
                    isExpanded
                      ? <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
                      : <ChevronRight className="h-3 w-3 text-muted-foreground ml-1" />
                  )}
                </span>
                <span className={`text-sm font-semibold ${count > 0 ? "text-primary" : "text-muted-foreground"}`}>
                  {count}
                </span>
              </button>

              {/* Expanded contact list */}
              {isExpanded && contacts.length > 0 && (
                <div className="bg-muted/10 border-b border-border">
                  {contacts.map((c) => {
                    const score = c.newsletter_intelligence?.engagement_score;
                    return (
                      <div key={c.id} className="flex items-center justify-between px-4 py-2 border-b border-border/50 last:border-0">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 ${
                            type === "buyer" ? "bg-gradient-to-br from-primary to-[#1a1535]" : "bg-brand"
                          }`}>
                            {(c.name || "?")[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{c.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {c.email || c.phone || "No contact info"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {typeof score === "number" && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-1.5 ${
                                score >= 60 ? "text-red-600 border-red-200" :
                                score >= 40 ? "text-amber-600 border-amber-200" :
                                "text-muted-foreground"
                              }`}
                            >
                              {score}
                            </Badge>
                          )}
                          {c.phone && (
                            <a href={`tel:${c.phone}`} className="p-1 rounded hover:bg-muted" title="Call">
                              <Phone className="h-3 w-3 text-brand" />
                            </a>
                          )}
                          <a href={`/contacts/${c.id}`} className="p-1 rounded hover:bg-muted" title="View">
                            <Eye className="h-3 w-3 text-primary" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
