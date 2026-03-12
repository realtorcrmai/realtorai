"use client";

import { CRMCalendar } from "@/components/calendar/CRMCalendar";

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Calendar</h1>
      <CRMCalendar />
    </div>
  );
}
