"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updateWorkflow,
  seedWorkflowSteps,
  createWorkflowStep,
  updateWorkflowStep,
  deleteWorkflowStep,
  enrollContact,
  updateEnrollment,
} from "@/actions/workflows";
import {
  ACTION_TYPE_LABELS,
  ACTION_TYPE_ICONS,
  ACTION_TYPE_COLORS,
  WORKFLOW_ACTION_TYPES,
  ENROLLMENT_STATUS_COLORS,
  formatDelay,
  getWorkflowBlueprint,
} from "@/lib/constants";
import type {
  Workflow,
  WorkflowStep,
  WorkflowEnrollment,
  MessageTemplate,
} from "@/types";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Edit,
  Play,
  Pause,
  Loader2,
  Check,
  Clock,
  Users,
  Zap,
} from "lucide-react";

type WorkflowWithSteps = Workflow & { workflow_steps: WorkflowStep[] };
type EnrollmentWithContact = WorkflowEnrollment & {
  contacts: { id: string; name: string };
};

interface WorkflowDetailProps {
  workflow: WorkflowWithSteps;
  enrollments: EnrollmentWithContact[];
  templates: MessageTemplate[];
  contacts: { id: string; name: string; type: string }[];
}

const DELAY_UNITS = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
];

type StepFormData = {
  name: string;
  action_type: string;
  delay_value: number;
  delay_unit: string;
  template_id: string;
  exit_on_reply: boolean;
  task_title: string;
  task_priority: string;
  task_category: string;
  action_action: string;
  action_value: string;
};

const defaultStepForm: StepFormData = {
  name: "",
  action_type: "auto_sms",
  delay_value: 0,
  delay_unit: "minutes",
  template_id: "",
  exit_on_reply: false,
  task_title: "",
  task_priority: "medium",
  task_category: "follow_up",
  action_action: "",
  action_value: "",
};

