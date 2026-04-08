"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Zap,
  Plus,
  Pause,
  Play,
  X,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { enrollContact, updateEnrollment } from "@/actions/workflows";
import { ENROLLMENT_STATUS_COLORS, WORKFLOW_BLUEPRINTS } from "@/lib/constants";

type Enrollment = {
  id: string;
  workflow_id: string;
  status: string;
  current_step: number;
  next_run_at: string | null;
  started_at: string;
  completed_at: string | null;
  exit_reason: string | null;
  workflows: { id: string; name: string; slug: string };
};

type WorkflowOption = {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
};

export function ContactWorkflowEnrollments({
  contactId,
  enrollments,
  workflows,
}: {
  contactId: string;
  enrollments: Enrollment[];
  workflows: WorkflowOption[];
}) {
  const [showEnroll, setShowEnroll] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>("");
  const [expanded, setExpanded] = useState(true);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const activeEnrollments = enrollments.filter((e) => e.status === "active" || e.status === "paused");
  const pastEnrollments = enrollments.filter((e) => e.status !== "active" && e.status !== "paused");

  // Filter out workflows already actively enrolled
  const activeWorkflowIds = new Set(activeEnrollments.map((e) => e.workflow_id));
  const availableWorkflows = workflows.filter(
    (w) => w.is_active && !activeWorkflowIds.has(w.id)
  );

  function handleEnroll() {
    if (!selectedWorkflow) return;
    startTransition(async () => {
      await enrollContact(selectedWorkflow, contactId);
      setSelectedWorkflow("");
      setShowEnroll(false);
      router.refresh();
    });
  }

  function handlePause(enrollmentId: string) {
    startTransition(async () => {
      await updateEnrollment(enrollmentId, { status: "paused" });
      router.refresh();
    });
  }

  function handleResume(enrollmentId: string) {
    startTransition(async () => {
      await updateEnrollment(enrollmentId, { status: "active" });
      router.refresh();
    });
  }

  function handleExit(enrollmentId: string) {
    startTransition(async () => {
      await updateEnrollment(enrollmentId, {
        status: "exited",
        exit_reason: "Manually removed by agent",
      });
      router.refresh();
    });
  }

  function getWorkflowIcon(slug: string): string {
    return WORKFLOW_BLUEPRINTS.find((w) => w.slug === slug)?.icon || "⚡";
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "active": return <Play className="h-3 w-3 text-[#0F7694]" />;
      case "paused": return <Pause className="h-3 w-3 text-amber-500" />;
      case "completed": return <CheckCircle2 className="h-3 w-3 text-[#0F7694]" />;
      case "exited": return <XCircle className="h-3 w-3 text-gray-500" />;
      case "failed": return <AlertCircle className="h-3 w-3 text-red-500" />;
      default: return <Clock className="h-3 w-3 text-muted-foreground" />;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-lg font-semibold hover:text-primary transition-colors"
        >
          <Zap className="h-5 w-5 text-muted-foreground" />
          Workflows
          {activeEnrollments.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {activeEnrollments.length} active
            </span>
          )}
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
        {expanded && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowEnroll(!showEnroll)}
            className="text-xs"
            disabled={availableWorkflows.length === 0}
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Enroll
          </Button>
        )}
      </div>

      {expanded && (
        <>
          {/* Enroll form */}
          {showEnroll && (
            <div className="p-3 rounded-lg border border-border bg-background space-y-3">
              <Select
                value={selectedWorkflow}
                onValueChange={(val: string | null) => setSelectedWorkflow(val ?? "")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select workflow..." />
                </SelectTrigger>
                <SelectContent>
                  {availableWorkflows.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {getWorkflowIcon(w.slug)} {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleEnroll}
                  disabled={isPending || !selectedWorkflow}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  ) : (
                    <Zap className="h-4 w-4 mr-1.5" />
                  )}
                  Enroll
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEnroll(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Active enrollments */}
          {activeEnrollments.length > 0 && (
            <div className="space-y-2">
              {activeEnrollments.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">
                      {getWorkflowIcon(e.workflows.slug)}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.workflows.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] ${
                            ENROLLMENT_STATUS_COLORS[e.status as keyof typeof ENROLLMENT_STATUS_COLORS] || ""
                          }`}
                        >
                          {getStatusIcon(e.status)}
                          <span className="ml-1">{e.status}</span>
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          Step {e.current_step}
                        </span>
                        {e.next_run_at && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Next:{" "}
                            {new Date(e.next_run_at).toLocaleDateString(
                              "en-CA",
                              { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {e.status === "active" ? (
                      <button
                        type="button"
                        onClick={() => handlePause(e.id)}
                        disabled={isPending}
                        className="p-1.5 text-muted-foreground hover:text-amber-500 transition-colors"
                        title="Pause"
                      >
                        <Pause className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleResume(e.id)}
                        disabled={isPending}
                        className="p-1.5 text-muted-foreground hover:text-[#0F7694] transition-colors"
                        title="Resume"
                      >
                        <Play className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleExit(e.id)}
                      disabled={isPending}
                      className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Past enrollments (collapsed) */}
          {pastEnrollments.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1.5">
                <ChevronRight className="h-3.5 w-3.5 group-open:rotate-90 transition-transform" />
                Past ({pastEnrollments.length})
              </summary>
              <div className="space-y-2 mt-2">
                {pastEnrollments.map((e) => (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg border border-border/30 bg-muted/10 opacity-70"
                  >
                    <span className="text-base">
                      {getWorkflowIcon(e.workflows.slug)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">
                        {e.workflows.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          variant="secondary"
                          className={`text-[9px] ${
                            ENROLLMENT_STATUS_COLORS[e.status as keyof typeof ENROLLMENT_STATUS_COLORS] || ""
                          }`}
                        >
                          {e.status}
                        </Badge>
                        {e.exit_reason && (
                          <span className="text-[10px] text-muted-foreground">
                            {e.exit_reason}
                          </span>
                        )}
                        {e.completed_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(e.completed_at).toLocaleDateString("en-CA", {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Empty state */}
          {enrollments.length === 0 && !showEnroll && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Not enrolled in any workflows. Click &quot;Enroll&quot; to start.
            </p>
          )}
        </>
      )}
    </div>
  );
}
