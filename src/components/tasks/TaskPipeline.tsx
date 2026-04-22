"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const TASK_PHASES = [
  { id: "pending", name: "To Do", desc: "Pending tasks awaiting start", icon: "\u{1F4CB}" },
  { id: "in_progress", name: "In Progress", desc: "Currently being worked on", icon: "\u26A1" },
  { id: "completed", name: "Completed", desc: "Finished tasks", icon: "\u2705" },
];

type PhaseStatus = "completed" | "in-progress" | "pending";

const PHASE_STYLES: Record<PhaseStatus, { bg: string; border: string; text: string; icon: string }> = {
  completed: {
    bg: "bg-brand-muted dark:bg-foreground/20",
    border: "border-brand/20 dark:border-brand/10",
    text: "text-brand-dark dark:text-brand-light",
    icon: "bg-brand shadow-sm shadow-[#0F7694]/30",
  },
  "in-progress": {
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-800",
    text: "text-orange-600 dark:text-orange-400",
    icon: "border-2 border-orange-500 bg-orange-50 dark:bg-orange-950/50",
  },
  pending: {
    bg: "bg-muted/50",
    border: "border-muted-foreground/15",
    text: "text-muted-foreground",
    icon: "border-2 border-muted-foreground/25 bg-muted/50",
  },
};

type Task = {
  id: string;
  status: "pending" | "in_progress" | "completed";
  [key: string]: unknown;
};

function derivePhaseStatuses(tasks: Task[]): Record<string, PhaseStatus> {
  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const total = tasks.length;

  const statuses: Record<string, PhaseStatus> = {};

  // "pending" phase: completed if no pending tasks remain; in-progress if > 0
  statuses["pending"] = pendingCount === 0 && total > 0 ? "completed" : pendingCount > 0 ? "in-progress" : "pending";

  // "in_progress" phase: completed if in_progress=0 and pending=0; in-progress if > 0
  statuses["in_progress"] =
    inProgressCount === 0 && pendingCount === 0 && total > 0
      ? "completed"
      : inProgressCount > 0
        ? "in-progress"
        : "pending";

  // "completed" phase: completed if ALL tasks completed; in-progress if some completed
  statuses["completed"] =
    total > 0 && completedCount === total
      ? "completed"
      : completedCount > 0
        ? "in-progress"
        : "pending";

  return statuses;
}

export function TaskPipeline({ tasks }: { tasks: Task[] }) {
  const statuses = derivePhaseStatuses(tasks);
  const total = tasks.length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const counts: Record<string, number> = {
    pending: tasks.filter((t) => t.status === "pending").length,
    in_progress: tasks.filter((t) => t.status === "in_progress").length,
    completed: completedCount,
  };

  const todayStr = new Date().toISOString().split("T")[0];
  const overdueByPhase: Record<string, number> = {
    pending: tasks.filter(
      (t) => t.status === "pending" && t.due_date && (t.due_date as string) < todayStr
    ).length,
    in_progress: tasks.filter(
      (t) => t.status === "in_progress" && t.due_date && (t.due_date as string) < todayStr
    ).length,
    completed: 0,
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Task Pipeline</h2>
        <span className="text-sm text-muted-foreground">
          {completedCount}/{total} tasks complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#00C875] to-[#007A47] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Horizontal pipeline */}
      <div className="flex items-stretch gap-2">
        {TASK_PHASES.map((phase, i) => {
          const status = statuses[phase.id];
          const styles = PHASE_STYLES[status];
          const isLast = i === TASK_PHASES.length - 1;

          return (
            <div key={phase.id} className="flex items-stretch flex-1 gap-2">
              <div
                className={`flex-1 rounded-xl border p-4 ${styles.bg} ${styles.border} transition-colors`}
              >
                <div className="flex items-center gap-2.5 mb-1.5">
                  {/* Status circle */}
                  {status === "completed" ? (
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${styles.icon}`}
                    >
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : (
                    <div
                      className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${styles.icon}`}
                    >
                      <span className="text-sm">{phase.icon}</span>
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className={cn("text-sm font-semibold", styles.text)}>
                        {phase.name}
                      </p>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "text-[10px] px-1.5 py-0 font-semibold",
                          styles.text
                        )}
                      >
                        {counts[phase.id]}
                      </Badge>
                      {overdueByPhase[phase.id] > 0 && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] px-1.5 py-0 font-semibold"
                        >
                          {overdueByPhase[phase.id]} overdue
                        </Badge>
                      )}
                    </div>
                    <p className={cn("text-xl font-bold", styles.text)}>
                      {counts[phase.id]}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{phase.desc}</p>
              </div>

              {/* Arrow connector */}
              {!isLast && (
                <div className="flex items-center shrink-0">
                  <svg
                    className="h-5 w-5 text-muted-foreground/30"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
