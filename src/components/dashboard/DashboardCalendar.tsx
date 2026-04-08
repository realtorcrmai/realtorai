"use client";

import { useState, useCallback } from "react";
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
  isWeekend,
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

const EVENT_DOT_COLORS: Record<string, string> = {
  google: "bg-blue-400",       // Google Calendar brand
  showing: "bg-[#FDAB3D]",     // showing = pending/attention by default
  task: "bg-[#A25DDC]",        // tasks = purple
};

const STATUS_DOT_COLORS: Record<string, string> = {
  requested:  "bg-[#FDAB3D]",  // orange — needs action
  confirmed:  "bg-[#00C875]",  // green — confirmed = success
  denied:     "bg-rose-500",   // red — denied
  cancelled:  "bg-gray-400",   // gray — cancelled
};

function getDotColor(event: CalendarEvent): string {
  if (event.type === "showing" && event.status) {
    return STATUS_DOT_COLORS[event.status] ?? EVENT_DOT_COLORS.showing;
  }
  return EVENT_DOT_COLORS[event.type] ?? "bg-gray-400";
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

  const eventsByDate = useCallback(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = format(ev.start, "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events])();

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const goToToday = () => {
    const today = new Date();
    setCurrentMonth(startOfMonth(today));
    onSelectDate(today);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden elevation-8 bg-card border border-[#0F7694]/20">
      {/* Gold accent top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0F7694]/60 via-[#0F7694] to-[#0F7694]/60" />

      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {format(currentMonth, "MMMM yyyy")}
          </h2>
          <button
            onClick={goToToday}
            className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full bg-[#0F7694] text-white hover:shadow-md hover:shadow-[#0F7694]/30 transition-all duration-200 hover:scale-105"
          >
            Today
          </button>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={prevMonth} className="p-2.5 rounded-xl hover:bg-muted/80 transition-all duration-200 text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95" aria-label="Previous month">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={nextMonth} className="p-2.5 rounded-xl hover:bg-muted/80 transition-all duration-200 text-muted-foreground hover:text-foreground hover:scale-105 active:scale-95" aria-label="Next month">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 px-4 pb-2">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={cn("text-center text-[10px] font-bold uppercase tracking-widest py-1.5", i === 0 || i === 6 ? "text-rose-400/60" : "text-muted-foreground/50")}>
            {d}
          </div>
        ))}
      </div>

      <div className="px-3 pb-4">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-px">
            {week.map((d) => {
              const dateKey = format(d, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(dateKey) ?? [];
              const inMonth = isSameMonth(d, currentMonth);
              const selected = isSameDay(d, selectedDate);
              const today = isToday(d);
              const weekend = isWeekend(d);
              const eventCount = dayEvents.length;
              const dotColors = [...new Set(dayEvents.map(getDotColor))].slice(0, 3);

              return (
                <button
                  key={dateKey}
                  onClick={() => onSelectDate(d)}
                  className={cn(
                    "relative flex flex-col items-center justify-center py-2.5 rounded-xl transition-all duration-200 group min-h-[52px]",
                    !inMonth && "opacity-25 pointer-events-none",
                    inMonth && !selected && "hover:bg-primary/5 hover:scale-105 active:scale-95",
                    selected && "bg-[#0F7694] text-white shadow-lg shadow-[#0F7694]/25 scale-105",
                    today && !selected && "bg-[#0F7694]/8 ring-2 ring-[#0F7694]/25 ring-inset",
                    weekend && inMonth && !selected && !today && "bg-muted/30"
                  )}
                >
                  <span className={cn("text-sm tabular-nums leading-none", selected ? "text-white font-extrabold" : today ? "text-[#0F7694] font-extrabold" : "text-foreground font-semibold", weekend && !selected && !today && "text-foreground/70")}>
                    {format(d, "d")}
                  </span>
                  {dotColors.length > 0 && (
                    <div className="flex items-center gap-[3px] mt-1.5">
                      {dotColors.map((color, i) => (
                        <span key={i} className={cn("h-[5px] w-[5px] rounded-full transition-all duration-200", selected ? "bg-white/80 shadow-sm shadow-white/40" : color, "group-hover:scale-150")} />
                      ))}
                    </div>
                  )}
                  {eventCount > 2 && !selected && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#0F7694] text-[8px] font-bold text-white shadow-sm">{eventCount}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-5 px-5 py-3.5 border-t border-border/20 bg-muted/20">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/40" />
          <span className="text-[11px] font-medium text-muted-foreground">Calendar</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FDAB3D] shadow-sm shadow-[#FDAB3D]/40" />
          <span className="text-[11px] font-medium text-muted-foreground">Showings</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#A25DDC] shadow-sm shadow-[#A25DDC]/40" />
          <span className="text-[11px] font-medium text-muted-foreground">Tasks</span>
        </div>
      </div>
    </div>
  );
}
