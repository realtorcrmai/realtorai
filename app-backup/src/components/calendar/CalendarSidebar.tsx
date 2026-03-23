"use client";

import { useState, useEffect } from "react";
import { format, addDays, subDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin } from "lucide-react";

interface ShowingEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  status: string;
  buyerAgentName: string;
  buyerAgentPhone: string;
  listingId: string;
}

const statusBadgeStyles: Record<string, string> = {
  confirmed: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  requested: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  denied: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

export function CalendarSidebar() {
  const [showings, setShowings] = useState<ShowingEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const now = new Date();
        const start = subDays(now, 1).toISOString();
        const end = addDays(now, 30).toISOString();
        const res = await fetch(
          `/api/calendar/events?start=${start}&end=${end}`
        );
        if (!res.ok) return;
        const data = await res.json();
        setShowings(data.showingEvents ?? []);
      } catch {
        setShowings([]);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const now = new Date();
  const confirmedCount = showings.filter((s) => s.status === "confirmed").length;
  const pendingCount = showings.filter((s) => s.status === "requested").length;

  // Upcoming showings: confirmed or requested, start >= now, sorted by date, top 5
  const upcoming = showings
    .filter(
      (s) =>
        (s.status === "confirmed" || s.status === "requested") &&
        new Date(s.start) >= now
    )
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 5);

  return (
    <aside className="w-[280px] shrink-0 border-r bg-card/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <h2 className="text-base font-semibold">Schedule</h2>

        {/* Today's date */}
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Today
          </p>
          <p className="text-lg font-bold mt-0.5">
            {format(now, "EEEE, MMMM d")}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
            <div>
              <p className="text-lg font-bold leading-tight">{confirmedCount}</p>
              <p className="text-[11px] text-muted-foreground">Confirmed</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            <div>
              <p className="text-lg font-bold leading-tight">{pendingCount}</p>
              <p className="text-[11px] text-muted-foreground">Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming showings */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Upcoming Showings
          </h3>

          {loading ? (
            <div className="text-center py-6">
              <Calendar className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2 animate-spin" />
              <p className="text-xs text-muted-foreground">Loading...</p>
            </div>
          ) : upcoming.length === 0 ? (
            <div className="text-center py-6">
              <Calendar className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                No upcoming showings
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming.map((showing) => (
                <div
                  key={showing.id}
                  className="rounded-lg border border-border/40 p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3 w-3 text-primary shrink-0" />
                        <p className="text-sm font-medium truncate">
                          {showing.title}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-[18px]">
                        {format(new Date(showing.start), "MMM d, h:mm a")}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`${statusBadgeStyles[showing.status] ?? ""} text-[11px] px-1.5 py-0 shrink-0 capitalize border-0`}
                    >
                      {showing.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
