"use client";

import { format, isSameDay, isToday, isTomorrow } from "date-fns";
import Link from "next/link";
import { Clock, CheckCircle2, MapPin, Calendar, ArrowRight, Sunrise, Coffee } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "./DashboardCalendar";

interface PriorityAlert {
  icon: string;
  label: string;
  count: number;
  href: string;
}

interface DayActivityFeedProps {
  events: CalendarEvent[];
  selectedDate: Date;
  tasks: DayTask[];
  priorities?: PriorityAlert[];
}

export type DayTask = {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  due_date: string | null;
};

const PRIORITY_CONFIG: Record<string, { dot: string; label: string; gradient: string }> = {
  urgent: { dot: "bg-red-500 shadow-sm shadow-red-500/40", label: "Urgent", gradient: "from-red-50 to-red-50/0 dark:from-red-950/30 dark:to-transparent" },
  high: { dot: "bg-orange-500 shadow-sm shadow-orange-500/40", label: "High", gradient: "from-orange-50 to-orange-50/0 dark:from-orange-950/30 dark:to-transparent" },
  medium: { dot: "bg-brand", label: "Medium", gradient: "from-teal-50/50 to-teal-50/0 dark:from-teal-950/20 dark:to-transparent" },
  low: { dot: "bg-gray-400", label: "Low", gradient: "" },
};

const EVENT_TYPE_STYLE: Record<string, { icon: typeof Clock; accent: string; gradient: string; border: string; iconBg: string }> = {
  google:  { icon: Calendar,     accent: "text-blue-500",    gradient: "from-blue-50 to-blue-50/0",    border: "border-blue-200/40",   iconBg: "bg-blue-50" },
  showing: { icon: MapPin,       accent: "text-[#FDAB3D]",   gradient: "from-amber-50 to-amber-50/0",  border: "border-amber-200/50",  iconBg: "bg-amber-50" },
  task:    { icon: CheckCircle2, accent: "text-[#A25DDC]",   gradient: "from-purple-50 to-purple-50/0", border: "border-purple-200/40", iconBg: "bg-purple-50" },
};

const SHOWING_STATUS_STYLE: Record<string, { label: string; color: string; bg: string; glow: string }> = {
  requested:  { label: "Pending",   color: "text-amber-700",        bg: "bg-amber-100",             glow: "" },
  confirmed:  { label: "Confirmed", color: "text-emerald-700",        bg: "bg-success/15",          glow: "shadow-sm shadow-[#00C875]/30" },
  denied:     { label: "Denied",    color: "text-red-700",          bg: "bg-red-100",               glow: "" },
  cancelled:  { label: "Cancelled", color: "text-gray-500",         bg: "bg-gray-100",              glow: "" },
};

function getDateLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEEE, MMMM d");
}

export function DayActivityFeed({ events, selectedDate, tasks, priorities }: DayActivityFeedProps) {
  const dayEvents = events.filter((ev) => isSameDay(ev.start, selectedDate)).sort((a, b) => a.start.getTime() - b.start.getTime());
  const dayTasks = tasks.filter((t) => t.due_date && isSameDay(new Date(t.due_date), selectedDate));
  const isEmpty = dayEvents.length === 0 && dayTasks.length === 0;
  const totalItems = dayEvents.length + dayTasks.length;
  const visiblePriorities = (priorities ?? []).filter((p) => p.count > 0);

  return (
    <div className="relative rounded-2xl overflow-hidden elevation-8 bg-card border border-brand/20 flex flex-col h-full">
      {/* Gold accent top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0F7694]/60 via-[#0F7694] to-[#0F7694]/60 z-10" />

      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/40">Schedule</p>
          <h2 className="text-xl font-bold tracking-tight text-foreground">{getDateLabel(selectedDate)}</h2>
        </div>
        {totalItems > 0 && (
          <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0F7694]/15 to-[#0F7694]/5 px-3 py-1.5 text-[11px] font-bold text-brand-dark shadow-sm">
            {totalItems} item{totalItems !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Priority alerts */}
      {visiblePriorities.length > 0 && (
        <div className="px-4 pb-2">
          <div className="flex flex-wrap gap-1.5">
            {visiblePriorities.map((p) => (
              <Link
                key={p.label}
                href={p.href}
                className="inline-flex items-center gap-1.5 rounded-lg bg-muted/60 hover:bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-foreground/80 transition-colors"
              >
                <span>{p.icon}</span>
                <span className="font-bold">{p.count}</span>
                <span className="text-muted-foreground">{p.label}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2.5 min-h-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-5">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#0F7694]/10 to-[#1a1535]/5 flex items-center justify-center">
                <Sunrise className="h-9 w-9 text-brand/40" />
              </div>
              <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-transparent flex items-center justify-center shadow-sm">
                <Coffee className="h-4 w-4 text-amber-500/60" />
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground/70">{isToday(selectedDate) ? "Clear schedule today" : "Nothing planned"}</p>
            <p className="text-xs text-muted-foreground/50 mt-1.5 max-w-[200px] leading-relaxed">
              {isToday(selectedDate) ? "A great day for prospecting, follow-ups, and building relationships." : "Click a day with dots to see scheduled events."}
            </p>
          </div>
        ) : (
          <>
            {dayEvents.map((ev, i) => {
              const style = EVENT_TYPE_STYLE[ev.type] ?? EVENT_TYPE_STYLE.google;
              const Icon = style.icon;
              const showingStatus = ev.type === "showing" && ev.status ? SHOWING_STATUS_STYLE[ev.status] : null;
              return (
                <div key={ev.id} className={cn("group relative flex gap-3.5 rounded-xl p-3.5 border transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r", style.gradient, style.border)}>
                  <div className="flex flex-col items-center shrink-0 w-12">
                    <span className="text-xs font-bold tabular-nums text-foreground leading-tight">{format(ev.start, "h:mm")}</span>
                    <span className="text-[9px] font-bold text-muted-foreground/50 uppercase leading-tight">{format(ev.start, "a")}</span>
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shadow-sm", style.iconBg)}>
                      <Icon className={cn("h-4 w-4", style.accent)} />
                    </div>
                    {i < dayEvents.length - 1 && <div className="w-px flex-1 bg-border/30 mt-1.5 min-h-[8px]" />}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">{ev.title}</p>
                      {showingStatus && <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wider", showingStatus.bg, showingStatus.color, showingStatus.glow)}>{showingStatus.label}</span>}
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 mt-1 font-medium">{format(ev.start, "h:mm a")} — {format(ev.end, "h:mm a")}</p>
                  </div>
                </div>
              );
            })}
            {dayTasks.length > 0 && (
              <div className="pt-3">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40 px-1 mb-2">Tasks Due</p>
                {dayTasks.map((task) => {
                  const priority = PRIORITY_CONFIG[task.priority] ?? PRIORITY_CONFIG.medium;
                  return (
                    <Link key={task.id} href="/tasks" className={cn("flex items-center gap-3.5 rounded-xl p-3.5 mb-2 border border-border/30 transition-all duration-200 hover:shadow-md hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r", priority.gradient)}>
                      <div className={cn("h-3 w-3 rounded-full shrink-0", priority.dot)} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-semibold truncate leading-tight", task.status === "completed" && "line-through text-muted-foreground")}>{task.title}</p>
                      </div>
                      <span className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-wider">{priority.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-4 py-3 border-t border-border/20 bg-muted/10">
        <Link href="/calendar" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-semibold text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all duration-200 group">
          <Calendar className="h-4 w-4" />
          Open Full Calendar
          <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
        </Link>
      </div>
    </div>
  );
}
