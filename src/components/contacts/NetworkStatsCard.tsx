"use client";

import { useState } from "react";
import type { Demographics } from "@/types";

function formatNetworkValue(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    return `$${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M`;
  }
  if (value >= 1_000) {
    const thousands = value / 1_000;
    return `$${thousands.toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

type DataScoreItem = {
  label: string;
  filled: boolean;
  category: "demographics" | "relationships" | "dates" | "preferences";
  tip?: string; // what to do to fill it
};

function computeDataScoreBreakdown(
  demographics: Demographics | null,
  connectionCount: number,
  dateCount: number,
  hasPreferences: boolean
): { score: number; items: DataScoreItem[] } {
  const items: DataScoreItem[] = [];

  // Demographics fields (each worth ~5.5 points, 9 fields = ~50 points)
  const demoFields: { key: keyof Demographics; label: string; tip: string }[] = [
    { key: "birthday", label: "Birthday", tip: "Add birthday in Demographics" },
    { key: "anniversary", label: "Anniversary", tip: "Add anniversary in Demographics" },
    { key: "occupation", label: "Occupation", tip: "Add occupation in Demographics" },
    { key: "employer", label: "Employer", tip: "Add employer in Demographics" },
    { key: "income_range", label: "Income Range", tip: "Set income range in Demographics" },
    { key: "languages", label: "Languages", tip: "Add languages in Demographics" },
    { key: "hobbies_interests", label: "Hobbies & Interests", tip: "Add hobbies in Demographics" },
    { key: "family_size", label: "Family Size", tip: "Set family size in Demographics" },
    { key: "bio_notes", label: "Bio Notes", tip: "Write a bio note in Demographics" },
  ];

  for (const field of demoFields) {
    const val = demographics?.[field.key];
    const filled = val !== undefined && val !== null && val !== "" && !(Array.isArray(val) && val.length === 0);
    items.push({ label: field.label, filled, category: "demographics", tip: field.tip });
  }

  // Relationships (25 points)
  items.push({
    label: "Relationships",
    filled: connectionCount > 0,
    category: "relationships",
    tip: "Add relationships in the sidebar",
  });

  // Dates (15 points)
  items.push({
    label: "Important Dates",
    filled: dateCount > 0,
    category: "dates",
    tip: "Add birthday, anniversary, or other dates",
  });

  // Preferences (10 points)
  items.push({
    label: "Preferences",
    filled: hasPreferences,
    category: "preferences",
    tip: "Fill in buyer or seller preferences",
  });

  const totalItems = items.length;
  const filledItems = items.filter((i) => i.filled).length;
  const score = Math.round((filledItems / totalItems) * 100);

  return { score, items };
}

export function NetworkStatsCard({
  connectionCount,
  referralCount,
  networkValue,
  dataScore,
  demographics,
  dateCount,
  hasPreferences,
}: {
  connectionCount: number;
  referralCount: number;
  networkValue: number;
  dataScore: number;
  demographics?: Demographics | null;
  dateCount?: number;
  hasPreferences?: boolean;
}) {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const breakdown = demographics !== undefined
    ? computeDataScoreBreakdown(demographics ?? null, connectionCount, dateCount ?? 0, hasPreferences ?? false)
    : null;

  const effectiveScore = breakdown ? breakdown.score : dataScore;
  const missingItems = breakdown?.items.filter((i) => !i.filled) ?? [];
  const filledItems = breakdown?.items.filter((i) => i.filled) ?? [];

  const stats = [
    { label: "Connections", value: connectionCount.toString(), color: "text-[#0F7694]" },
    { label: "Referrals", value: referralCount.toString(), color: "text-[#0F7694]" },
    { label: "Network Value", value: formatNetworkValue(networkValue), color: "text-[#0F7694]" },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <span>📊</span>
        Network Stats
      </h3>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-[#f8f7fd] rounded-lg p-3 text-center">
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Data Score — clickable */}
      <div
        className="bg-[#f8f7fd] rounded-lg p-3 cursor-pointer hover:bg-[#f0eeff] transition-colors"
        onClick={() => setShowBreakdown(!showBreakdown)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Data Score</span>
            <span className={`text-lg font-bold ${effectiveScore >= 80 ? "text-[#0F7694]" : effectiveScore >= 50 ? "text-amber-600" : "text-red-500"}`}>
              {effectiveScore}%
            </span>
          </div>
          <span className="text-xs text-muted-foreground">
            {showBreakdown ? "Hide details ▲" : "Show details ▼"}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${effectiveScore >= 80 ? "bg-[#0F7694]/50" : effectiveScore >= 50 ? "bg-amber-500" : "bg-red-400"}`}
            style={{ width: `${effectiveScore}%` }}
          />
        </div>

        {/* Breakdown panel */}
        {showBreakdown && breakdown && (
          <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
            {/* Missing items first */}
            {missingItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-red-500 mb-1.5">Missing ({missingItems.length})</p>
                {missingItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 py-0.5">
                    <span className="text-red-400 text-xs">✕</span>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    {item.tip && (
                      <span className="text-[10px] text-muted-foreground/60 ml-auto">→ {item.tip}</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Filled items */}
            {filledItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-[#0F7694] mb-1.5">Completed ({filledItems.length})</p>
                {filledItems.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 py-0.5">
                    <span className="text-[#0F7694] text-xs">✓</span>
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
