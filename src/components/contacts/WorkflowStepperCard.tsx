"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  X,
  Clock,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateEnrollment } from "@/actions/workflows";
import {
  ACTION_TYPE_ICONS,
  WORKFLOW_BLUEPRINTS,
  type WorkflowActionType,
} from "@/lib/constants/workflows";

type WorkflowStep = {
  id: string;
  step_order: number;
  name: string;
  action_type: string;
  delay_minutes: number;
  delay_unit: string;
  delay_value: number;
  exit_on_reply: boolean;
};

type Enrollment = {
  id: string;
  workflow_id: string;
  status: string;
  current_step: number;
  next_run_at: string | null;
  started_at: string;
  completed_at: string | null;
  exit_reason: string | null;
  workflows: {
    id: string;
    name: string;
    slug: string;
  };
};

type StepStatus = "completed" | "current" | "pending";

const STATUS_STYLES: Record<
  StepStatus,
  {
    circle: string;
    connector: string;
    text: string;
    badge: string;
    badgeLabel: string;
  }
> = {
  completed: {
    circle: "bg-[#0F7694]/50 shadow-sm shadow-green-500/30",
    connector: "bg-[#0F7694]/50",
    text: "text-foreground",
    badge:
      "bg-[#0F7694]/10 text-[#0A6880] dark:bg-[#1a1535]/30 dark:text-[#67D4E8]",
    badgeLabel: "COMPLETE",
  },
  current: {
    circle:
      "border-2 border-[#0F7694]/60 bg-[#0F7694]/5 dark:bg-[#1a1535]/50",
    connector: "bg-muted-foreground/15",
    text: "text-[#0F7694] dark:text-[#67D4E8]",
    badge:
      "bg-[#0F7694]/10 text-[#0A6880] dark:bg-[#1a1535]/30 dark:text-[#67D4E8]",
    badgeLabel: "CURRENT",
  },
  pending: {
    circle: "border-2 border-muted-foreground/25 bg-muted/50",
    connector: "bg-muted-foreground/15",
    text: "text-muted-foreground",
    badge: "",
    badgeLabel: "",
  },
};

function getStepStatus(
  stepOrder: number,
  currentStep: number,
  enrollmentStatus: string
): StepStatus {
  if (enrollmentStatus === "completed") return "completed";
  if (stepOrder < currentStep) return "completed";
  if (stepOrder === currentStep) return "current";
  return "pending";
}

function formatDelay(value: number, unit: string): string {
  if (value === 0) return "";
  if (unit === "minutes" && value < 60) return `${value}m delay`;
  if (unit === "hours") return value === 1 ? "1hr delay" : `${value}hr delay`;
  if (unit === "days") return value === 1 ? "1 day delay" : `${value}d delay`;
  return `${value} ${unit}`;
}

function delayToMinutes(value: number, unit: string): number {
  if (unit === "hours") return value * 60;
  if (unit === "days") return value * 60 * 24;
  return value; // minutes
}

function formatProjectedDate(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    // Past date — show relative
    const absDays = Math.abs(diffDays);
    if (absDays === 0) return "Today";
    if (absDays === 1) return "Yesterday";
    return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) {
    return date.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
  }
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

