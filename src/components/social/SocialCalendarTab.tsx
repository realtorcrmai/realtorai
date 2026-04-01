"use client";

import { useState, useMemo } from "react";
import type { SocialPost, SocialPlatform, ContentType, PostStatus } from "@/lib/social/types";

interface Props {
  posts: SocialPost[];
}

// ---------------------------------------------------------------------------
// Constants & Helpers
// ---------------------------------------------------------------------------

type ViewMode = "week" | "month";

const PLATFORM_COLOUR: Record<SocialPlatform, string> = {
  facebook: "#1877F2",
  instagram: "#E4405F",
  tiktok: "#010101",
  youtube: "#FF0000",
  linkedin: "#0A66C2",
  pinterest: "#E60023",
  google_business: "#4285F4",
};

const PLATFORM_EMOJI: Record<SocialPlatform, string> = {
  facebook: "🔵",
  instagram: "📸",
  tiktok: "🎵",
  youtube: "🔴",
  linkedin: "💼",
  pinterest: "📌",
  google_business: "🏢",
};

const CONTENT_TYPE_EMOJI: Record<ContentType, string> = {
  just_listed: "🏠",
  just_sold: "🎉",
  open_house: "🏡",
  price_reduced: "💰",
  coming_soon: "🔜",
  market_update: "📊",
  neighbourhood: "🗺️",
  testimonial: "⭐",
  tips: "💡",
  holiday: "🎄",
  milestone: "🏆",
  custom: "✍️",
};

const STATUS_BADGE: Record<PostStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "lf-badge -pending" },
  approved: { label: "Approved", className: "lf-badge -info" },
  scheduled: { label: "Scheduled", className: "lf-badge -active" },
  publishing: { label: "Publishing", className: "lf-badge -active" },
  published: { label: "Published", className: "lf-badge -done" },
  failed: { label: "Failed", className: "lf-badge -blocked" },
  cancelled: { label: "Cancelled", className: "lf-badge -blocked" },
  skipped: { label: "Skipped", className: "lf-badge -pending" },
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function truncate(text: string | null, max: number): string {
  if (!text) return "No caption";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/** Get the Monday of the week containing the given date. */
function getWeekStart(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  // JS Sunday = 0, we want Monday = 0
  const diff = day === 0 ? -6 : 1 - day;
  result.setDate(result.getDate() + diff);
  result.setHours(0, 0, 0, 0);
  return result;
}

/** Get all days in the week starting from a Monday. */
function getWeekDays(monday: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

/** Get calendar grid days for a month view (includes padding from prev/next month). */
function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Start from Monday before or on the first
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const gridStart = new Date(firstDay);
  gridStart.setDate(gridStart.getDate() - startOffset);

  // We need enough rows to cover the month (always 6 rows = 42 cells for consistency)
  const days: Date[] = [];
  const totalCells = 42;
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }

  // Trim trailing row if fully outside the month
  const lastRowStart = days[35];
  if (lastRowStart && lastRowStart.getMonth() !== month) {
    return days.slice(0, 35);
  }

  return days;
}

