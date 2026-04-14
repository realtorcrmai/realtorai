"use client";

/**
 * ActivitySparkline — a compact 30-day activity visualization.
 * Each day shows a dot: filled = had communication, empty = no activity.
 * Recent days on the right, older on the left.
 * Color: green (active recently), amber (cooling), red (gone cold).
 */

interface Props {
  /** Array of ISO date strings for each communication */
  communicationDates: string[];
}

export function ActivitySparkline({ communicationDates }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build a 30-day activity map
  const days: boolean[] = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const hasActivity = communicationDates.some((d) => {
      const date = new Date(d);
      return date >= dayStart && date < dayEnd;
    });
    days.push(hasActivity);
  }

  const activeDays = days.filter(Boolean).length;
  const recentActive = days.slice(-7).filter(Boolean).length;

  // Color based on recent activity pattern
  const barColor = recentActive >= 2
    ? "bg-success"
    : recentActive >= 1
    ? "bg-[#f5c26b]"
    : "bg-destructive/60";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          30-Day Activity
        </span>
        <span className="text-xs text-muted-foreground">
          {activeDays} active day{activeDays !== 1 ? "s" : ""}
        </span>
      </div>
      <div className="flex items-end gap-[2px] h-4">
        {days.map((active, i) => (
          <div
            key={i}
            className={`flex-1 rounded-[1px] transition-all ${
              active ? `${barColor} h-full` : "bg-muted/40 h-1"
            }`}
            title={`${29 - i} days ago${active ? " — active" : ""}`}
          />
        ))}
      </div>
    </div>
  );
}
