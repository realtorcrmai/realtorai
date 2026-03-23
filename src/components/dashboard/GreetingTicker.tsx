"use client";

import { useEffect, useState } from "react";
import { Building2, ListTodo, Clock, FileWarning, Users, UserPlus } from "lucide-react";

interface DashboardStats {
  activeListings: number;
  openTasks: number;
  pendingShowings: number;
  missingDocs: number;
  totalContacts: number;
  newLeadsToday: number;
}

const STAT_ITEMS = [
  { key: "activeListings", label: "Active Listings", icon: Building2 },
  { key: "openTasks", label: "Open Tasks", icon: ListTodo },
  { key: "pendingShowings", label: "Pending Showings", icon: Clock },
  { key: "missingDocs", label: "Missing Docs", icon: FileWarning },
  { key: "totalContacts", label: "Contacts", icon: Users },
  { key: "newLeadsToday", label: "New Leads Today", icon: UserPlus },
] as const;

export function GreetingTicker({
  initialStats,
}: {
  initialStats: DashboardStats;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter to only stats with non-zero values
  const visibleItems = STAT_ITEMS.filter(
    (item) => initialStats[item.key] > 0
  );

  useEffect(() => {
    if (visibleItems.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % visibleItems.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [visibleItems.length]);

  if (visibleItems.length === 0) return null;

  const current = visibleItems[currentIndex];
  const Icon = current.icon;
  const value = initialStats[current.key];

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/15 rounded-lg px-3 py-2 min-w-[160px] transition-all">
      <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="font-semibold text-primary">{value}</span>
      <span>{current.label}</span>
    </div>
  );
}
