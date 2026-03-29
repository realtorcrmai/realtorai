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
      ? "text-emerald-600"
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
      ? "bg-purple-100 text-purple-700"
      : score >= 60
      ? "bg-red-100 text-red-700"
      : score >= 40
      ? "bg-amber-100 text-amber-700"
      : score >= 20
      ? "bg-blue-100 text-blue-700"
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
      <Card className="bg-gradient-to-br from-indigo-50/60 via-white/70 to-violet-50/40 dark:from-indigo-950/20 dark:via-card/70 dark:to-violet-950/10 backdrop-blur-sm border-indigo-200/40 dark:border-indigo-800/30 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Engagement
            </span>
            <Badge className={scoreColor}>
              {scoreLabel} {trendArrow}
            </Badge>
          </div>
          <div className="flex items-end gap-3">
            <span className="text-4xl font-bold text-foreground">{score}</span>
            <span className="text-sm text-muted-foreground mb-1">/100</span>
            <span className={`text-sm font-medium mb-1 ${trendColor}`}>
              {trend}
            </span>
          </div>
          {/* Score bar */}
          <div className="w-full bg-muted rounded-full h-2 mt-3">
            <div
              className={`h-2 rounded-full transition-all ${
                score >= 60 ? "bg-red-500" : score >= 40 ? "bg-amber-500" : "bg-blue-400"
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
            <span>Cold</span>
            <span>Warming</span>
            <span>Engaged</span>
            <span>Hot</span>
            <span>Ready</span>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border">
            <div className="text-center">
              <p className="text-lg font-semibold">{intel.email_opens || 0}</p>
              <p className="text-[10px] text-muted-foreground">Opens</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{intel.email_clicks || 0}</p>
              <p className="text-[10px] text-muted-foreground">Clicks</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{totalEmails}</p>
              <p className="text-[10px] text-muted-foreground">Emails</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Interested In */}
      {(interests.areas?.length || interests.property_types?.length) && (
        <Card className="bg-gradient-to-br from-indigo-50/60 via-white/70 to-violet-50/40 dark:from-indigo-950/20 dark:via-card/70 dark:to-violet-950/10 backdrop-blur-sm border-indigo-200/40 dark:border-indigo-800/30 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
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
          </CardContent>
        </Card>
      )}

      {/* Content Preferences */}
      {bestContent.length > 0 && (
        <Card className="bg-gradient-to-br from-indigo-50/60 via-white/70 to-violet-50/40 dark:from-indigo-950/20 dark:via-card/70 dark:to-violet-950/10 backdrop-blur-sm border-indigo-200/40 dark:border-indigo-800/30 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
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
                      <span className="text-emerald-500">✓</span>
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
          </CardContent>
        </Card>
      )}

      {/* Best Send Time */}
      {timing.best_day && (
        <Card className="bg-gradient-to-br from-indigo-50/60 via-white/70 to-violet-50/40 dark:from-indigo-950/20 dark:via-card/70 dark:to-violet-950/10 backdrop-blur-sm border-indigo-200/40 dark:border-indigo-800/30 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Best Send Time
            </h4>
            <div className="flex gap-1">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className={`flex-1 text-center py-1 rounded text-[10px] ${
                    timing.best_day?.toLowerCase().startsWith(day.toLowerCase())
                      ? "bg-primary text-white font-bold"
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
          </CardContent>
        </Card>
      )}

      {/* Direct Interactions */}
      {intel.last_direct_contact && (
        <Card className="bg-gradient-to-br from-indigo-50/60 via-white/70 to-violet-50/40 dark:from-indigo-950/20 dark:via-card/70 dark:to-violet-950/10 backdrop-blur-sm border-indigo-200/40 dark:border-indigo-800/30 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <CardContent className="p-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
