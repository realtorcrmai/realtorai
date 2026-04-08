"use client";

import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, User, Phone, Mail, Calendar } from "lucide-react";

function PreviewRow({ icon: Icon, label, value, empty }: { icon: typeof MapPin; label: string; value?: string; empty?: string }) {
  const hasValue = !!value;
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className={`h-4 w-4 shrink-0 ${hasValue ? "text-foreground" : "text-muted-foreground/25"}`} />
      <span className="text-muted-foreground text-sm min-w-[70px] shrink-0">{label}</span>
      <span className={hasValue ? "text-foreground font-medium" : "text-muted-foreground/30 italic"}>
        {value || empty || "—"}
      </span>
    </div>
  );
}

export interface ShowingPreviewCardProps {
  listingAddress: string;
  date: string;
  startTime: string;
  endTime: string;
  buyerAgentName: string;
  buyerAgentPhone: string;
  buyerAgentEmail: string;
}

export function ShowingPreviewCard({
  listingAddress, date, startTime, endTime,
  buyerAgentName, buyerAgentPhone, buyerAgentEmail,
}: ShowingPreviewCardProps) {
  const gradient = "from-amber-500 to-orange-600";

  // Format date for display
  const dateDisplay = date
    ? new Date(date + "T00:00:00").toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" })
    : "";
  const timeDisplay = startTime && endTime ? `${startTime} — ${endTime}` : startTime || endTime || "";

  // Completion tracking
  const totalFields = 5;
  const filledFields = [listingAddress, date, startTime, buyerAgentName, buyerAgentPhone].filter(Boolean).length;
  const completionPct = Math.min(100, Math.round((filledFields / totalFields) * 100));

  return (
    <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-white via-white to-[#FAF8F4] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/50 shadow-lg overflow-hidden transition-all duration-300">
      {/* Colored top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${gradient}`} />

      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl shadow-lg`}>
            🏠
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold tracking-tight truncate">
              {listingAddress || <span className="text-muted-foreground/30 italic font-normal">Select a listing</span>}
            </h3>
            <Badge variant="outline" className="text-sm bg-amber-50 text-amber-700 border-amber-200 mt-0.5">
              Requested
            </Badge>
          </div>
        </div>

        {/* Completion bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completionPct >= 70 ? "bg-[#0F7694]/50" : completionPct >= 40 ? "bg-amber-500" : "bg-red-400"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{completionPct}%</span>
        </div>

        {/* Schedule */}
        <div className="space-y-1.5 border-t border-border/20 pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Schedule</p>
          <PreviewRow icon={Calendar} label="Date" value={dateDisplay} empty="Pick a date" />
          <PreviewRow icon={Clock} label="Time" value={timeDisplay} empty="Set time window" />
        </div>

        {/* Buyer's Agent */}
        <div className="space-y-1.5 border-t border-border/20 pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Buyer&apos;s Agent</p>
          <PreviewRow icon={User} label="Name" value={buyerAgentName} empty="Agent name" />
          <PreviewRow icon={Phone} label="Phone" value={buyerAgentPhone} empty="Agent phone" />
          <PreviewRow icon={Mail} label="Email" value={buyerAgentEmail} empty="Agent email" />
        </div>

        {/* Status flow */}
        <div className="border-t border-border/20 pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Status Flow</p>
          <div className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${gradient} ring-2 ring-offset-1 ring-current shadow-sm`} />
            <div className="h-0.5 w-6 bg-muted/30 rounded-full" />
            <div className="w-3 h-3 rounded-full bg-muted/20" />
            <div className="h-0.5 w-6 bg-muted/30 rounded-full" />
            <div className="w-3 h-3 rounded-full bg-muted/20" />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Requested → Confirmed → Completed</p>
        </div>
      </div>
    </div>
  );
}
