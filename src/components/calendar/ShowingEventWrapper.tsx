"use client";

import { cn } from "@/lib/utils";

interface ShowingEvent {
  type: "google" | "showing";
  status?: string;
}

export function ShowingEventWrapper({
  event,
  children,
}: {
  event: ShowingEvent;
  children: React.ReactNode;
}) {
  const getColor = () => {
    if (event.type === "google") return "bg-blue-500 text-white";
    switch (event.status) {
      case "requested":
        return "bg-amber-400 text-amber-900";
      case "confirmed":
        return "bg-[#00C875] text-white";
      case "denied":
        return "bg-red-400 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  return (
    <div
      className={cn(
        "rounded px-1.5 py-0.5 text-xs font-medium truncate",
        getColor()
      )}
    >
      {children}
    </div>
  );
}
