"use client";

import type {
  SocialPost,
  SocialAccount,
  SocialTab,
  SocialPlatform,
  ContentType,
  ConnectionStatus,
} from "@/lib/social/types";

interface Props {
  stats: {
    totalPosts30d: number;
    totalImpressions: number;
    totalEngagement: number;
    totalClicks: number;
    totalLeads: number;
    pendingCount: number;
    scheduledCount: number;
    connectedPlatforms: number;
  };
  recentPosts: SocialPost[];
  pendingDrafts: SocialPost[];
  scheduledPosts: SocialPost[];
  accounts: SocialAccount[];
  onTabChange: (tab: SocialTab) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (n: number): string =>
  new Intl.NumberFormat("en-CA", { notation: "compact", maximumFractionDigits: 1 }).format(n);

const PLATFORM_EMOJI: Record<SocialPlatform, string> = {
  facebook: "🔵",
  instagram: "📸",
  tiktok: "🎵",
  youtube: "🔴",
  linkedin: "💼",
  pinterest: "📌",
  google_business: "🏢",
};

const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  youtube: "YouTube",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  google_business: "Google Business",
};

const CONTENT_TYPE_EMOJI: Record<ContentType, string> = {
  just_listed: "🏠",
  just_sold: "🎉",
  open_house: "🏡",
  price_reduced: "💰",
  coming_soon: "🔜",
  market_update: "📊",
  neighbourhood: "🗺️",
  testimonial: "⭐",
  tips: "💡",
  holiday: "🎄",
  milestone: "🏆",
  custom: "✍️",
};

const CONNECTION_BADGE: Record<ConnectionStatus, { label: string; className: string }> = {
  connected: { label: "Connected", className: "lf-badge -done" },
  expiring: { label: "Expiring", className: "lf-badge -pending" },
  disconnected: { label: "Disconnected", className: "lf-badge -blocked" },
  error: { label: "Error", className: "lf-badge -blocked" },
};

function truncate(text: string | null, max: number): string {
  if (!text) return "No caption";
  return text.length > max ? text.slice(0, max) + "..." : text;
}

function relativeDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatPill({ emoji, label, value }: { emoji: string; label: string; value: number }) {
  return (
    <div className="lf-card flex items-center gap-3 px-4 py-3 min-w-[140px]">
      <span className="text-xl">{emoji}</span>
      <div>
        <div className="text-lg font-bold text-[var(--lf-text)]">{fmt(value)}</div>
        <div className="text-[11px] text-[var(--lf-text)]/55 font-medium">{label}</div>
      </div>
    </div>
  );
}

function QuickActionCard({
  emoji,
  title,
  description,
  badge,
  onClick,
}: {
  emoji: string;
  title: string;
  description: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="lf-card p-5 text-left hover:shadow-lg transition-shadow group flex-1 min-w-[200px]"
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl group-hover:scale-110 transition-transform">{emoji}</span>
        {badge != null && badge > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-[var(--lf-coral)] text-white text-[11px] font-bold">
            {badge}
          </span>
        )}
      </div>
      <h3 className="font-bold text-sm text-[var(--lf-text)] mb-0.5">{title}</h3>
      <p className="text-[11px] text-[var(--lf-text)]/55">{description}</p>
    </button>
  );
}

function PlatformBadges({ platforms }: { platforms: SocialPlatform[] }) {
  return (
    <div className="flex gap-1 flex-wrap">
      {platforms.map((p) => (
        <span
          key={p}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-white/70 text-[10px] font-medium"
          title={PLATFORM_LABEL[p]}
        >
          {PLATFORM_EMOJI[p]}
        </span>
      ))}
    </div>
  );
}

function DraftRow({
  post,
  onApprove,
  onSkip,
}: {
  post: SocialPost;
  onApprove: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--lf-text)]/5 last:border-0">
      <span className="text-lg" title={post.content_type}>
        {CONTENT_TYPE_EMOJI[post.content_type] || "📝"}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--lf-text)] truncate font-medium">
          {truncate(post.caption, 100)}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <PlatformBadges platforms={post.target_platforms} />
          {post.content_score != null && (
            <span className="text-[10px] text-[var(--lf-text)]/50 font-medium">
              Score: {post.content_score}/10
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1.5 shrink-0">
        <button onClick={onApprove} className="lf-btn-sm lf-btn-success text-xs px-3 py-1">
          Approve
        </button>
        <button onClick={onSkip} className="lf-btn-sm lf-btn-ghost text-xs px-3 py-1">
          Skip
        </button>
      </div>
    </div>
  );
}

function PublishedRow({ post }: { post: SocialPost }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--lf-text)]/5 last:border-0">
      <PlatformBadges platforms={post.target_platforms} />

      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--lf-text)] truncate">
          {truncate(post.caption, 100)}
        </p>
      </div>

      <div className="flex items-center gap-4 text-[11px] text-[var(--lf-text)]/55 shrink-0">
        <span title="Impressions">👁️ {fmt(post.total_impressions)}</span>
        <span title="Engagement">💬 {fmt(post.total_engagement)}</span>
        <span title="Clicks">🔗 {fmt(post.total_clicks)}</span>
      </div>

      <span className="text-[11px] text-[var(--lf-text)]/40 whitespace-nowrap shrink-0">
        {relativeDate(post.published_at)}
      </span>
    </div>
  );
}

