"use client";

import { CRMCalendar } from "@/components/calendar/CRMCalendar";
import { PageHeader } from "@/components/layout/PageHeader";

export default function CalendarPage() {
  return (
    <>
      <PageHeader title="Calendar" />
      <div className="p-6">
        <CRMCalendar />
      </div>
    </>
  );
}
