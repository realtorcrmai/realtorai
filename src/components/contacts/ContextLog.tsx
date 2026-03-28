"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Check, AlertTriangle, Info, Clock, Heart, ChevronDown } from "lucide-react";

type ContextEntry = {
  id: string;
  context_type: string;
  text: string;
  is_resolved: boolean;
  resolved_note: string | null;
  created_at: string;
};

type Props = {
  contactId: string;
  entries: ContextEntry[];
  onAdd?: (entry: { context_type: string; text: string }) => void;
  onResolve?: (id: string, note: string) => void;
};

const TYPE_CONFIG: Record<
  string,
  { icon: typeof AlertTriangle; bg: string; border: string; text: string; label: string; emoji: string }
> = {
  objection: { icon: AlertTriangle, bg: "bg-amber-50 dark:bg-amber-950/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-400", label: "Objection", emoji: "⚠️" },
  preference: { icon: Heart, bg: "bg-blue-50 dark:bg-blue-950/20", border: "border-blue-200 dark:border-blue-800", text: "text-blue-700 dark:text-blue-400", label: "Preference", emoji: "💙" },
  concern: { icon: AlertTriangle, bg: "bg-red-50 dark:bg-red-950/20", border: "border-red-200 dark:border-red-800", text: "text-red-700 dark:text-red-400", label: "Concern", emoji: "🔴" },
  info: { icon: Info, bg: "bg-slate-50 dark:bg-slate-950/20", border: "border-slate-200 dark:border-slate-800", text: "text-slate-700 dark:text-slate-400", label: "Info", emoji: "ℹ️" },
  timeline: { icon: Clock, bg: "bg-purple-50 dark:bg-purple-950/20", border: "border-purple-200 dark:border-purple-800", text: "text-purple-700 dark:text-purple-400", label: "Timeline", emoji: "📅" },
};

export function ContextLog({ contactId, entries, onAdd, onResolve }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState("info");
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [showResolved, setShowResolved] = useState(false);

  async function handleAdd() {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/contacts/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactId, contextType: newType, text: newText.trim() }),
      });
      if (res.ok) {
        onAdd?.({ context_type: newType, text: newText.trim() });
        setNewText("");
        setShowForm(false);
      }
    } catch { /* silent */ }
    setSaving(false);
  }

  async function handleResolve(id: string) {
    const note = prompt("Resolution note (optional):");
    if (note === null) return;
    try {
      await fetch("/api/contacts/context", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, isResolved: true, resolvedNote: note }),
      });
      onResolve?.(id, note);
    } catch { /* silent */ }
  }

  const active = entries.filter((e) => !e.is_resolved);
  const resolved = entries.filter((e) => e.is_resolved);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Realtor Context
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs gap-1 px-2"
          onClick={() => setShowForm(!showForm)}
        >
          <Plus className="w-3 h-3" /> Add
        </Button>
      </div>

      {/* Add form — compact for narrow panel */}
      {showForm && (
        <div className="mb-3 p-3 rounded-lg bg-muted/40 border border-border space-y-2">
          <div className="flex flex-wrap gap-1">
            {Object.entries(TYPE_CONFIG).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setNewType(key)}
                className={`px-2 py-1 rounded-md text-[10px] font-medium border transition-colors ${
                  newType === key
                    ? `${config.bg} ${config.border} ${config.text}`
                    : "border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {config.emoji} {config.label}
              </button>
            ))}
          </div>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="e.g., Thinks Kits is too expensive"
            className="w-full text-xs border border-border rounded-md px-2.5 py-2 bg-background resize-none"
            rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAdd(); } }}
          />
          <div className="flex gap-1.5">
            <Button size="sm" className="text-xs h-7" onClick={handleAdd} disabled={saving || !newText.trim()}>
              {saving ? "Saving..." : "Add"}
            </Button>
            <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { setShowForm(false); setNewText(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 && resolved.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground py-2">
          No context logged yet. Track objections, preferences, or timeline info.
        </p>
      )}

      {/* Active entries — colored cards */}
      <div className="space-y-2">
        {active.map((entry) => {
          const config = TYPE_CONFIG[entry.context_type] || TYPE_CONFIG.info;
          return (
            <div
              key={entry.id}
              className={`relative rounded-lg border p-2.5 ${config.bg} ${config.border} group`}
            >
              <div className="flex items-start gap-2">
                <span className="text-xs shrink-0 mt-0.5">{config.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-relaxed break-words ${config.text}`}>
                    {entry.text}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(entry.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                </div>
                <button
                  onClick={() => handleResolve(entry.id)}
                  className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
                  title="Mark resolved"
                >
                  <Check className="w-3 h-3 text-emerald-600" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resolved — collapsible */}
      {resolved.length > 0 && (
        <div className="mt-3">
          <button
            onClick={() => setShowResolved(!showResolved)}
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <ChevronDown className={`w-3 h-3 transition-transform ${showResolved ? "" : "-rotate-90"}`} />
            {resolved.length} resolved
          </button>
          {showResolved && (
            <div className="mt-2 space-y-1.5 pl-1">
              {resolved.map((entry) => (
                <div key={entry.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Check className="w-3 h-3 mt-0.5 text-emerald-500 shrink-0" />
                  <div className="min-w-0">
                    <span className="line-through break-words">{entry.text}</span>
                    {entry.resolved_note && (
                      <span className="no-underline italic block text-[10px] mt-0.5"> → {entry.resolved_note}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
