"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { TASK_PRIORITY_CONFIG, TASK_CATEGORY_LABELS } from "@/lib/constants";
import { Search, Calendar, Plus } from "lucide-react";
import Link from "next/link";

type Task = {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  due_date: string | null;
  assigned_to?: string | null;
  assignee_name?: string | null;
};

type StatusFilter = "active" | "all" | "pending" | "in_progress" | "completed";

export function TaskSidebar({ initialTasks }: { initialTasks: Task[] }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("active");

  const pendingCount = initialTasks.filter((t) => t.status === "pending").length;
  const inProgressCount = initialTasks.filter((t) => t.status === "in_progress").length;
  const completedCount = initialTasks.filter((t) => t.status === "completed").length;
  const activeCount = pendingCount + inProgressCount;

  const filtered = initialTasks.filter((t) => {
    const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ? true
      : statusFilter === "active" ? t.status !== "completed"
      : t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const today = new Date().toISOString().split("T")[0];

  const filters: { key: StatusFilter; label: string; count: number }[] = [
    { key: "active", label: "Active", count: activeCount },
    { key: "pending", label: "To Do", count: pendingCount },
    { key: "in_progress", label: "In Progress", count: inProgressCount },
    { key: "completed", label: "Done", count: completedCount },
  ];

  return (
    <aside className="w-[280px] shrink-0 border-r bg-card/50 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Tasks <span className="text-muted-foreground font-normal">({initialTasks.length})</span>
          </h2>
          <Link href="/tasks/new" className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="New task">
            <Plus className="h-4 w-4" />
          </Link>
        </div>

        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm" aria-label="Search tasks" />
        </div>

        <div className="flex items-center gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(statusFilter === f.key ? "all" : f.key)}
              className={`px-2 py-0.5 text-[11px] rounded-full cursor-pointer transition-colors inline-flex items-center gap-1 ${
                statusFilter === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
              <span className="font-semibold">{f.count}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? "No matching tasks" : statusFilter !== "all"
                ? `No ${filters.find((f) => f.key === statusFilter)?.label?.toLowerCase()} tasks`
                : "No tasks yet"}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((task) => {
              const isOverdue = task.due_date && task.due_date < today && task.status !== "completed";
              return (
                <Link
                  key={task.id}
                  href={`/tasks/${task.id}`}
                  className="block px-4 py-3 border-b border-border/40 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 ${
                      TASK_PRIORITY_CONFIG[task.priority]?.dotColor ?? "bg-gray-400"
                    }`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.due_date && (
                          <span className={`flex items-center gap-0.5 text-xs ${
                            isOverdue ? "text-red-500 font-semibold" : "text-muted-foreground"
                          }`}>
                            <Calendar className="h-3 w-3" />
                            {new Date(task.due_date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                          </span>
                        )}
                        <span className="text-[11px] px-1.5 py-0 rounded-md bg-secondary text-secondary-foreground">
                          {TASK_CATEGORY_LABELS[task.category as keyof typeof TASK_CATEGORY_LABELS] ?? task.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
