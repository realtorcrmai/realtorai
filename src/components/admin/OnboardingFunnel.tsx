"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface OnboardingFunnelProps {
  data: Array<{
    step: number;
    label: string;
    count: number;
    percentage: number;
    dropoff: number;
  }>;
  isLoading?: boolean;
}

export function OnboardingFunnel({ data, isLoading }: OnboardingFunnelProps) {
  const [open, setOpen] = useState(false);

  const isEmpty = !data.length || data.every((d) => d.count === 0);

  return (
    <div className="bg-card border border-border rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
        aria-expanded={open}
      >
        <h3 className="text-sm font-semibold text-foreground">
          Onboarding Funnel
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
                <div key={i} className="flex items-center gap-3 py-2">
                  <div className="w-40 h-4 bg-muted rounded animate-pulse" />
                  <div className="flex-1 h-7 bg-muted rounded-md animate-pulse" />
                  <div className="w-12 h-4 bg-muted rounded animate-pulse" />
                  <div className="w-10 h-4 bg-muted rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : isEmpty ? (
            <p className="text-sm text-muted-foreground py-4">
              No onboarding data yet. Events will appear as users sign up.
            </p>
          ) : (
            <div className="space-y-0.5">
              {data.map((row) => (
                <div
                  key={row.step}
                  className="flex items-center gap-3 py-2"
                >
                  <span className="text-sm text-foreground w-40 shrink-0 truncate">
                    {row.label}
                  </span>
                  <div className="flex-1 h-7 bg-muted rounded-md overflow-hidden relative">
                    <div
                      className="h-full rounded-md bg-gradient-to-r from-primary to-brand transition-all duration-500"
                      style={{ width: `${row.percentage}%` }}
                    />
                    <span
                      className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs font-semibold ${
                        row.percentage > 50
                          ? "text-white"
                          : "text-foreground"
                      }`}
                    >
                      {row.percentage}%
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground w-12 text-right shrink-0 tabular-nums">
                    {row.count}
                  </span>
                  <span
                    className={`text-xs font-medium w-10 text-right shrink-0 ${
                      row.dropoff > 15
                        ? "text-red-500"
                        : row.dropoff > 10
                          ? "text-amber-500"
                          : "text-muted-foreground"
                    }`}
                  >
                    {row.dropoff > 0 ? `-${row.dropoff}%` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
