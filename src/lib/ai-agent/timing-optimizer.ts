import { createAdminClient } from "@/lib/supabase/admin";

interface OptimalSendTime {
  scheduledFor: Date;
  confidence: number;
  basis: "historical_opens" | "day_of_week_pattern" | "default";
}

// Default: Tuesday/Thursday 9 AM PST
const DEFAULT_HOUR = 9;
const DEFAULT_DAYS = [2, 4]; // Tuesday, Thursday

export async function getOptimalSendTime(contactId: string): Promise<OptimalSendTime> {
  const patterns = await analyzeOpenTimePatterns(contactId);

  if (patterns.sampleSize >= 5 && patterns.preferredHours.length > 0) {
    const nextSlot = getNextTimeSlot(patterns.preferredHours[0], patterns.preferredDays);
    return {
      scheduledFor: nextSlot,
      confidence: Math.min(0.95, 0.5 + patterns.sampleSize * 0.05),
      basis: "historical_opens",
    };
  }

  if (patterns.sampleSize >= 2 && patterns.preferredDays.length > 0) {
    const nextSlot = getNextTimeSlot(DEFAULT_HOUR, patterns.preferredDays);
    return {
      scheduledFor: nextSlot,
      confidence: 0.4,
      basis: "day_of_week_pattern",
    };
  }

  // Default
  const nextSlot = getNextTimeSlot(DEFAULT_HOUR, DEFAULT_DAYS);
  return {
    scheduledFor: nextSlot,
    confidence: 0.2,
    basis: "default",
  };
}

export async function analyzeOpenTimePatterns(contactId: string): Promise<{
  preferredHours: number[];
  preferredDays: number[];
  sampleSize: number;
}> {
  const supabase = createAdminClient();

  // Get newsletter IDs for this contact
  const { data: newsletters } = await supabase
    .from("newsletters")
    .select("id")
    .eq("contact_id", contactId)
    .eq("status", "sent");

  if (!newsletters || newsletters.length === 0) {
    return { preferredHours: [], preferredDays: [], sampleSize: 0 };
  }

  const nlIds = newsletters.map((n) => n.id);

  // Get open events
  const { data: opens } = await supabase
    .from("newsletter_events")
    .select("created_at")
    .eq("event_type", "opened")
    .in("newsletter_id", nlIds);

  if (!opens || opens.length === 0) {
    return { preferredHours: [], preferredDays: [], sampleSize: 0 };
  }

  // Build histograms
  const hourCounts: Record<number, number> = {};
  const dayCounts: Record<number, number> = {};

  for (const open of opens) {
    const d = new Date(open.created_at);
    const hour = d.getHours();
    const day = d.getDay();
    hourCounts[hour] = (hourCounts[hour] ?? 0) + 1;
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }

  // Sort by frequency
  const preferredHours = Object.entries(hourCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([h]) => parseInt(h));

  const preferredDays = Object.entries(dayCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([d]) => parseInt(d));

  return {
    preferredHours,
    preferredDays,
    sampleSize: opens.length,
  };
}

function getNextTimeSlot(targetHour: number, targetDays: number[]): Date {
  const now = new Date();
  const candidates: Date[] = [];

  // Check next 7 days
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    d.setHours(targetHour, 0, 0, 0);

    // Skip if in the past
    if (d <= now) continue;

    // Prefer target days, but accept any weekday
    if (targetDays.includes(d.getDay())) {
      candidates.unshift(d); // Prioritize
    } else if (d.getDay() >= 1 && d.getDay() <= 5) {
      candidates.push(d);
    }
  }

  return candidates[0] ?? new Date(now.getTime() + 24 * 3600000);
}
