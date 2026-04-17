"use client";

import { useState, useTransition, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Loader2 } from "lucide-react";
import { createSmartList, updateSmartList, countSmartList } from "@/actions/smart-lists";
import { toast } from "sonner";
import type { SmartList, SmartListRule, EntityType, MatchMode, RuleOperator } from "@/types/smart-lists";
import { ENTITY_FIELDS, OPERATOR_LABELS } from "@/types/smart-lists";

const ICONS = ["📋", "🚀", "🔥", "📞", "🏠", "🧊", "⚠️", "💰", "🎯", "📧", "👤", "🔔", "📊", "🗂️", "⭐", "💎"];

const ENTITY_LABELS: Record<EntityType, string> = {
  contacts: "Contacts",
  listings: "Listings",
  showings: "Showings",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingList?: SmartList | null;
  onSaved?: () => void;
}

export function SmartListBuilder({ open, onOpenChange, editingList, onSaved }: Props) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState(editingList?.name ?? "");
  const [icon, setIcon] = useState(editingList?.icon ?? "📋");
  const [entityType, setEntityType] = useState<EntityType>(editingList?.entity_type ?? "contacts");
  const [matchMode, setMatchMode] = useState<MatchMode>(editingList?.match_mode ?? "all");
  const [rules, setRules] = useState<SmartListRule[]>(editingList?.rules ?? []);
  const [sortField, setSortField] = useState(editingList?.sort_field ?? "created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">(editingList?.sort_order ?? "desc");
  const [isPinned, setIsPinned] = useState(editingList?.is_pinned ?? true);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const fields = ENTITY_FIELDS[entityType];

  const addRule = useCallback(() => {
    const firstField = fields[0];
    setRules((prev) => [
      ...prev,
      { field: firstField.key, operator: firstField.operators[0], value: "" },
    ]);
  }, [fields]);

  const removeRule = (index: number) => {
    setRules((prev) => prev.filter((_, i) => i !== index));
  };

  const updateRule = (index: number, updates: Partial<SmartListRule>) => {
    setRules((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...updates } : r))
    );
  };

  const handleFieldChange = (index: number, newField: string) => {
    const fieldDef = fields.find((f) => f.key === newField);
    if (!fieldDef) return;
    updateRule(index, {
      field: newField,
      operator: fieldDef.operators[0],
      value: fieldDef.type === "enum" ? (fieldDef.values?.[0] ?? "") : "",
    });
  };

  const handleSave = () => {
    startTransition(async () => {
      if (editingList) {
        const result = await updateSmartList(editingList.id, {
          name, icon, rules, match_mode: matchMode,
          sort_field: sortField, sort_order: sortOrder, is_pinned: isPinned,
        });
        if (result.error) { toast.error(result.error); return; }
        toast.success("Smart List updated");
      } else {
        const result = await createSmartList({
          name, icon, entity_type: entityType, rules,
          match_mode: matchMode, sort_field: sortField, sort_order: sortOrder, is_pinned: isPinned,
        });
        if (result.error) { toast.error(result.error); return; }
        toast.success("Smart List created");
      }
      onOpenChange(false);
      onSaved?.();
    });
  };

  const handlePreview = () => {
    if (!editingList) return;
    startTransition(async () => {
      const count = await countSmartList(editingList.id);
      setPreviewCount(count);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editingList ? "Edit Smart List" : "Create Smart List"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Name + Icon */}
          <div className="flex gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="h-9 w-9 flex items-center justify-center rounded-md border border-input bg-background text-lg hover:bg-muted transition-colors"
                aria-label="Choose icon"
              >
                {icon}
              </button>
              {showIconPicker && (
                <div className="absolute top-10 left-0 z-50 bg-popover border border-border rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1">
                  {ICONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => { setIcon(e); setShowIconPicker(false); }}
                      className="h-8 w-8 flex items-center justify-center rounded hover:bg-muted text-lg"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Hot Buyers Needing Follow-Up"
              className="flex-1"
              aria-label="Smart list name"
            />
          </div>

          {/* Entity Type (only on create) */}
          {!editingList && (
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">What to filter</Label>
              <div className="flex gap-2">
                {(["contacts", "listings", "showings"] as EntityType[]).map((et) => (
                  <button
                    key={et}
                    type="button"
                    onClick={() => { setEntityType(et); setRules([]); }}
                    className={`flex-1 py-2 text-sm rounded-md border transition-colors ${
                      entityType === et
                        ? "bg-brand text-white border-brand"
                        : "bg-background border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {ENTITY_LABELS[et]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Match Mode */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Match</Label>
            <select
              value={matchMode}
              onChange={(e) => setMatchMode(e.target.value as MatchMode)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
            >
              <option value="all">ALL conditions (AND)</option>
              <option value="any">ANY condition (OR)</option>
            </select>
          </div>

          {/* Condition Rows */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Conditions</Label>
            {rules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3 border border-dashed border-border rounded-md">
                No conditions yet. Add one below.
              </p>
            )}
            {rules.map((rule, i) => {
              const fieldDef = fields.find((f) => f.key === rule.field);
              const operators = fieldDef?.operators ?? [];
              const needsValue = !["is_null", "is_not_null"].includes(rule.operator);

              return (
                <div key={i} className="flex items-center gap-1.5 bg-muted/30 rounded-md p-2 border border-border">
                  {/* Field */}
                  <select
                    value={rule.field}
                    onChange={(e) => handleFieldChange(i, e.target.value)}
                    className="h-7 rounded border border-input bg-background px-1.5 text-xs flex-shrink-0"
                    aria-label="Field"
                  >
                    {fields.map((f) => (
                      <option key={f.key} value={f.key}>{f.label}</option>
                    ))}
                  </select>

                  {/* Operator */}
                  <select
                    value={rule.operator}
                    onChange={(e) => updateRule(i, { operator: e.target.value as RuleOperator })}
                    className="h-7 rounded border border-input bg-background px-1.5 text-xs flex-shrink-0"
                    aria-label="Operator"
                  >
                    {operators.map((op) => (
                      <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
                    ))}
                  </select>

                  {/* Value */}
                  {needsValue && (
                    <>
                      {fieldDef?.type === "enum" ? (
                        <select
                          value={typeof rule.value === "string" ? rule.value : ""}
                          onChange={(e) => updateRule(i, { value: e.target.value })}
                          className="h-7 rounded border border-input bg-background px-1.5 text-xs flex-1 min-w-0"
                          aria-label="Value"
                        >
                          {fieldDef.values?.map((v) => (
                            <option key={v} value={v}>{v}</option>
                          ))}
                        </select>
                      ) : fieldDef?.type === "date" ? (
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          <Input
                            type="number"
                            min={1}
                            value={typeof rule.value === "string" ? parseInt(rule.value) || "" : ""}
                            onChange={(e) => {
                              const num = e.target.value;
                              const unit = typeof rule.value === "string" ? rule.value.replace(/\d+/, "") || "d" : "d";
                              updateRule(i, { value: `${num}${unit}` });
                            }}
                            className="h-7 w-16 text-xs"
                            placeholder="7"
                            aria-label="Amount"
                          />
                          <select
                            value={typeof rule.value === "string" ? rule.value.replace(/\d+/, "") || "d" : "d"}
                            onChange={(e) => {
                              const num = typeof rule.value === "string" ? parseInt(rule.value) || 7 : 7;
                              updateRule(i, { value: `${num}${e.target.value}` });
                            }}
                            className="h-7 rounded border border-input bg-background px-1 text-xs"
                            aria-label="Unit"
                          >
                            <option value="h">hours</option>
                            <option value="d">days</option>
                            <option value="w">weeks</option>
                            <option value="m">months</option>
                          </select>
                        </div>
                      ) : (
                        <Input
                          type={fieldDef?.type === "number" ? "number" : "text"}
                          value={typeof rule.value === "string" || typeof rule.value === "number" ? rule.value : ""}
                          onChange={(e) => updateRule(i, { value: fieldDef?.type === "number" ? Number(e.target.value) : e.target.value })}
                          className="h-7 text-xs flex-1 min-w-0"
                          placeholder="value"
                          aria-label="Value"
                        />
                      )}
                    </>
                  )}

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => removeRule(i)}
                    className="h-7 w-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                    aria-label="Remove condition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
            <button
              type="button"
              onClick={addRule}
              className="flex items-center gap-1.5 text-xs font-medium text-brand hover:text-brand-dark transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add condition
            </button>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">Sort by</Label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
            >
              {fields.map((f) => (
                <option key={f.key} value={f.key}>{f.label}</option>
              ))}
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="h-8 rounded-md border border-input bg-background px-2 text-xs font-medium"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>

          {/* Pin Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded border-input"
            />
            <span className="text-sm">Pin to sidebar</span>
          </label>

          {/* Preview Count */}
          {previewCount !== null && (
            <div className="text-sm font-medium text-center py-2 bg-brand/5 rounded-md border border-brand/20">
              {previewCount} {entityType} match these rules
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            {editingList && (
              <Button variant="outline" size="sm" onClick={handlePreview} disabled={isPending}>
                Preview Count
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-brand text-white hover:bg-brand-dark"
              onClick={handleSave}
              disabled={isPending || !name.trim() || rules.length === 0}
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingList ? "Save Changes" : "Create"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
