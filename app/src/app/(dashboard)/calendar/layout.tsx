"use client";

import { CalendarSidebar } from "@/components/calendar/CalendarSidebar";

export default function CalendarLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full">
      <div className="hidden md:flex flex-col h-full">
        <CalendarSidebar />
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        {children}
      </div>
    </div>
  );
}