export default function WorkflowDetail({
  workflow,
  enrollments,
  templates,
  contacts,
}: WorkflowDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Inline editing
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameValue, setNameValue] = useState(workflow.name);
  const [descValue, setDescValue] = useState(workflow.description || "");

  // Step editor dialog
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [stepForm, setStepForm] = useState<StepFormData>(defaultStepForm);

  // Enroll contact dialog
  const [enrollDialogOpen, setEnrollDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState("");

  // Seed confirmation
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);

  const steps = workflow.workflow_steps;

  // ── Inline field save ─────────────────────────────────────────
  function saveField(field: "name" | "description", value: string) {
    startTransition(async () => {
      await updateWorkflow(workflow.id, { [field]: value });
      if (field === "name") setEditingName(false);
      if (field === "description") setEditingDesc(false);
      router.refresh();
    });
  }

  // ── Toggle active ─────────────────────────────────────────────
  function toggleActive() {
    startTransition(async () => {
      await updateWorkflow(workflow.id, { is_active: !workflow.is_active });
      router.refresh();
    });
  }

  // ── Seed default steps ────────────────────────────────────────
  function handleSeed() {
    startTransition(async () => {
      await seedWorkflowSteps(workflow.id, workflow.slug);
      setSeedConfirmOpen(false);
      router.refresh();
    });
  }

  // ── Open step editor ──────────────────────────────────────────
  function openAddStep() {
    setEditingStep(null);
    setStepForm(defaultStepForm);
    setStepDialogOpen(true);
  }

  function openEditStep(step: WorkflowStep) {
    const taskConfig = (step.task_config || {}) as Record<string, unknown>;
    const actionConfig = (step.action_config || {}) as Record<string, unknown>;
    setEditingStep(step);
    setStepForm({
      name: step.name,
      action_type: step.action_type,
      delay_value: step.delay_value,
      delay_unit: step.delay_unit || "minutes",
      template_id: step.template_id || "",
      exit_on_reply: step.exit_on_reply,
      task_title: (taskConfig.title as string) || "",
      task_priority: (taskConfig.priority as string) || "medium",
      task_category: (taskConfig.category as string) || "follow_up",
      action_action: (actionConfig.action as string) || "",
      action_value: (actionConfig.value as string) || "",
    });
    setStepDialogOpen(true);
  }

  // ── Save step ─────────────────────────────────────────────────
  function handleSaveStep() {
    startTransition(async () => {
      const taskConfig =
        stepForm.action_type === "manual_task"
          ? {
              title: stepForm.task_title,
              priority: stepForm.task_priority,
              category: stepForm.task_category,
            }
          : {};

      const actionConfig =
        stepForm.action_type === "system_action"
          ? {
              action: stepForm.action_action,
              value: stepForm.action_value,
            }
          : {};

      if (editingStep) {
        await updateWorkflowStep(editingStep.id, {
          name: stepForm.name,
          action_type: stepForm.action_type,
          delay_value: stepForm.delay_value,
          delay_unit: stepForm.delay_unit,
          template_id: stepForm.template_id || null,
          exit_on_reply: stepForm.exit_on_reply,
          task_config: taskConfig,
          action_config: actionConfig,
        });
      } else {
        await createWorkflowStep(workflow.id, {
          step_order: steps.length + 1,
          name: stepForm.name,
          action_type: stepForm.action_type,
          delay_value: stepForm.delay_value,
          delay_unit: stepForm.delay_unit,
          template_id: stepForm.template_id || undefined,
          exit_on_reply: stepForm.exit_on_reply,
          task_config: taskConfig,
          action_config: actionConfig,
        });
      }
      setStepDialogOpen(false);
      router.refresh();
    });
  }

  // ── Delete step ───────────────────────────────────────────────
  function handleDeleteStep(stepId: string) {
    startTransition(async () => {
      await deleteWorkflowStep(stepId);
      router.refresh();
    });
  }

  // ── Enroll contact ────────────────────────────────────────────
  function handleEnroll() {
    if (!selectedContactId) return;
    startTransition(async () => {
      await enrollContact(workflow.id, selectedContactId);
      setEnrollDialogOpen(false);
      setSelectedContactId("");
      router.refresh();
    });
  }

  // ── Pause/Resume enrollment ───────────────────────────────────
  function handleToggleEnrollment(
    enrollmentId: string,
    currentStatus: string
  ) {
    const newStatus = currentStatus === "active" ? "paused" : "active";
    startTransition(async () => {
      await updateEnrollment(enrollmentId, {
        status: newStatus as "active" | "paused",
      });
      router.refresh();
    });
  }

  // ── Exit enrollment ───────────────────────────────────────────
  function handleExitEnrollment(enrollmentId: string) {
    startTransition(async () => {
      await updateEnrollment(enrollmentId, {
        status: "exited",
        exit_reason: "Manually exited by agent",
      });
      router.refresh();
    });
  }

  // ── Helper: find template name ────────────────────────────────
  function templateName(templateId: string | null): string | null {
    if (!templateId) return null;
    const t = templates.find((tpl) => tpl.id === templateId);
    return t ? t.name : null;
  }

  // ── Helper: get action color classes ──────────────────────────
  function actionColors(actionType: string) {
    const colors =
      ACTION_TYPE_COLORS[actionType as keyof typeof ACTION_TYPE_COLORS];
    return colors || { bg: "bg-gray-50", text: "text-gray-600" };
  }

  const blueprint = getWorkflowBlueprint(workflow.slug);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="lf-glass sticky top-[100px] z-10 px-5 py-4 -mx-[18px] -mt-[18px] mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              href="/automations"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="min-w-0">
              {editingName ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    className="text-xl font-bold h-9 w-72"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveField("name", nameValue);
                      if (e.key === "Escape") {
                        setNameValue(workflow.name);
                        setEditingName(false);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => saveField("name", nameValue)}
                    disabled={isPending}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <h1
                  className="text-xl font-bold bg-gradient-to-r from-[var(--lf-indigo)] to-[var(--lf-coral)] bg-clip-text text-transparent cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setEditingName(true)}
                >
                  {workflow.name}
                </h1>
              )}
              {editingDesc ? (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    value={descValue}
                    onChange={(e) => setDescValue(e.target.value)}
                    className="text-sm h-7 w-96"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter")
                        saveField("description", descValue);
                      if (e.key === "Escape") {
                        setDescValue(workflow.description || "");
                        setEditingDesc(false);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => saveField("description", descValue)}
                    disabled={isPending}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <p
                  className="text-sm text-muted-foreground mt-0.5 cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => setEditingDesc(true)}
                >
                  {workflow.description || "Click to add description..."}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Seed Default Steps */}
            {blueprint && (
              <Dialog open={seedConfirmOpen} onOpenChange={setSeedConfirmOpen}>
                <DialogTrigger
                  render={
                    <Button variant="outline" size="sm">
                      <Zap className="w-4 h-4 mr-1" />
                      Seed Default Steps
                    </Button>
                  }
                />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Seed Default Steps?</DialogTitle>
                  </DialogHeader>
                  <p className="text-sm text-muted-foreground">
                    This will replace all current steps with the default
                    blueprint for <strong>{blueprint.name}</strong> (
                    {blueprint.steps.length} steps). This action cannot be
                    undone.
                  </p>
                  <div className="flex justify-end gap-2 mt-4">
                    <Button
                      variant="outline"
                      onClick={() => setSeedConfirmOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSeed} disabled={isPending}>
                      {isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Zap className="w-4 h-4 mr-1" />
                      )}
                      Seed Steps
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
            {/* Active/Inactive Toggle */}
            <Button
              variant={workflow.is_active ? "default" : "outline"}
              size="sm"
              onClick={toggleActive}
              disabled={isPending}
              className={
                workflow.is_active
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : ""
              }
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : workflow.is_active ? (
                <Pause className="w-4 h-4 mr-1" />
              ) : (
                <Play className="w-4 h-4 mr-1" />
              )}
              {workflow.is_active ? "Active" : "Inactive"}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Steps Timeline (2/3 width) ───────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--lf-indigo)]" />
              Workflow Steps
              <Badge variant="secondary" className="ml-1">
                {steps.length}
              </Badge>
            </h2>
            <Button size="sm" onClick={openAddStep}>
              <Plus className="w-4 h-4 mr-1" />
              Add Step
            </Button>
          </div>

          {steps.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-muted-foreground mb-4">
                  No steps configured yet.
                  {blueprint
                    ? " Seed default steps from the blueprint or add steps manually."
                    : " Add steps to define your workflow sequence."}
                </p>
                <div className="flex items-center justify-center gap-2">
                  {blueprint && (
                    <Button
                      variant="outline"
                      onClick={() => setSeedConfirmOpen(true)}
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      Seed Default Steps
                    </Button>
                  )}
                  <Button onClick={openAddStep}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add Step
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-[23px] top-[28px] bottom-[28px] w-[2px] bg-gradient-to-b from-[var(--lf-indigo)] via-[var(--lf-indigo)]/40 to-[var(--lf-indigo)]/10 rounded-full" />

              <div className="space-y-0">
                {steps.map((step, idx) => {
                  const colors = actionColors(step.action_type);
                  const icon =
                    ACTION_TYPE_ICONS[
                      step.action_type as keyof typeof ACTION_TYPE_ICONS
                    ] || "⚙️";
                  const label =
                    ACTION_TYPE_LABELS[
                      step.action_type as keyof typeof ACTION_TYPE_LABELS
                    ] || step.action_type;
                  const tplName = templateName(step.template_id);
                  const delay = formatDelay(
                    step.delay_value,
                    step.delay_unit || "minutes"
                  );
                  const isWait = step.action_type === "wait";
                  const isMilestone = step.action_type === "milestone";

                  return (
                    <div key={step.id} className="relative group">
                      {/* Delay indicator between steps */}
                      {idx > 0 && step.delay_value > 0 && !isWait && (
                        <div className="flex items-center gap-2 py-1.5 pl-[38px] text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>Wait {delay}</span>
                        </div>
                      )}

                      <div className="flex items-start gap-3 py-2 px-1 rounded-lg transition-colors hover:bg-black/[0.02]">
                        {/* Step number circle */}
                        <div
                          className={`relative z-10 flex-shrink-0 w-[46px] h-[46px] rounded-full flex items-center justify-center text-sm font-bold shadow-sm border-2 ${
                            isWait
                              ? "bg-gray-50 border-gray-200 text-gray-500"
                              : isMilestone
                              ? "bg-teal-50 border-teal-300 text-teal-600"
                              : "bg-white border-[var(--lf-indigo)]/30 text-[var(--lf-indigo)]"
                          }`}
                        >
                          {isWait ? (
                            <span className="text-lg">⏳</span>
                          ) : isMilestone ? (
                            <span className="text-lg">🏁</span>
                          ) : (
                            idx + 1
                          )}
                        </div>

                        {/* Step content */}
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Action type badge */}
                            <Badge
                              variant="secondary"
                              className={`${colors.bg} ${colors.text} text-xs font-medium px-2 py-0.5`}
                            >
                              <span className="mr-1">{icon}</span>
                              {label}
                            </Badge>

                            {step.exit_on_reply && (
                              <Badge
                                variant="outline"
                                className="text-xs border-amber-300 text-amber-600 bg-amber-50"
                              >
                                Exits on reply
                              </Badge>
                            )}

                            {tplName && (
                              <Badge
                                variant="outline"
                                className="text-xs border-blue-200 text-blue-600 bg-blue-50"
                              >
                                📄 {tplName}
                              </Badge>
                            )}
                          </div>

                          <p className="text-sm font-medium mt-1 text-foreground">
                            {step.name}
                          </p>

                          {isWait && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Wait{" "}
                              {formatDelay(
                                step.delay_value,
                                step.delay_unit || "minutes"
                              )}{" "}
                              before next step
                            </p>
                          )}

                          {step.action_type === "manual_task" &&
                            Boolean((step.task_config as Record<string, unknown>)?.title) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Task:{" "}
                                {String(
                                  (step.task_config as Record<string, unknown>)
                                    .title
                                )}
                              </p>
                            )}

                          {step.action_type === "system_action" &&
                            Boolean((step.action_config as Record<string, unknown>)?.action) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Action:{" "}
                                {String(
                                  (step.action_config as Record<string, unknown>)
                                    .action
                                )}{" "}
                                &rarr;{" "}
                                {String(
                                  (step.action_config as Record<string, unknown>)
                                    .value
                                )}
                              </p>
                            )}

                          {step.action_type === "milestone" &&
                            Boolean((step.action_config as Record<string, unknown>)?.description) && (
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {String(
                                  (step.action_config as Record<string, unknown>)
                                    .description
                                )}
                              </p>
                            )}

                          {!isWait && delay !== "Immediate" && (
                            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Delay: {delay}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={() => openEditStep(step)}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => handleDeleteStep(step.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add step button at bottom */}
              <div className="relative flex items-center gap-3 pt-3 pl-1">
                <div className="relative z-10 flex-shrink-0 w-[46px] h-[46px] rounded-full flex items-center justify-center border-2 border-dashed border-gray-300 bg-white hover:border-[var(--lf-indigo)] hover:bg-[var(--lf-indigo)]/5 transition-colors cursor-pointer"
                  onClick={openAddStep}
                >
                  <Plus className="w-5 h-5 text-gray-400" />
                </div>
                <button
                  onClick={openAddStep}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Add another step
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Enrollments Sidebar (1/3 width) ──────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-[var(--lf-indigo)]" />
              Enrollments
              <Badge variant="secondary" className="ml-1">
                {enrollments.length}
              </Badge>
            </h2>
            <Dialog open={enrollDialogOpen} onOpenChange={setEnrollDialogOpen}>
              <DialogTrigger
                render={
                  <Button size="sm" variant="outline">
                    <Plus className="w-4 h-4 mr-1" />
                    Enroll
                  </Button>
                }
              />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enroll Contact</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label>Select Contact</Label>
                    <Select
                      value={selectedContactId || undefined}
                      onValueChange={(val) => setSelectedContactId(val ?? "")}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {contacts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}{" "}
                            <span className="text-muted-foreground text-xs ml-1">
                              ({c.type})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setEnrollDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleEnroll}
                      disabled={!selectedContactId || isPending}
                    >
                      {isPending ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Plus className="w-4 h-4 mr-1" />
                      )}
                      Enroll
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {enrollments.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <div className="text-3xl mb-2">👥</div>
                <p className="text-sm text-muted-foreground">
                  No contacts enrolled yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {enrollments.map((enrollment) => {
                const statusColor =
                  ENROLLMENT_STATUS_COLORS[
                    enrollment.status as keyof typeof ENROLLMENT_STATUS_COLORS
                  ] || "bg-gray-100 text-gray-800";

                return (
                  <Card key={enrollment.id} className="overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <Link
                            href={`/contacts/${enrollment.contact_id}`}
                            className="text-sm font-medium text-[var(--lf-indigo)] hover:underline block truncate"
                          >
                            {enrollment.contacts?.name || "Unknown Contact"}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              className={`${statusColor} text-xs px-1.5 py-0`}
                            >
                              {enrollment.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Step {enrollment.current_step} of {steps.length}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Started{" "}
                            {new Date(enrollment.started_at).toLocaleDateString(
                              "en-CA",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {(enrollment.status === "active" ||
                            enrollment.status === "paused") && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0"
                                onClick={() =>
                                  handleToggleEnrollment(
                                    enrollment.id,
                                    enrollment.status
                                  )
                                }
                                disabled={isPending}
                                title={
                                  enrollment.status === "active"
                                    ? "Pause"
                                    : "Resume"
                                }
                              >
                                {enrollment.status === "active" ? (
                                  <Pause className="w-3.5 h-3.5" />
                                ) : (
                                  <Play className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-600"
                                onClick={() =>
                                  handleExitEnrollment(enrollment.id)
                                }
                                disabled={isPending}
                                title="Exit workflow"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Step Editor Dialog ──────────────────────────────────── */}
      <Dialog open={stepDialogOpen} onOpenChange={setStepDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingStep ? "Edit Step" : "Add Step"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Step Name */}
            <div>
              <Label>Step Name</Label>
              <Input
                value={stepForm.name}
                onChange={(e) =>
                  setStepForm({ ...stepForm, name: e.target.value })
                }
                placeholder="e.g. Send welcome email"
                className="mt-1"
              />
            </div>

            {/* Action Type */}
            <div>
              <Label>Action Type</Label>
              <Select
                value={stepForm.action_type}
                onValueChange={(val) =>
                  setStepForm({ ...stepForm, action_type: val ?? "auto_sms" })
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WORKFLOW_ACTION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      <span className="mr-2">
                        {ACTION_TYPE_ICONS[type]}
                      </span>
                      {ACTION_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delay */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Delay Value</Label>
                <Input
                  type="number"
                  min={0}
                  value={stepForm.delay_value}
                  onChange={(e) =>
                    setStepForm({
                      ...stepForm,
                      delay_value: parseInt(e.target.value) || 0,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Delay Unit</Label>
                <Select
                  value={stepForm.delay_unit}
                  onValueChange={(val) =>
                    setStepForm({ ...stepForm, delay_unit: val ?? "minutes" })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DELAY_UNITS.map((u) => (
                      <SelectItem key={u.value} value={u.value}>
                        {u.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Template (for message types) */}
            {["auto_email", "auto_sms", "auto_whatsapp"].includes(
              stepForm.action_type
            ) && (
              <div>
                <Label>Message Template</Label>
                <Select
                  value={stepForm.template_id || "none"}
                  onValueChange={(val) =>
                    setStepForm({
                      ...stepForm,
                      template_id: val === "none" || !val ? "" : val,
                    })
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No template</SelectItem>
                    {templates.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}{" "}
                        <span className="text-muted-foreground">
                          ({tpl.channel})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Exit on reply checkbox */}
            {["auto_email", "auto_sms", "auto_whatsapp"].includes(
              stepForm.action_type
            ) && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="exit_on_reply"
                  checked={stepForm.exit_on_reply}
                  onChange={(e) =>
                    setStepForm({
                      ...stepForm,
                      exit_on_reply: e.target.checked,
                    })
                  }
                  className="rounded border-gray-300 text-[var(--lf-indigo)] focus:ring-[var(--lf-indigo)]"
                />
                <Label htmlFor="exit_on_reply" className="text-sm font-normal">
                  Exit workflow if contact replies
                </Label>
              </div>
            )}

            {/* Manual Task fields */}
            {stepForm.action_type === "manual_task" && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Task Configuration
                </p>
                <div>
                  <Label>Task Title</Label>
                  <Input
                    value={stepForm.task_title}
                    onChange={(e) =>
                      setStepForm({ ...stepForm, task_title: e.target.value })
                    }
                    placeholder="e.g. Call new lead"
                    className="mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Priority</Label>
                    <Select
                      value={stepForm.task_priority}
                      onValueChange={(val) =>
                        setStepForm({ ...stepForm, task_priority: val ?? "medium" })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Select
                      value={stepForm.task_category}
                      onValueChange={(val) =>
                        setStepForm({ ...stepForm, task_category: val ?? "follow_up" })
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="showing">Showing</SelectItem>
                        <SelectItem value="closing">Closing</SelectItem>
                        <SelectItem value="marketing">Marketing</SelectItem>
                        <SelectItem value="general">General</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* System Action fields */}
            {stepForm.action_type === "system_action" && (
              <div className="space-y-3 border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  System Action Configuration
                </p>
                <div>
                  <Label>Action Type</Label>
                  <Select
                    value={stepForm.action_action || undefined}
                    onValueChange={(val) =>
                      setStepForm({ ...stepForm, action_action: val ?? "" })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="change_lead_status">
                        Change Lead Status
                      </SelectItem>
                      <SelectItem value="add_tag">Add Tag</SelectItem>
                      <SelectItem value="remove_tag">Remove Tag</SelectItem>
                      <SelectItem value="change_lifecycle_stage">
                        Change Lifecycle Stage
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    value={stepForm.action_value}
                    onChange={(e) =>
                      setStepForm({
                        ...stepForm,
                        action_value: e.target.value,
                      })
                    }
                    placeholder="e.g. nurturing, cold_lead"
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            {/* Save / Cancel */}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setStepDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveStep}
                disabled={!stepForm.name || isPending}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : editingStep ? (
                  <Check className="w-4 h-4 mr-1" />
                ) : (
                  <Plus className="w-4 h-4 mr-1" />
                )}
                {editingStep ? "Update Step" : "Add Step"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
