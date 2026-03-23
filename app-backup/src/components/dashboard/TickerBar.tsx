"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ListTodo,
  Clock,
  FileWarning,
  Wifi,
  WifiOff,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeDashboard, type DashboardStats } from "@/hooks/useRealtimeDashboard";

type TickerItem = {
  label: string;
  value: number;
  icon: typeof Building2;
  href: string;
  color: string;
  alert?: boolean;
};

function buildItems(stats: DashboardStats): TickerItem[] {
  return [
    { label: "Active Listings", value: stats.activeListings, icon: Building2, href: "/listings", color: "text-sky-300" },
    { label: "Open Tasks", value: stats.openTasks, icon: ListTodo, href: "/tasks", color: "text-indigo-300" },
    { label: "Pending Showings", value: stats.pendingShowings, icon: Clock, href: "/showings", color: "text-teal-300" },
    { label: "Missing Docs", value: stats.missingDocs, icon: FileWarning, href: "/forms", color: "text-red-300", alert: stats.missingDocs > 0 },
  ];
}

// ── Animated number that bumps on change ──
function AnimatedNum({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useEffect(() => {
    if (prev.current !== value && ref.current) {
      ref.current.classList.remove("animate-counter-bump");
      void ref.current.offsetWidth;
      ref.current.classList.add("animate-counter-bump");
      prev.current = value;
    }
  }, [value]);

  return <span ref={ref} className="tabular-nums">{value}</span>;
}

export function TickerBar({ initialStats }: { initialStats: DashboardStats }) {
  const { stats, isConnected, mode } = useRealtimeDashboard(initialStats);
  const items = buildItems(stats);

  // Mobile: carousel mode
  const [mobileIndex, setMobileIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-rotate on mobile every 4 seconds
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setMobileIndex((i) => (i + 1) % items.length);
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [items.length]);

  const goNext = () => {
    setMobileIndex((i) => (i + 1) % items.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };
  const goPrev = () => {
    setMobileIndex((i) => (i - 1 + items.length) % items.length);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-3 md:p-4 elevation-8 relative overflow-hidden">
      {/* Subtle gradient shimmer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent pointer-events-none" />

      {/* Desktop: show all items in a row */}
      <div className="hidden md:flex items-center justify-between gap-2 relative z-10">
        <div className="flex items-center gap-1 flex-1">
          {items.map((item, i) => (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2 rounded-xl transition-all hover:bg-white/10 flex-1 group",
                item.alert && "bg-red-500/10"
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", item.color)} />
              <span className={cn("text-xl font-bold text-white group-hover:scale-110 transition-transform inline-block", item.alert && "text-red-300")}>
                <AnimatedNum value={item.value} />
              </span>
              <span className="text-[11px] text-white/50 group-hover:text-white/70 transition-colors">
                {item.label}
              </span>
              {i < items.length - 1 && (
                <div className="w-px h-5 bg-white/10 ml-auto shrink-0" />
              )}
            </Link>
          ))}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 pl-3 border-l border-white/10 shrink-0">
          {mode === "realtime" ? (
            <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              Live
            </span>
          ) : mode === "polling" ? (
            <span className="flex items-center gap-1 text-[10px] text-blue-400">
              <RefreshCw className="h-3 w-3" />
              30s
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[10px] text-white/30">
              <WifiOff className="h-3 w-3" />
            </span>
          )}
        </div>
      </div>

      {/* Mobile: single item carousel with arrows */}
      <div className="flex md:hidden items-center justify-between gap-2 relative z-10">
        <button onClick={goPrev} className="text-white/40 hover:text-white/80 p-1 shrink-0">
          <ChevronLeft className="h-4 w-4" />
        </button>

        <Link
          href={items[mobileIndex].href}
          className="flex items-center gap-3 flex-1 justify-center py-1"
        >
          {(() => {
            const item = items[mobileIndex];
            return (
              <>
                <item.icon className={cn("h-4 w-4", item.color)} />
                <span className={cn("text-xl font-bold text-white", item.alert && "text-red-300")}>
                  <AnimatedNum value={item.value} />
                </span>
                <span className="text-xs text-white/50">{item.label}</span>
              </>
            );
          })()}
        </Link>

        <button onClick={goNext} className="text-white/40 hover:text-white/80 p-1 shrink-0">
          <ChevronRight className="h-4 w-4" />
        </button>

        {/* Dot indicators */}
        <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 flex gap-1">
          {items.map((_, i) => (
            <div key={i} className={cn("h-1 rounded-full transition-all", i === mobileIndex ? "w-3 bg-white/60" : "w-1 bg-white/20")} />
          ))}
        </div>
      </div>
    </div>
  );
}
