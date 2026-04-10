"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  ListTodo,
  Clock,
  FileWarning,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useRealtimeDashboard, type DashboardStats } from "@/hooks/useRealtimeDashboard";

type StatItem = {
  label: string;
  value: number;
  icon: typeof Building2;
  href: string;
  color: string;
  iconBg: string;
  alert?: boolean;
};

function buildItems(stats: DashboardStats): StatItem[] {
  return [
    { label: "Active Listings",  value: stats.activeListings,  icon: Building2,    href: "/listings", color: "text-brand", iconBg: "bg-brand-muted" },
    { label: "Open Tasks",       value: stats.openTasks,       icon: ListTodo,     href: "/tasks",    color: "text-[#A25DDC]", iconBg: "bg-[#A25DDC]/10" },
    { label: "Pending Showings", value: stats.pendingShowings, icon: Clock,        href: "/showings", color: "text-[#FDAB3D]", iconBg: "bg-[#FDAB3D]/15" },
    { label: "Missing Docs",     value: stats.missingDocs,     icon: FileWarning,  href: "/forms",    color: "text-rose-600",  iconBg: "bg-rose-50", alert: stats.missingDocs > 0 },
  ];
}

// Animated number with bump on change
function AnimNum({ value, className }: { value: number; className?: string }) {
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
  return <span ref={ref} className={cn("tabular-nums", className)}>{value}</span>;
}

// Single stat card with staggered entry
function StatCard({ item, delay }: { item: StatItem; delay: number }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors hover:bg-muted/60 group",
        item.alert && "bg-rose-50/50"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-transform duration-300 group-hover:scale-110", item.iconBg)}>
        <item.icon className={cn("h-4 w-4", item.color)} />
      </div>
      <div className="flex flex-col">
        <AnimNum
          value={item.value}
          className={cn("text-xl font-bold leading-tight", item.color)}
        />
        <span className="text-[10px] text-muted-foreground leading-tight whitespace-nowrap">
          {item.label}
        </span>
      </div>
    </Link>
  );
}

export function GreetingTicker({ initialStats }: { initialStats: DashboardStats }) {
  const { stats } = useRealtimeDashboard(initialStats);
  const items = buildItems(stats);
  const [page, setPage] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setIsTransitioning(true);
      // Start exit animation, then swap after it completes
      setTimeout(() => {
        setPage((p) => (p + 1) % 2);
        setIsTransitioning(false);
      }, 600); // Match the exit animation duration
    }, 5000);
  }, []);

  useEffect(() => {
    startTimer();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [startTimer]);

  const goTo = (p: number) => {
    if (p === page) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setPage(p);
      setIsTransitioning(false);
    }, 400);
    startTimer();
  };

  const pair = page === 0 ? items.slice(0, 2) : items.slice(2, 4);

  return (
    <div className="flex flex-col items-end gap-1.5">
      {/* Cards with crossfade + slide */}
      <div className="relative overflow-hidden h-[52px] w-[300px]">
        <div
          className={cn(
            "flex items-center gap-2 h-full transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isTransitioning
              ? "opacity-0 translate-y-3 blur-[2px] scale-[0.97]"
              : "opacity-100 translate-y-0 blur-0 scale-100"
          )}
        >
          {pair.map((item, i) => (
            <div
              key={item.label}
              className={cn(
                "transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
                isTransitioning
                  ? "opacity-0 translate-y-2"
                  : "opacity-100 translate-y-0",
              )}
              style={{
                transitionDuration: isTransitioning ? "500ms" : "800ms",
                transitionDelay: isTransitioning ? `${i * 80}ms` : `${i * 120 + 100}ms`,
              }}
            >
              <StatCard item={item} delay={0} />
            </div>
          ))}
        </div>
      </div>

      {/* Horizontal dot indicators below cards */}
      <div className="flex items-center gap-1.5 pr-1.5">
        {[0, 1].map((i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={cn(
              "h-1 rounded-full transition-all duration-500 ease-out",
              page === i
                ? "w-4 bg-brand"
                : "w-1 bg-muted-foreground/25 hover:bg-muted-foreground/45"
            )}
          />
        ))}
      </div>
    </div>
  );
}
