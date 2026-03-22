"use client";

import Link from "next/link";
import { ListTodo, ArrowRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
}

interface FloatingTaskBannerProps {
  tasks: Task[];
  openTasksCount: number;
}

function priorityDot(priority: string) {
  const color =
    priority === "urgent"
      ? "bg-red-500"
      : priority === "high"
        ? "bg-orange-500"
        : priority === "medium"
          ? "bg-amber-500"
          : "bg-gray-400";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${color}`} />;
}

export function FloatingTaskBanner({ tasks, openTasksCount }: FloatingTaskBannerProps) {
  if (tasks.length === 0) return null;

  // Double the items for seamless infinite scroll
  const tickerItems = [...tasks, ...tasks];

  return (
    <div className="w-full rounded-xl border border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/60 dark:bg-indigo-950/20 overflow-hidden">
      <div className="flex items-center">
        {/* Fixed left label */}
        <Link
          href="/tasks"
          className="shrink-0 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white group hover:bg-indigo-700 transition-colors"
        >
          <ListTodo className="h-4 w-4" />
          <span className="text-xs font-semibold whitespace-nowrap">
            Tasks
          </span>
          <span className="text-[10px] font-bold bg-white/20 rounded-full px-1.5 py-0.5">
            {openTasksCount}
          </span>
          <ArrowRight className="h-3 w-3 opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
        </Link>

        {/* Scrolling ticker */}
        <div className="flex-1 overflow-hidden relative">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-indigo-50/90 dark:from-indigo-950/60 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-indigo-50/90 dark:from-indigo-950/60 to-transparent z-10 pointer-events-none" />

          <div className="flex animate-ticker hover:[animation-play-state:paused]">
            {tickerItems.map((task, i) => (
              <Link
                key={`${task.id}-${i}`}
                href="/tasks"
                className="shrink-0 flex items-center gap-2 px-5 py-2.5 hover:bg-indigo-100/50 dark:hover:bg-indigo-900/20 transition-colors"
              >
                {priorityDot(task.priority)}
                <span className="text-xs font-medium text-foreground whitespace-nowrap">
                  {task.title}
                </span>
                {task.due_date && (
                  <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                    {new Date(task.due_date).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                )}
                <span className="text-indigo-300 dark:text-indigo-700 mx-2">|</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
