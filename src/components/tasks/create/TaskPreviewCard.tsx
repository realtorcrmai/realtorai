"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, Tag, User, Building2, Flag } from "lucide-react";
import { TASK_CATEGORY_LABELS, TASK_PRIORITY_CONFIG } from "@/lib/constants/tasks";
import type { TaskPriority, TaskCategory } from "@/lib/constants/tasks";

function PreviewRow({ icon: Icon, label, value, empty }: { icon: typeof Calendar; label: string; value?: string; empty?: string }) {
  const hasValue = !!value;
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className={`h-4 w-4 shrink-0 ${hasValue ? "text-foreground" : "text-muted-foreground/25"}`} />
      <span className="text-muted-foreground text-sm min-w-[70px] shrink-0">{label}</span>
      <span className={hasValue ? "text-foreground font-medium" : "text-muted-foreground/30 italic"}>
        {value || empty || "—"}
      </span>
    </div>
  );
}

const PRIORITY_GRADIENTS: Record<string, string> = {
  low: "from-gray-400 to-slate-500",
  medium: "from-[#67D4E8] to-[#0F7694]",
  high: "from-orange-500 to-amber-600",
  urgent: "from-red-500 to-rose-600",
};

const CATEGORY_ICONS: Record<string, string> = {
  follow_up: "📞", showing: "🏠", document: "📄", listing: "🏢",
  marketing: "📣", inspection: "🔍", closing: "✅", general: "📋",
};

export interface TaskPreviewCardProps {
  title: string;
  description: string;
  priority: string;
  category: string;
  dueDate: string;
  contactName: string;
  listingAddress: string;
}

export function TaskPreviewCard({
  title, description, priority, category, dueDate,
  contactName, listingAddress,
}: TaskPreviewCardProps) {
  const gradient = PRIORITY_GRADIENTS[priority] || PRIORITY_GRADIENTS.medium;
  const priorityConfig = TASK_PRIORITY_CONFIG[priority as TaskPriority];
  const categoryLabel = TASK_CATEGORY_LABELS[category as TaskCategory] || category;
  const categoryIcon = CATEGORY_ICONS[category] || "📋";

  const dueDateDisplay = dueDate
    ? new Date(dueDate + "T00:00:00").toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })
    : "";

  // Completion tracking
  const totalFields = 5;
  const filledFields = [title, priority, category, dueDate, contactName || listingAddress].filter(Boolean).length;
  const completionPct = Math.min(100, Math.round((filledFields / totalFields) * 100));

  return (
    <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-white via-white to-[#FAF8F4] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/50 shadow-lg overflow-hidden transition-all duration-300">
      {/* Colored top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-lg transition-all duration-300`}>
            {categoryIcon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold tracking-tight truncate transition-all">
              {title || <span className="text-muted-foreground/30 italic font-normal">Task title</span>}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {priority && priorityConfig && (
                <Badge variant="secondary" className={`text-sm ${priorityConfig.bg} ${priorityConfig.color}`}>
                  {priorityConfig.label}
                </Badge>
              )}
              {category && (
                <Badge variant="outline" className="text-sm capitalize">{categoryLabel}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Completion bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completionPct >= 70 ? "bg-brand" : completionPct >= 40 ? "bg-amber-500" : "bg-red-400"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{completionPct}%</span>
        </div>

        {/* Details */}
        <div className="space-y-1.5 border-t border-border/20 pt-3">
          <PreviewRow icon={Flag} label="Priority" value={priorityConfig?.label} empty="Set priority" />
          <PreviewRow icon={Tag} label="Category" value={categoryLabel} empty="Set category" />
          <PreviewRow icon={Calendar} label="Due" value={dueDateDisplay} empty="No due date" />
        </div>

        {/* Linked entities */}
        {(contactName || listingAddress) && (
          <div className="space-y-1.5 border-t border-border/20 pt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Linked To</p>
            {contactName && <PreviewRow icon={User} label="Contact" value={contactName} />}
            {listingAddress && <PreviewRow icon={Building2} label="Listing" value={listingAddress} />}
          </div>
        )}

        {/* Description */}
        {description && (
          <div className="border-t border-border/20 pt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Description</p>
            <p className="text-sm text-muted-foreground italic">&ldquo;{description}&rdquo;</p>
          </div>
        )}

        {/* Status */}
        <div className="border-t border-border/20 pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Status</p>
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient} ring-2 ring-offset-1 ring-current shadow-sm`} />
            <div className="h-0.5 w-6 bg-muted/30 rounded-full" />
            <div className="w-3 h-3 rounded-full bg-muted/20" />
            <div className="h-0.5 w-6 bg-muted/30 rounded-full" />
            <div className="w-3 h-3 rounded-full bg-muted/20" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Pending → In Progress → Completed</p>
        </div>
      </div>
    </div>
  );
}
