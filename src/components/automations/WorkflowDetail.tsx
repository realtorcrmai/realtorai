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
  Zap,
} from "lucide-react";

import {
  StepEditorDialog,
  defaultStepForm,
  type StepFormData,
} from "./StepEditorDialog";
import { EnrollmentsSidebar } from "./EnrollmentsSidebar";

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
        <EnrollmentsSidebar
          enrollments={enrollments}
          contacts={contacts}
          stepsCount={steps.length}
          enrollDialogOpen={enrollDialogOpen}
          onEnrollDialogOpenChange={setEnrollDialogOpen}
          selectedContactId={selectedContactId}
          onSelectedContactChange={setSelectedContactId}
          onEnroll={handleEnroll}
          onToggleEnrollment={handleToggleEnrollment}
          onExitEnrollment={handleExitEnrollment}
          isPending={isPending}
        />
      </div>

      {/* ── Step Editor Dialog ──────────────────────────────────── */}
      <StepEditorDialog
        open={stepDialogOpen}
        onOpenChange={setStepDialogOpen}
        editingStep={editingStep}
        stepForm={stepForm}
        onStepFormChange={setStepForm}
        onSave={handleSaveStep}
        isPending={isPending}
        templates={templates}
      />
    </div>
  );
}
