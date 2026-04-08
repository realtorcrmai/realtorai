"use client";

import { useMemo } from "react";
import { isToday, isTomorrow, format } from "date-fns";
import { Sparkles, TrendingUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "./DashboardCalendar";
import type { DayTask } from "./DayActivityFeed";

interface AIBriefCardProps {
  events: CalendarEvent[];
  tasks: DayTask[];
  selectedDate: Date;
  pendingShowings: number;
  activeListings: number;
}

type BriefLine = { text: string; type: "neutral" | "alert" | "positive" | "info" };

function generateBrief({ events, tasks, selectedDate, pendingShowings, activeListings }: AIBriefCardProps): BriefLine[] {
  const dayEvents = events.filter((ev) => {
    const d = new Date(ev.start);
    return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth() && d.getDate() === selectedDate.getDate();
  });
  const showings = dayEvents.filter((ev) => ev.type === "showing");
  const googleEvents = dayEvents.filter((ev) => ev.type === "google");
  const pendingToday = showings.filter((s) => s.status === "requested");
  const confirmedToday = showings.filter((s) => s.status === "confirmed");
  const dayTasks = tasks.filter((t) => {
    if (!t.due_date) return false;
    const d = new Date(t.due_date);
    return d.getFullYear() === selectedDate.getFullYear() && d.getMonth() === selectedDate.getMonth() && d.getDate() === selectedDate.getDate();
  });
  const urgentTasks = dayTasks.filter((t) => t.priority === "urgent" || t.priority === "high");
  const lines: BriefLine[] = [];
  const dayLabel = isToday(selectedDate) ? "today" : isTomorrow(selectedDate) ? "tomorrow" : format(selectedDate, "EEEE");

  if (dayEvents.length === 0) {
    lines.push({ text: `No events scheduled ${dayLabel}. A great day to focus on follow-ups and prospecting.`, type: "positive" });
  } else {
    const parts: string[] = [];
    if (showings.length > 0) parts.push(`${showings.length} showing${showings.length !== 1 ? "s" : ""}`);
    if (googleEvents.length > 0) parts.push(`${googleEvents.length} calendar event${googleEvents.length !== 1 ? "s" : ""}`);
    lines.push({ text: `You have ${parts.join(" and ")} ${dayLabel}.`, type: "info" });
  }
  if (confirmedToday.length > 0) lines.push({ text: `${confirmedToday.length} showing${confirmedToday.length !== 1 ? "s" : ""} confirmed and ready to go.`, type: "positive" });
  if (pendingToday.length > 0) lines.push({ text: `${pendingToday.length} showing${pendingToday.length !== 1 ? "s" : ""} still awaiting confirmation.`, type: "alert" });
  if (urgentTasks.length > 0) lines.push({ text: `${urgentTasks.length} high-priority task${urgentTasks.length !== 1 ? "s" : ""} due ${dayLabel}.`, type: "alert" });
  if (isToday(selectedDate)) {
    if (pendingShowings > 0 && lines.length < 4) lines.push({ text: `${pendingShowings} total showing request${pendingShowings !== 1 ? "s" : ""} pending across your listings.`, type: "neutral" });
    if (activeListings > 0 && lines.length < 4) lines.push({ text: `${activeListings} active listing${activeListings !== 1 ? "s" : ""} in your portfolio.`, type: "info" });
  }
  return lines.length > 0 ? lines : [{ text: "Everything looks clear. Time to build relationships and close deals.", type: "positive" as const }];
}

const LINE_DOT_COLORS: Record<string, string> = {
  neutral: "bg-muted-foreground/30",
  alert: "bg-amber-400 shadow-sm shadow-amber-400/40",
  positive: "bg-[#67D4E8] shadow-sm shadow-[#0F7694]/30",
  info: "bg-primary/50",
};
const LINE_COLORS: Record<string, string> = {
  neutral: "text-muted-foreground",
  alert: "text-amber-600 dark:text-amber-400",
  positive: "text-[#0F7694] dark:text-[#67D4E8]",
  info: "text-primary",
};

export function AIBriefCard(props: AIBriefCardProps) {
  const lines = useMemo(() => generateBrief(props), [props.events, props.tasks, props.selectedDate, props.pendingShowings, props.activeListings]);

  return (
    <div className="relative rounded-2xl overflow-hidden elevation-4 bg-card border border-[#0F7694]/20">
      {/* Gold accent top border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#0F7694]/60 via-[#0F7694] to-[#0F7694]/60" />
      <div className="px-5 py-4">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#0F7694] shadow-md shadow-[#0F7694]/20">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#1a1535]/40">AI Daily Brief</h3>
        </div>
        <div className="space-y-3">
          {lines.map((line, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className={cn("mt-1.5 h-2 w-2 rounded-full shrink-0", LINE_DOT_COLORS[line.type])} />
              <p className={cn("text-sm leading-relaxed", i === 0 ? "text-foreground font-semibold" : LINE_COLORS[line.type])}>{line.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
