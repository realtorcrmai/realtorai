"use client";

import dynamic from "next/dynamic";
import { PageHeader } from "@/components/layout/PageHeader";

const CRMCalendar = dynamic(
  () => import("@/components/calendar/CRMCalendar").then((m) => m.CRMCalendar),
  { ssr: false }
);

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