function postDate(post: SocialPost): string | null {
  return post.scheduled_at || post.published_at || null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function WeekPostCard({ post }: { post: SocialPost }) {
  const dateStr = postDate(post);
  const primaryPlatform = post.target_platforms[0];
  const colour = primaryPlatform ? PLATFORM_COLOUR[primaryPlatform] : "#888";
  const badge = STATUS_BADGE[post.status];

  return (
    <div
      className="rounded-lg bg-white/90 p-2 mb-1.5 border-l-[3px] shadow-sm hover:shadow-md transition-shadow cursor-default"
      style={{ borderLeftColor: colour }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-xs">
          {CONTENT_TYPE_EMOJI[post.content_type] || "📝"}
        </span>
        <span className="text-[10px] text-[var(--lf-text)]/60 font-mono">
          {dateStr ? formatTime(dateStr) : "--:--"}
        </span>
      </div>
      <p className="text-[11px] text-[var(--lf-text)] leading-tight mb-1">
        {truncate(post.caption, 40)}
      </p>
      <div className="flex items-center gap-1 flex-wrap">
        {post.target_platforms.map((p) => (
          <span key={p} className="text-[10px]" title={p}>
            {PLATFORM_EMOJI[p]}
          </span>
        ))}
        <span className={`${badge.className} text-[9px] ml-auto`}>{badge.label}</span>
      </div>
    </div>
  );
}

function MonthDotIndicators({ posts }: { posts: SocialPost[] }) {
  // Collect unique platforms from all posts for this day
  const platforms = new Set<SocialPlatform>();
  posts.forEach((p) => p.target_platforms.forEach((pl) => platforms.add(pl)));

  return (
    <div className="flex gap-0.5 justify-center mt-0.5 flex-wrap">
      {Array.from(platforms)
        .slice(0, 5)
        .map((p) => (
          <span
            key={p}
            className="w-[6px] h-[6px] rounded-full inline-block"
            style={{ backgroundColor: PLATFORM_COLOUR[p] }}
            title={`${p}: ${posts.filter((post) => post.target_platforms.includes(p)).length} post(s)`}
          />
        ))}
      {posts.length > 0 && (
        <span className="text-[9px] text-[var(--lf-text)]/40 ml-0.5">{posts.length}</span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SocialCalendarTab({ posts }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());

  // Group posts by date key
  const postsByDate = useMemo(() => {
    const map = new Map<string, SocialPost[]>();
    for (const post of posts) {
      const dateStr = postDate(post);
      if (!dateStr) continue;
      const key = toDateKey(new Date(dateStr));
      const existing = map.get(key) || [];
      existing.push(post);
      map.set(key, existing);
    }
    // Sort posts within each day by time
    for (const [key, dayPosts] of map) {
      dayPosts.sort((a, b) => {
        const aDate = postDate(a) || "";
        const bDate = postDate(b) || "";
        return aDate.localeCompare(bDate);
      });
    }
    return map;
  }, [posts]);

  // Navigation
  const navigateBack = () => {
    const d = new Date(currentDate);
    if (viewMode === "week") {
      d.setDate(d.getDate() - 7);
    } else {
      d.setMonth(d.getMonth() - 1);
    }
    setCurrentDate(d);
  };

  const navigateForward = () => {
    const d = new Date(currentDate);
    if (viewMode === "week") {
      d.setDate(d.getDate() + 7);
    } else {
      d.setMonth(d.getMonth() + 1);
    }
    setCurrentDate(d);
  };

  const goToToday = () => setCurrentDate(new Date());

  // Computed values
  const weekStart = getWeekStart(currentDate);
  const weekDays = getWeekDays(weekStart);
  const monthGrid = getMonthGrid(currentDate.getFullYear(), currentDate.getMonth());
  const todayKey = toDateKey(new Date());

  const headerLabel =
    viewMode === "week"
      ? (() => {
          const start = weekDays[0];
          const end = weekDays[6];
          const sameMonth = start.getMonth() === end.getMonth();
          if (sameMonth) {
            return `${start.toLocaleDateString("en-CA", { month: "long" })} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
          }
          return `${start.toLocaleDateString("en-CA", { month: "short" })} ${start.getDate()} - ${end.toLocaleDateString("en-CA", { month: "short" })} ${end.getDate()}, ${end.getFullYear()}`;
        })()
      : `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

  return (
    <div className="space-y-4">
      {/* ── Toolbar ── */}
      <div className="lf-card p-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button onClick={navigateBack} className="lf-btn-ghost lf-btn-sm px-2 py-1 text-sm">
            ←
          </button>
          <h2 className="text-sm font-bold text-[var(--lf-text)] min-w-[200px] text-center">
            {headerLabel}
          </h2>
          <button onClick={navigateForward} className="lf-btn-ghost lf-btn-sm px-2 py-1 text-sm">
            →
          </button>
          <button onClick={goToToday} className="lf-btn-ghost lf-btn-sm text-xs px-3 py-1 ml-1">
            Today
          </button>
        </div>

        <div className="flex rounded-lg overflow-hidden border border-[var(--lf-text)]/10">
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "week"
                ? "bg-[var(--lf-indigo)] text-white"
                : "bg-white/60 text-[var(--lf-text)]/70 hover:bg-white/80"
            }`}
          >
            📅 Week
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "month"
                ? "bg-[var(--lf-indigo)] text-white"
                : "bg-white/60 text-[var(--lf-text)]/70 hover:bg-white/80"
            }`}
          >
            🗓️ Month
          </button>
        </div>
      </div>

      {/* ── Week View ── */}
      {viewMode === "week" && (
        <div className="grid grid-cols-7 gap-2">
          {weekDays.map((day) => {
            const key = toDateKey(day);
            const isToday = key === todayKey;
            const dayPosts = postsByDate.get(key) || [];

            return (
              <div key={key} className="min-h-[180px]">
                {/* Day header */}
                <div
                  className={`text-center py-2 rounded-t-lg ${
                    isToday
                      ? "bg-[var(--lf-indigo)] text-white"
                      : "bg-white/60 text-[var(--lf-text)]"
                  }`}
                >
                  <div className="text-[11px] font-medium uppercase">
                    {DAY_LABELS[day.getDay() === 0 ? 6 : day.getDay() - 1]}
                  </div>
                  <div className={`text-lg font-bold ${isToday ? "" : "text-[var(--lf-text)]"}`}>
                    {day.getDate()}
                  </div>
                </div>

                {/* Posts column */}
                <div
                  className={`lf-card rounded-t-none p-1.5 min-h-[130px] ${
                    isToday ? "ring-2 ring-[var(--lf-indigo)]/30" : ""
                  }`}
                >
                  {dayPosts.length === 0 ? (
                    <div className="flex items-center justify-center h-full min-h-[100px]">
                      <span className="text-[11px] text-[var(--lf-text)]/25">No posts</span>
                    </div>
                  ) : (
                    dayPosts.map((post) => (
                      <WeekPostCard key={post.id} post={post} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Month View ── */}
      {viewMode === "month" && (
        <div className="lf-card p-3">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((label) => (
              <div
                key={label}
                className="text-center text-[11px] font-bold text-[var(--lf-text)]/50 uppercase py-1"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((day) => {
              const key = toDateKey(day);
              const isToday = key === todayKey;
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const dayPosts = postsByDate.get(key) || [];

              return (
                <div
                  key={key}
                  className={`min-h-[60px] rounded-lg p-1.5 transition-colors ${
                    isToday
                      ? "bg-[var(--lf-indigo)]/10 ring-1 ring-[var(--lf-indigo)]/30"
                      : isCurrentMonth
                        ? "bg-white/50 hover:bg-white/70"
                        : "bg-white/20"
                  }`}
                >
                  <div
                    className={`text-xs font-medium mb-0.5 ${
                      isToday
                        ? "text-[var(--lf-indigo)] font-bold"
                        : isCurrentMonth
                          ? "text-[var(--lf-text)]"
                          : "text-[var(--lf-text)]/25"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                  {dayPosts.length > 0 && <MonthDotIndicators posts={dayPosts} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Summary ── */}
      <div className="lf-card p-4">
        <div className="flex items-center gap-4 flex-wrap text-[11px] text-[var(--lf-text)]/50">
          <span className="font-medium text-[var(--lf-text)] text-xs">Legend:</span>
          {(Object.keys(PLATFORM_COLOUR) as SocialPlatform[]).map((p) => (
            <span key={p} className="flex items-center gap-1">
              <span
                className="w-[8px] h-[8px] rounded-full inline-block"
                style={{ backgroundColor: PLATFORM_COLOUR[p] }}
              />
              {p.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
