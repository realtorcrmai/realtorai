"use client";

import { useState, useEffect, useCallback } from "react";
import { subDays, addDays } from "date-fns";
import { DashboardCalendar, type CalendarEvent } from "./DashboardCalendar";
import { DayActivityFeed, type DayTask } from "./DayActivityFeed";
import { AIBriefCard } from "./AIBriefCard";
import { RemindersWidget } from "./RemindersWidget";

interface PriorityAlert {
  icon: string;
  label: string;
  count: number;
  href: string;
}

interface DashboardShellProps {
  initialTasks: DayTask[];
  pendingShowings: number;
  activeListings: number;
  priorities?: PriorityAlert[];
}

export function DashboardShell({ initialTasks, pendingShowings, activeListings, priorities }: DashboardShellProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const fetchEvents = useCallback(async () => {
    try {
      const center = new Date();
      const start = subDays(center, 45);
      const end = addDays(center, 45);
      const res = await fetch(`/api/calendar/events?start=${start.toISOString()}&end=${end.toISOString()}`);
      if (!res.ok) return;
      const data = await res.json();
      const calEvents: CalendarEvent[] = [
        ...(data.googleEvents ?? []).map((e: any) => ({ id: e.id, title: e.title, start: new Date(e.start), end: new Date(e.end), type: "google" as const })),
        ...(data.showingEvents ?? []).map((e: any) => ({ id: e.id, title: e.title, start: new Date(e.start), end: new Date(e.end), type: "showing" as const, status: e.status })),
        ...(data.taskEvents ?? []).map((e: any) => ({ id: `task-${e.id}`, title: e.title, start: new Date(e.start), end: new Date(e.end), type: "task" as const, status: e.status })),
      ];
      setEvents(calEvents);
    } catch { /* silent */ }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6">
      <div className="lg:col-span-7 space-y-5">
        <div className="animate-float-in" style={{ animationDelay: "60ms" }}>
          <DashboardCalendar events={events} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </div>
        <div className="animate-float-in" style={{ animationDelay: "120ms" }}>
          <AIBriefCard events={events} tasks={initialTasks} selectedDate={selectedDate} pendingShowings={pendingShowings} activeListings={activeListings} />
        </div>
        <div className="animate-float-in" style={{ animationDelay: "180ms" }}>
          <RemindersWidget />
        </div>
      </div>
      <div className="lg:col-span-5">
        <div className="animate-float-in lg:sticky lg:top-4" style={{ animationDelay: "100ms" }}>
          <DayActivityFeed events={events} selectedDate={selectedDate} tasks={initialTasks} priorities={priorities} />
        </div>
      </div>
    </div>
  );
}
