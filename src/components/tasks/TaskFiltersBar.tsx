"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import {
  TASK_STATUSES, TASK_PRIORITIES, TASK_CATEGORIES,
  TASK_CATEGORY_LABELS, TASK_PRIORITY_CONFIG,
  TASK_SCOPE_OPTIONS, TASK_SORT_OPTIONS,
} from "@/lib/constants/tasks";
import type { TaskFilters, TeamMember } from "@/hooks/useTasks";
import type { TaskPriority, TaskCategory } from "@/lib/constants/tasks";

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onUpdate: (filters: Partial<TaskFilters>) => void;
  teamMembers: TeamMember[];
}

export function TaskFiltersBar({ filters, onUpdate, teamMembers }: TaskFiltersBarProps) {
  const activeStatuses = filters.status?.split(",").filter(Boolean) || [];
  const activePriorities = filters.priority?.split(",").filter(Boolean) || [];
  const activeCategories = filters.category?.split(",").filter(Boolean) || [];

  function toggleArrayFilter(key: "status" | "priority" | "category", value: string) {
    const current = (filters[key] || "").split(",").filter(Boolean);
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onUpdate({ [key]: next.length > 0 ? next.join(",") : undefined });
  }

  function clearAll() {
    onUpdate({
      status: undefined,
      priority: undefined,
      category: undefined,
      assigned_to: undefined,
      scope: undefined,
      labels: undefined,
      due_date_from: undefined,
      due_date_to: undefined,
      sort_by: undefined,
      sort_dir: undefined,
    });
  }

  const hasFilters = [
    filters.status, filters.priority, filters.category,
    filters.assigned_to, filters.scope, filters.labels,
    filters.due_date_from, filters.due_date_to,
  ].some(Boolean);

  return (
    <div className="p-4 rounded-xl border border-border bg-card/50 space-y-4">
      {/* Scope tabs */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scope:</span>
        {TASK_SCOPE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onUpdate({ scope: filters.scope === opt.value ? undefined : opt.value })}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
              filters.scope === opt.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Status chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-16 shrink-0">Status:</span>
        {TASK_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => toggleArrayFilter("status", s)}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
              activeStatuses.includes(s)
                ? "bg-brand text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s === "pending" ? "To Do" : s === "in_progress" ? "In Progress" : "Done"}
          </button>
        ))}
      </div>

      {/* Priority chips */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-16 shrink-0">Priority:</span>
        {TASK_PRIORITIES.map((p) => {
          const config = TASK_PRIORITY_CONFIG[p as TaskPriority];
          return (
            <button
              key={p}
              onClick={() => toggleArrayFilter("priority", p)}
              className={`px-2.5 py-1 text-xs rounded-full transition-colors flex items-center gap-1 ${
                activePriorities.includes(p)
                  ? `${config.bg} ${config.color} ring-1 ring-current`
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${config.dotColor}`} />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Category chips */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-16 shrink-0">Category:</span>
        {TASK_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => toggleArrayFilter("category", c)}
            className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
              activeCategories.includes(c)
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {TASK_CATEGORY_LABELS[c as TaskCategory]}
          </button>
        ))}
      </div>

      {/* Assignee + Date range + Sort */}
      <div className="flex items-end gap-4 flex-wrap">
        {teamMembers.length > 1 && (
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase block mb-1">Assignee</label>
            <select
              value={filters.assigned_to || ""}
              onChange={(e) => onUpdate({ assigned_to: e.target.value || undefined })}
              className="h-8 px-2 text-xs rounded-lg border bg-background"
            >
              <option value="">Anyone</option>
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}{m.is_current ? " (me)" : ""}</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase block mb-1">Due from</label>
          <input
            type="date"
            value={filters.due_date_from || ""}
            onChange={(e) => onUpdate({ due_date_from: e.target.value || undefined })}
            className="h-8 px-2 text-xs rounded-lg border bg-background"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase block mb-1">Due to</label>
          <input
            type="date"
            value={filters.due_date_to || ""}
            onChange={(e) => onUpdate({ due_date_to: e.target.value || undefined })}
            className="h-8 px-2 text-xs rounded-lg border bg-background"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground uppercase block mb-1">Sort by</label>
          <select
            value={filters.sort_by || "priority"}
            onChange={(e) => onUpdate({ sort_by: e.target.value })}
            className="h-8 px-2 text-xs rounded-lg border bg-background"
          >
            {TASK_SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearAll} className="text-xs">
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>
    </div>
  );
}
