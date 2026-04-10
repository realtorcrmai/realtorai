"use client";

import Link from "next/link";

export type DigestData = {
  emails_sent: number;
  pending_drafts: number;
  opens_today: number;
  clicks_today: number;
  open_rate: number;
  hot_leads: Array<{ name: string; type: string; score: number }>;
};

export function DailyDigestCard({ digest }: { digest: DigestData | null }) {
  // Empty state — no newsletter data yet
  if (!digest || (digest.emails_sent === 0 && digest.pending_drafts === 0 && digest.hot_leads.length === 0 && digest.opens_today === 0)) {
    return (
      <div className="lf-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">📧 AI Email Digest</h3>
          <span className="lf-badge lf-badge-info text-[10px]">Last 24h</span>
        </div>
        <div className="text-center py-6">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm text-muted-foreground font-medium">No email activity yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Send your first newsletter to see engagement stats here.
          </p>
          <Link
            href="/newsletters"
            className="inline-block mt-3 text-xs font-medium text-[var(--lf-indigo)] hover:underline"
          >
            Go to Newsletters →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="lf-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">📧 AI Email Digest</h3>
        <span className="lf-badge lf-badge-info text-[10px]">Last 24h</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-2 mb-4">
        <div className="text-center rounded-lg bg-[var(--lf-bg)] p-2">
          <p className="text-lg font-bold text-[var(--lf-text)]">{digest.emails_sent}</p>
          <p className="text-[10px] text-muted-foreground">Sent</p>
        </div>
        <div className="text-center rounded-lg bg-[var(--lf-bg)] p-2">
          <p className="text-lg font-bold text-[var(--lf-text)]">{digest.opens_today}</p>
          <p className="text-[10px] text-muted-foreground">Opens</p>
        </div>
        <div className="text-center rounded-lg bg-[var(--lf-bg)] p-2">
          <p className="text-lg font-bold text-[var(--lf-indigo)]">{digest.clicks_today}</p>
          <p className="text-[10px] text-muted-foreground">Clicks</p>
        </div>
        <div className="text-center rounded-lg bg-[var(--lf-bg)] p-2">
          <p className="text-lg font-bold text-[var(--lf-emerald)]">{digest.open_rate}%</p>
          <p className="text-[10px] text-muted-foreground">Open Rate</p>
        </div>
      </div>

      {/* Hot leads */}
      {digest.hot_leads.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-red-600 mb-1">
            🔥 Hot Leads — Act Today
          </p>
          {digest.hot_leads.map((lead, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-1.5 text-xs border-b border-border/50 last:border-b-0"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-[var(--lf-text)]">{lead.name}</span>
                <span className="lf-badge text-[10px] px-1.5 py-0">{lead.type}</span>
              </div>
              <span
                className="font-semibold"
                style={{
                  color: lead.score >= 70 ? "#dc2626" : lead.score >= 50 ? "#f59e0b" : "var(--lf-text)",
                }}
              >
                Score: {lead.score}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Pending drafts */}
      {digest.pending_drafts > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <span className="text-xs text-muted-foreground">
            📬 {digest.pending_drafts} email{digest.pending_drafts > 1 ? "s" : ""} pending review
          </span>
          <Link
            href="/newsletters/queue"
            className="text-xs font-medium text-[var(--lf-indigo)] hover:underline"
          >
            Review →
          </Link>
        </div>
      )}
    </div>
  );
}
