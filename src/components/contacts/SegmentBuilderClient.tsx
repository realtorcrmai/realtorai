"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSegment, deleteSegment, evaluateSegment, bulkEnroll } from "@/actions/segments";

const RULE_FIELDS = [
  { key: "type", label: "Contact Type", operators: ["equals"], values: ["buyer", "seller", "customer", "agent", "partner", "other"] },
  { key: "stage_bar", label: "Stage", operators: ["equals"], values: ["new", "qualified", "active_search", "active_listing", "under_contract", "closed", "cold"] },
  { key: "lead_status", label: "Lead Status", operators: ["equals"], values: ["new", "contacted", "qualified", "nurturing", "converted", "lost"] },
  { key: "tags", label: "Has Tag", operators: ["contains"], values: [] },
  { key: "newsletter_unsubscribed", label: "Unsubscribed", operators: ["equals"], values: ["true", "false"] },
];

interface Segment {
  id: string;
  name: string;
  description: string | null;
  rules: Array<{ field: string; operator: string; value: string }>;
  rule_operator: string;
  contact_count: number;
  created_at: string;
}

interface Rule {
  field: string;
  operator: string;
  value: string;
}

export function SegmentBuilderClient({ initialSegments }: { initialSegments: Segment[] }) {
  const [segments, setSegments] = useState(initialSegments);
  const [showBuilder, setShowBuilder] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rules, setRules] = useState<Rule[]>([{ field: "type", operator: "equals", value: "buyer" }]);
  const [ruleOperator, setRuleOperator] = useState("AND");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const addRule = () => setRules([...rules, { field: "type", operator: "equals", value: "" }]);
  const removeRule = (i: number) => setRules(rules.filter((_, idx) => idx !== i));
  const updateRule = (i: number, update: Partial<Rule>) => {
    setRules(rules.map((r, idx) => idx === i ? { ...r, ...update } : r));
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    startTransition(async () => {
      const result = await createSegment({ name, description, rules, rule_operator: ruleOperator });
      if (result.data) {
        setSegments([result.data as Segment, ...segments]);
        setShowBuilder(false);
        setName("");
        setDescription("");
        setRules([{ field: "type", operator: "equals", value: "buyer" }]);
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteSegment(id);
      setSegments(segments.filter(s => s.id !== id));
    });
  };

  const handleEvaluate = (id: string) => {
    startTransition(async () => {
      const result = await evaluateSegment(id);
      setSegments(segments.map(s => s.id === id ? { ...s, contact_count: result.count } : s));
    });
  };

  return (
    <div className="space-y-4">
      {/* Create Button */}
      <button
        onClick={() => setShowBuilder(!showBuilder)}
        className="px-4 py-2.5 rounded-xl bg-brand text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
      >
        {showBuilder ? "Cancel" : "+ New Segment"}
      </button>

      {/* Builder */}
      {showBuilder && (
        <div className="glass rounded-xl border border-border/50 p-5 space-y-4">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Segment name (e.g., 'Active Buyers in Vancouver')"
            className="w-full px-3 py-2.5 rounded-lg border border-border bg-background text-sm"
          />
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
          />

          {/* Rules */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground">Match</span>
              <select
                value={ruleOperator}
                onChange={e => setRuleOperator(e.target.value)}
                className="text-xs px-2 py-1 rounded border border-border bg-background"
              >
                <option value="AND">ALL rules (AND)</option>
                <option value="OR">ANY rule (OR)</option>
              </select>
            </div>

            {rules.map((rule, i) => {
              const fieldConfig = RULE_FIELDS.find(f => f.key === rule.field);
              return (
                <div key={i} className="flex items-center gap-2">
                  <select
                    value={rule.field}
                    onChange={e => updateRule(i, { field: e.target.value, value: "" })}
                    className="text-sm px-2 py-1.5 rounded border border-border bg-background"
                  >
                    {RULE_FIELDS.map(f => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground">{rule.operator}</span>
                  {fieldConfig?.values.length ? (
                    <select
                      value={rule.value}
                      onChange={e => updateRule(i, { value: e.target.value })}
                      className="text-sm px-2 py-1.5 rounded border border-border bg-background"
                    >
                      <option value="">Select...</option>
                      {fieldConfig.values.map(v => (
                        <option key={v} value={v}>{v}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={rule.value}
                      onChange={e => updateRule(i, { value: e.target.value })}
                      placeholder="Value"
                      className="text-sm px-2 py-1.5 rounded border border-border bg-background flex-1"
                    />
                  )}
                  {rules.length > 1 && (
                    <button onClick={() => removeRule(i)} className="text-xs text-red-500 hover:text-red-700">{"\u2715"}</button>
                  )}
                </div>
              );
            })}

            <button onClick={addRule} className="text-xs text-primary font-medium">+ Add Rule</button>
          </div>

          <button
            onClick={handleCreate}
            disabled={pending || !name.trim()}
            className="px-4 py-2 rounded-lg bg-brand text-white text-sm font-semibold disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create Segment"}
          </button>
        </div>
      )}

      {/* Segment List */}
      {segments.length === 0 && !showBuilder ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-3">{"\uD83C\uDFAF"}</div>
          <h3 className="text-lg font-semibold">No segments yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Create segments to target specific groups of contacts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {segments.map(seg => (
            <div key={seg.id} className="glass rounded-xl border border-border/50 p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">{seg.name}</h3>
                {seg.description && <p className="text-xs text-muted-foreground mt-0.5">{seg.description}</p>}
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-medium text-primary">{seg.contact_count} contacts</span>
                  <span className="text-xs text-muted-foreground">{seg.rules.length} rule{seg.rules.length !== 1 ? "s" : ""} ({seg.rule_operator})</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEvaluate(seg.id)}
                  disabled={pending}
                  className="text-xs font-medium text-primary hover:text-primary/80 px-3 py-1.5 rounded-md border border-primary/20"
                >
                  Refresh Count
                </button>
                <button
                  onClick={() => handleDelete(seg.id)}
                  disabled={pending}
                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1.5"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
