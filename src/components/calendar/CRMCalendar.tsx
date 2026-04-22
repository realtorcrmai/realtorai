"use client";

import { useState, useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, subDays, isToday, isTomorrow } from "date-fns";
import { enCA } from "date-fns/locale/en-CA";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";

const locales = { "en-CA": enCA };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: "google" | "showing" | "task";
  status?: string;
  priority?: string;
  category?: string;
  buyerAgentName?: string;
  buyerAgentPhone?: string;
  listingId?: string;
}

function eventStyleGetter(event: CalendarEvent) {
  let backgroundColor = "#3b82f6"; // blue for google
  if (event.type === "showing") {
    switch (event.status) {
      case "requested":
        backgroundColor = "#f59e0b";
        break;
      case "confirmed":
        backgroundColor = "#22c55e";
        break;
      case "denied":
        backgroundColor = "#ef4444";
        break;
      default:
        backgroundColor = "#9ca3af";
    }
  } else if (event.type === "task") {
    backgroundColor = event.status === "completed" ? "#9ca3af" : "#8b5cf6"; // purple for tasks, grey if done
  }
  return {
    style: {
      backgroundColor,
      borderRadius: "4px",
      color: "white",
      border: "none",
      fontSize: "12px",
    },
  };
}

function EventComponent({ event }: { event: CalendarEvent }) {
  if (event.type === "google") {
    return <span className="text-xs">{event.title}</span>;
  }

  if (event.type === "task") {
    return (
      <Popover>
        <PopoverTrigger className="text-xs cursor-pointer text-left">
          {event.title}
        </PopoverTrigger>
        <PopoverContent className="w-64">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">{event.title}</h4>
            <div className="flex items-center gap-2">
              <Badge variant={event.status === "completed" ? "outline" : "default"} className={event.status === "completed" ? "" : "bg-violet-500 text-white hover:bg-violet-500"}>
                {event.status}
              </Badge>
              <Badge variant="outline" className="text-[10px]">{event.priority}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Due: {format(event.start, "MMM d, yyyy")}
            </p>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover>
      <PopoverTrigger className="text-xs cursor-pointer text-left">
        {event.title}
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">{event.title}</h4>
          <ShowingStatusBadge
            status={event.status as "requested" | "confirmed" | "denied" | "cancelled"}
          />
          <div className="text-sm space-y-1">
            <p>
              <strong>Agent:</strong> {event.buyerAgentName}
            </p>
            <p>
              <strong>Phone:</strong> {event.buyerAgentPhone}
            </p>
            <p>
              <strong>Time:</strong>{" "}
              {format(event.start, "MMM d, h:mm a")} -{" "}
              {format(event.end, "h:mm a")}
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function UpcomingTasks({ events }: { events: CalendarEvent[] }) {
  const days = useMemo(() => {
    const today = new Date();
    return [0, 1, 2].map((offset) => {
      const d = addDays(today, offset);
      const dateStr = format(d, "yyyy-MM-dd");
      const tasks = events.filter(
        (ev) => ev.type === "task" && format(ev.start, "yyyy-MM-dd") === dateStr
      );
      const label = isToday(d) ? "Today" : isTomorrow(d) ? "Tomorrow" : format(d, "EEEE");
      return { date: d, dateStr, label, tasks };
    });
  }, [events]);

  const totalTasks = days.reduce((sum, d) => sum + d.tasks.length, 0);
  if (totalTasks === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-violet-500" />
        Upcoming Tasks
        <span className="text-muted-foreground font-normal">({totalTasks})</span>
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {days.map(({ dateStr, label, date, tasks }) => (
          <div key={dateStr}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {label} <span className="font-normal">{format(date, "MMM d")}</span>
            </p>
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground/50">No tasks</p>
            ) : (
              <div className="space-y-1.5">
                {tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/20"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shrink-0" />
                    <span className="text-xs font-medium text-violet-700 dark:text-violet-300 truncate">
                      {t.title}
                    </span>
                    {t.status === "completed" && (
                      <span className="text-[9px] text-muted-foreground ml-auto shrink-0">Done</span>
                    )}
                    {t.priority === "urgent" && (
                      <span className="text-[9px] text-red-500 font-bold ml-auto shrink-0">URGENT</span>
                    )}
                    {t.priority === "high" && t.status !== "completed" && (
                      <span className="text-[9px] text-orange-500 font-semibold ml-auto shrink-0">HIGH</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Use matchMedia to determine initial view for responsive behavior
const mql = typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)") : null;
function subscribeToMql(cb: () => void) {
  mql?.addEventListener("change", cb);
  return () => mql?.removeEventListener("change", cb);
}
function getIsMobile() {
  return mql?.matches ?? false;
}
function getIsMobileServer() {
  return false;
}

export function CRMCalendar() {
  const isMobile = useSyncExternalStore(subscribeToMql, getIsMobile, getIsMobileServer);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [view, setView] = useState<View>(() => isMobile ? "agenda" : "week");
  const [date, setDate] = useState(new Date());
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (rangeStart: Date, rangeEnd: Date): Promise<CalendarEvent[]> => {
    try {
      const res = await fetch(
        `/api/calendar/events?start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`
      );
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      return [
        ...(data.googleEvents ?? []).map(
          (e: { id: string; title: string; start: string; end: string }) => ({
            id: e.id,
            title: e.title,
            start: new Date(e.start),
            end: new Date(e.end),
            type: "google" as const,
          })
        ),
        ...(data.showingEvents ?? []).map(
          (e: {
            id: string;
            title: string;
            start: string;
            end: string;
            status: string;
            buyerAgentName: string;
            buyerAgentPhone: string;
            listingId: string;
          }) => ({
            id: e.id,
            title: e.title,
            start: new Date(e.start),
            end: new Date(e.end),
            type: "showing" as const,
            status: e.status,
            buyerAgentName: e.buyerAgentName,
            buyerAgentPhone: e.buyerAgentPhone,
            listingId: e.listingId,
          })
        ),
        ...(data.taskEvents ?? []).map(
          (e: {
            id: string;
            title: string;
            start: string;
            end: string;
            status: string;
            priority: string;
            category: string;
          }) => ({
            id: `task-${e.id}`,
            title: e.title,
            start: new Date(e.start),
            end: new Date(e.end),
            type: "task" as const,
            status: e.status,
            priority: e.priority,
            category: e.category,
          })
        ),
      ];
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
      setFetchError("Unable to load calendar events. Please try again.");
      return [];
    }
  }, []);

  const loadEvents = useCallback((forDate: Date) => {
    setFetchError(null);
    const start = subDays(forDate, 30);
    const end = addDays(forDate, 30);
    let cancelled = false;
    fetchEvents(start, end).then((result) => {
      if (!cancelled) setEvents(result);
    });
    return () => { cancelled = true; };
  }, [fetchEvents]);

  useEffect(() => {
    return loadEvents(date);
  }, [date, loadEvents]);

  // Sync view when screen size changes from desktop to mobile
  useEffect(() => {
    if (!isMobile) return;
    const raf = requestAnimationFrame(() => setView("agenda"));
    return () => cancelAnimationFrame(raf);
  }, [isMobile]);

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        <Badge className="bg-blue-500 text-white hover:bg-blue-500">
          Google Calendar
        </Badge>
        <Badge className="bg-violet-500 text-white hover:bg-violet-500">
          Task
        </Badge>
        <Badge className="bg-amber-400 text-amber-900 hover:bg-amber-400">
          Requested
        </Badge>
        <Badge className="bg-success text-white hover:bg-[#007A47]">
          Confirmed
        </Badge>
        <Badge className="bg-red-400 text-white hover:bg-red-400">
          Denied
        </Badge>
      </div>

      {/* Upcoming tasks — next 3 days */}
      <UpcomingTasks events={events} />

      {fetchError ? (
        <div className="flex flex-col items-center justify-center h-[600px] md:h-[700px] gap-3 text-center">
          <p className="text-sm text-red-600">⚠️ {fetchError}</p>
          <button
            onClick={() => loadEvents(date)}
            className="px-4 py-2 text-sm rounded-lg border border-input bg-background hover:bg-accent transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <div className="h-[600px] md:h-[700px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            eventPropGetter={eventStyleGetter}
            components={{
              event: EventComponent,
            }}
            views={["month", "week", "day", "agenda"]}
            step={30}
            timeslots={2}
            popup
          />
        </div>
      )}
    </div>
  );
}
