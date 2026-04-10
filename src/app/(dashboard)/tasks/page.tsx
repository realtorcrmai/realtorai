"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Clock, ListTodo, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskPipeline } from "@/components/tasks/TaskPipeline";

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
};

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const resp = await fetch("/api/tasks");
      const data = await resp.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Clear selection whenever tasks reload
  useEffect(() => {
    setSelectedIds(new Set());
  }, [tasks]);

  // Sort: overdue first, then by priority, then by due date
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  const sortedTasks = [...tasks].sort((a, b) => {
    // Completed always last
    if (a.status === "completed" && b.status !== "completed") return 1;
    if (a.status !== "completed" && b.status === "completed") return -1;

    // Overdue first
    const today = new Date().toISOString().split("T")[0];
    const aOverdue = a.due_date && a.due_date < today && a.status !== "completed";
    const bOverdue = b.due_date && b.due_date < today && b.status !== "completed";
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // By priority
    const aPri = priorityOrder[a.priority] ?? 2;
    const bPri = priorityOrder[b.priority] ?? 2;
    if (aPri !== bPri) return aPri - bPri;

    // By due date
    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
    if (a.due_date) return -1;
    if (b.due_date) return 1;

    return 0;
  });

  // Only non-completed tasks are selectable
  const selectableTasks = sortedTasks.filter((t) => t.status !== "completed");
  const allSelected =
    selectableTasks.length > 0 && selectedIds.size === selectableTasks.length;
  const someSelected = selectedIds.size > 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableTasks.map((t) => t.id)));
    }
  }

  async function bulkComplete() {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const resp = await fetch("/api/tasks/bulk-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      if (!resp.ok) throw new Error("Failed to bulk complete");
      const result = await resp.json();
      toast.success(
        `${result.updated ?? selectedIds.size} task${selectedIds.size !== 1 ? "s" : ""} marked complete`
      );
      setSelectedIds(new Set());
      fetchTasks();
    } catch {
      toast.error("Failed to mark tasks complete");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-float-in">
      {/* Pipeline overview */}
      <TaskPipeline tasks={tasks} />

      {/* Add Task button */}
      <div className="flex justify-end">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            }
          />
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create New Task</DialogTitle>
            </DialogHeader>
            <TaskForm
              onSuccess={() => {
                setDialogOpen(false);
                fetchTasks();
              }}
              onCancel={() => setDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Task list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {/* Select All checkbox — only shown when there are selectable tasks */}
            {!loading && selectableTasks.length > 0 && (
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 cursor-pointer accent-[#0F7694]"
                aria-label="Select all incomplete tasks"
                title={allSelected ? "Deselect all" : "Select all incomplete tasks"}
              />
            )}
            <ListTodo className="h-4 w-4" />
            All Tasks
            <span className="text-muted-foreground font-normal text-sm">
              ({sortedTasks.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading && (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading tasks...</p>
            </div>
          )}

          {!loading && sortedTasks.length === 0 && (
            <div className="text-center py-8">
              <ListTodo className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tasks yet</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Create a task to start organizing your day
              </p>
            </div>
          )}

          {sortedTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onUpdate={fetchTasks}
              isSelected={selectedIds.has(task.id)}
              onToggleSelect={task.status !== "completed" ? toggleSelect : undefined}
            />
          ))}
        </CardContent>
      </Card>

      {/* Floating bulk action bar */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 px-4 py-2 rounded-xl shadow-xl bg-white dark:bg-zinc-900 border border-border">
          <span className="text-sm font-medium text-muted-foreground">
            {selectedIds.size} selected
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setSelectedIds(new Set())}
            disabled={bulkLoading}
          >
            Clear
          </Button>
          <Button
            size="sm"
            onClick={bulkComplete}
            disabled={bulkLoading}
            className="bg-brand hover:bg-brand-dark text-white"
          >
            <CheckCheck className="h-4 w-4 mr-1.5" />
            {bulkLoading ? "Completing..." : "Mark Complete"}
          </Button>
        </div>
      )}
    </div>
  );
}
