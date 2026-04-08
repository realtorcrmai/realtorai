"use client";

import Link from "next/link";
import type { BuyerJourney } from "@/actions/buyer-journeys";
import type { BuyerJourneyProperty } from "@/actions/buyer-journey-properties";

// Journey status → progress step index (0-based)
const STATUS_STEPS = ["searching", "viewing", "offer_made", "conditional", "firm", "closed"];
const STATUS_LABELS: Record<string, string> = {
  searching:   "🔍 Searching",
  viewing:     "👀 Viewing",
  offer_made:  "📝 Offer Out",
  conditional: "📋 Conditional",
  firm:        "✅ Firm",
  closed:      "🎉 Closed",
  paused:      "⏸️ Paused",
  cancelled:   "❌ Cancelled",
};

const INTEREST_STARS = (level: number | null) =>
  Array.from({ length: 5 }, (_, i) => (i < (level ?? 0) ? "⭐" : "☆")).join("");

interface BuyerJourneyPanelProps {
  contactId: string;
  journeys: BuyerJourney[];
  /** Latest 3 properties of interest across all journeys */
  recentProperties: (BuyerJourneyProperty & { journeyStatus?: string })[];
}

export function BuyerJourneyPanel({ contactId, journeys, recentProperties }: BuyerJourneyPanelProps) {
  const activeJourneys = journeys.filter(
    (j) => !["closed", "cancelled"].includes(j.status)
  );
  const closedCount = journeys.length - activeJourneys.length;

  if (journeys.length === 0) {
    return (
      <div className="lf-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm flex items-center gap-1.5">🔍 Buyer Journey</h3>
          <Link
            href={`/contacts/${contactId}/buyer-journey/new`}
            className="lf-btn-sm text-xs"
          >
            + Start Journey
          </Link>
        </div>
        <p className="text-xs text-muted-foreground">No active buyer journeys. Start one to track this buyer's search.</p>
      </div>
    );
  }

  return (
    <div className="lf-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          🔍 Buyer Journey
          {activeJourneys.length > 0 && (
            <span className="lf-badge lf-badge-active text-xs">{activeJourneys.length} active</span>
          )}
          {closedCount > 0 && (
            <span className="lf-badge text-xs">{closedCount} closed</span>
          )}
        </h3>
        <Link
          href={`/contacts/${contactId}/buyer-journey/new`}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          + New Journey
        </Link>
      </div>

      {activeJourneys.map((journey) => {
        const stepIdx = STATUS_STEPS.indexOf(journey.status);
        const progressPct = stepIdx >= 0 ? Math.round(((stepIdx + 1) / STATUS_STEPS.length) * 100) : 0;
        const priceRange = journey.min_price || journey.max_price
          ? `$${journey.min_price ? (journey.min_price / 1000).toFixed(0) + "K" : "?"} – $${journey.max_price ? (journey.max_price / 1000).toFixed(0) + "K" : "?"}`
          : null;

        return (
          <div key={journey.id} className="border border-indigo-100 rounded-lg p-3 bg-indigo-50/30 space-y-2">
            {/* Status + price */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{STATUS_LABELS[journey.status] ?? journey.status}</span>
              {priceRange && <span className="text-xs text-muted-foreground font-medium">{priceRange}</span>}
            </div>

            {/* Progress bar */}
            <div className="relative h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="absolute left-0 top-0 h-full bg-indigo-500 rounded-full transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Areas + conditional flag */}
            <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
              {journey.preferred_areas.slice(0, 3).map((area) => (
                <span key={area} className="px-1.5 py-0.5 bg-white border border-gray-200 rounded text-xs">{area}</span>
              ))}
              {journey.conditional_on_sale && (
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs">⚠️ Conditional on sale</span>
              )}
              {journey.ai_buyer_score && (
                <span className="px-1.5 py-0.5 bg-teal-100 text-teal-700 border border-teal-200 rounded text-xs">🎯 Score {journey.ai_buyer_score}/100</span>
              )}
            </div>

            {/* View Full Journey link */}
            <Link
              href={`/contacts/${contactId}/buyer-journey/${journey.id}`}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
            >
              View Full Journey →
            </Link>
          </div>
        );
      })}

      {/* Recent properties of interest */}
      {recentProperties.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Properties of Interest</h4>
          {recentProperties.slice(0, 3).map((prop) => (
            <div key={prop.id} className="flex items-center justify-between text-xs p-2 bg-white border border-gray-100 rounded-lg">
              <div className="flex items-center gap-2 min-w-0">
                <span className="shrink-0">🏠</span>
                <span className="truncate font-medium">{prop.address}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-yellow-500">{INTEREST_STARS(prop.interest_level)}</span>
                <span className={`lf-badge ${prop.status === "accepted" ? "lf-badge-done" : prop.status === "interested" ? "lf-badge-pending" : "lf-badge-info"} text-xs`}>
                  {prop.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
