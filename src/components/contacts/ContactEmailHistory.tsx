"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mail, Filter } from "lucide-react";
import { EmailHistoryTimeline } from "@/components/contacts/EmailHistoryTimeline";

type NewsletterEvent = {
  id: string;
  event_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type Newsletter = {
  id: string;
  subject: string;
  email_type: string;
  status: string;
  html_body: string | null;
  sent_at: string | null;
  created_at: string;
  quality_score: number | null;
  ai_context: Record<string, unknown> | null;
  events: NewsletterEvent[];
};

type EmailStats = {
  total: number;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
};

type Props = {
  newsletters: Newsletter[];
  stats: EmailStats;
};

const FILTER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "sent", label: "Sent" },
  { value: "suppressed", label: "Held Back" },
] as const;

export function ContactEmailHistory({ newsletters, stats }: Props) {
  const [filter, setFilter] = useState<"all" | "sent" | "suppressed">("all");

  if (newsletters.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <Mail className="w-5 h-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">No emails sent yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          When emails are sent to this contact, they will appear here with open and click tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{stats.total}</span> emails
        </div>
        <span className="text-border">|</span>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{stats.sent}</span> sent
        </div>
        {stats.opened > 0 && (
          <>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-success">{stats.opened}</span>
              <span className="text-muted-foreground">opened</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-success border-success/30">
                {stats.openRate}%
              </Badge>
            </div>
          </>
        )}
        {stats.clicked > 0 && (
          <>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-brand">{stats.clicked}</span>
              <span className="text-muted-foreground">clicked</span>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-brand border-brand/30">
                {stats.clickRate}%
              </Badge>
            </div>
          </>
        )}
        {stats.bounced > 0 && (
          <>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1.5 text-sm">
              <span className="font-semibold text-destructive">{stats.bounced}</span>
              <span className="text-muted-foreground">bounced</span>
            </div>
          </>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-1.5">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        {FILTER_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={filter === opt.value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(opt.value)}
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {/* Email Timeline */}
      <EmailHistoryTimeline newsletters={newsletters} filter={filter} />
    </div>
  );
}
