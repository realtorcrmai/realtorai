"use client";

import { useState, useTransition } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2, Eye, Zap, Plus, Trash2, ChevronDown, ChevronRight,
} from "lucide-react";
import { saveAutomationRules, type AutomationRule } from "@/actions/config";

const TRIGGERS = [
  { id: "listing_active", icon: "🟢", name: "Listing Goes Active", desc: "When listing status changes to active (MLS-ready)" },
  { id: "listing_created", icon: "📝", name: "Listing Created", desc: "When a new listing is added to the CRM" },
  { id: "price_change", icon: "💰", name: "Price Change", desc: "When list price is updated on an active listing" },
];

const TEMPLATES = [
  { id: "ai_chooses", emoji: "✨", name: "AI Chooses Best", desc: "AI picks based on property type & price range", previewId: null },
  { id: "listing_alert", emoji: "🏠", name: "New Listing Alert", desc: "Property details, photos, showing CTA", previewId: "listing_alert" },
  { id: "luxury_showcase", emoji: "💎", name: "Luxury Showcase", desc: "Premium layout for $1.5M+ properties", previewId: "luxury_showcase" },
  { id: "open_house", emoji: "🏡", name: "Open House Invite", desc: "Event-focused with RSVP", previewId: "open_house" },
];

const RECIPIENTS = [
  { id: "all_agents", name: "All agents" },
  { id: "area_agents", name: "Area-specific agents" },
  { id: "active_agents", name: "Recently active agents" },
  { id: "all_buyers", name: "All buyers" },
  { id: "area_buyers", name: "Area-matched buyers" },
];

function createRule(trigger: string): AutomationRule {
  return {
    id: crypto.randomUUID(),
    trigger,
    template: "ai_chooses",
    recipients: "all_agents",
    approval: "review",
    enabled: true,
  };
}

export function ListingBlastAutomation({ initialRules }: { initialRules?: AutomationRule[] }) {
  const [rules, setRules] = useState<AutomationRule[]>(
    initialRules && initialRules.length > 0 ? initialRules : [createRule("listing_active")]
  );
  const [expandedId, setExpandedId] = useState<string | null>(rules[0]?.id || null);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  function persist(newRules: AutomationRule[]) {
    setRules(newRules);
    setSaveStatus("saving");
    startTransition(async () => {
      await saveAutomationRules(newRules);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 1500);
    });
  }

  function updateRule(id: string, updates: Partial<AutomationRule>) {
    persist(rules.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  function removeRule(id: string) {
    persist(rules.filter(r => r.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function addRule() {
    const usedTriggers = new Set(rules.map(r => r.trigger));
    const nextTrigger = TRIGGERS.find(t => !usedTriggers.has(t.id))?.id || "listing_active";
    const newRule = createRule(nextTrigger);
    persist([...rules, newRule]);
    setExpandedId(newRule.id);
  }

  const activeCount = rules.filter(r => r.enabled).length;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <div>
            <h3 className="text-base font-semibold">Listing Blast Automations</h3>
            <p className="text-xs text-muted-foreground">
              {activeCount > 0
                ? `${activeCount} automation${activeCount > 1 ? "s" : ""} active`
                : "No automations active"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saveStatus === "saving" && <span className="text-[10px] text-muted-foreground">Saving...</span>}
          {saveStatus === "saved" && <span className="text-[10px] text-emerald-600 font-medium">Saved</span>}
          <button
            onClick={addRule}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Automation
          </button>
        </div>
      </div>

      {/* Rules */}
      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Zap className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No automations configured.</p>
            <button onClick={addRule} className="text-xs text-primary font-medium mt-2 hover:underline">
              + Create your first automation
            </button>
          </CardContent>
        </Card>
      ) : rules.map(rule => {
        const trigger = TRIGGERS.find(t => t.id === rule.trigger);
        const template = TEMPLATES.find(t => t.id === rule.template);
        const recipient = RECIPIENTS.find(r => r.id === rule.recipients);
        const isExpanded = expandedId === rule.id;

        return (
          <Card key={rule.id} className={rule.enabled ? "" : "opacity-60"}>
            <CardContent className="p-0">
              {/* Summary row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : rule.id)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl">{trigger?.icon || "⚙️"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{trigger?.name || "Unknown trigger"}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {template?.emoji} {template?.name} → {recipient?.name} · {rule.approval === "auto" ? "Auto-send" : "Review first"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {rule.enabled ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">Active</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">Paused</Badge>
                  )}
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded settings */}
              {isExpanded && (
                <div className="border-t border-border px-4 py-4 bg-muted/10 space-y-4">
                  {/* Enable toggle */}
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm font-medium">Enabled</p><p className="text-xs text-muted-foreground">Turn this automation on or off</p></div>
                    <button
                      onClick={() => updateRule(rule.id, { enabled: !rule.enabled })}
                      className={`relative w-11 h-6 rounded-full transition-colors ${rule.enabled ? "bg-emerald-500" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${rule.enabled ? "left-[22px]" : "left-0.5"}`} />
                    </button>
                  </div>

                  {/* Trigger */}
                  <div>
                    <p className="text-sm font-medium mb-2">Trigger</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {TRIGGERS.map(t => (
                        <div
                          key={t.id}
                          onClick={() => updateRule(rule.id, { trigger: t.id })}
                          className={`cursor-pointer rounded-lg border-2 p-2.5 transition-all ${rule.trigger === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{t.icon}</span>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold">{t.name}</p>
                              <p className="text-[10px] text-muted-foreground leading-tight">{t.desc}</p>
                            </div>
                            {rule.trigger === t.id && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto shrink-0" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Template */}
                  <div>
                    <p className="text-sm font-medium mb-2">Email Template</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {TEMPLATES.map(t => (
                        <div
                          key={t.id}
                          onClick={() => updateRule(rule.id, { template: t.id })}
                          className={`cursor-pointer rounded-lg border-2 p-2.5 transition-all text-center ${rule.template === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                        >
                          <span className="text-xl">{t.emoji}</span>
                          <p className="text-xs font-semibold mt-1">{t.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{t.desc}</p>
                          {rule.template === t.id && <CheckCircle2 className="h-3.5 w-3.5 text-primary mx-auto mt-1" />}
                          {t.previewId && (
                            <button
                              onClick={(e) => { e.stopPropagation(); window.open(`/api/templates/preview?template=${t.previewId}`, "_blank"); }}
                              className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] px-2 py-1.5 rounded-md border border-border hover:bg-muted font-medium transition-colors"
                            >
                              <Eye className="h-3 w-3" /> Preview
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recipients + Approval row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium mb-1">Recipients</p>
                      <select
                        value={rule.recipients}
                        onChange={e => updateRule(rule.id, { recipients: e.target.value })}
                        className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background"
                      >
                        {RECIPIENTS.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1">Approval</p>
                      <div className="flex bg-muted rounded-lg p-0.5">
                        <button
                          onClick={() => updateRule(rule.id, { approval: "review" })}
                          className={`flex-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${rule.approval === "review" ? "bg-background shadow" : "text-muted-foreground"}`}
                        >Review first</button>
                        <button
                          onClick={() => updateRule(rule.id, { approval: "auto" })}
                          className={`flex-1 text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${rule.approval === "auto" ? "bg-background shadow" : "text-muted-foreground"}`}
                        >Auto-send</button>
                      </div>
                    </div>
                  </div>

                  {/* Delete */}
                  <div className="flex justify-end pt-2 border-t border-border">
                    <button
                      onClick={() => removeRule(rule.id)}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-600 font-medium transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Delete automation
                    </button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