export function WorkflowStepperCard({
  enrollment,
  steps,
  defaultCollapsed = false,
}: {
  enrollment: Enrollment;
  steps: WorkflowStep[];
  defaultCollapsed?: boolean;
}) {
  const sortedSteps = [...steps].sort((a, b) => a.step_order - b.step_order);
  const completedCount =
    enrollment.status === "completed"
      ? sortedSteps.length
      : Math.max(0, enrollment.current_step - 1);
  const totalSteps = sortedSteps.length;

  // Compute projected dates for each step
  const projectedDates: Record<string, Date> = {};
  if (enrollment.started_at) {
    let cumulativeMinutes = 0;
    for (const step of sortedSteps) {
      cumulativeMinutes += delayToMinutes(step.delay_value, step.delay_unit);
      const projected = new Date(
        new Date(enrollment.started_at).getTime() + cumulativeMinutes * 60 * 1000
      );
      projectedDates[step.id] = projected;
    }
  }
  const allComplete =
    enrollment.status === "completed" || completedCount === totalSteps;

  const blueprint = WORKFLOW_BLUEPRINTS.find(
    (w) => w.slug === enrollment.workflows.slug
  );
  const workflowIcon = blueprint?.icon ?? "⚡";

  const isPaused = enrollment.status === "paused";
  const isExited = enrollment.status === "exited";
  const isFailed = enrollment.status === "failed";
  const isInactive = isPaused || isExited || isFailed;

  const [collapsed, setCollapsed] = useState(allComplete || defaultCollapsed);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handlePause() {
    startTransition(async () => {
      await updateEnrollment(enrollment.id, { status: "paused" });
      router.refresh();
    });
  }

  function handleResume() {
    startTransition(async () => {
      await updateEnrollment(enrollment.id, { status: "active" });
      router.refresh();
    });
  }

  function handleExit() {
    startTransition(async () => {
      await updateEnrollment(enrollment.id, {
        status: "exited",
        exit_reason: "Manually removed by agent",
      });
      router.refresh();
    });
  }

  const statusBadge = (() => {
    if (allComplete)
      return {
        label: "COMPLETED",
        className:
          "bg-[#0F7694]/10 text-[#0A6880] dark:bg-[#1a1535]/30 dark:text-[#67D4E8]",
      };
    if (isPaused)
      return {
        label: "PAUSED",
        className:
          "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      };
    if (isExited)
      return {
        label: "EXITED",
        className:
          "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400",
      };
    if (isFailed)
      return {
        label: "FAILED",
        className:
          "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
      };
    return {
      label: "ACTIVE",
      className:
        "bg-[#0F7694]/10 text-[#0A6880] dark:bg-[#1a1535]/30 dark:text-[#67D4E8]",
    };
  })();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl">{workflowIcon}</span>
          <h2 className="text-lg font-semibold">
            {enrollment.workflows.name}
          </h2>
          <span
            className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Action buttons */}
          {enrollment.status === "active" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePause}
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-amber-600"
              title="Pause"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Pause className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {isPaused && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResume}
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-[#0F7694]"
              title="Resume"
            >
              {isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </Button>
          )}
          {(enrollment.status === "active" || isPaused) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExit}
              disabled={isPending}
              className="text-xs text-muted-foreground hover:text-red-600"
              title="Remove from workflow"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          <span className="text-sm text-muted-foreground">
            {completedCount}/{totalSteps} steps
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${
            allComplete
              ? "bg-[#0F7694]/50"
              : isPaused
                ? "bg-amber-500"
                : "bg-[#0F7694]"
          }`}
          style={{
            width: `${totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Next run indicator */}
      {enrollment.next_run_at &&
        enrollment.status === "active" &&
        !allComplete && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            Next step:{" "}
            {new Date(enrollment.next_run_at).toLocaleDateString("en-CA", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </div>
        )}

      {/* Exit reason */}
      {enrollment.exit_reason && (
        <p className="text-xs text-muted-foreground italic">
          {enrollment.exit_reason}
        </p>
      )}

      {/* Step Timeline — collapsible */}
      {!collapsed && (
        <div className="relative">
          {sortedSteps.map((step, i) => {
            const status = getStepStatus(
              step.step_order,
              enrollment.current_step,
              enrollment.status
            );
            const styles = STATUS_STYLES[status];
            const isLast = i === sortedSteps.length - 1;
            const icon =
              ACTION_TYPE_ICONS[step.action_type as WorkflowActionType] ?? "⚙️";
            const delay = formatDelay(step.delay_value, step.delay_unit);
            const projected = projectedDates[step.id];

            return (
              <div key={step.id} className="flex gap-4 pb-6 last:pb-0">
                {/* Timeline connector + circle */}
                <div className="flex flex-col items-center">
                  {status === "completed" ? (
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}
                    >
                      <Check className="h-5 w-5 text-white" />
                    </div>
                  ) : status === "current" ? (
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}
                    >
                      <span className="text-sm font-bold text-[#0F7694] dark:text-[#67D4E8]">
                        {step.step_order}
                      </span>
                    </div>
                  ) : (
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${styles.circle}`}
                    >
                      <span className="text-sm font-medium text-muted-foreground/50">
                        {step.step_order}
                      </span>
                    </div>
                  )}
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 mt-1.5 ${styles.connector}`}
                    />
                  )}
                </div>

                {/* Content */}
                <div className="pb-2 min-w-0 pt-1.5 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-base">{icon}</span>
                    <p
                      className={`text-base font-semibold leading-6 ${styles.text}`}
                    >
                      {step.name}
                    </p>
                    {styles.badgeLabel && (
                      <span
                        className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide ${styles.badge}`}
                      >
                        {styles.badgeLabel}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-7">
                    <Badge
                      variant="outline"
                      className="text-[10px] capitalize"
                    >
                      {step.action_type.replace(/_/g, " ")}
                    </Badge>
                    {delay && (
                      <span className="text-xs text-muted-foreground">
                        {delay}
                      </span>
                    )}
                    {projected && status !== "completed" && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatProjectedDate(projected)}
                      </span>
                    )}
                    {step.exit_on_reply && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Exits on reply
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
