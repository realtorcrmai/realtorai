"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY_CONFIG, TASK_CATEGORY_LABELS } from "@/lib/constants";
import {
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  ArrowRight,
  Calendar,
  User,
  Building2,
  AlertTriangle,
  Flag,
  Pencil,
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

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  due_date: string | null;
  contact_id: string | null;
  listing_id: string | null;
  created_at: string;
  completed_at: string | null;
  contacts: { name: string } | null;
  listings: { address: string } | null;
  comment_count?: number;
};

interface TaskCardProps {
  task: Task;
  onUpdate: () => void;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
}

export function TaskCard({ task, onUpdate, isSelected = false, onToggleSelect }: TaskCardProps) {
  const priority = TASK_PRIORITY_CONFIG[task.priority] ?? TASK_PRIORITY_CONFIG.medium;
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Compare date strings directly to avoid timezone issues
  const todayStr = new Date().toISOString().split("T")[0];
  const isOverdue = task.due_date && task.status !== "completed" && task.due_date < todayStr;

  async function updateStatus(newStatus: string) {
    try {
      const resp = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      if (!resp.ok) throw new Error("Failed to update");
      toast.success(
        newStatus === "completed" ? "Task completed!" : "Task updated"
      );
      onUpdate();
    } catch {
      toast.error("Failed to update task");
    }
  }

  async function deleteTask() {
    if (!window.confirm(`Delete "${task.title}"? This cannot be undone.`)) return;
    try {
      const resp = await fetch(`/api/tasks?id=${task.id}`, {
        method: "DELETE",
      });
      if (!resp.ok) throw new Error("Failed to delete");
      toast.success("Task deleted");
      onUpdate();
    } catch {
      toast.error("Failed to delete task");
    }
  }

  function nextStatus() {
    if (task.status === "pending") return "in_progress";
    if (task.status === "in_progress") return "completed";
    return "pending";
  }

  // Parse due_date safely for display (avoid timezone shift)
  function formatDueDate(dateStr: string) {
    const [year, month, day] = dateStr.split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  }

  return (
    <div
      className={cn(
        "flex flex-col p-2 md:p-3 rounded-xl transition-colors group",
        task.status === "completed"
          ? "bg-muted/30 opacity-60"
          : isOverdue
            ? "bg-red-50/50 dark:bg-red-950/20 border-2 border-red-300 dark:border-red-800 shadow-sm shadow-red-100 dark:shadow-red-950/30"
            : "bg-muted/40 hover:bg-muted/60"
      )}
    >
      <div className="flex items-start gap-2 md:gap-3">
        {/* Status toggle — also serves as selection indicator in bulk mode */}
        <button
          onClick={(e) => {
            if (onToggleSelect) {
              e.stopPropagation();
              onToggleSelect(task.id);
            } else {
              updateStatus(nextStatus());
            }
          }}
          className="mt-0.5 shrink-0 transition-colors"
          title={onToggleSelect ? (isSelected ? "Deselect" : "Select") : `Mark as ${nextStatus()}`}
        >
          {onToggleSelect && isSelected ? (
            <CheckCircle2 className="h-5 w-5 text-brand" />
          ) : task.status === "completed" ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : task.status === "in_progress" ? (
            <Clock className="h-5 w-5 text-brand" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground/50 hover:text-primary" />
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              className={cn(
                "text-sm font-medium",
                task.status === "completed" && "line-through text-muted-foreground"
              )}
            >
              {task.title}
            </p>
            <div className="flex items-center gap-1 shrink-0">
              <Flag className={cn("h-3 w-3", priority.color)} />
            </div>
          </div>

          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mt-1.5 md:mt-2">
            {/* Category badge */}
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-secondary-foreground font-medium">
              {TASK_CATEGORY_LABELS[task.category as keyof typeof TASK_CATEGORY_LABELS] ?? task.category}
            </span>

            {/* Due date */}
            {task.due_date && (
              <span
                className={cn(
                  "flex items-center gap-1 text-[10px]",
                  isOverdue
                    ? "text-red-500 font-semibold"
                    : "text-muted-foreground"
                )}
              >
                {isOverdue ? (
                  <AlertTriangle className="h-3 w-3" />
                ) : (
                  <Calendar className="h-3 w-3" />
                )}
                {formatDueDate(task.due_date)}
              </span>
            )}

            {/* Related contact */}
            {task.contacts?.name && (
              <Link
                href={`/contacts/${task.contact_id}`}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <User className="h-3 w-3" />
                {task.contacts.name}
              </Link>
            )}

            {/* Related listing */}
            {task.listings?.address && (
              <Link
                href={`/listings/${task.listing_id}`}
                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <Building2 className="h-3 w-3" />
                {task.listings.address.length > 25
                  ? task.listings.address.slice(0, 25) + "..."
                  : task.listings.address}
              </Link>
            )}
          </div>
        </div>

        {/* Actions — visible on mobile, hover-reveal on desktop */}
        <div className="flex items-center gap-1 shrink-0">
          <CommentToggle
            commentCount={task.comment_count}
            isOpen={commentsOpen}
            onToggle={() => setCommentsOpen(!commentsOpen)}
          />
          <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => setEditOpen(true)}
              className="p-1 rounded hover:bg-muted transition-colors"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {task.status !== "completed" && (
              <button
                onClick={() => updateStatus("completed")}
                className="p-1 rounded hover:bg-brand-muted dark:hover:bg-brand-muted transition-colors"
                title="Complete"
              >
                <ArrowRight className="h-3.5 w-3.5 text-brand" />
              </button>
            )}
            <button
              onClick={deleteTask}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900 transition-colors"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Comments thread */}
      <TaskComments taskId={task.id} isOpen={commentsOpen} />

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <TaskForm
            task={task}
            onSuccess={() => { setEditOpen(false); onUpdate(); }}
            onCancel={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
