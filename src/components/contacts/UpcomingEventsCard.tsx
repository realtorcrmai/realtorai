"use client";

import {
  EVENT_TYPE_EMOJI,
  type EventType,
} from "@/lib/constants/contacts";

type ContactDate = {
  id: string;
  label: string;
  date: string;
  recurring: boolean;
  event_type: string;
};

type EventEntry = {
  id: string;
  label: string;
  date: string;
  recurring: boolean;
  event_type: string;
  nextOccurrence: Date;
};

function getNextOccurrence(dateStr: string, recurring: boolean): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parsed = new Date(dateStr + "T00:00:00");

  if (!recurring) {
    return parsed;
  }

  // For recurring dates, find the next occurrence this year or next
  const thisYear = today.getFullYear();
  const candidate = new Date(thisYear, parsed.getMonth(), parsed.getDate());

  if (candidate >= today) {
    return candidate;
  }

  // Already passed this year, use next year
  return new Date(thisYear + 1, parsed.getMonth(), parsed.getDate());
}

function getCountdownText(nextDate: Date): { text: string; color: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffMs = nextDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return { text: "Today!", color: "bg-[#0F7694]/10 text-[#0A6880]" };
  }
  if (diffDays === 1) {
    return { text: "Tomorrow", color: "bg-amber-100 text-amber-800" };
  }
  if (diffDays < 30) {
    return {
      text: `in ${diffDays} days`,
      color: "bg-amber-100 text-amber-800",
    };
  }
  return {
    text: `in ${diffDays} days`,
    color: "bg-[#0F7694]/15 text-[#0A6880]",
  };
}

export function UpcomingEventsCard({
  contactDates,
  demographics,
  contactName,
}: {
  contactDates: ContactDate[];
  demographics: { birthday?: string; anniversary?: string } | null;
  contactName: string;
}) {
  // Build merged list of events
  const events: EventEntry[] = [];

  // Add contact_dates entries
  for (const cd of contactDates) {
    events.push({
      id: cd.id,
      label: cd.label,
      date: cd.date,
      recurring: cd.recurring,
      event_type: cd.event_type,
      nextOccurrence: getNextOccurrence(cd.date, cd.recurring),
    });
  }

  // Add virtual entries from demographics (if not already present)
  if (demographics?.birthday) {
    const hasBirthday = contactDates.some((d) => d.event_type === "birthday");
    if (!hasBirthday) {
      events.push({
        id: "demo-birthday",
        label: `${contactName}'s Birthday`,
        date: demographics.birthday,
        recurring: true,
        event_type: "birthday",
        nextOccurrence: getNextOccurrence(demographics.birthday, true),
      });
    }
  }

  if (demographics?.anniversary) {
    const hasAnniversary = contactDates.some(
      (d) => d.event_type === "anniversary"
    );
    if (!hasAnniversary) {
      events.push({
        id: "demo-anniversary",
        label: `${contactName}'s Anniversary`,
        date: demographics.anniversary,
        recurring: true,
        event_type: "anniversary",
        nextOccurrence: getNextOccurrence(demographics.anniversary, true),
      });
    }
  }

  // Sort by next occurrence, take top 5
  events.sort(
    (a, b) => a.nextOccurrence.getTime() - b.nextOccurrence.getTime()
  );
  const upcoming = events.slice(0, 5);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <span>🎯</span>
        Upcoming Events
      </h3>

      {upcoming.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">
          No upcoming events.
        </p>
      ) : (
        <div className="space-y-2">
          {upcoming.map((event) => {
            const emoji =
              EVENT_TYPE_EMOJI[event.event_type as EventType] ?? "📅";
            const countdown = getCountdownText(event.nextOccurrence);
            const displayDate = event.nextOccurrence.toLocaleDateString(
              "en-CA",
              {
                month: "short",
                day: "numeric",
              }
            );

            return (
              <div
                key={event.id}
                className="flex items-center gap-2.5 p-2.5 rounded-lg bg-muted/30"
              >
                <span className="text-lg shrink-0">{emoji}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{displayDate}</p>
                </div>
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${countdown.color}`}
                >
                  {countdown.text}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
