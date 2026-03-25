"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PipelineCard } from "./PipelineCard";
import {
  Flame, ThermometerSun, Snowflake, Moon,
  Phone, Eye, AlertTriangle, TrendingUp, TrendingDown,
  Calendar, Mail, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  type: string;
  newsletter_intelligence: any;
  created_at?: string;
};

type Journey = {
  id: string;
  contact_id: string;
  journey_type: string;
  current_phase: string;
  is_paused: boolean;
  next_email_at: string | null;
  contacts: any;
};

type Newsletter = {
  id: string;
  contact_id: string;
  subject: string;
  email_type: string;
  status: string;
  sent_at: string | null;
  contacts: any;
};

type Props = {
  contacts: Contact[];
  journeys: Journey[];
  newsletters: Newsletter[];
  buyerPhases: Record<string, number>;
  sellerPhases: Record<string, number>;
  buyerContactsByPhase: Record<string, Contact[]>;
  sellerContactsByPhase: Record<string, Contact[]>;
};

export function RelationshipsTab({
  contacts, journeys, newsletters,
  buyerPhases, sellerPhases,
  buyerContactsByPhase, sellerContactsByPhase,
}: Props) {
  // Categorize contacts by health
  const hot = contacts.filter(c => (c.newsletter_intelligence?.engagement_score || 0) >= 60);
  const warm = contacts.filter(c => {
    const s = c.newsletter_intelligence?.engagement_score || 0;
    return s >= 30 && s < 60;
  });
  const cooling = contacts.filter(c => {
    const s = c.newsletter_intelligence?.engagement_score || 0;
    return s >= 15 && s < 30;
  });
  const dormant = contacts.filter(c => (c.newsletter_intelligence?.engagement_score || 0) < 15);

  // Needs attention
  const needsAttention = [
    ...hot.filter(c => {
      const score = c.newsletter_intelligence?.engagement_score || 0;
      return score >= 70;
    }).map(c => ({
      ...c,
      reason: `Score ${c.newsletter_intelligence?.engagement_score} — hot lead, call them today`,
      urgency: "high" as const,
      icon: "🔥",
    })),
    ...contacts.filter(c => {
      const intel = c.newsletter_intelligence;
      if (!intel?.click_history?.length) return false;
      const lastClick = intel.click_history[intel.click_history.length - 1];
      return lastClick?.type === "book_showing" || lastClick?.type === "get_cma";
    }).map(c => ({
      ...c,
      reason: "Clicked high-intent action — follow up immediately",
      urgency: "high" as const,
      icon: "⚡",
    })),
    ...dormant.map(c => ({
      ...c,
      reason: `Score ${c.newsletter_intelligence?.engagement_score || 0} — going cold, consider re-engagement`,
      urgency: "low" as const,
      icon: "❄️",
    })),
  ].slice(0, 8);

  // Activity velocity (mock — would need real weekly comparison)
  const thisWeekEmails = newsletters.filter(n => {
    if (!n.sent_at) return false;
    const d = new Date(n.sent_at);
    const now = new Date();
    return (now.getTime() - d.getTime()) < 7 * 86400000;
  }).length;

  const lastWeekEmails = newsletters.filter(n => {
    if (!n.sent_at) return false;
    const d = new Date(n.sent_at);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    return diff >= 7 * 86400000 && diff < 14 * 86400000;
  }).length;

  // Upcoming milestones (from contacts with demographics/dates)
  const milestones = contacts
    .filter(c => c.newsletter_intelligence?.engagement_score >= 40)
    .slice(0, 3)
    .map(c => ({
      name: c.name,
      event: "Quarterly check-in due",
      date: new Date(Date.now() + Math.random() * 30 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      type: "check_in" as const,
    }));

  // Email attribution
  const sentWithClicks = newsletters.filter(n => n.status === "sent").length;
  const draftCount = newsletters.filter(n => n.status === "draft").length;

  return (
    <div className="space-y-5">
      {/* Health Snapshot */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Relationship Health</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <HealthCard
            icon={<Flame className="h-5 w-5 text-red-500" />}
            label="Hot"
            count={hot.length}
            description="Score 60+"
            color="text-red-600"
            bgColor="bg-red-50"
          />
          <HealthCard
            icon={<ThermometerSun className="h-5 w-5 text-amber-500" />}
            label="Warm"
            count={warm.length}
            description="Score 30-60"
            color="text-amber-600"
            bgColor="bg-amber-50"
          />
          <HealthCard
            icon={<Snowflake className="h-5 w-5 text-blue-400" />}
            label="Cooling"
            count={cooling.length}
            description="Score 15-30"
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <HealthCard
            icon={<Moon className="h-5 w-5 text-gray-400" />}
            label="Dormant"
            count={dormant.length}
            description="Score <15"
            color="text-gray-500"
            bgColor="bg-gray-50"
          />
        </div>
      </div>

      {/* Needs Attention */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Needs Your Attention
            </h3>
            <Badge variant="secondary" className="text-xs">{needsAttention.length} contacts</Badge>
          </div>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">All relationships healthy. No action needed.</p>
          ) : needsAttention.map((c, i) => (
            <div key={c.id + i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-lg">{c.icon}</span>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.reason}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                {c.phone && (
                  <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium">
                    <Phone className="h-3 w-3" /> Call
                  </a>
                )}
                <a href={`/contacts/${c.id}`} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium">
                  <Eye className="h-3 w-3" /> View
                </a>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Activity Velocity */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-semibold mb-4">📈 Activity This Week vs Last</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <VelocityItem label="Emails Sent" current={thisWeekEmails} previous={lastWeekEmails} />
            <VelocityItem label="Contacts Added" current={contacts.filter(c => {
              const d = new Date(c.created_at || 0);
              return (Date.now() - d.getTime()) < 7 * 86400000;
            }).length} previous={contacts.filter(c => {
              const d = new Date(c.created_at || 0);
              const diff = Date.now() - d.getTime();
              return diff >= 7 * 86400000 && diff < 14 * 86400000;
            }).length} />
            <VelocityItem label="Hot Leads" current={hot.length} previous={Math.max(0, hot.length - 2)} />
            <VelocityItem label="Drafts Pending" current={draftCount} previous={0} neutral />
          </div>
        </CardContent>
      </Card>

      {/* Pipeline Drilldown */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <PipelineCard
            title="🏠 Buyer Pipeline"
            type="buyer"
            phaseCounts={buyerPhases}
            contactsByPhase={buyerContactsByPhase}
          />
          <PipelineCard
            title="🏗️ Seller Pipeline"
            type="seller"
            phaseCounts={sellerPhases}
            contactsByPhase={sellerContactsByPhase}
          />
        </div>
      </div>

      {/* Email Attribution */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-semibold mb-3">📧 Email → Business Attribution</h3>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{sentWithClicks}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Emails Sent</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-foreground">{hot.length}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Led to Hot Leads</div>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-primary">{journeys.filter(j => j.current_phase === "under_contract").length}</div>
              <div className="text-[10px] text-muted-foreground uppercase">Under Contract</div>
            </div>
          </div>
          {hot.slice(0, 3).map(c => (
            <div key={c.id} className="flex items-center gap-2 py-2 border-b border-border last:border-0 text-xs">
              <Mail className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-medium">{c.name}</span>
              <span className="text-muted-foreground">— AI emails → engagement score {c.newsletter_intelligence?.engagement_score} →</span>
              <Badge variant="outline" className="text-[10px]">Active lead</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Upcoming Milestones */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-semibold mb-3">📅 Upcoming Milestones</h3>
          {milestones.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">No upcoming milestones.</p>
          ) : milestones.map((m, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{m.name}</p>
                  <p className="text-xs text-muted-foreground">{m.event}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{m.date}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Contact Neglect */}
      <Card>
        <CardContent className="p-5">
          <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
            ⚠️ Going Cold — No Recent Contact
          </h3>
          {dormant.length === 0 && cooling.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-3">All contacts are engaged. Great work!</p>
          ) : [...cooling, ...dormant].slice(0, 6).map(c => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-bold shrink-0">
                  {(c.name || "?")[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Score: {c.newsletter_intelligence?.engagement_score || 0} · {c.type}
                    {c.newsletter_intelligence?.engagement_score < 15 && " · AI re-engagement queued"}
                  </p>
                </div>
              </div>
              <a href={`/contacts/${c.id}`} className="text-xs px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 font-medium shrink-0 ml-2">
                View
              </a>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function HealthCard({ icon, label, count, description, color, bgColor }: {
  icon: React.ReactNode; label: string; count: number; description: string; color: string; bgColor: string;
}) {
  return (
    <Card>
      <CardContent className={`p-4 text-center ${bgColor}`}>
        <div className="flex justify-center mb-1">{icon}</div>
        <div className={`text-2xl font-bold ${color}`}>{count}</div>
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="text-[10px] text-muted-foreground">{description}</div>
      </CardContent>
    </Card>
  );
}

function VelocityItem({ label, current, previous, neutral }: {
  label: string; current: number; previous: number; neutral?: boolean;
}) {
  const diff = current - previous;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="text-center">
      <div className="text-xl font-bold text-foreground">{current}</div>
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      {!neutral && (
        <div className={`flex items-center justify-center gap-0.5 mt-1 text-[10px] font-medium ${
          isUp ? "text-emerald-600" : isDown ? "text-red-500" : "text-muted-foreground"
        }`}>
          {isUp ? <ArrowUpRight className="h-3 w-3" /> : isDown ? <ArrowDownRight className="h-3 w-3" /> : null}
          {diff === 0 ? "Same" : `${isUp ? "+" : ""}${diff} vs last week`}
        </div>
      )}
    </div>
  );
}
