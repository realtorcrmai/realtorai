"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ListTodo,
  Plus,
  Check,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  createContactTask,
  updateContactTask,
  deleteContactTask,
} from "@/actions/contacts";
import {
  TASK_PRIORITIES,
  TASK_CATEGORIES,
  TASK_PRIORITY_CONFIG,
} from "@/lib/constants";

type Task = {
  id: string;
  title: string;
  status: string;
  priority: string;
  category: string;
  due_date: string | null;
  notes: string | null;
  completed_at: string | null;
  created_at: string;
};

export function ContactTasksPanel({
  contactId,
  tasks,
}: {
  contactId: string;
  tasks: Task[];
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("general");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const now = new Date();
  const overdue = tasks.filter(
    (t) =>
      t.status !== "completed" &&
      t.due_date &&
      new Date(t.due_date + "T23:59:59") < now
  );
  const upcoming = tasks.filter(
    (t) =>
      t.status !== "completed" &&
      (!t.due_date || new Date(t.due_date + "T23:59:59") >= now)
  );
  const completed = tasks.filter((t) => t.status === "completed");

  function handleAdd() {
    if (!title.trim()) return;
    startTransition(async () => {
      await createContactTask(contactId, {
        title: title.trim(),
        due_date: dueDate || undefined,
        priority,
        category,
        notes: notes || undefined,
      });
      setTitle("");
      setDueDate("");
      setPriority("medium");
      setCategory("general");
      setNotes("");
      setShowAdd(false);
      router.refresh();
    });
  }

  function handleComplete(taskId: string) {
    startTransition(async () => {
      await updateContactTask(taskId, contactId, {
        status: "completed",
        completed_at: new Date().toISOString(),
      });
      router.refresh();
    });
  }

  function handleDelete(taskId: string) {
    startTransition(async () => {
      await deleteContactTask(taskId, contactId);
      router.refresh();
    });
  }

  function handleReopen(taskId: string) {
    startTransition(async () => {
      await updateContactTask(taskId, contactId, {
        status: "pending",
        completed_at: null,
      });
      router.refresh();
    });
  }

  function TaskRow({ task, isOverdue }: { task: Task; isOverdue?: boolean }) {
    const priorityConfig =
      TASK_PRIORITY_CONFIG[task.priority as keyof typeof TASK_PRIORITY_CONFIG];
    const isComplete = task.status === "completed";

    return (
      <div
        className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
          isOverdue
            ? "border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-950/10"
            : isComplete
              ? "border-border/30 bg-muted/20 opacity-70"
              : "border-border/50 hover:bg-muted/30"
        }`}
      >
        <button
          type="button"
          onClick={() =>
            isComplete ? handleReopen(task.id) : handleComplete(task.id)
          }
          disabled={isPending}
          className={`mt-0.5 shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            isComplete
              ? "bg-[#0F7694]/50 border-green-500 text-white"
              : "border-muted-foreground/30 hover:border-primary"
          }`}
        >
          {isComplete && <Check className="h-3 w-3" />}
        </button>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-medium ${isComplete ? "line-through text-muted-foreground" : ""}`}
          >
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {priorityConfig && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${priorityConfig.bg} ${priorityConfig.color}`}
              >
                {task.priority}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground capitalize">
              {task.category?.replace("_", " ")}
            </span>
            {task.due_date && (
              <span
                className={`flex items-center gap-0.5 text-[10px] ${
                  isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                }`}
              >
                <Clock className="h-3 w-3" />
                {new Date(task.due_date + "T00:00:00").toLocaleDateString(
                  "en-CA",
                  { month: "short", day: "numeric" }
                )}
              </span>
            )}
          </div>
          {task.notes && (
            <p className="text-xs text-muted-foreground mt-1">{task.notes}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => handleDelete(task.id)}
          disabled={isPending}
          className="shrink-0 p-1 text-muted-foreground hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4" id="tasks-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <ListTodo className="h-5 w-5 text-muted-foreground" />
          Tasks & Follow-ups
          {tasks.filter((t) => t.status !== "completed").length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {tasks.filter((t) => t.status !== "completed").length}
            </span>
          )}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Task
        </Button>
      </div>

      {/* Add Task Form */}
      {showAdd && (
        <div className="p-4 rounded-lg border border-border bg-background space-y-3">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd();
              }
            }}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={isPending}
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={isPending}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-medium">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={isPending}
              >
                {TASK_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace("_", " ").charAt(0).toUpperCase() +
                      c.replace("_", " ").slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)..."
            rows={2}
            className="w-full px-3 py-2 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            disabled={isPending}
          />
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={isPending || !title.trim()}
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Create Task
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdd(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs font-medium text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" />
            Overdue ({overdue.length})
          </p>
          {overdue.map((t) => (
            <TaskRow key={t.id} task={t} isOverdue />
          ))}
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-2">
          {overdue.length > 0 && (
            <p className="text-xs font-medium text-muted-foreground">
              Upcoming ({upcoming.length})
            </p>
          )}
          {upcoming.map((t) => (
            <TaskRow key={t.id} task={t} />
          ))}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showCompleted ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Completed ({completed.length})
          </button>
          {showCompleted && (
            <div className="space-y-2 mt-2">
              {completed.map((t) => (
                <TaskRow key={t.id} task={t} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {tasks.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No tasks yet. Click &quot;Add Task&quot; to create one.
        </p>
      )}
    </div>
  );
}
