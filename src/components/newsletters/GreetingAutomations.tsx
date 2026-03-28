"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, ChevronDown, ChevronRight, Sparkles } from "lucide-react";
import { saveGreetingRules, type GreetingRule } from "@/actions/config";

const OCCASIONS = [
  // Personal milestones
  { id: "birthday", icon: "🎂", name: "Birthday", desc: "Personal birthday greeting with warm wishes", category: "personal", timing: "On their birthday", defaultRecipients: "with_date" },
  { id: "home_anniversary", icon: "🏠", name: "Home Anniversary", desc: "Annual home purchase celebration with value update", category: "personal", timing: "On closing anniversary", defaultRecipients: "with_date" },
  // Major holidays
  { id: "christmas", icon: "🎄", name: "Christmas", desc: "Warm holiday season greetings", category: "holiday", timing: "December 24", defaultRecipients: "all_contacts" },
  { id: "new_year", icon: "🎆", name: "New Year", desc: "New year wishes with market outlook", category: "holiday", timing: "December 31", defaultRecipients: "all_contacts" },
  { id: "diwali", icon: "🪔", name: "Diwali", desc: "Festival of lights celebration", category: "holiday", timing: "Varies (Oct/Nov)", defaultRecipients: "all_contacts" },
  { id: "lunar_new_year", icon: "🧧", name: "Lunar New Year", desc: "Chinese/Vietnamese New Year wishes", category: "holiday", timing: "Varies (Jan/Feb)", defaultRecipients: "all_contacts" },
  // Canadian holidays
  { id: "canada_day", icon: "🍁", name: "Canada Day", desc: "National pride and community celebration", category: "holiday", timing: "July 1", defaultRecipients: "all_contacts" },
  { id: "thanksgiving", icon: "🦃", name: "Thanksgiving", desc: "Gratitude message to your network", category: "holiday", timing: "2nd Mon Oct", defaultRecipients: "all_contacts" },
  // Personal occasions
  { id: "valentines", icon: "💝", name: "Valentine's Day", desc: "'Love your home' themed message", category: "personal", timing: "February 14", defaultRecipients: "all_contacts" },
  { id: "mothers_day", icon: "💐", name: "Mother's Day", desc: "Warm wishes to moms in your network", category: "personal", timing: "2nd Sun May", defaultRecipients: "all_contacts" },
  { id: "fathers_day", icon: "👔", name: "Father's Day", desc: "Warm wishes to dads in your network", category: "personal", timing: "3rd Sun Jun", defaultRecipients: "all_contacts" },
];

const RECIPIENT_OPTIONS = [
  { id: "all_contacts", name: "All contacts" },
  { id: "all_buyers", name: "Buyers only" },
  { id: "all_sellers", name: "Sellers only" },
  { id: "past_clients", name: "Past clients" },
  { id: "active_clients", name: "Active clients" },
  { id: "with_date", name: "Contacts with date on file" },
];

function createGreeting(id: string): GreetingRule {
  const occasion = OCCASIONS.find(o => o.id === id);
  return {
    id: crypto.randomUUID(),
    occasion: id,
    recipients: occasion?.defaultRecipients || "all_contacts",
    approval: "auto",
    personalNote: "",
    enabled: true,
  };
}

