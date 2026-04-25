"use client";

import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";

interface FeatureAdoptionTableProps {
  data: Array<{
    feature: string;
    users: number;
    actions: number;
    adoptionPct: number;
    trend: number;
  }>;
  isLoading?: boolean;
}

const FEATURE_LABELS: Record<string, string> = {
  contacts: "Contacts",
  listings: "Listings",
  newsletters: "AI Agents",
  showings: "Showings",
  content: "AI Content",
  calendar: "Calendar",
  assistant: "AI Assistant",
  website: "Website",
};

function capitalize(s: string): string {
  return FEATURE_LABELS[s] ?? s.charAt(0).toUpperCase() + s.slice(1);
}

function adoptionClasses(pct: number): { bg: string; text: string } {
  if (pct > 50) return { bg: "bg-emerald-50", text: "text-emerald-700" };
  if (pct >= 20) return { bg: "bg-amber-50", text: "text-amber-700" };
  return { bg: "bg-red-50", text: "text-red-700" };
}

export function FeatureAdoptionTable({
  data,
  isLoading,
}: FeatureAdoptionTableProps) {
  const [open, setOpen] = useState(false);

  const sorted = useMemo(
    () => [...data].sort((a, b) => b.adoptionPct - a.adoptionPct),
    [data]
  );

  const isEmpty = !data.length;

  return (
    <div className="bg-card border border-border rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <h3 className="text-sm font-semibold text-foreground">
          Feature Adoption
        </h3>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="px-5 pb-5 pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-muted rounded animate-pulse" />
              ))}
            </div>
          ) : isEmpty ? (
            <p className="text-sm text-muted-foreground py-4">
              No feature usage data yet.
            </p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/60 border-b border-border">
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left">
                      Feature
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                      Users
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                      Actions
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-left">
                      Adoption
                    </th>
                    <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-right">
                      Trend
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => {
                    const cls = adoptionClasses(row.adoptionPct);
                    return (
                      <tr
                        key={row.feature}
                        className="border-b border-border last:border-b-0 hover:bg-muted/30"
                      >
                        <td className="px-4 py-2.5 text-sm text-foreground font-medium">
                          {capitalize(row.feature)}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-foreground text-right tabular-nums">
                          {row.users}
                        </td>
                        <td className="px-4 py-2.5 text-sm text-foreground text-right tabular-nums">
                          {row.actions}
                        </td>
                        <td className="px-4 py-2.5 text-sm">
                          <div className="relative h-6 flex items-center">
                            <div
                              className={`absolute inset-y-0 left-0 rounded ${cls.bg}`}
                              style={{ width: `${Math.min(row.adoptionPct, 100)}%` }}
                            />
                            <span
                              className={`relative z-10 font-medium pl-2 ${cls.text}`}
                            >
                              {row.adoptionPct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-right tabular-nums">
                          {row.trend > 0 ? (
                            <span className="text-emerald-600 font-medium">
                              +{row.trend}%
                            </span>
                          ) : row.trend < 0 ? (
                            <span className="text-red-500 font-medium">
                              {row.trend}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0%</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
