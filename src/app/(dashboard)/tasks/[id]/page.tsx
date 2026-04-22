"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import { TaskComments } from "@/components/tasks/TaskComments";
import { TaskSubtasks } from "@/components/tasks/TaskSubtasks";
import { TaskActivityLog } from "@/components/tasks/TaskActivityLog";
import {
  ArrowLeft, Calendar, User, Building2, Flag, Tag,
  Clock, CheckCircle2, Circle, Copy, Archive,
  Trash2, RotateCcw, Link as LinkIcon, Users,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { TASK_PRIORITY_CONFIG, TASK_CATEGORY_LABELS, TASK_CATEGORY_ICONS, RECURRENCE_PRESETS } from "@/lib/constants/tasks";
import type { TaskPriority, TaskCategory } from "@/lib/constants/tasks";

type TaskDetail = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: string;
  category: string;
  due_date: string | null;
  start_date: string | null;
  assigned_to: string | null;
  contact_id: string | null;
  listing_id: string | null;
  parent_id: string | null;
  estimated_hours: number | null;
  labels: string[];
  visibility: string;
  recurrence_rule: string | null;
  archived_at: string | null;
  completed_at: string | null;
  created_at: string;
  comment_count: number;
  assignee: { id: string; name: string; email: string } | null;
  contacts: { id: string; name: string; email: string; phone: string } | null;
  listings: { id: string; address: string; status: string; list_price: number } | null;
  subtasks: { id: string; title: string; status: string; priority: string; due_date: string | null; assigned_to: string | null; position: number }[];
  watchers: { user_id: string; name: string; email: string }[];
  blocks: { id: string; title: string; status: string }[];
  blocked_by: { id: string; title: string; status: string }[];
  activity: { id: string; user_name: string; action: string; field_name: string | null; old_value: string | null; new_value: string | null; created_at: string }[];
};

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  const fetchTask = useCallback(async () => {
    try {
      const resp = await fetch(`/api/tasks/${id}`);
      if (!resp.ok) throw new Error("Not found");
      setTask(await resp.json());
    } catch {
      toast.error("Task not found");
      router.push("/tasks");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchTask(); }, [fetchTask]);

  async function updateField(field: string, value: unknown) {
    try {
      const resp = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      });
      if (!resp.ok) throw new Error("Failed");
      fetchTask();
      toast.success("Updated");
    } catch {
      toast.error("Update failed");
    }
  }

  async function duplicateTask() {
    try {
      const resp = await fetch(`/api/tasks/${id}`, { method: "POST" });
      if (!resp.ok) throw new Error("Failed");
      const newTask = await resp.json();
      toast.success("Task duplicated");
      router.push(`/tasks/${newTask.id}`);
    } catch {
      toast.error("Duplicate failed");
    }
  }

  async function deleteTask() {
    if (!window.confirm("Delete this task? This cannot be undone.")) return;
    try {
      await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
      toast.success("Task deleted");
      router.push("/tasks");
    } catch {
      toast.error("Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-muted-foreground/30 border-t-brand animate-spin" />
      </div>
    );
  }

  if (!task) return null;

  const priority = TASK_PRIORITY_CONFIG[task.priority as TaskPriority];
  const todayStr = new Date().toISOString().split("T")[0];
  const isOverdue = task.due_date && task.due_date < todayStr && task.status !== "completed";
  const subtasksDone = task.subtasks.filter((s) => s.status === "completed").length;
  const subtasksTotal = task.subtasks.length;

  return (
    <>
      <PageHeader
        title=""
        breadcrumbs={[
          { label: "Tasks", href: "/tasks" },
          { label: task.title.length > 40 ? task.title.slice(0, 40) + "..." : task.title },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={duplicateTask}><Copy className="h-4 w-4 mr-1.5" />Duplicate</Button>
            {task.archived_at ? (
              <Button variant="outline" size="sm" onClick={() => updateField("archived_at", null)}>
                <RotateCcw className="h-4 w-4 mr-1.5" />Unarchive
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => updateField("archived_at", new Date().toISOString())}>
                <Archive className="h-4 w-4 mr-1.5" />Archive
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={deleteTask} className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-1.5" />Delete
            </Button>
          </div>
        }
      />

      <div className="p-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title (inline editable) */}
            <div>
              {editingTitle ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { updateField("title", titleDraft); setEditingTitle(false); }
                      if (e.key === "Escape") setEditingTitle(false);
                    }}
                    className="text-xl font-bold"
                  />
                  <Button size="sm" onClick={() => { updateField("title", titleDraft); setEditingTitle(false); }}>Save</Button>
                </div>
              ) : (
                <h1
                  className={cn("text-2xl font-bold cursor-pointer hover:text-brand transition-colors",
                    task.status === "completed" && "line-through text-muted-foreground"
                  )}
                  onClick={() => { setTitleDraft(task.title); setEditingTitle(true); }}
                >
                  {TASK_CATEGORY_ICONS[task.category as TaskCategory] || "📋"} {task.title}
                </h1>
              )}
            </div>

            {/* Status buttons */}
            <div className="flex items-center gap-2">
              {(["pending", "in_progress", "completed"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => updateField("status", s)}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-lg border transition-all",
                    task.status === s
                      ? s === "completed"
                        ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400"
                        : s === "in_progress"
                          ? "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400"
                          : "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400"
                      : "border-border hover:bg-muted"
                  )}
                >
                  {s === "pending" ? <><Circle className="h-3 w-3 inline mr-1" />To Do</> :
                   s === "in_progress" ? <><Clock className="h-3 w-3 inline mr-1" />In Progress</> :
                   <><CheckCircle2 className="h-3 w-3 inline mr-1" />Done</>}
                </button>
              ))}
            </div>

            {/* Description (inline editable) */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Description</h3>
              {editingDesc ? (
                <div className="space-y-2">
                  <textarea
                    value={descDraft}
                    onChange={(e) => setDescDraft(e.target.value)}
                    autoFocus
                    rows={4}
                    className="w-full px-3 py-2 text-sm rounded-lg border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => { updateField("description", descDraft || null); setEditingDesc(false); }}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingDesc(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <p
                  className="text-sm text-muted-foreground cursor-pointer hover:bg-muted/50 p-2 rounded-lg min-h-[40px]"
                  onClick={() => { setDescDraft(task.description || ""); setEditingDesc(true); }}
                >
                  {task.description || "Click to add description..."}
                </p>
              )}
            </div>

            {/* Subtasks */}
            {(task.subtasks.length > 0 || true) && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase flex items-center gap-2">
                  Subtasks
                  {subtasksTotal > 0 && (
                    <span className="text-xs font-normal">{subtasksDone}/{subtasksTotal}</span>
                  )}
                </h3>
                {subtasksTotal > 0 && (
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${subtasksTotal > 0 ? (subtasksDone / subtasksTotal) * 100 : 0}%` }} />
                  </div>
                )}
                <TaskSubtasks parentId={task.id} subtasks={task.subtasks} onUpdate={fetchTask} />
              </div>
            )}

            {/* Dependencies */}
            {(task.blocks.length > 0 || task.blocked_by.length > 0) && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase">Dependencies</h3>
                {task.blocked_by.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Blocked by:</p>
                    {task.blocked_by.map((dep) => (
                      <Link key={dep.id} href={`/tasks/${dep.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        {dep.title}
                        {dep.status === "completed" && <CheckCircle2 className="h-3 w-3 text-green-500" />}
                      </Link>
                    ))}
                  </div>
                )}
                {task.blocks.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Blocks:</p>
                    {task.blocks.map((dep) => (
                      <Link key={dep.id} href={`/tasks/${dep.id}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                        <LinkIcon className="h-3 w-3" />
                        {dep.title}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Comments */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                Comments ({task.comment_count})
              </h3>
              <TaskComments taskId={task.id} isOpen={true} />
            </div>

            {/* Activity log */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">Activity</h3>
              <TaskActivityLog activity={task.activity} />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-4 space-y-4">
              {/* Priority */}
              <DetailField label="Priority" icon={<Flag className={cn("h-4 w-4", priority?.color)} />}>
                <select
                  value={task.priority}
                  onChange={(e) => updateField("priority", e.target.value)}
                  className="text-sm bg-transparent border-none outline-none cursor-pointer"
                >
                  {(["low", "medium", "high", "urgent"] as const).map((p) => (
                    <option key={p} value={p}>{TASK_PRIORITY_CONFIG[p].label}</option>
                  ))}
                </select>
              </DetailField>

              {/* Category */}
              <DetailField label="Category" icon={<Tag className="h-4 w-4 text-muted-foreground" />}>
                <select
                  value={task.category}
                  onChange={(e) => updateField("category", e.target.value)}
                  className="text-sm bg-transparent border-none outline-none cursor-pointer"
                >
                  {Object.entries(TASK_CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </DetailField>

              {/* Due date */}
              <DetailField label="Due Date" icon={<Calendar className={cn("h-4 w-4", isOverdue ? "text-red-500" : "text-muted-foreground")} />}>
                <input
                  type="date"
                  value={task.due_date || ""}
                  onChange={(e) => updateField("due_date", e.target.value || null)}
                  className={cn("text-sm bg-transparent border-none outline-none cursor-pointer", isOverdue && "text-red-500 font-semibold")}
                />
              </DetailField>

              {/* Start date */}
              <DetailField label="Start Date" icon={<Calendar className="h-4 w-4 text-muted-foreground" />}>
                <input
                  type="date"
                  value={task.start_date || ""}
                  onChange={(e) => updateField("start_date", e.target.value || null)}
                  className="text-sm bg-transparent border-none outline-none cursor-pointer"
                />
              </DetailField>

              {/* Assignee */}
              <DetailField label="Assignee" icon={<User className="h-4 w-4 text-muted-foreground" />}>
                {task.assignee ? (
                  <span className="text-sm">{task.assignee.name}</span>
                ) : (
                  <span className="text-sm text-muted-foreground">Unassigned</span>
                )}
              </DetailField>

              {/* Estimated hours */}
              <DetailField label="Estimate" icon={<Clock className="h-4 w-4 text-muted-foreground" />}>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={task.estimated_hours || ""}
                  onChange={(e) => updateField("estimated_hours", e.target.value ? parseFloat(e.target.value) : null)}
                  placeholder="hours"
                  className="text-sm bg-transparent border-none outline-none w-16 cursor-pointer"
                />
              </DetailField>

              {/* Recurrence */}
              <DetailField label="Repeat" icon={<RotateCcw className="h-4 w-4 text-muted-foreground" />}>
                <select
                  value={task.recurrence_rule || ""}
                  onChange={(e) => updateField("recurrence_rule", e.target.value || null)}
                  className="text-sm bg-transparent border-none outline-none cursor-pointer"
                >
                  {RECURRENCE_PRESETS.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </DetailField>

              {/* Labels */}
              <DetailField label="Labels" icon={<Tag className="h-4 w-4 text-muted-foreground" />}>
                <div className="flex flex-wrap gap-1">
                  {(task.labels || []).map((label) => (
                    <Badge key={label} variant="secondary" className="text-[10px]">
                      {label}
                      <button onClick={() => updateField("labels", task.labels.filter((l) => l !== label))} className="ml-1">×</button>
                    </Badge>
                  ))}
                  <button
                    onClick={() => {
                      const label = prompt("Enter label:");
                      if (label?.trim()) updateField("labels", [...(task.labels || []), label.trim()]);
                    }}
                    className="text-[10px] text-muted-foreground hover:text-foreground"
                  >
                    + Add
                  </button>
                </div>
              </DetailField>

              {/* Related contact */}
              {task.contacts && (
                <DetailField label="Contact" icon={<User className="h-4 w-4 text-muted-foreground" />}>
                  <Link href={`/contacts/${task.contact_id}`} className="text-sm text-primary hover:underline">
                    {task.contacts.name}
                  </Link>
                </DetailField>
              )}

              {/* Related listing */}
              {task.listings && (
                <DetailField label="Listing" icon={<Building2 className="h-4 w-4 text-muted-foreground" />}>
                  <Link href={`/listings/${task.listing_id}`} className="text-sm text-primary hover:underline">
                    {task.listings.address}
                  </Link>
                </DetailField>
              )}

              {/* Watchers */}
              <DetailField label="Watchers" icon={<Users className="h-4 w-4 text-muted-foreground" />}>
                <div className="flex flex-wrap gap-1">
                  {task.watchers.map((w) => (
                    <div key={w.user_id} className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[9px] font-bold" title={w.name}>
                      {(w.name || "?").charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </DetailField>

              {/* Created */}
              <DetailField label="Created" icon={<Clock className="h-4 w-4 text-muted-foreground" />}>
                <span className="text-xs text-muted-foreground">
                  {new Date(task.created_at).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </DetailField>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function DetailField({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      {icon}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        {children}
      </div>
    </div>
  );
}