export function GreetingAutomations({ initialRules }: { initialRules?: GreetingRule[] }) {
  const rulesMap = new Map((initialRules || []).map(r => [r.occasion, r]));
  const [rules, setRules] = useState<Map<string, GreetingRule>>(rulesMap);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  function persist(newMap: Map<string, GreetingRule>) {
    setRules(newMap);
    setSaveStatus("saving");
    startTransition(async () => {
      await saveGreetingRules(Array.from(newMap.values()));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    });
  }

  function toggleOccasion(occasionId: string) {
    const newMap = new Map(rules);
    if (newMap.has(occasionId)) {
      const existing = newMap.get(occasionId)!;
      newMap.set(occasionId, { ...existing, enabled: !existing.enabled });
    } else {
      newMap.set(occasionId, createGreeting(occasionId));
    }
    persist(newMap);
  }

  function updateRule(occasionId: string, updates: Partial<GreetingRule>) {
    const newMap = new Map(rules);
    const existing = newMap.get(occasionId);
    if (existing) {
      newMap.set(occasionId, { ...existing, ...updates });
      persist(newMap);
    }
  }

  function enableAll() {
    const newMap = new Map(rules);
    for (const o of OCCASIONS) {
      if (!newMap.has(o.id)) {
        newMap.set(o.id, createGreeting(o.id));
      } else {
        const existing = newMap.get(o.id)!;
        newMap.set(o.id, { ...existing, enabled: true });
      }
    }
    persist(newMap);
  }

  const activeCount = Array.from(rules.values()).filter(r => r.enabled).length;
  const personalOccasions = OCCASIONS.filter(o => o.category === "personal");
  const holidayOccasions = OCCASIONS.filter(o => o.category === "holiday");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
            <Gift className="h-4.5 w-4.5 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Greeting Automations</h3>
            <p className="text-xs text-muted-foreground">
              {activeCount > 0
                ? `${activeCount} of ${OCCASIONS.length} active`
                : "AI writes personalized wishes for each contact"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && <span className="text-[10px] text-muted-foreground animate-pulse">Saving...</span>}
          {saveStatus === "saved" && <span className="text-[10px] text-emerald-600 font-medium">Saved</span>}
          {activeCount < OCCASIONS.length && (
            <button
              onClick={enableAll}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-primary/30 text-primary font-medium hover:bg-primary/5 transition-colors"
            >
              <Sparkles className="h-3 w-3" /> Enable All
            </button>
          )}
        </div>
      </div>

      {/* AI personalization note */}
      <div className="flex items-start gap-2.5 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-xl">
        <Sparkles className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
        <p className="text-[11px] text-purple-800 leading-relaxed">
          <strong>AI writes every greeting uniquely.</strong> Each contact gets a personalized message based on their name, relationship history, property details, and the occasion. No two emails are the same.
        </p>
      </div>

      {/* Personal Milestones */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Personal Milestones</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {personalOccasions.map(occasion => {
            const rule = rules.get(occasion.id);
            const isEnabled = rule?.enabled ?? false;
            const isExpanded = expandedId === occasion.id;

            return (
              <Card key={occasion.id} className={`transition-all ${isEnabled ? "border-primary/20 bg-primary/[0.02]" : ""}`}>
                <CardContent className="p-0">
                  {/* Main row */}
                  <div className="flex items-center gap-3 p-3">
                    <span className="text-2xl">{occasion.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold">{occasion.name}</p>
                        {isEnabled && <Badge className="bg-emerald-100 text-emerald-700 text-[9px] px-1.5 py-0">Active</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground">{occasion.desc}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{occasion.timing}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isEnabled && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : occasion.id)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                        </button>
                      )}
                      <button
                        onClick={() => toggleOccasion(occasion.id)}
                        className={`relative w-10 h-5.5 rounded-full transition-colors ${isEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
                      >
                        <span className={`absolute top-[2px] w-4.5 h-4.5 rounded-full bg-white shadow transition-transform ${isEnabled ? "left-[19px]" : "left-[2px]"}`} style={{ width: 18, height: 18 }} />
                      </button>
                    </div>
                  </div>

                  {/* Settings (expanded) */}
                  {isExpanded && isEnabled && (
                    <div className="border-t border-border px-3 py-3 bg-muted/30 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Send To</label>
                          <select
                            value={rule?.recipients || occasion.defaultRecipients}
                            onChange={e => updateRule(occasion.id, { recipients: e.target.value })}
                            className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background mt-1"
                          >
                            {RECIPIENT_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Approval</label>
                          <div className="flex bg-muted rounded-md p-0.5 mt-1">
                            <button
                              onClick={() => updateRule(occasion.id, { approval: "review" })}
                              className={`flex-1 text-[10px] px-2 py-1 rounded font-medium ${rule?.approval === "review" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                            >Review</button>
                            <button
                              onClick={() => updateRule(occasion.id, { approval: "auto" })}
                              className={`flex-1 text-[10px] px-2 py-1 rounded font-medium ${rule?.approval !== "review" ? "bg-background shadow text-foreground" : "text-muted-foreground"}`}
                            >Auto</button>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">AI Hint (optional)</label>
                        <input
                          type="text"
                          value={rule?.personalNote || ""}
                          onChange={e => updateRule(occasion.id, { personalNote: e.target.value })}
                          placeholder="e.g., Mention their neighbourhood, keep it short..."
                          className="w-full text-xs border border-border rounded-md px-2 py-1.5 bg-background mt-1"
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Holidays & Celebrations */}
      <div>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Holidays & Celebrations</h4>
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {holidayOccasions.map(occasion => {
              const rule = rules.get(occasion.id);
              const isEnabled = rule?.enabled ?? false;
              const isExpanded = expandedId === occasion.id;

              return (
                <div key={occasion.id}>
                  <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <span className="text-xl">{occasion.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{occasion.name}</p>
                        <span className="text-[10px] text-muted-foreground">{occasion.timing}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{occasion.desc}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isEnabled && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : occasion.id)}
                          className="text-[10px] text-primary font-medium hover:underline"
                        >
                          Settings
                        </button>
                      )}
                      <button
                        onClick={() => toggleOccasion(occasion.id)}
                        className={`relative w-10 h-5.5 rounded-full transition-colors ${isEnabled ? "bg-emerald-500" : "bg-gray-300"}`}
                      >
                        <span className={`absolute top-[2px] rounded-full bg-white shadow transition-transform ${isEnabled ? "left-[19px]" : "left-[2px]"}`} style={{ width: 18, height: 18 }} />
                      </button>
                    </div>
                  </div>

                  {/* Inline settings */}
                  {isExpanded && isEnabled && (
                    <div className="px-4 py-3 bg-muted/20 border-t border-border/50">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-medium text-muted-foreground">Send to:</label>
                          <select
                            value={rule?.recipients || "all_contacts"}
                            onChange={e => updateRule(occasion.id, { recipients: e.target.value })}
                            className="text-xs border border-border rounded px-2 py-1 bg-background"
                          >
                            {RECIPIENT_OPTIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-[10px] font-medium text-muted-foreground">Mode:</label>
                          <div className="flex bg-muted rounded p-0.5">
                            <button
                              onClick={() => updateRule(occasion.id, { approval: "review" })}
                              className={`text-[10px] px-2 py-0.5 rounded font-medium ${rule?.approval === "review" ? "bg-background shadow" : "text-muted-foreground"}`}
                            >Review</button>
                            <button
                              onClick={() => updateRule(occasion.id, { approval: "auto" })}
                              className={`text-[10px] px-2 py-0.5 rounded font-medium ${rule?.approval !== "review" ? "bg-background shadow" : "text-muted-foreground"}`}
                            >Auto</button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <label className="text-[10px] font-medium text-muted-foreground shrink-0">AI hint:</label>
                          <input
                            type="text"
                            value={rule?.personalNote || ""}
                            onChange={e => updateRule(occasion.id, { personalNote: e.target.value })}
                            placeholder="Optional tone guidance..."
                            className="flex-1 text-xs border border-border rounded px-2 py-1 bg-background"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Summary footer */}
      {activeCount > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
          <div className={`w-2 h-2 rounded-full ${activeCount > 0 ? "bg-emerald-500 animate-pulse" : "bg-gray-300"}`} />
          <span>
            {activeCount} greeting{activeCount > 1 ? "s" : ""} active — AI will generate personalized emails when each occasion arrives
          </span>
        </div>
      )}
    </div>
  );
}
