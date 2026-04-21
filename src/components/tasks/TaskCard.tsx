"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY_CONFIG, TASK_CATEGORY_LABELS } from "@/lib/constants";
import {
  CheckCircle2, Circle, Clock, Trash2, ArrowRight,
  Calendar, User, Building2, AlertTriangle, Flag,
  Pencil, Copy, Archive, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { TaskComments, CommentToggle } from "./TaskComments";
import { TaskForm } from "./TaskForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TaskData, TeamMember } from "@/hooks/useTasks";

interface TaskCardProps {
  task: TaskData;
  onUpdate: () => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  teamMembers?: TeamMember[];
}

export function TaskCard({ task, onUpdate, isSelected = false, onToggleSelect, teamMembers = [] }: TaskCardProps) {
  const priority = TASK_PRIORITY_CONFIG[task.priority] ?? TASK_PRIORITY_CONFIG.medium;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const isOverdue = task.is_overdue;
  const isArchived = !!task.archived_at;

  async function updateStatus(newStatus: string) {
    try {
      const resp = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      if (!resp.ok) throw new Error("Failed");
      toast.success(newStatus === "completed" ? "Task completed!" : "Task updated");
      onUpdate();
    } catch {
      toast.error("Failed to update task");
    }
  }

  async function deleteTask() {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await fetch(`/api/tasks?id=${task.id}`, { method: "DELETE" });
      toast.success("Task deleted");
      onUpdate();
    } catch {
      toast.error("Failed to delete task");
    }
  }

  async function duplicateTask() {
    try {
      const resp = await fetch(`/api/tasks/${task.id}`, { method: "POST" });
      if (!resp.ok) throw new Error("Failed");
      toast.success("Task duplicated");
      onUpdate();
    } catch {
      toast.error("Duplicate failed");
    }
  }

  async function toggleArchive() {
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, archived_at: isArchived ? null : new Date().toISOString() }),
      });
      toast.success(isArchived ? "Unarchived" : "Archived");
      onUpdate();
    } catch {
      toast.error("Failed");
    }
  }

  function nextStatus() {
    if (task.status === "pending") return "in_progress";
    if (task.status === "in_progress") return "completed";
    return "pending";
  }

  function formatDueDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }

  return (
    <div className={cn(
      "flex flex-col p-2 md:p-3 rounded-xl transition-colors group",
      task.status === "completed" ? "bg-muted/30 opacity-60"
        : isOverdue ? "bg-red-50/50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800 shadow-sm"
        : "bg-muted/40 hover:bg-muted/60"
    )}>
      <div className="flex items-start gap-2 md:gap-3">
        {/* Status toggle / select */}
        <button
          onClick={(e) => {
            if (onToggleSelect) { e.stopPropagation(); onToggleSelect(task.id); }
            else updateStatus(nextStatus());
          }}
          className="mt-0.5 shrink-0 transition-colors"
          title={onToggleSelect ? (isSelected ? "Deselect" : "Select") : `Mark as ${nextStatus()}`}
        >
          {onToggleSelect && isSelected ? <CheckCircle2 className="h-5 w-5 text-brand" />
            : task.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-success" />
            : task.status === "in_progress" ? <Clock className="h-5 w-5 text-brand" />
            : <Circle className="h-5 w-5 text-muted-foreground/50 hover:text-primary" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/tasks/${task.id}`}
              className={cn("text-sm font-medium hover:text-brand transition-colors",
                task.status === "completed" && "line-through text-muted-foreground")}>
              {task.title}
            </Link>
            <Flag className={cn("h-3 w-3 shrink-0", priority.color)} />
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{task.description}</p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
              {TASK_CATEGORY_LABELS[task.category as keyof typeof TASK_CATEGORY_LABELS] ?? task.category}
            </span>

            {task.due_date && (
              <span className={cn("flex items-center gap-1 text-[10px]",
                isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground")}>
                {isOverdue ? <AlertTriangle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {formatDueDate(task.due_date)}
              </span>
            )}

            {task.recurrence_rule && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <RotateCcw className="h-3 w-3" />Recurring
              </span>
            )}

            {task.contacts?.name && (
              <Link href={`/contacts/${task.contact_id}`} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                <User className="h-3 w-3" />{task.contacts.name}
              </Link>
            )}

            {task.listings?.address && (
              <Link href={`/listings/${task.listing_id}`} className="flex items-center gap-1 text-[10px] text-primary hover:underline">
                <Building2 className="h-3 w-3" />
                {task.listings.address.length > 25 ? task.listings.address.slice(0, 25) + "..." : task.listings.address}
              </Link>
            )}

            {task.assignee_name && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="h-4 w-4 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[8px] font-bold">
                  {task.assignee_name.charAt(0).toUpperCase()}
                </span>
                {task.assignee_name}
              </span>
            )}

            {task.labels?.length > 0 && task.labels.map((label) => (
              <span key={label} className="text-[10px] px-1 py-0 rounded bg-brand/10 text-brand font-medium">{label}</span>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <CommentToggle commentCount={task.comment_count} isOpen={commentsOpen} onToggle={() => setCommentsOpen(!commentsOpen)} />
          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button onClick={() => setEditOpen(true)} className="p-1 rounded hover:bg-muted" title="Edit">
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={duplicateTask} className="p-1 rounded hover:bg-muted" title="Duplicate">
              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button onClick={toggleArchive} className="p-1 rounded hover:bg-muted" title={isArchived ? "Unarchive" : "Archive"}>
              <Archive className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {task.status !== "completed" && (
              <button onClick={() => updateStatus("completed")} className="p-1 rounded hover:bg-brand-muted" title="Complete">
                <ArrowRight className="h-3.5 w-3.5 text-brand" />
              </button>
            )}
            <button onClick={deleteTask} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900" title="Delete">
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      <TaskComments taskId={task.id} isOpen={commentsOpen} />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <TaskForm task={task} teamMembers={teamMembers}
            onSuccess={() => { setEditOpen(false); onUpdate(); }}
            onCancel={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
