export const dynamic = "force-dynamic";

import Link from "next/link";
import { getNewsletterAnalytics } from "@/actions/newsletters";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Send,
  MailOpen,
  MousePointerClick,
  BarChart3,
  ArrowLeft,
  Heart,
  Trophy,
  TrendingUp,
} from "lucide-react";

const emailTypeLabels: Record<string, string> = {
  new_listing_alert: "Listing Alerts",
  market_update: "Market Updates",
  just_sold: "Just Sold",
  open_house_invite: "Open House",
  neighbourhood_guide: "Neighbourhood Guide",
  home_anniversary: "Home Anniversary",
  welcome: "Welcome",
  reengagement: "Re-engagement",
  referral_ask: "Referral Ask",
};

function calculateBrandScore(analytics: any): number {
  const openScore = Math.min(40, (analytics.openRate / 100) * 80);
  const clickScore = Math.min(30, (analytics.clickRate / 100) * 150);
  const volumeScore = Math.min(20, (analytics.sent / 100) * 20);
  const healthScore = analytics.bounces === 0 && analytics.unsubscribes === 0 ? 10 : 5;
  return Math.round(openScore + clickScore + volumeScore + healthScore);
}

export default async function NewsletterAnalyticsPage() {
  const analytics = await getNewsletterAnalytics(30);
  const brandScore = calculateBrandScore(analytics);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1">
            <Link href="/newsletters">
              <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Newsletter Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Last 30 days</p>
        </div>
        <BarChart3 className="h-8 w-8 text-muted-foreground/40" />
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard
          label="Sent"
          value={analytics.sent}
          icon={<Send className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          label="Opened"
          value={analytics.opens}
          icon={<MailOpen className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          label="Clicked"
          value={analytics.clicks}
          icon={<MousePointerClick className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          label="Open Rate"
          value={`${analytics.openRate}%`}
          icon={<TrendingUp className="h-5 w-5 text-muted-foreground" />}
          valueClassName={analytics.openRate > 40 ? "text-brand" : "text-amber-500"}
        />
        <StatCard
          label="Click Rate"
          value={`${analytics.clickRate}%`}
          icon={<MousePointerClick className="h-5 w-5 text-muted-foreground" />}
          valueClassName={analytics.clickRate > 10 ? "text-brand" : "text-amber-500"}
        />
      </div>

      {/* Health Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Heart className="h-4 w-4 text-rose-500" />
              <h3 className="text-base font-semibold text-foreground">Deliverability</h3>
            </div>
            <div className="flex gap-8">
              <div>
                <div
                  className={`text-2xl font-bold ${
                    analytics.bounces === 0 ? "text-brand" : "text-destructive"
                  }`}
                >
                  {analytics.bounces}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Bounces</div>
              </div>
              <div>
                <div
                  className={`text-2xl font-bold ${
                    analytics.unsubscribes === 0 ? "text-brand" : "text-amber-500"
                  }`}
                >
                  {analytics.unsubscribes}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Unsubscribes</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="h-4 w-4 text-amber-500" />
              <h3 className="text-base font-semibold text-foreground">Brand Score</h3>
            </div>
            <div className="text-4xl font-bold text-primary">{brandScore}/100</div>
            <div className="text-sm text-muted-foreground mt-1">
              {brandScore > 70 ? "Excellent" : brandScore > 40 ? "Good" : "Needs improvement"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance by Type */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-5">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-base font-semibold text-foreground">Performance by Email Type</h3>
          </div>

          {Object.keys(analytics.byType).length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No data yet. Send some newsletters to see performance breakdown.
            </p>
          ) : (
            <div>
              {/* Table Header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] pb-2 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <div>Type</div>
                <div className="text-center">Sent</div>
                <div className="text-center">Opens</div>
                <div className="text-center">Clicks</div>
                <div className="text-center">CTR</div>
              </div>

              {/* Table Rows */}
              {Object.entries(analytics.byType).map(([type, data]: [string, any]) => {
                const ctr = data.sent > 0 ? Math.round((data.clicks / data.sent) * 100) : 0;
                return (
                  <div
                    key={type}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] py-2.5 border-b border-border last:border-0 text-sm"
                  >
                    <div className="font-medium text-foreground">
                      {emailTypeLabels[type] || type}
                    </div>
                    <div className="text-center text-muted-foreground">{data.sent}</div>
                    <div className="text-center text-muted-foreground">{data.opens}</div>
                    <div className="text-center text-muted-foreground">{data.clicks}</div>
                    <div
                      className={`text-center font-semibold ${
                        ctr > 10 ? "text-brand" : "text-muted-foreground"
                      }`}
                    >
                      {ctr}%
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  valueClassName,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5 text-center">
        <div className="flex justify-center mb-2">{icon}</div>
        <div className={`text-2xl font-bold ${valueClassName || "text-foreground"}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}
