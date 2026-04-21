"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Plus, CheckCircle2, Circle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TASK_PRIORITY_CONFIG } from "@/lib/constants/tasks";
import type { TaskPriority } from "@/lib/constants/tasks";

type Subtask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  position: number;
};

interface TaskSubtasksProps {
  parentId: string;
  subtasks: Subtask[];
  onUpdate: () => void;
}

export function TaskSubtasks({ parentId, subtasks, onUpdate }: TaskSubtasksProps) {
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [saving, setSaving] = useState(false);

  async function addSubtask() {
    if (!newTitle.trim() || saving) return;
    setSaving(true);
    try {
      const resp = await fetch(`/api/tasks/${parentId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (!resp.ok) throw new Error("Failed");
      setNewTitle("");
      setAdding(false);
      onUpdate();
    } catch {
      toast.error("Failed to add subtask");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSubtask(subtaskId: string, currentStatus: string) {
    const newStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: subtaskId, status: newStatus }),
      });
      onUpdate();
    } catch {
      toast.error("Failed to update subtask");
    }
  }

  async function deleteSubtask(subtaskId: string) {
    try {
      await fetch(`/api/tasks?id=${subtaskId}`, { method: "DELETE" });
      onUpdate();
    } catch {
      toast.error("Failed to delete subtask");
    }
  }

  return (
    <div className="space-y-1">
      {subtasks.map((sub) => {
        const priority = TASK_PRIORITY_CONFIG[sub.priority as TaskPriority];
        const isComplete = sub.status === "completed";

        return (
          <div key={sub.id} className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-muted/50 group">
            <button onClick={() => toggleSubtask(sub.id, sub.status)} className="shrink-0">
              {isComplete ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/40 hover:text-primary" />
              )}
            </button>
            <span className={cn("text-sm flex-1", isComplete && "line-through text-muted-foreground")}>
              {sub.title}
            </span>
            {priority && (
              <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", priority.dotColor)} />
            )}
            {sub.due_date && (
              <span className="text-[10px] text-muted-foreground">{sub.due_date}</span>
            )}
            <button
              onClick={() => deleteSubtask(sub.id)}
              className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-red-500 transition-opacity"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {adding ? (
        <div className="flex items-center gap-2 py-1">
          <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0" />
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addSubtask();
              if (e.key === "Escape") { setAdding(false); setNewTitle(""); }
            }}
            placeholder="Subtask title..."
            autoFocus
            disabled={saving}
            className="flex-1 text-sm bg-transparent border-none outline-none placeholder:text-muted-foreground/40"
          />
          <button onClick={addSubtask} disabled={saving} className="text-xs text-brand font-medium">Add</button>
          <button onClick={() => { setAdding(false); setNewTitle(""); }} className="text-xs text-muted-foreground">Cancel</button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="flex items-center gap-2 py-1.5 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full rounded-lg hover:bg-muted/50"
        >
          <Plus className="h-4 w-4" />
          Add subtask
        </button>
      )}
    </div>
  );
}
