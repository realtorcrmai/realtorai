"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown, ChevronRight, ShieldOff, Eye, Phone,
  Clock, AlertTriangle, Ban, Timer, Moon, TrendingDown,
} from "lucide-react";

type SuppressedEmail = {
  id: string;
  subject: string;
  email_type: string;
  contact_id: string;
  created_at: string;
  ai_context: {
    suppression_reason?: string;
    suppressed_at?: string;
    journey_phase?: string;
    contact_type?: string;
    adjustments?: string[];
    suggested_delay_hours?: number | null;
  } | null;
  contacts: any;
};

function getContact(e: SuppressedEmail) {
  const c = Array.isArray(e.contacts) ? e.contacts[0] : e.contacts;
  return c || { name: "Unknown", type: "buyer", email: null, phone: null };
}

function getReasonIcon(reason: string) {
  const r = reason.toLowerCase();
  if (r.includes("frequency") || r.includes("cap")) return <Timer className="h-4 w-4 text-amber-500" />;
  if (r.includes("sunset") || r.includes("paused")) return <Ban className="h-4 w-4 text-red-500" />;
  if (r.includes("declining") || r.includes("inactive")) return <TrendingDown className="h-4 w-4 text-[#0F7694]" />;
  if (r.includes("weekend")) return <Moon className="h-4 w-4 text-[#0F7694]" />;
  return <ShieldOff className="h-4 w-4 text-muted-foreground" />;
}

function getReasonCategory(reason: string) {
  const r = reason.toLowerCase();
  if (r.includes("frequency") || r.includes("cap")) return "Frequency Cap";
  if (r.includes("sunset")) return "Auto-Sunset";
  if (r.includes("declining")) return "Low Engagement";
  if (r.includes("inactive")) return "Inactive Contact";
  if (r.includes("weekend")) return "Quiet Hours";
  return "Other";
}

export function HeldBackList({ emails }: { emails: SuppressedEmail[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (emails.length === 0) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">🤚 Held Back by AI</h4>
            <Badge variant="secondary" className="text-xs">0 suppressed</Badge>
          </div>
          <p className="text-xs text-muted-foreground text-center py-3">No suppressed emails. AI sent everything it planned.</p>
        </CardContent>
      </Card>
    );
  }

  // Group by reason category
  const categories: Record<string, number> = {};
  for (const e of emails) {
    const cat = getReasonCategory(e.ai_context?.suppression_reason || "");
    categories[cat] = (categories[cat] || 0) + 1;
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold">🤚 Held Back by AI</h4>
          <Badge variant="secondary" className="text-xs">{emails.length} suppressed</Badge>
        </div>

        {/* Category summary */}
        <div className="flex gap-2 flex-wrap mb-4">
          {Object.entries(categories).map(([cat, count]) => (
            <div key={cat} className="flex items-center gap-1.5 px-2.5 py-1 bg-muted/50 rounded-md text-xs">
              {getReasonIcon(cat)}
              <span className="text-muted-foreground">{cat}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>

        {/* Individual suppressed emails */}
        <div className="space-y-1">
          {emails.map((e) => {
            const contact = getContact(e);
            const isExpanded = expandedId === e.id;
            const reason = e.ai_context?.suppression_reason || "Unknown reason";
            const category = getReasonCategory(reason);
            const suppressedAt = e.ai_context?.suppressed_at || e.created_at;

            return (
              <div key={e.id} className={`rounded-lg transition-colors ${isExpanded ? "bg-muted/20 ring-1 ring-border" : ""}`}>
                {/* Summary row */}
                <button
                  onClick={() => setExpandedId(isExpanded ? null : e.id)}
                  className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getReasonIcon(reason)}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                      contact.type === "seller" ? "bg-gradient-to-br from-gray-400 to-gray-500" : "bg-gradient-to-br from-gray-400 to-gray-500"
                    }`}>
                      {(contact.name || "?")[0]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{category}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <Badge variant="outline" className="text-[10px] capitalize">{e.email_type?.replace(/_/g, " ")}</Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(suppressedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                </button>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Reason card */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-800">Why it was held back</span>
                      </div>
                      <p className="text-xs text-amber-700 leading-relaxed">{reason}</p>
                    </div>

                    {/* Details grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-muted-foreground">Contact</span>
                        <p className="font-medium">{contact.name}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Type</span>
                        <p className="font-medium capitalize">{contact.type}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Email Type</span>
                        <p className="font-medium capitalize">{e.email_type?.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Would Have Sent</span>
                        <p className="font-medium">{e.subject}</p>
                      </div>
                    </div>

                    {/* Phase + adjustments */}
                    {(e.ai_context?.journey_phase || e.ai_context?.adjustments?.length) && (
                      <div className="text-xs space-y-1">
                        {e.ai_context?.journey_phase && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Journey phase:</span>
                            <Badge variant="outline" className="text-[10px] capitalize">{e.ai_context.journey_phase.replace(/_/g, " ")}</Badge>
                          </div>
                        )}
                        {e.ai_context?.suggested_delay_hours && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">Suggested retry in {e.ai_context.suggested_delay_hours} hours</span>
                          </div>
                        )}
                        {e.ai_context?.adjustments?.map((adj, i) => (
                          <div key={i} className="flex items-center gap-1">
                            <span className="text-muted-foreground">•</span>
                            <span className="text-muted-foreground">{adj}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <a
                        href={`/contacts/${e.contact_id}`}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 font-medium"
                      >
                        <Eye className="h-3 w-3" /> View Contact
                      </a>
                      {contact.phone && (
                        <a
                          href={`tel:${contact.phone}`}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-[#0F7694]/5 text-[#0A6880] hover:bg-[#0F7694]/10 font-medium"
                        >
                          <Phone className="h-3 w-3" /> Call
                        </a>
                      )}
                      <span className="text-[10px] text-muted-foreground ml-auto">
                        Suppressed {new Date(suppressedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
