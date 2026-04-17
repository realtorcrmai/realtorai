"use client";

import { useState, useMemo } from "react";
import { format, isToday, isYesterday, startOfDay } from "date-fns";

interface ActivityEvent {
  id?: string;
  event_name: string;
  metadata: any;
  created_at: string;
}

interface UserDetailActivityProps {
  userId: string;
  events: ActivityEvent[];
}

const EVENT_TYPE_OPTIONS = [
  { label: "All Events", value: "" },
  { label: "Feature Used", value: "feature_used" },
  { label: "Onboarding Step", value: "onboarding_step" },
  { label: "Session Start", value: "session_start" },
  { label: "Plan Changed", value: "plan_changed" },
  { label: "Checklist Event", value: "checklist_event" },
  { label: "Personalization", value: "personalization" },
] as const;

const DATE_RANGE_OPTIONS = [
  { label: "Last 7 Days", value: 7 },
  { label: "Last 30 Days", value: 30 },
  { label: "Last 90 Days", value: 90 },
] as const;

function describeEvent(event: ActivityEvent): string {
  const meta = event.metadata ?? {};
  const name = event.event_name;

  if (name === "feature_used") {
    const feature = meta.feature ?? meta.page ?? "";
    if (feature.includes("contacts/create") || feature.includes("contact_create"))
      return "Created a contact";
    if (feature.includes("listings/create") || feature.includes("listing_create"))
      return "Created a listing";
    if (feature.includes("newsletters/send") || feature.includes("newsletter_send"))
      return "Sent a newsletter";
    if (feature.includes("showings/create") || feature.includes("showing_create"))
      return "Created a showing";
    if (feature.includes("contacts")) return "Viewed contacts";
    if (feature.includes("listings")) return "Viewed listings";
    if (feature.includes("showings")) return "Viewed showings";
    if (feature.includes("newsletters")) return "Viewed newsletters";
    if (feature.includes("calendar")) return "Viewed calendar";
    if (feature.includes("content")) return "Viewed content studio";
    if (feature) return `Used ${feature.replace(/_/g, " ")}`;
    return "Used a feature";
  }

  if (name === "onboarding_step") {
    const step = meta.step ?? meta.step_number ?? "?";
    return `Completed onboarding step ${step}`;
  }

  if (name === "session_start") return "Session started";

  if (name === "plan_changed") {
    const from = meta.from ?? "unknown";
    const to = meta.to ?? "unknown";
    return `Plan changed from ${from} to ${to}`;
  }

  if (name === "checklist_event") {
    if (meta.completed || meta.action === "completed") {
      const item = meta.item ?? meta.label ?? "an item";
      return `Completed checklist item: ${item}`;
    }
    return "Checklist event";
  }

  if (name === "personalization") return "Updated personalization";

  if (name === "signup") return "Account created";
  if (name === "trial_started") return `Trial started: ${meta.plan ?? ""} plan`;

  // Default: capitalize event name
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function formatDateGroupLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, MMM d, yyyy");
}

const PAGE_SIZE = 50;

export function UserDetailActivity({
  userId,
  events,
}: UserDetailActivityProps) {
  const [typeFilter, setTypeFilter] = useState("");
  const [dateRange, setDateRange] = useState(30);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const filteredEvents = useMemo(() => {
    const cutoff = Date.now() - dateRange * 86400000;

    return events.filter((e) => {
      // Date range filter
      if (new Date(e.created_at).getTime() < cutoff) return false;
      // Type filter
      if (typeFilter && e.event_name !== typeFilter) return false;
      return true;
    });
  }, [events, typeFilter, dateRange]);

  const visibleEvents = filteredEvents.slice(0, visibleCount);
  const hasMore = filteredEvents.length > visibleCount;

  // Group by date
  const grouped = useMemo(() => {
    const groups: { date: Date; label: string; events: ActivityEvent[] }[] = [];
    let currentKey = "";

    for (const event of visibleEvents) {
      const eventDate = startOfDay(new Date(event.created_at));
      const key = eventDate.toISOString();

      if (key !== currentKey) {
        currentKey = key;
        groups.push({
          date: eventDate,
          label: formatDateGroupLabel(eventDate),
          events: [],
        });
      }
      groups[groups.length - 1].events.push(event);
    }

    return groups;
  }, [visibleEvents]);

  return (
    <div>
      {/* Filter bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select
          value={typeFilter}
          onChange={(e) => {
            setTypeFilter(e.target.value);
            setVisibleCount(PAGE_SIZE);
          }}
          className="text-sm bg-card border border-border rounded-md px-3 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-brand"
          aria-label="Filter by event type"
        >
          {EVENT_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          {DATE_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                setDateRange(opt.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                dateRange === opt.value
                  ? "bg-brand text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-6 text-center">
          <p className="text-sm text-muted-foreground">
            No activity recorded yet.
          </p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg px-4 py-2">
          {grouped.map((group, gi) => (
            <div key={group.date.toISOString()}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider py-2 mt-4 first:mt-0">
                {group.label}
              </p>
              {group.events.map((event, ei) => (
                <div
                  key={event.id ?? `${gi}-${ei}`}
                  className="flex items-center gap-3 py-2 px-2 rounded-md hover:bg-muted/30 transition-colors"
                >
                  <span className="text-xs text-muted-foreground w-12 shrink-0 tabular-nums">
                    {format(new Date(event.created_at), "HH:mm")}
                  </span>
                  <span className="text-sm text-foreground flex-1">
                    {describeEvent(event)}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                    {event.event_name}
                  </span>
                </div>
              ))}
            </div>
          ))}

          {/* Load more */}
          {hasMore && (
            <div className="py-3 text-center border-t border-border mt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                className="text-sm font-medium text-brand hover:text-brand/80 transition-colors"
              >
                Load more ({filteredEvents.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
