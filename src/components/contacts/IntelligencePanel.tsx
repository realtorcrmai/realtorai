"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Intelligence = {
  engagement_score?: number;
  engagement_trend?: string;
  email_opens?: number;
  email_clicks?: number;
  trend_data?: Array<{ week: string; opens: number; clicks: number }>;
  inferred_interests?: {
    areas?: string[];
    property_types?: string[];
    price_range?: number[];
    lifestyle?: string[];
  };
  content_preferences?: Record<
    string,
    { sent: number; opened: number; clicked: number; converted: number }
  >;
  timing_patterns?: {
    best_day?: string;
    best_hour?: number;
    open_velocity_minutes?: number;
    data_points?: number;
  };
  last_direct_contact?: string;
  last_direct_contact_type?: string;
  last_direct_contact_outcome?: string;
};

type Props = {
  intelligence: Intelligence | null;
  totalEmails?: number;
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function IntelligencePanel({ intelligence, totalEmails = 0 }: Props) {
  const intel = intelligence || {};
  const score = intel.engagement_score || 0;
  const trend = intel.engagement_trend || "stable";
  const interests = intel.inferred_interests || {};
  const contentPrefs = intel.content_preferences || {};
  const timing = intel.timing_patterns || {};

  const trendArrow =
    trend === "accelerating" ? "↑" : trend === "declining" ? "↓" : "→";
  const trendColor =
    trend === "accelerating"
      ? "text-[#0F7694]"
      : trend === "declining"
      ? "text-red-600"
      : "text-muted-foreground";

  const scoreLabel =
    score >= 80
      ? "Ready"
      : score >= 60
      ? "Hot"
      : score >= 40
      ? "Engaged"
      : score >= 20
      ? "Warming"
      : "Cold";
  const scoreColor =
    score >= 80
      ? "bg-[#0F7694]/15 text-[#0A6880]"
      : score >= 60
      ? "bg-red-100 text-red-700"
      : score >= 40
      ? "bg-amber-100 text-amber-700"
      : score >= 20
      ? "bg-[#0F7694]/10 text-[#0A6880]"
      : "bg-gray-100 text-gray-600";

  if (!intelligence) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No engagement data yet. Intelligence builds as emails are sent and interactions logged.
      </div>
    );
  }

  // Find best/worst content types
  const contentEntries = Object.entries(contentPrefs).map(([type, data]) => ({
    type,
    ...data,
    openRate: data.sent > 0 ? data.opened / data.sent : 0,
  }));
  const bestContent = contentEntries
    .filter((c) => c.sent >= 2)
    .sort((a, b) => b.openRate - a.openRate);

  return (
    <div className="space-y-4">
      {/* Engagement Score */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Engagement
          </span>
          <Badge className={scoreColor}>
            {scoreLabel} {trendArrow}
          </Badge>
        </div>

        {/* Score hero — colored background card */}
        <div className={`rounded-xl p-4 ${
          score >= 70 ? "bg-gradient-to-br from-[#0F7694] to-[#0F7694]/5 border border-[#0F7694]/20" :
          score >= 40 ? "bg-gradient-to-br from-amber-50 to-[#0F7694]/5 border border-amber-200" :
          "bg-gradient-to-br from-[#0F7694]/5 to-[#0F7694]/10 border border-[#0F7694]/20"
        }`}>
          <div className="flex items-baseline gap-2 mb-3">
            <span className={`text-3xl font-bold ${
              score >= 70 ? "text-[#0A6880]" : score >= 40 ? "text-amber-700" : "text-[#0A6880]"
            }`}>{score}</span>
            <span className="text-sm text-muted-foreground">/100</span>
            <span className={`text-sm font-medium ml-auto ${trendColor}`}>{trend}</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                score >= 70 ? "bg-gradient-to-r from-[#0F7694] to-[#0F7694]" :
                score >= 40 ? "bg-gradient-to-r from-amber-400 to-[#0F7694]" :
                "bg-gradient-to-r from-blue-400 to-[#0F7694]"
              }`}
              style={{ width: `${Math.max(score, 3)}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-0.5">
            <span>Cold</span>
            <span>Warm</span>
            <span>Hot</span>
            <span>Ready</span>
          </div>
        </div>

        {/* Stats grid — colored */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[#0F7694]/5 border border-[#0F7694]/15 rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-[#0A6880]">{intel.email_opens || 0}</p>
            <p className="text-[10px] text-[#0F7694] font-medium">Opens</p>
          </div>
          <div className="bg-[#0F7694]/5 border border-[#0F7694]/15 rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-[#0A6880]">{intel.email_clicks || 0}</p>
            <p className="text-[10px] text-[#0F7694] font-medium">Clicks</p>
          </div>
          <div className="bg-[#0F7694]/5 border border-[#0F7694]/15 rounded-lg p-2.5 text-center">
            <p className="text-base font-bold text-[#0A6880]">{totalEmails}</p>
            <p className="text-[10px] text-[#0F7694] font-medium">Sent</p>
          </div>
        </div>
      </div>

      {/* Interested In */}
      {(interests.areas?.length || interests.property_types?.length) && (
        <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Interested In
            </h4>
            <div className="space-y-2">
              {interests.areas && interests.areas.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Areas: </span>
                  {interests.areas.map((area) => (
                    <Badge key={area} variant="secondary" className="text-xs mr-1 mb-1">
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
              {interests.property_types && interests.property_types.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Type: </span>
                  {interests.property_types.map((t) => (
                    <Badge key={t} variant="outline" className="text-xs mr-1 mb-1">
                      {t}
                    </Badge>
                  ))}
                </div>
              )}
              {interests.price_range && interests.price_range.length === 2 && (
                <div className="text-sm">
                  <span className="text-xs text-muted-foreground">Budget: </span>
                  <span className="font-medium">
                    ${Math.round(interests.price_range[0] / 1000)}K – $
                    {Math.round(interests.price_range[1] / 1000)}K
                  </span>
                  <span className="text-[10px] text-muted-foreground ml-1">
                    (inferred from clicks)
                  </span>
                </div>
              )}
              {interests.lifestyle && interests.lifestyle.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">Lifestyle: </span>
                  {interests.lifestyle.map((l) => (
                    <Badge key={l} variant="outline" className="text-xs mr-1 mb-1">
                      {l}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
        </div>
      )}

      {/* Content Preferences */}
      {bestContent.length > 0 && (
        <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Content Effectiveness
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Responds To</p>
                {bestContent
                  .filter((c) => c.openRate > 0.5)
                  .slice(0, 3)
                  .map((c) => (
                    <div key={c.type} className="flex items-center gap-1 text-xs mb-1">
                      <span className="text-[#0F7694]">✓</span>
                      <span>{c.type.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground">
                        ({Math.round(c.openRate * 100)}%)
                      </span>
                    </div>
                  ))}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground mb-1">Doesn&apos;t Respond To</p>
                {bestContent
                  .filter((c) => c.openRate <= 0.3)
                  .slice(0, 3)
                  .map((c) => (
                    <div key={c.type} className="flex items-center gap-1 text-xs mb-1">
                      <span className="text-red-500">✗</span>
                      <span>{c.type.replace(/_/g, " ")}</span>
                      <span className="text-muted-foreground">
                        ({Math.round(c.openRate * 100)}%)
                      </span>
                    </div>
                  ))}
              </div>
            </div>
        </div>
      )}

      {/* Best Send Time */}
      {timing.best_day && (
        <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Best Send Time
            </h4>
            <div className="flex gap-1">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className={`flex-1 text-center py-1 rounded text-[10px] ${
                    timing.best_day?.toLowerCase().startsWith(day.toLowerCase())
                      ? "bg-[#0F7694] text-white font-bold"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
            {timing.best_hour !== undefined && (
              <p className="text-xs text-muted-foreground mt-2">
                Optimal: {timing.best_day} at {timing.best_hour}:00
                {timing.data_points && (
                  <span> · Confidence: {timing.data_points >= 15 ? "High" : timing.data_points >= 5 ? "Medium" : "Low"} ({timing.data_points} data points)</span>
                )}
              </p>
            )}
            {timing.open_velocity_minutes && (
              <p className="text-xs text-muted-foreground">
                Avg open speed: {timing.open_velocity_minutes} min after send
              </p>
            )}
        </div>
      )}

      {/* Direct Interactions */}
      {intel.last_direct_contact && (
        <div className="pt-3 border-t border-border">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Last Direct Contact
            </h4>
            <p className="text-sm">
              {intel.last_direct_contact_type?.replace(/_/g, " ")} —{" "}
              {new Date(intel.last_direct_contact).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </p>
            {intel.last_direct_contact_outcome && (
              <Badge variant="outline" className="text-xs mt-1">
                {intel.last_direct_contact_outcome}
              </Badge>
            )}
        </div>
      )}
    </div>
  );
}
