"use client";

import { useEffect, useRef } from "react";
import { useRealtimeDashboard, type DashboardStats, type RealtimeEvent } from "@/hooks/useRealtimeDashboard";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Building2,
  ListTodo,
  Clock,
  FileWarning,
  Wifi,
  WifiOff,
  UserPlus,
  Home,
  CheckCircle2,
  MessageSquare,
  CalendarCheck,
} from "lucide-react";

// ── Animated Counter ────────────────────────────────────────
function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value && ref.current) {
      ref.current.classList.remove("animate-counter-bump");
      // Force reflow
      void ref.current.offsetWidth;
      ref.current.classList.add("animate-counter-bump");
      prevValue.current = value;
    }
  }, [value]);

  return (
    <span ref={ref} className={className}>
      {value}
    </span>
  );
}

// ── Event icon mapping ──────────────────────────────────────
const EVENT_ICONS: Record<RealtimeEvent["type"], typeof UserPlus> = {
  new_lead: UserPlus,
  showing_request: CalendarCheck,
  task_completed: CheckCircle2,
  listing_sold: Home,
  listing_active: Building2,
  message_received: MessageSquare,
};

const EVENT_COLORS: Record<RealtimeEvent["type"], string> = {
  new_lead: "text-[#0F7694]",
  showing_request: "text-[#0F7694]",
  task_completed: "text-[#0F7694]",
  listing_sold: "text-[#0F7694]",
  listing_active: "text-[#0F7694]",
  message_received: "text-[#0F7694]",
};

// ── Quick Stats (real-time) ─────────────────────────────────
function RealtimeQuickStats({
  stats,
  isConnected,
  mode,
}: {
  stats: DashboardStats;
  isConnected: boolean;
  mode: "connecting" | "realtime" | "polling";
}) {
  const statItems = [
    {
      label: "Active Listings",
      value: stats.activeListings,
      color: "text-[#0F7694] dark:text-[#67D4E8]",
    },
    {
      label: "Open Tasks",
      value: stats.openTasks,
      color: "text-[#0F7694] dark:text-[#67D4E8]",
    },
    {
      label: "Pending Showings",
      value: stats.pendingShowings,
      color: "text-[#0F7694] dark:text-[#67D4E8]",
    },
    {
      label: "Missing Docs",
      value: stats.missingDocs,
      color: "text-rose-600 dark:text-rose-400",
      icon: stats.missingDocs > 0 ? AlertTriangle : null,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {statItems.map((stat) => (
        <div
          key={stat.label}
          className="glass rounded-xl px-4 py-3 elevation-2 transition-all duration-200 hover:elevation-4"
        >
          <div className="flex items-center gap-2">
            <AnimatedCounter
              value={stat.value}
              className={`text-2xl font-bold ${stat.color}`}
            />
            {stat.icon && <stat.icon className="h-4 w-4 text-rose-500" />}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stat.label}
          </p>
        </div>
      ))}

      {/* Connection indicator — subtle */}
      <div className="col-span-2 sm:col-span-4 flex items-center justify-end gap-1.5 -mt-1">
        {mode === "realtime" ? (
          <span className="flex items-center gap-1 text-[10px] text-[#0F7694]/60">
            <Wifi className="h-3 w-3" />
            Live
          </span>
        ) : mode === "polling" ? (
          <span className="flex items-center gap-1 text-[10px] text-[#0F7694]/60">
            <RefreshCw className="h-3 w-3" />
            Auto-refresh (30s)
          </span>
        ) : (
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground/50">
            <WifiOff className="h-3 w-3" />
            Connecting...
          </span>
        )}
      </div>
    </div>
  );
}

// ── Live Activity Feed ──────────────────────────────────────
function LiveActivityFeed({ events }: { events: RealtimeEvent[] }) {
  if (events.length === 0) return null;

  return (
    <div className="glass rounded-xl p-4 elevation-2">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#0F7694] opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0F7694]/50" />
        </span>
        Live Activity
      </h2>
      <div className="space-y-2 max-h-[200px] overflow-y-auto">
        {events.slice(0, 8).map((event) => {
          const Icon = EVENT_ICONS[event.type];
          const color = EVENT_COLORS[event.type];
          const timeAgo = getTimeAgo(event.timestamp);

          return (
            <div
              key={event.id}
              className="flex items-start gap-2.5 py-1.5 animate-float-in"
            >
              <div className={`mt-0.5 ${color}`}>
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  {event.title}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {event.body}
                </p>
              </div>
              <span className="text-[10px] text-muted-foreground/60 shrink-0">
                {timeAgo}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

// ── Main Wrapper ────────────────────────────────────────────
interface RealtimeDashboardProps {
  initialStats: DashboardStats;
}

export function RealtimeDashboard({ initialStats }: RealtimeDashboardProps) {
  const { stats, events, isConnected, mode } = useRealtimeDashboard(initialStats);
  const toastedRef = useRef(new Set<string>());

  // Show toast notifications for new events
  useEffect(() => {
    for (const event of events) {
      if (toastedRef.current.has(event.id)) continue;
      toastedRef.current.add(event.id);

      const Icon = EVENT_ICONS[event.type];
      toast(event.title, {
        description: event.body,
        icon: <Icon className={`h-4 w-4 ${EVENT_COLORS[event.type]}`} />,
        duration: 5000,
      });
    }
  }, [events]);

  return (
    <>
      <RealtimeQuickStats stats={stats} isConnected={isConnected} mode={mode} />
      <LiveActivityFeed events={events} />
    </>
  );
}
