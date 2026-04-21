"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type CalendarEvent = {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "google" | "showing" | "task";
  status?: string;
};

interface DashboardCalendarProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

// Event pill colors — semantic
const EVENT_PILL: Record<string, { bg: string; text: string; dot: string }> = {
  google:  { bg: "bg-blue-100",   text: "text-blue-700",   dot: "bg-blue-400" },
  showing: { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-[#FDAB3D]" },
  task:    { bg: "bg-purple-100", text: "text-purple-700", dot: "bg-[#A25DDC]" },
};

const STATUS_OVERRIDE: Record<string, { bg: string; text: string; dot: string }> = {
  confirmed: { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-success" },
  denied:    { bg: "bg-red-100",     text: "text-red-700",     dot: "bg-rose-500" },
  cancelled: { bg: "bg-gray-100",    text: "text-gray-500",    dot: "bg-gray-400" },
};

function getEventStyle(ev: CalendarEvent) {
  if (ev.type === "showing" && ev.status && STATUS_OVERRIDE[ev.status]) {
    return STATUS_OVERRIDE[ev.status];
  }
  return EVENT_PILL[ev.type] ?? EVENT_PILL.google;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function DashboardCalendar({
  events,
  selectedDate,
  onSelectDate,
}: DashboardCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = format(ev.start, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    onSelectDate(today);
  };

  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border elevation-8 flex flex-col">

      {/* ── Header: "April  2026" + nav ── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">
            {format(currentMonth, "MMMM")}
          </h2>
          <span className="text-2xl font-light text-foreground/50">
            {format(currentMonth, "yyyy")}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={goToToday}
            className="text-[11px] font-semibold px-3 py-1 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors mr-1"
          >
            Today
          </button>
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Weekday header row ── */}
      <div className="grid grid-cols-7 border-t border-b border-border/60">
        {WEEKDAYS.map((d, i) => (
          <div
            key={d}
            className={cn(
              "text-center text-[11px] font-semibold py-2 uppercase tracking-wider",
              i === 0 || i === 6 ? "text-rose-400/70" : "text-muted-foreground/60",
              i > 0 && "border-l border-border/40"
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ── */}
      <div className="flex-1 grid grid-rows-[repeat(var(--weeks),1fr)]" style={{ "--weeks": weeks.length } as React.CSSProperties}>
        {weeks.map((week, wi) => (
          <div key={wi} className={cn("grid grid-cols-7", wi > 0 && "border-t border-border/40")}>
            {week.map((d, di) => {
              const dateKey = format(d, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateKey) ?? [];
              const inMonth = isSameMonth(d, currentMonth);
              const selected = isSameDay(d, selectedDate);
              const today = isToday(d);
              const visibleEvents = dayEvents.slice(0, 3);
              const overflow = dayEvents.length - 3;

              return (
                <div
                  key={dateKey}
                  onClick={() => inMonth && onSelectDate(d)}
                  className={cn(
                    "relative flex flex-col min-h-[90px] p-1.5 transition-colors",
                    di > 0 && "border-l border-border/40",
                    inMonth ? "cursor-pointer hover:bg-primary/[0.03]" : "opacity-30 cursor-default",
                    selected && "bg-primary/[0.06]",
                  )}
                >
                  {/* Date number */}
                  <div className="flex justify-end mb-1">
                    <span
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors",
                        today
                          ? "bg-red-500 text-white font-bold"
                          : selected
                          ? "bg-primary text-primary-foreground font-semibold"
                          : inMonth
                          ? "text-foreground hover:bg-muted"
                          : "text-muted-foreground"
                      )}
                    >
                      {format(d, "d")}
                    </span>
                  </div>

                  {/* Event pills */}
                  <div className="flex flex-col gap-[3px]">
                    {visibleEvents.map((ev) => {
                      const style = getEventStyle(ev);
                      return (
                        <div
                          key={ev.id}
                          className={cn(
                            "flex items-center gap-1 px-1.5 py-[2px] rounded text-[10px] font-medium truncate leading-tight",
                            style.bg,
                            style.text
                          )}
                          title={ev.title}
                        >
                          <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", style.dot)} />
                          <span className="truncate">{format(ev.start, "h:mm")} {ev.title}</span>
                        </div>
                      );
                    })}
                    {overflow > 0 && (
                      <div className="text-[10px] font-semibold text-muted-foreground px-1.5">
                        +{overflow} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-5 px-5 py-3 border-t border-border/40 bg-muted/10">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-400" />
          <span className="text-[11px] text-muted-foreground">Calendar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#FDAB3D]" />
          <span className="text-[11px] text-muted-foreground">Showings</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#A25DDC]" />
          <span className="text-[11px] text-muted-foreground">Tasks</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="h-2 w-2 rounded-full bg-red-500" />
          <span className="text-[11px] text-muted-foreground">Today</span>
        </div>
      </div>
    </div>
  );
}
