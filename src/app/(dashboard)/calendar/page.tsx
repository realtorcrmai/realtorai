"use client";

import { CRMCalendar } from "@/components/calendar/CRMCalendar";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your schedule and upcoming showings
        </p>
      </div>
      <CRMCalendar />
    </div>
  );
}
