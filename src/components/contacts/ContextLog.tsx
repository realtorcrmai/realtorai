"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Check, AlertTriangle, Info, Clock, Heart } from "lucide-react";

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
  { icon: typeof AlertTriangle; color: string; label: string }
> = {
  objection: { icon: AlertTriangle, color: "text-amber-600", label: "Objection" },
  preference: { icon: Heart, color: "text-blue-600", label: "Preference" },
  concern: { icon: AlertTriangle, color: "text-red-600", label: "Concern" },
  info: { icon: Info, color: "text-gray-600", label: "Info" },
  timeline: { icon: Clock, color: "text-purple-600", label: "Timeline" },
};

export function ContextLog({ contactId, entries, onAdd, onResolve }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [newType, setNewType] = useState("info");
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/contacts/context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId,
          contextType: newType,
          text: newText.trim(),
        }),
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
    if (note === null) return; // cancelled
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
    <Card className="border-l-4 border-l-slate-400 bg-slate-50/20 dark:bg-slate-950/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Realtor Context
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1"
            onClick={() => setShowForm(!showForm)}
          >
            <Plus className="w-3 h-3" /> Add
          </Button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="mb-3 p-2 bg-muted/50 rounded space-y-2">
            <div className="flex gap-1">
              {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                <button
                  key={key}
                  onClick={() => setNewType(key)}
                  className={`px-2 py-1 rounded text-[10px] border ${
                    newType === key
                      ? "bg-primary text-white border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  {config.label}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              placeholder="e.g., Thinks Kits is too expensive"
              className="w-full text-xs border border-border rounded px-2 py-1.5 bg-background"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <div className="flex gap-1">
              <Button size="sm" className="text-xs" onClick={handleAdd} disabled={saving}>
                {saving ? "Saving..." : "Add"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Active entries */}
        {active.length === 0 && resolved.length === 0 && !showForm && (
          <p className="text-xs text-muted-foreground">
            No context logged yet. Add objections, preferences, or timeline info.
          </p>
        )}

        <div className="space-y-1.5">
          {active.map((entry) => {
            const config = TYPE_CONFIG[entry.context_type] || TYPE_CONFIG.info;
            const Icon = config.icon;
            return (
              <div
                key={entry.id}
                className="flex items-start gap-2 text-xs group"
              >
                <Icon className={`w-3 h-3 mt-0.5 flex-shrink-0 ${config.color}`} />
                <div className="flex-1 min-w-0">
                  <span>{entry.text}</span>
                  <span className="text-muted-foreground ml-1">
                    — {new Date(entry.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                  onClick={() => handleResolve(entry.id)}
                  title="Mark as resolved"
                >
                  <Check className="w-3 h-3 text-emerald-500" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Resolved */}
        {resolved.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border">
            <p className="text-[10px] text-muted-foreground mb-1">Resolved</p>
            {resolved.map((entry) => (
              <div key={entry.id} className="flex items-start gap-2 text-xs text-muted-foreground line-through">
                <Check className="w-3 h-3 mt-0.5 text-emerald-500" />
                <span>
                  {entry.text}
                  {entry.resolved_note && (
                    <span className="no-underline italic"> → {entry.resolved_note}</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
