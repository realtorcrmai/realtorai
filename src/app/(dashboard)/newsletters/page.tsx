export const dynamic = "force-dynamic";

import Link from "next/link";
import { getJourneyDashboard } from "@/actions/journeys";
import { getApprovalQueue } from "@/actions/newsletters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MailOpen,
  Send,
  MousePointerClick,
  Link2,
  Users,
  BookOpen,
  BarChart3,
  Settings2,
  ArrowRight,
} from "lucide-react";
import { DailyDigestCard } from "@/components/dashboard/DailyDigestCard";

const phases = ["lead", "active", "under_contract", "past_client", "dormant"];

const phaseLabels: Record<string, string> = {
  lead: "New Leads",
  active: "Active",
  under_contract: "Under Contract",
  past_client: "Past Clients",
  dormant: "Dormant",
};

const phaseIcons: Record<string, string> = {
  lead: "🟢",
  active: "🔥",
  under_contract: "📝",
  past_client: "⭐",
  dormant: "❄️",
};

export default async function NewsletterDashboard() {
  const dashboard = await getJourneyDashboard();
  const queue = await getApprovalQueue();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Newsletter & Journeys</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered email sequences for your contacts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/walkthrough/index.html" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Walkthrough
            </Button>
          </a>
          <Link href="/newsletters/queue">
            <Button variant="outline" size="sm" className="gap-2">
              <MailOpen className="h-4 w-4" />
              Queue ({queue.length})
            </Button>
          </Link>
          <Link href="/newsletters/analytics">
            <Button variant="outline" size="sm" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </Button>
          </Link>
          <Link href="/newsletters/control">
            <Button size="sm" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Command Center
            </Button>
          </Link>
        </div>
      </div>

      {/* AI Email Summary */}
      <DailyDigestCard />

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Contacts"
          value={dashboard.totalContacts}
          icon={<Users className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          label="Emails Sent"
          value={dashboard.totalSent}
          icon={<Send className="h-5 w-5 text-muted-foreground" />}
        />
        <StatCard
          label="Open Rate"
          value={`${dashboard.openRate}%`}
          icon={<MailOpen className="h-5 w-5 text-muted-foreground" />}
          valueClassName={dashboard.openRate > 40 ? "text-emerald-600" : "text-amber-500"}
        />
        <StatCard
          label="Click Rate"
          value={`${dashboard.clickRate}%`}
          icon={<MousePointerClick className="h-5 w-5 text-muted-foreground" />}
          valueClassName={dashboard.clickRate > 10 ? "text-emerald-600" : "text-amber-500"}
        />
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Buyer Pipeline */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-base font-semibold text-foreground mb-4">🏠 Buyer Pipeline</h3>
            <div className="space-y-0">
              {phases.map((p) => (
                <div
                  key={p}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <span className="text-sm text-foreground">
                    {phaseIcons[p]} {phaseLabels[p]}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {dashboard.buyerPhases[p] || 0}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Seller Pipeline */}
        <Card>
          <CardContent className="p-5">
            <h3 className="text-base font-semibold text-foreground mb-4">🏗️ Seller Pipeline</h3>
            <div className="space-y-0">
              {phases.map((p) => (
                <div
                  key={p}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <span className="text-sm text-foreground">
                    {phaseIcons[p]} {phaseLabels[p]}
                  </span>
                  <span className="text-sm font-semibold text-primary">
                    {dashboard.sellerPhases[p] || 0}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {queue.length > 0 && (
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">Pending Approvals</h3>
              <Link
                href="/newsletters/queue"
                className="flex items-center gap-1 text-sm text-primary hover:underline"
              >
                View All
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="space-y-0">
              {queue.slice(0, 3).map((n: any) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {n.contacts?.name || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{n.subject}</p>
                  </div>
                  <Badge variant="outline" className="ml-3 shrink-0 text-xs capitalize">
                    {n.email_type.replace(/_/g, " ")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">Recent Activity</h3>
          {dashboard.recentEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-5">
              No newsletter activity yet. Enroll contacts in journeys to get started!
            </p>
          ) : (
            <div className="space-y-0">
              {dashboard.recentEvents.slice(0, 10).map((event: any) => (
                <div
                  key={event.id}
                  className="flex items-center gap-3 py-2 border-b border-border last:border-0"
                >
                  <div className="shrink-0">
                    {event.event_type === "opened" ? (
                      <MailOpen className="h-4 w-4 text-primary" />
                    ) : event.event_type === "clicked" ? (
                      <Link2 className="h-4 w-4 text-emerald-600" />
                    ) : event.event_type === "bounced" ? (
                      <Send className="h-4 w-4 text-destructive" />
                    ) : (
                      <Send className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-foreground">
                      {event.contacts?.name}
                    </span>
                    <span className="text-sm text-muted-foreground"> {event.event_type} </span>
                    <span className="text-sm text-muted-foreground truncate">
                      {event.newsletters?.subject}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(event.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
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
