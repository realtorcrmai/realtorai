"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Cake, Heart, Home, Calendar, Loader2 } from "lucide-react";
import Link from "next/link";

type Reminder = {
  id: string;
  contactId: string;
  contactName: string;
  dateType: "birthday" | "anniversary" | "mortgage_renewal" | "other";
  date: string;
  daysUntil: number;
};

const DATE_TYPE_CONFIG: Record<
  string,
  { icon: typeof Cake; label: string; color: string }
> = {
  birthday: { icon: Cake, label: "Birthday", color: "text-pink-500" },
  anniversary: { icon: Heart, label: "Anniversary", color: "text-red-500" },
  mortgage_renewal: { icon: Home, label: "Mortgage Renewal", color: "text-blue-500" },
  other: { icon: Calendar, label: "Important Date", color: "text-amber-500" },
};

function getTimeframeLabel(daysUntil: number): string {
  if (daysUntil === 0) return "Today";
  if (daysUntil === 1) return "Tomorrow";
  if (daysUntil <= 7) return "This Week";
  return "This Month";
}

export function RemindersWidget() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReminders() {
      try {
        const res = await fetch("/api/reminders/upcoming");
        if (res.ok) {
          const data = await res.json();
          setReminders(data.reminders ?? []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchReminders();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (reminders.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Upcoming Reminders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No upcoming reminders in the next 30 days
          </p>
        </CardContent>
      </Card>
    );
  }

  // Group by timeframe
  const grouped: Record<string, Reminder[]> = {};
  for (const r of reminders) {
    const label = getTimeframeLabel(r.daysUntil);
    if (!grouped[label]) grouped[label] = [];
    grouped[label].push(r);
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="h-4 w-4" />
          Upcoming Reminders
          {reminders.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
              {reminders.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Object.entries(grouped).map(([timeframe, items]) => (
          <div key={timeframe}>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {timeframe}
            </p>
            <div className="space-y-2">
              {items.map((reminder) => {
                const config = DATE_TYPE_CONFIG[reminder.dateType] ?? DATE_TYPE_CONFIG.other;
                const Icon = config.icon;

                return (
                  <Link
                    key={reminder.id}
                    href={`/contacts/${reminder.contactId}`}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {reminder.contactName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {config.label}
                        {reminder.daysUntil === 0
                          ? " — Today!"
                          : reminder.daysUntil === 1
                            ? " — Tomorrow"
                            : ` — ${reminder.daysUntil} days`}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
