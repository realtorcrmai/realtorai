"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY_CONFIG, TASK_CATEGORY_LABELS } from "@/lib/constants/tasks";
import { Calendar, User, Flag, GripVertical, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import type { TaskData, TeamMember } from "@/hooks/useTasks";
import type { TaskPriority } from "@/lib/constants/tasks";

const COLUMNS = [
  { id: "pending", label: "To Do", icon: "📋", color: "border-gray-300" },
  { id: "in_progress", label: "In Progress", icon: "⚡", color: "border-orange-400" },
  { id: "completed", label: "Done", icon: "✅", color: "border-green-400" },
] as const;

interface TaskKanbanBoardProps {
  tasks: TaskData[];
  onUpdate: () => void;
  teamMembers: TeamMember[];
}

export function TaskKanbanBoard({ tasks, onUpdate, teamMembers }: TaskKanbanBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const tasksByStatus: Record<string, TaskData[]> = {
    pending: tasks.filter((t) => t.status === "pending"),
    in_progress: tasks.filter((t) => t.status === "in_progress"),
    completed: tasks.filter((t) => t.status === "completed"),
  };

  async function moveTask(taskId: string, newStatus: string) {
    try {
      const resp = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });
      if (!resp.ok) throw new Error("Failed");
      toast.success(`Task moved to ${COLUMNS.find((c) => c.id === newStatus)?.label}`);
      onUpdate();
    } catch {
      toast.error("Failed to move task");
    }
  }

  function handleDragStart(e: React.DragEvent, taskId: string) {
    e.dataTransfer.setData("text/plain", taskId);
    setDraggedTaskId(taskId);
  }

  function handleDragOver(e: React.DragEvent, columnId: string) {
    e.preventDefault();
    setDragOverColumn(columnId);
  }

  function handleDrop(e: React.DragEvent, columnId: string) {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    setDraggedTaskId(null);
    setDragOverColumn(null);
    if (taskId) moveTask(taskId, columnId);
  }

  function handleDragEnd() {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {COLUMNS.map((col) => (
        <div
          key={col.id}
          onDragOver={(e) => handleDragOver(e, col.id)}
          onDrop={(e) => handleDrop(e, col.id)}
          onDragLeave={() => setDragOverColumn(null)}
          className={cn(
            "flex-1 min-w-[300px] rounded-xl border-t-4 bg-card/50 p-3 transition-colors",
            col.color,
            dragOverColumn === col.id && "bg-brand/5 ring-2 ring-brand/20"
          )}
        >
          {/* Column header */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <span>{col.icon}</span>
              {col.label}
              <span className="text-xs font-normal text-muted-foreground px-1.5 py-0.5 bg-muted rounded-full">
                {tasksByStatus[col.id].length}
              </span>
            </h3>
          </div>

          {/* Cards */}
          <div className="space-y-2 min-h-[100px]">
            {tasksByStatus[col.id].map((task) => {
              const priority = TASK_PRIORITY_CONFIG[task.priority as TaskPriority];
              const isOverdue = task.due_date && task.due_date < todayStr && task.status !== "completed";

              return (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "p-3 rounded-lg border bg-card shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md",
                    draggedTaskId === task.id && "opacity-50 scale-95",
                    isOverdue && "border-red-300 bg-red-50/50 dark:bg-red-950/20"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-4 w-4 text-muted-foreground/30 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <Link href={`/tasks/${task.id}`} className="text-sm font-medium hover:underline block truncate">
                        {task.title}
                      </Link>

                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className={cn("flex items-center gap-0.5 text-[10px]", priority?.color)}>
                          <Flag className="h-3 w-3" />
                          {priority?.label}
                        </span>

                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                          {TASK_CATEGORY_LABELS[task.category as keyof typeof TASK_CATEGORY_LABELS] ?? task.category}
                        </span>

                        {task.due_date && (
                          <span className={cn("flex items-center gap-0.5 text-[10px]",
                            isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"
                          )}>
                            <Calendar className="h-3 w-3" />
                            {formatDate(task.due_date)}
                          </span>
                        )}

                        {task.comment_count > 0 && (
                          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                            <MessageSquare className="h-3 w-3" />
                            {task.comment_count}
                          </span>
                        )}
                      </div>

                      {/* Assignee */}
                      {task.assignee_name && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <div className="h-5 w-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold">
                            {task.assignee_name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{task.assignee_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {tasksByStatus[col.id].length === 0 && (
              <div className="text-center py-8 text-xs text-muted-foreground/50">
                Drop tasks here
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}
