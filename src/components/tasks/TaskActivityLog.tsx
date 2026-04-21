"use client";

import { cn } from "@/lib/utils";
import {
  CheckCircle2, UserPlus, Flag, Archive, RotateCcw,
  Plus, MessageSquare, Copy, Edit3, Circle,
} from "lucide-react";

type Activity = {
  id: string;
  user_name: string;
  action: string;
  field_name: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
};

const ACTION_CONFIG: Record<string, { icon: React.ReactNode; verb: string; color: string }> = {
  created: { icon: <Plus className="h-3 w-3" />, verb: "created this task", color: "text-green-500" },
  status_changed: { icon: <CheckCircle2 className="h-3 w-3" />, verb: "changed status", color: "text-blue-500" },
  assigned: { icon: <UserPlus className="h-3 w-3" />, verb: "reassigned", color: "text-purple-500" },
  priority_changed: { icon: <Flag className="h-3 w-3" />, verb: "changed priority", color: "text-orange-500" },
  archived: { icon: <Archive className="h-3 w-3" />, verb: "archived", color: "text-gray-500" },
  unarchived: { icon: <RotateCcw className="h-3 w-3" />, verb: "unarchived", color: "text-green-500" },
  commented: { icon: <MessageSquare className="h-3 w-3" />, verb: "commented", color: "text-blue-500" },
  subtask_added: { icon: <Plus className="h-3 w-3" />, verb: "added a subtask", color: "text-green-500" },
  duplicated: { icon: <Copy className="h-3 w-3" />, verb: "duplicated this task", color: "text-blue-500" },
  updated: { icon: <Edit3 className="h-3 w-3" />, verb: "updated", color: "text-muted-foreground" },
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function TaskActivityLog({ activity }: { activity: Activity[] }) {
  if (activity.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No activity yet</p>;
  }

  return (
    <div className="space-y-0">
      {activity.map((item, idx) => {
        const config = ACTION_CONFIG[item.action] || ACTION_CONFIG.updated;
        const isLast = idx === activity.length - 1;

        return (
          <div key={item.id} className="flex gap-3">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div className={cn("h-6 w-6 rounded-full flex items-center justify-center shrink-0", config.color, "bg-muted/50")}>
                {config.icon}
              </div>
              {!isLast && <div className="w-px flex-1 bg-border/50 min-h-[16px]" />}
            </div>

            {/* Content */}
            <div className="pb-3 min-w-0">
              <p className="text-xs">
                <span className="font-medium">{item.user_name}</span>
                {" "}
                <span className="text-muted-foreground">{config.verb}</span>
                {item.field_name && item.action === "updated" && (
                  <span className="text-muted-foreground"> {item.field_name}</span>
                )}
                {item.old_value && item.new_value && (
                  <span className="text-muted-foreground">
                    {" "}from <span className="font-medium text-foreground">{item.old_value}</span>
                    {" "}to <span className="font-medium text-foreground">{item.new_value}</span>
                  </span>
                )}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(item.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
