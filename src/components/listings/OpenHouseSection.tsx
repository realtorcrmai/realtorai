"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Home, Plus, Trash2, ChevronDown, ChevronUp, Users, Clock,
  UserPlus, Flame, ThermometerSun, Snowflake,
} from "lucide-react";
import type { OpenHouse, OpenHouseVisitor } from "@/types";
import { SEMANTIC_TOKENS } from "@/lib/constants/theme";

const TYPE_LABELS: Record<string, string> = { public: "Public", broker: "Broker", private: "Private" };
const STATUS_COLORS: Record<string, string> = {
  scheduled: SEMANTIC_TOKENS.info.badge,
  in_progress: SEMANTIC_TOKENS.warning.badge,
  completed: SEMANTIC_TOKENS.success.badge,
  cancelled: SEMANTIC_TOKENS.danger.badge,
};
const INTEREST_CONFIG: Record<string, { icon: typeof Flame; color: string }> = {
  hot: { icon: Flame, color: "text-red-500" },
  warm: { icon: ThermometerSun, color: "text-amber-500" },
  cold: { icon: Snowflake, color: "text-brand" },
};

interface OpenHouseSectionProps {
  listingId: string;
  openHouses: OpenHouse[];
}

export function OpenHouseSection({ listingId, openHouses: initial }: OpenHouseSectionProps) {
  const [openHouses, setOpenHouses] = useState(initial);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visitors, setVisitors] = useState<Record<string, OpenHouseVisitor[]>>({});
  const [showForm, setShowForm] = useState(false);
  const [showVisitorForm, setShowVisitorForm] = useState<string | null>(null);

  async function loadVisitors(ohId: string) {
    if (visitors[ohId]) return;
    const res = await fetch(`/api/listings/${listingId}/open-houses/visitors?open_house_id=${ohId}`);
    if (res.ok) {
      const data = await res.json();
      setVisitors((prev) => ({ ...prev, [ohId]: data }));
    }
  }

  async function toggleExpand(ohId: string) {
    if (expandedId === ohId) {
      setExpandedId(null);
    } else {
      setExpandedId(ohId);
      loadVisitors(ohId);
    }
  }

  async function addOpenHouse(fd: FormData) {
    const body = {
      date: fd.get("date"),
      start_time: fd.get("start_time"),
      end_time: fd.get("end_time"),
      type: fd.get("type"),
      notes: fd.get("notes") || undefined,
    };
    const res = await fetch(`/api/listings/${listingId}/open-houses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const oh = await res.json();
      setOpenHouses((prev) => [oh, ...prev]);
      setShowForm(false);
    }
  }

  async function updateStatus(ohId: string, status: string) {
    const res = await fetch(`/api/listings/${listingId}/open-houses`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ open_house_id: ohId, status }),
    });
    if (res.ok) {
      const updated = await res.json();
      setOpenHouses((prev) => prev.map((o) => (o.id === ohId ? updated : o)));
    }
  }

  async function removeOpenHouse(ohId: string) {
    const res = await fetch(`/api/listings/${listingId}/open-houses?open_house_id=${ohId}`, { method: "DELETE" });
    if (res.ok) setOpenHouses((prev) => prev.filter((o) => o.id !== ohId));
  }

  async function addVisitor(ohId: string, fd: FormData) {
    const body = {
      open_house_id: ohId,
      name: fd.get("name"),
      phone: fd.get("phone") || undefined,
      email: fd.get("email") || undefined,
      agent_name: fd.get("agent_name") || undefined,
      interest_level: fd.get("interest_level") || undefined,
      feedback: fd.get("feedback") || undefined,
      wants_followup: fd.get("wants_followup") === "on",
    };
    const res = await fetch(`/api/listings/${listingId}/open-houses/visitors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const v = await res.json();
      setVisitors((prev) => ({ ...prev, [ohId]: [...(prev[ohId] || []), v] }));
      setOpenHouses((prev) => prev.map((o) => o.id === ohId ? { ...o, visitor_count: o.visitor_count + 1 } : o));
      setShowVisitorForm(null);
    }
  }

  async function removeVisitor(ohId: string, vId: string) {
    const res = await fetch(`/api/listings/${listingId}/open-houses/visitors?visitor_id=${vId}`, { method: "DELETE" });
    if (res.ok) {
      setVisitors((prev) => ({ ...prev, [ohId]: (prev[ohId] || []).filter((v) => v.id !== vId) }));
      setOpenHouses((prev) => prev.map((o) => o.id === ohId ? { ...o, visitor_count: Math.max(0, o.visitor_count - 1) } : o));
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Home className="h-4 w-4" />
          Open Houses
          {openHouses.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{openHouses.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {openHouses.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground text-center py-4">No open houses scheduled yet.</p>
        ) : (
          <div className="space-y-3">
            {openHouses.map((oh) => {
              const isExpanded = expandedId === oh.id;
              const ohVisitors = visitors[oh.id] || [];
              return (
                <div key={oh.id} className="rounded-lg border border-border/40">
                  <button onClick={() => toggleExpand(oh.id)} className="flex items-center justify-between w-full p-3 text-left">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {new Date(oh.date + "T00:00:00").toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })}
                        </p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{TYPE_LABELS[oh.type]}</Badge>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 capitalize ${STATUS_COLORS[oh.status]}`}>{oh.status.replace("_", " ")}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{oh.start_time.slice(0, 5)} - {oh.end_time.slice(0, 5)}</span>
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{oh.visitor_count} visitors</span>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border/30 pt-3 space-y-3">
                      {oh.notes && <p className="text-sm text-muted-foreground">{oh.notes}</p>}

                      {/* Status controls */}
                      <div className="flex gap-2">
                        {oh.status === "scheduled" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(oh.id, "in_progress")}>Start</Button>
                        )}
                        {oh.status === "in_progress" && (
                          <Button size="sm" variant="outline" onClick={() => updateStatus(oh.id, "completed")}>Complete</Button>
                        )}
                        {oh.status !== "cancelled" && oh.status !== "completed" && (
                          <Button size="sm" variant="outline" className="text-destructive" onClick={() => updateStatus(oh.id, "cancelled")}>Cancel</Button>
                        )}
                        <Button size="sm" variant="outline" className="text-destructive ml-auto" onClick={() => removeOpenHouse(oh.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Visitors */}
                      <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Visitors ({ohVisitors.length})</h4>
                        {ohVisitors.length === 0 ? (
                          <p className="text-xs text-muted-foreground">No visitors registered.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {ohVisitors.map((v) => {
                              const interest = v.interest_level ? INTEREST_CONFIG[v.interest_level] : null;
                              return (
                                <div key={v.id} className="flex items-center justify-between p-2 rounded-md border border-border/30 group text-sm">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium">{v.name}</span>
                                      {interest && <interest.icon className={`h-3.5 w-3.5 ${interest.color}`} />}
                                      {v.wants_followup && <Badge variant="outline" className="text-[10px] px-1 py-0 bg-brand-muted text-brand-dark border-brand/20">Follow-up</Badge>}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      {v.phone && <span>{v.phone}</span>}
                                      {v.email && <span>{v.email}</span>}
                                      {v.agent_name && <span>Agent: {v.agent_name}</span>}
                                    </div>
                                    {v.feedback && <p className="text-xs text-muted-foreground mt-0.5">{v.feedback}</p>}
                                  </div>
                                  <button onClick={() => removeVisitor(oh.id, v.id)} className="p-1 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {showVisitorForm === oh.id ? (
                          <form className="mt-2 space-y-2 p-2 rounded-md border border-border/30 bg-muted/20" onSubmit={(e) => { e.preventDefault(); addVisitor(oh.id, new FormData(e.currentTarget)); }}>
                            <div className="grid grid-cols-3 gap-2">
                              <input name="name" required placeholder="Name *" className="rounded border border-input px-2 py-1 text-sm bg-background" />
                              <input name="phone" placeholder="Phone" className="rounded border border-input px-2 py-1 text-sm bg-background" />
                              <input name="email" placeholder="Email" className="rounded border border-input px-2 py-1 text-sm bg-background" />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <input name="agent_name" placeholder="Agent name" className="rounded border border-input px-2 py-1 text-sm bg-background" />
                              <select name="interest_level" className="rounded border border-input px-2 py-1 text-sm bg-background">
                                <option value="">Interest level</option>
                                <option value="hot">Hot</option>
                                <option value="warm">Warm</option>
                                <option value="cold">Cold</option>
                              </select>
                              <label className="flex items-center gap-1.5 text-sm">
                                <input name="wants_followup" type="checkbox" className="rounded" /> Follow-up
                              </label>
                            </div>
                            <input name="feedback" placeholder="Feedback" className="w-full rounded border border-input px-2 py-1 text-sm bg-background" />
                            <div className="flex justify-end gap-2">
                              <Button type="button" variant="ghost" size="sm" onClick={() => setShowVisitorForm(null)}>Cancel</Button>
                              <Button type="submit" size="sm">Add</Button>
                            </div>
                          </form>
                        ) : (
                          <button onClick={() => setShowVisitorForm(oh.id)} className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80">
                            <UserPlus className="h-3.5 w-3.5" /> Add Visitor
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

        {showForm ? (
          <form className="mt-3 space-y-2 p-3 rounded-lg border border-border/40 bg-muted/30" onSubmit={(e) => { e.preventDefault(); addOpenHouse(new FormData(e.currentTarget)); }}>
            <div className="grid grid-cols-3 gap-2">
              <div><label className="text-[10px] text-muted-foreground">Date</label><input name="date" type="date" required className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background" /></div>
              <div><label className="text-[10px] text-muted-foreground">Start</label><input name="start_time" type="time" required defaultValue="14:00" className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background" /></div>
              <div><label className="text-[10px] text-muted-foreground">End</label><input name="end_time" type="time" required defaultValue="16:00" className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background" /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select name="type" className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background">
                <option value="public">Public</option>
                <option value="broker">Broker Open</option>
                <option value="private">Private</option>
              </select>
              <input name="notes" placeholder="Notes (optional)" className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" size="sm">Schedule</Button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)} className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
            <Plus className="h-4 w-4" /> Schedule Open House
          </button>
        )}
      </CardContent>
    </Card>
  );
}
