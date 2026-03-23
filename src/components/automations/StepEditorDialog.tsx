"use client";

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
} from "@/components/ui/dialog";
import { Plus, Check, Loader2 } from "lucide-react";
import {
  ACTION_TYPE_LABELS,
  ACTION_TYPE_ICONS,
  WORKFLOW_ACTION_TYPES,
} from "@/lib/constants";
import type { WorkflowStep, MessageTemplate } from "@/types";

export type StepFormData = {
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

export const defaultStepForm: StepFormData = {
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

const DELAY_UNITS = [
  { value: "minutes", label: "Minutes" },
  { value: "hours", label: "Hours" },
  { value: "days", label: "Days" },
];

interface StepEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingStep: WorkflowStep | null;
  stepForm: StepFormData;
  onStepFormChange: (form: StepFormData) => void;
  onSave: () => void;
  isPending: boolean;
  templates: MessageTemplate[];
}

export function StepEditorDialog({
  open,
  onOpenChange,
  editingStep,
  stepForm,
  onStepFormChange,
  onSave,
  isPending,
  templates,
}: StepEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                onStepFormChange({ ...stepForm, name: e.target.value })
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
                onStepFormChange({ ...stepForm, action_type: val ?? "auto_sms" })
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
                  onStepFormChange({
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
                  onStepFormChange({ ...stepForm, delay_unit: val ?? "minutes" })
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
                  onStepFormChange({
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
                  onStepFormChange({
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
                    onStepFormChange({ ...stepForm, task_title: e.target.value })
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
                      onStepFormChange({ ...stepForm, task_priority: val ?? "medium" })
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
                      onStepFormChange({ ...stepForm, task_category: val ?? "follow_up" })
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
                    onStepFormChange({ ...stepForm, action_action: val ?? "" })
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
                    onStepFormChange({
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
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={onSave}
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
  );
}
