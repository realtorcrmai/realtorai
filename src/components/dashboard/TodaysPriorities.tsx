"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface TodaysPrioritiesProps {
  overdueTasks: number;
  hotLeads: number;
  pendingShowings: number;
  missingDocs: number;
  confirmedToday: number;
}

interface PriorityRow {
  icon: string;
  label: string;
  count: number;
  href: string;
  urgency: number;
}

export default function TodaysPriorities({
  overdueTasks,
  hotLeads,
  pendingShowings,
  missingDocs,
  confirmedToday,
}: TodaysPrioritiesProps) {
  const rows: PriorityRow[] = [
    { icon: "\uD83D\uDD34", label: "overdue tasks", count: overdueTasks, href: "/tasks", urgency: 1 },
    { icon: "\uD83D\uDFE1", label: "pending showings", count: pendingShowings, href: "/showings", urgency: 2 },
    { icon: "\uD83D\uDD25", label: "hot leads (score >= 60)", count: hotLeads, href: "/contacts", urgency: 3 },
    { icon: "\uD83D\uDCCB", label: "listings missing docs", count: missingDocs, href: "/listings", urgency: 4 },
    { icon: "\u2705", label: "confirmed showings this week", count: confirmedToday, href: "/showings?status=confirmed", urgency: 5 },
  ];

  const visible = rows.filter((r) => r.count > 0).sort((a, b) => a.urgency - b.urgency);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Priorities</CardTitle>
      </CardHeader>
      <CardContent>
        {visible.length === 0 ? (
          <p className="text-sm text-muted-foreground">All caught up! No urgent items right now.</p>
        ) : (
          <div className="space-y-2">
            {visible.map((row) => (
              <Link
                key={row.label}
                href={row.href}
                className="flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/50"
              >
                <span className="text-base shrink-0">{row.icon}</span>
                <span className="text-sm text-foreground flex-1">
                  <span className="font-semibold">{row.count}</span> {row.label}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
