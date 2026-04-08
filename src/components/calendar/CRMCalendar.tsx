"use client";

import { useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, addDays, subDays } from "date-fns";
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
  type: "google" | "showing";
  status?: string;
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

  const fetchEvents = useCallback(async (rangeStart: Date, rangeEnd: Date): Promise<CalendarEvent[]> => {
    try {
      const res = await fetch(
        `/api/calendar/events?start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`
      );
      if (!res.ok) return [];
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
      ];
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
      return [];
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const start = subDays(date, 30);
    const end = addDays(date, 30);
    fetchEvents(start, end).then((result) => {
      if (!cancelled) setEvents(result);
    });
    return () => { cancelled = true; };
  }, [date, fetchEvents]);

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
        <Badge className="bg-amber-400 text-amber-900 hover:bg-amber-400">
          Requested
        </Badge>
        <Badge className="bg-[#00C875] text-white hover:bg-[#007A47]">
          Confirmed
        </Badge>
        <Badge className="bg-red-400 text-white hover:bg-red-400">
          Denied
        </Badge>
      </div>

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
    </div>
  );
}
