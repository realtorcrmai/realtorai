"use client";

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, Pause, Play, ArrowRight, Search } from "lucide-react";

type Journey = {
  id: string;
  contact_id: string;
  journey_type: string;
  current_phase: string;
  is_paused: boolean;
  next_email_at: string | null;
  send_mode: string;
  contacts: { name: string; type: string; email: string } | { name: string; type: string; email: string }[] | null;
};

const phaseIcons: Record<string, string> = {
  lead: "🟢", active: "🔥", under_contract: "📝",
  past_client: "⭐", dormant: "❄️",
};
const phaseLabels: Record<string, string> = {
  lead: "New Lead", active: "Active", under_contract: "Under Contract",
  past_client: "Past Client", dormant: "Dormant",
};
const phaseOrder = ["lead", "active", "under_contract", "past_client", "dormant"];

function getContact(j: Journey) {
  const c = j.contacts;
  if (!c) return { name: "Unknown", type: "", email: "" };
  if (Array.isArray(c)) return c[0] || { name: "Unknown", type: "", email: "" };
  return c;
}

export function JourneysTab({ journeys }: { journeys: Journey[] }) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterPhase, setFilterPhase] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return journeys
      .filter((j) => {
        if (search && !getContact(j).name?.toLowerCase().includes(search.toLowerCase())) return false;
        if (filterType !== "all" && j.journey_type !== filterType) return false;
        if (filterPhase !== "all" && j.current_phase !== filterPhase) return false;
        return true;
      })
      .sort((a, b) => {
        const aIdx = phaseOrder.indexOf(a.current_phase);
        const bIdx = phaseOrder.indexOf(b.current_phase);
        return aIdx - bIdx;
      });
  }, [journeys, search, filterType, filterPhase]);

  // Group by phase
  const grouped = useMemo(() => {
    const groups: Record<string, Journey[]> = {};
    for (const j of filtered) {
      const phase = j.current_phase;
      if (!groups[phase]) groups[phase] = [];
      groups[phase].push(j);
    }
    return groups;
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none"
        >
          <option value="all">All Types</option>
          <option value="buyer">Buyers</option>
          <option value="seller">Sellers</option>
        </select>
        <select
          value={filterPhase}
          onChange={(e) => setFilterPhase(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none"
        >
          <option value="all">All Phases</option>
          {phaseOrder.map((p) => (
            <option key={p} value={p}>{phaseIcons[p]} {phaseLabels[p]}</option>
          ))}
        </select>
        <Badge variant="secondary" className="text-xs">{filtered.length} contacts</Badge>
      </div>

      {/* Grouped by phase */}
      {filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">No contacts match your filters.</CardContent></Card>
      ) : (
        phaseOrder.filter((p) => grouped[p]?.length).map((phase) => (
          <div key={phase}>
            <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
              <span className="text-sm">{phaseIcons[phase]}</span>
              <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{phaseLabels[phase]}</h4>
              <Badge variant="outline" className="text-[10px]">{grouped[phase].length}</Badge>
            </div>
            <div className="space-y-2">
              {grouped[phase].map((j) => (
                <Card key={j.id} className={expandedId === j.id ? "ring-1 ring-primary/30" : ""}>
                  <CardContent className="p-0">
                    {/* Main row */}
                    <button
                      onClick={() => setExpandedId(expandedId === j.id ? null : j.id)}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                          j.journey_type === "buyer" ? "bg-gradient-to-br from-primary to-purple-500" : "bg-gradient-to-br from-primary to-orange-500"
                        }`}>
                          {(getContact(j).name || "?")[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{getContact(j).name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground">{j.journey_type} · {getContact(j).email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {j.is_paused && <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Paused</Badge>}
                        <Badge variant="secondary" className="text-[10px]">{j.send_mode}</Badge>
                        {j.next_email_at && (
                          <span className="text-[10px] text-muted-foreground hidden md:inline">
                            Next: {new Date(j.next_email_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        {expandedId === j.id ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </button>

                    {/* Expanded content */}
                    {expandedId === j.id && (
                      <div className="border-t border-border px-4 py-3 bg-muted/20 space-y-3">
                        {/* Journey info */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Phase:</span>
                            <span className="ml-1 font-medium">{phaseLabels[j.current_phase]}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type:</span>
                            <span className="ml-1 font-medium capitalize">{j.journey_type}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Mode:</span>
                            <span className="ml-1 font-medium capitalize">{j.send_mode}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Next email:</span>
                            <span className="ml-1 font-medium">
                              {j.next_email_at ? new Date(j.next_email_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric" }) : "None"}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors font-medium">
                            {j.is_paused ? <><Play className="h-3 w-3" /> Resume</> : <><Pause className="h-3 w-3" /> Pause</>}
                          </button>
                          <button className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-muted transition-colors font-medium">
                            <ArrowRight className="h-3 w-3" /> Advance Phase
                          </button>
                          <a
                            href={`/contacts/${j.contact_id}`}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium"
                          >
                            View Contact →
                          </a>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
