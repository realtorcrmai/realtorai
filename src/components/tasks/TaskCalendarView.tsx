"use client";

import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TASK_PRIORITY_CONFIG } from "@/lib/constants/tasks";
import Link from "next/link";
import type { TaskData } from "@/hooks/useTasks";
import type { TaskPriority } from "@/lib/constants/tasks";

interface TaskCalendarViewProps {
  tasks: TaskData[];
  onUpdate: () => void;
}

export function TaskCalendarView({ tasks }: TaskCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay(); // 0=Sun
  const daysInMonth = lastDay.getDate();

  // Build calendar grid (6 weeks max)
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Group tasks by due_date
  const tasksByDate = useMemo(() => {
    const map: Record<string, TaskData[]> = {};
    for (const task of tasks) {
      if (task.due_date) {
        if (!map[task.due_date]) map[task.due_date] = [];
        map[task.due_date].push(task);
      }
    }
    return map;
  }, [tasks]);

  const todayStr = new Date().toISOString().split("T")[0];
  const monthLabel = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="bg-card rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="text-lg font-semibold">{monthLabel}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(year, month - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Today</Button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date(year, month + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 border-b">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {cells.map((day, idx) => {
          if (day === null) {
            return <div key={idx} className="min-h-[100px] border-b border-r bg-muted/20" />;
          }

          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayTasks = tasksByDate[dateStr] || [];
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[100px] border-b border-r p-1 transition-colors",
                isToday && "bg-brand/5",
                isPast && "bg-muted/10"
              )}
            >
              <div className={cn(
                "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                isToday && "bg-brand text-white"
              )}>
                {day}
              </div>

              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => {
                  const priority = TASK_PRIORITY_CONFIG[task.priority as TaskPriority];
                  return (
                    <Link
                      key={task.id}
                      href={`/tasks/${task.id}`}
                      className={cn(
                        "block text-[10px] px-1.5 py-0.5 rounded truncate transition-colors hover:opacity-80",
                        task.status === "completed"
                          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400 line-through"
                          : `${priority?.bg} ${priority?.color}`
                      )}
                    >
                      {task.title}
                    </Link>
                  );
                })}
                {dayTasks.length > 3 && (
                  <span className="text-[10px] text-muted-foreground px-1.5">
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