function AccountRow({ account }: { account: SocialAccount }) {
  const badge = CONNECTION_BADGE[account.connection_status];
  return (
    <div className="flex items-center gap-3 py-3 border-b border-[var(--lf-text)]/5 last:border-0">
      <span className="text-lg">{PLATFORM_EMOJI[account.platform]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--lf-text)] truncate">
          {account.account_name || PLATFORM_LABEL[account.platform]}
        </p>
        <p className="text-[11px] text-[var(--lf-text)]/50">
          {fmt(account.followers_count)} followers
        </p>
      </div>
      <span className={badge.className}>{badge.label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function SocialOverviewTab({
  stats,
  recentPosts,
  pendingDrafts,
  scheduledPosts,
  accounts,
  onTabChange,
}: Props) {
  const publishedPosts = recentPosts
    .filter((p) => p.status === "published")
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* ── Stat Pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatPill emoji="📝" label="Posts (30d)" value={stats.totalPosts30d} />
        <StatPill emoji="👁️" label="Impressions" value={stats.totalImpressions} />
        <StatPill emoji="💬" label="Engagement" value={stats.totalEngagement} />
        <StatPill emoji="🔗" label="Clicks" value={stats.totalClicks} />
        <StatPill emoji="🎯" label="Leads" value={stats.totalLeads} />
        <StatPill emoji="🔌" label="Platforms" value={stats.connectedPlatforms} />
      </div>

      {/* ── Quick Actions ── */}
      <div className="flex gap-3 flex-wrap">
        <QuickActionCard
          emoji="✨"
          title="Create Post"
          description="Generate AI-powered content for your social channels"
          onClick={() => onTabChange("studio")}
        />
        <QuickActionCard
          emoji="📋"
          title="Review Drafts"
          description="Approve or edit AI-generated drafts before publishing"
          badge={stats.pendingCount}
          onClick={() => onTabChange("studio")}
        />
        <QuickActionCard
          emoji="📅"
          title="View Calendar"
          description="See your scheduled and published posts at a glance"
          onClick={() => onTabChange("calendar")}
        />
      </div>

      {/* ── Pending Drafts ── */}
      {pendingDrafts.length > 0 && (
        <div className="lf-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-[var(--lf-text)] flex items-center gap-2">
              📋 Pending Drafts
              <span className="px-2 py-0.5 rounded-full bg-[var(--lf-coral)]/10 text-[var(--lf-coral)] text-[11px] font-bold">
                {pendingDrafts.length}
              </span>
            </h2>
            <button
              onClick={() => onTabChange("studio")}
              className="lf-btn-ghost text-xs px-3 py-1"
            >
              View All
            </button>
          </div>
          <div>
            {pendingDrafts.slice(0, 5).map((post) => (
              <DraftRow
                key={post.id}
                post={post}
                onApprove={() => {
                  /* Approval handled via server action in parent */
                }}
                onSkip={() => {
                  /* Skip handled via server action in parent */
                }}
              />
            ))}
          </div>
          {pendingDrafts.length > 5 && (
            <p className="text-center text-[11px] text-[var(--lf-text)]/40 mt-2">
              +{pendingDrafts.length - 5} more drafts in studio
            </p>
          )}
        </div>
      )}

      {/* ── Recent Published ── */}
      <div className="lf-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-[var(--lf-text)] flex items-center gap-2">
            🚀 Recent Published
          </h2>
          <button
            onClick={() => onTabChange("analytics")}
            className="lf-btn-ghost text-xs px-3 py-1"
          >
            Full Analytics
          </button>
        </div>

        {publishedPosts.length === 0 ? (
          <div className="py-8 text-center">
            <span className="text-3xl mb-2 block">📭</span>
            <p className="text-sm text-[var(--lf-text)]/50">
              No published posts yet. Create your first post to get started.
            </p>
          </div>
        ) : (
          <div>
            {publishedPosts.map((post) => (
              <PublishedRow key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>

      {/* ── Upcoming Scheduled ── */}
      {scheduledPosts.length > 0 && (
        <div className="lf-card p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm text-[var(--lf-text)] flex items-center gap-2">
              ⏰ Upcoming Scheduled
              <span className="lf-badge -info text-[10px]">{scheduledPosts.length}</span>
            </h2>
            <button
              onClick={() => onTabChange("calendar")}
              className="lf-btn-ghost text-xs px-3 py-1"
            >
              Calendar
            </button>
          </div>
          <div>
            {scheduledPosts.slice(0, 4).map((post) => (
              <div
                key={post.id}
                className="flex items-center gap-3 py-3 border-b border-[var(--lf-text)]/5 last:border-0"
              >
                <span className="text-lg">
                  {CONTENT_TYPE_EMOJI[post.content_type] || "📝"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--lf-text)] truncate">
                    {truncate(post.caption, 80)}
                  </p>
                  <PlatformBadges platforms={post.target_platforms} />
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs font-medium text-[var(--lf-text)]">
                    {post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </p>
                  <p className="text-[11px] text-[var(--lf-text)]/50">
                    {post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleTimeString("en-CA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : ""}
                  </p>
                </div>
                <span className="lf-badge -active text-[10px]">Scheduled</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Connected Accounts ── */}
      <div className="lf-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-sm text-[var(--lf-text)] flex items-center gap-2">
            🔌 Connected Accounts
          </h2>
          <button
            onClick={() => onTabChange("settings")}
            className="lf-btn-ghost text-xs px-3 py-1"
          >
            Manage
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="py-8 text-center">
            <span className="text-3xl mb-2 block">🔗</span>
            <p className="text-sm text-[var(--lf-text)]/50 mb-3">
              No social accounts connected yet.
            </p>
            <button
              onClick={() => onTabChange("settings")}
              className="lf-btn text-xs"
            >
              Connect Account
            </button>
          </div>
        ) : (
          <div>
            {accounts.map((account) => (
              <AccountRow key={account.id} account={account} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
