"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VoiceRule {
  rule: string;
  source?: string;
  created_at?: string;
}

interface ABTest {
  id: string;
  title: string;
  status: string;
  subject_a: string | null;
  subject_b: string | null;
  ab_winner: string | null;
}

interface QualitySnapshot {
  avgScore: number;
  totalScored: number;
  highQuality: number;
  lowQuality: number;
}

interface SendTimeInsight {
  bestDay: string | null;
  bestHour: number | null;
}

interface TrustDistribution {
  l0: number;
  l1: number;
  l2: number;
  l3: number;
}

interface GovernorActivity {
  blocked: number;
  deferred: number;
  autoSunset: number;
}

export interface AIInsightsData {
  voiceRules: VoiceRule[];
  abTests: ABTest[];
  quality: QualitySnapshot;
  sendTime: SendTimeInsight;
  trust: TrustDistribution;
  governor: GovernorActivity;
  learningConfidence: string;
  totalEmailsAnalyzed: number;
}

const DAY_NAMES: Record<string, string> = {
  monday: "Monday", tuesday: "Tuesday", wednesday: "Wednesday",
  thursday: "Thursday", friday: "Friday", saturday: "Saturday", sunday: "Sunday",
};

function formatHour(h: number | null): string {
  if (h === null) return "—";
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:00 ${ampm}`;
}

export function AIInsightsTab({ data }: { data: AIInsightsData }) {
  const trustTotal = data.trust.l0 + data.trust.l1 + data.trust.l2 + data.trust.l3;

  return (
    <div className="space-y-4">

      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{data.totalEmailsAnalyzed}</p>
            <p className="text-[10px] text-muted-foreground">Emails Analyzed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className="text-lg font-bold text-primary">{data.voiceRules.length}</p>
            <p className="text-[10px] text-muted-foreground">Voice Rules Learned</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <p className={`text-lg font-bold ${data.quality.avgScore >= 7 ? "text-green-600" : data.quality.avgScore >= 5 ? "text-amber-600" : "text-red-600"}`}>
              {data.quality.avgScore.toFixed(1)}
            </p>
            <p className="text-[10px] text-muted-foreground">Avg Quality Score</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <Badge className={`text-xs ${
              data.learningConfidence === "high" ? "bg-green-100 text-green-700 hover:bg-green-100" :
              data.learningConfidence === "medium" ? "bg-amber-100 text-amber-700 hover:bg-amber-100" :
              "bg-gray-100 text-gray-600 hover:bg-gray-100"
            }`}>
              {data.learningConfidence}
            </Badge>
            <p className="text-[10px] text-muted-foreground mt-1">Learning Confidence</p>
          </CardContent>
        </Card>
      </div>

      {/* Voice Rules Learned */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Voice Rules Learned</h4>
            <a href="/newsletters/learning" className="text-[10px] text-primary hover:underline">Full report →</a>
          </div>
          {data.voiceRules.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              No voice rules yet. The AI learns your style as you edit drafts.
            </p>
          ) : (
            <div className="space-y-1.5">
              {data.voiceRules.slice(0, 6).map((rule, i) => (
                <div key={i} className="flex items-start gap-2 py-1.5 px-2 rounded-md bg-muted/30">
                  <span className="text-sm shrink-0 mt-0.5">
                    {rule.source === "edit" ? "📝" : "💡"}
                  </span>
                  <p className="text-xs text-foreground leading-relaxed">{rule.rule}</p>
                </div>
              ))}
              {data.voiceRules.length > 6 && (
                <a href="/newsletters/learning" className="block text-xs text-primary hover:underline mt-1">
                  +{data.voiceRules.length - 6} more rules →
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Send Time Optimization */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3">Optimal Send Time</h4>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {data.sendTime.bestDay ? DAY_NAMES[data.sendTime.bestDay] || data.sendTime.bestDay : "—"}
                </p>
                <p className="text-[10px] text-muted-foreground">Best Day</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">
                  {formatHour(data.sendTime.bestHour)}
                </p>
                <p className="text-[10px] text-muted-foreground">Best Hour</p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Learned from contact open patterns. AI schedules sends at this time automatically.
            </p>
          </CardContent>
        </Card>

        {/* Quality Scores */}
        <Card>
          <CardContent className="p-4">
            <h4 className="text-sm font-semibold mb-3">Email Quality</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-lg font-bold text-green-600">{data.quality.highQuality}</p>
                <p className="text-[10px] text-muted-foreground">High (7+)</p>
              </div>
              <div>
                <p className="text-lg font-bold text-amber-600">{data.quality.totalScored - data.quality.highQuality - data.quality.lowQuality}</p>
                <p className="text-[10px] text-muted-foreground">Medium</p>
              </div>
              <div>
                <p className="text-lg font-bold text-red-600">{data.quality.lowQuality}</p>
                <p className="text-[10px] text-muted-foreground">Low (&lt;5)</p>
              </div>
            </div>
            <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden flex">
              {data.quality.totalScored > 0 && (
                <>
                  <div className="bg-green-500 h-full" style={{ width: `${(data.quality.highQuality / data.quality.totalScored) * 100}%` }} />
                  <div className="bg-amber-400 h-full" style={{ width: `${((data.quality.totalScored - data.quality.highQuality - data.quality.lowQuality) / data.quality.totalScored) * 100}%` }} />
                  <div className="bg-red-400 h-full" style={{ width: `${(data.quality.lowQuality / data.quality.totalScored) * 100}%` }} />
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trust Distribution */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Trust Levels</h4>
            <span className="text-[10px] text-muted-foreground">{trustTotal} contacts</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "L0 New", count: data.trust.l0, color: "bg-gray-100 text-gray-700", bar: "bg-gray-400" },
              { label: "L1 Proven", count: data.trust.l1, color: "bg-blue-50 text-blue-700", bar: "bg-blue-500" },
              { label: "L2 Engaged", count: data.trust.l2, color: "bg-amber-50 text-amber-700", bar: "bg-amber-500" },
              { label: "L3 Deal", count: data.trust.l3, color: "bg-green-50 text-green-700", bar: "bg-green-500" },
            ].map((level) => (
              <div key={level.label} className={`rounded-lg p-2.5 text-center ${level.color}`}>
                <p className="text-lg font-bold">{level.count}</p>
                <p className="text-[10px]">{level.label}</p>
                {trustTotal > 0 && (
                  <div className="mt-1.5 h-1 rounded-full bg-white/50 overflow-hidden">
                    <div className={`${level.bar} h-full rounded-full`} style={{ width: `${(level.count / trustTotal) * 100}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* A/B Test Results */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">A/B Test Results</h4>
            <a href="/newsletters/ab-testing" className="text-[10px] text-primary hover:underline">All tests →</a>
          </div>
          {data.abTests.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">
              No A/B tests yet. Create one from the Campaigns page.
            </p>
          ) : (
            <div className="space-y-2">
              {data.abTests.slice(0, 4).map((test) => (
                <div key={test.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium truncate flex-1">{test.title}</span>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ml-2 ${
                      test.ab_winner ? "bg-green-50 text-green-700 border-green-200" :
                      test.status === "sent" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-gray-50 text-gray-600"
                    }`}>
                      {test.ab_winner ? `Winner: ${test.ab_winner.toUpperCase()}` : test.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className={`text-[11px] px-2 py-1.5 rounded border ${test.ab_winner === "a" ? "border-green-300 bg-green-50" : "border-border"}`}>
                      <span className="font-medium text-muted-foreground">A: </span>
                      <span className="truncate">{test.subject_a || "—"}</span>
                    </div>
                    <div className={`text-[11px] px-2 py-1.5 rounded border ${test.ab_winner === "b" ? "border-green-300 bg-green-50" : "border-border"}`}>
                      <span className="font-medium text-muted-foreground">B: </span>
                      <span className="truncate">{test.subject_b || "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send Governor Activity */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold">Send Governor</h4>
            <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">Active</Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            The send governor protects your reputation by enforcing frequency caps, engagement throttling, and auto-sunset rules.
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted/30 rounded-lg p-2.5">
              <p className="text-lg font-bold text-amber-600">{data.governor.blocked}</p>
              <p className="text-[10px] text-muted-foreground">Blocked (too soon)</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5">
              <p className="text-lg font-bold text-blue-600">{data.governor.deferred}</p>
              <p className="text-[10px] text-muted-foreground">Deferred</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-2.5">
              <p className="text-lg font-bold text-red-600">{data.governor.autoSunset}</p>
              <p className="text-[10px] text-muted-foreground">Auto-sunset</p>
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
