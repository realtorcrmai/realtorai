"use client";

import { useMemo } from "react";
import type { SocialPost, SocialAccount, SocialPlatform, ContentType } from "@/lib/social/types";

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
  accounts: SocialAccount[];
}

const fmt = new Intl.NumberFormat("en-CA");

const PLATFORM_EMOJI: Record<SocialPlatform, string> = {
  facebook: "📘",
  instagram: "📸",
  tiktok: "🎵",
  youtube: "🎬",
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
  open_house: "🚪",
  price_reduced: "💰",
  coming_soon: "⏳",
  market_update: "📊",
  neighbourhood: "🏘️",
  testimonial: "⭐",
  tips: "💡",
  holiday: "🎄",
  milestone: "🏆",
  custom: "✏️",
};

const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  just_listed: "Just Listed",
  just_sold: "Just Sold",
  open_house: "Open House",
  price_reduced: "Price Reduced",
  coming_soon: "Coming Soon",
  market_update: "Market Update",
  neighbourhood: "Neighbourhood",
  testimonial: "Testimonial",
  tips: "Tips & Advice",
  holiday: "Holiday",
  milestone: "Milestone",
  custom: "Custom",
};

export function SocialAnalyticsTab({ stats, recentPosts, accounts }: Props) {
  const engagementRate =
    stats.totalImpressions > 0
      ? ((stats.totalEngagement / stats.totalImpressions) * 100).toFixed(1)
      : "0.0";

  const publishedPosts = useMemo(
    () => recentPosts.filter((p) => p.status === "published"),
    [recentPosts]
  );

  const topPosts = useMemo(
    () =>
      [...publishedPosts]
        .sort((a, b) => b.total_engagement - a.total_engagement)
        .slice(0, 5),
    [publishedPosts]
  );

  // Platform performance: posts + engagement per connected account
  const platformPerformance = useMemo(() => {
    return accounts
      .filter((a) => a.is_active)
      .map((account) => {
        const platformPosts = publishedPosts.filter((p) =>
          p.target_platforms.includes(account.platform)
        );
        const totalEngagement = platformPosts.reduce(
          (sum, p) => sum + p.total_engagement,
          0
        );
        return {
          account,
          postsCount: platformPosts.length,
          totalEngagement,
        };
      });
  }, [accounts, publishedPosts]);

  // Content type performance breakdown
  const contentTypePerformance = useMemo(() => {
    const map = new Map<
      ContentType,
      { posts: number; engagement: number; impressions: number }
    >();

    for (const post of publishedPosts) {
      const existing = map.get(post.content_type) || {
        posts: 0,
        engagement: 0,
        impressions: 0,
      };
      existing.posts += 1;
      existing.engagement += post.total_engagement;
      existing.impressions += post.total_impressions;
      map.set(post.content_type, existing);
    }

    const entries = Array.from(map.entries()).sort(
      (a, b) => b[1].engagement - a[1].engagement
    );

    const maxEngagement = entries.length > 0 ? entries[0][1].engagement : 1;

    return entries.map(([type, data]) => ({
      type,
      ...data,
      barWidth: Math.max(5, (data.engagement / maxEngagement) * 100),
    }));
  }, [publishedPosts]);

  // Empty state
  if (publishedPosts.length === 0) {
    return (
      <div className="lf-card p-12 text-center">
        <span className="text-5xl mb-4 block">📈</span>
        <h2 className="text-xl font-bold mb-2">No Analytics Yet</h2>
        <p className="text-sm text-[var(--lf-text)]/60 max-w-md mx-auto">
          Publish your first post to see analytics here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stat Pills ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatPill emoji="📝" label="Posts" value={fmt.format(stats.totalPosts30d)} />
        <StatPill emoji="👁️" label="Impressions" value={fmt.format(stats.totalImpressions)} />
        <StatPill emoji="❤️" label="Engagement" value={fmt.format(stats.totalEngagement)} />
        <StatPill emoji="🔗" label="Clicks" value={fmt.format(stats.totalClicks)} />
        <StatPill emoji="🧲" label="Leads" value={fmt.format(stats.totalLeads)} />
        <StatPill emoji="📐" label="Eng. Rate" value={`${engagementRate}%`} highlight />
      </div>

      {/* ── Top Performing Posts ── */}
      <section>
        <h2 className="text-base font-bold mb-3 flex items-center gap-2">
          🏅 Top Performing Posts
          <span className="text-xs font-normal text-[var(--lf-text)]/50">
            (30 days)
          </span>
        </h2>
        <div className="space-y-3">
          {topPosts.map((post, idx) => (
            <div key={post.id} className="lf-card p-4">
              <div className="flex items-start gap-3">
                {/* Rank */}
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-[var(--lf-indigo)] to-[var(--lf-coral)] flex items-center justify-center text-white text-sm font-bold">
                  #{idx + 1}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Content type + caption */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm">
                      {CONTENT_TYPE_EMOJI[post.content_type]}
                    </span>
                    <span className="text-xs font-semibold text-[var(--lf-text)]/80">
                      {CONTENT_TYPE_LABEL[post.content_type]}
                    </span>
                  </div>

                  <p className="text-sm text-[var(--lf-text)]/70 mb-2 truncate">
                    {post.caption
                      ? post.caption.length > 80
                        ? post.caption.slice(0, 80) + "..."
                        : post.caption
                      : "No caption"}
                  </p>

                  {/* Platform badges */}
                  <div className="flex items-center gap-1.5 mb-2">
                    {post.target_platforms.map((platform) => (
                      <span
                        key={platform}
                        className="lf-badge text-[10px] px-2 py-0.5"
                        title={PLATFORM_LABEL[platform]}
                      >
                        {PLATFORM_EMOJI[platform]} {PLATFORM_LABEL[platform]}
                      </span>
                    ))}
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-[var(--lf-text)]/60">
                    <span>👁️ {fmt.format(post.total_impressions)}</span>
                    <span>❤️ {fmt.format(post.total_engagement)}</span>
                    <span>🔗 {fmt.format(post.total_clicks)}</span>
                    {post.published_at && (
                      <span className="ml-auto">
                        {new Date(post.published_at).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Platform Performance ── */}
      {platformPerformance.length > 0 && (
        <section>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            📡 Platform Performance
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {platformPerformance.map(({ account, postsCount, totalEngagement }) => (
              <div key={account.id} className="lf-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">
                    {PLATFORM_EMOJI[account.platform]}
                  </span>
                  <div>
                    <p className="text-sm font-bold">
                      {PLATFORM_LABEL[account.platform]}
                    </p>
                    {account.account_name && (
                      <p className="text-[11px] text-[var(--lf-text)]/50">
                        @{account.account_name}
                      </p>
                    )}
                  </div>
                  <span
                    className={`ml-auto lf-badge text-[10px] ${
                      account.connection_status === "connected"
                        ? "lf-badge-done"
                        : account.connection_status === "expiring"
                        ? "lf-badge-pending"
                        : "lf-badge-blocked"
                    }`}
                  >
                    {account.connection_status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-lg font-bold">
                      {fmt.format(account.followers_count)}
                    </p>
                    <p className="text-[10px] text-[var(--lf-text)]/50">
                      Followers
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">{postsCount}</p>
                    <p className="text-[10px] text-[var(--lf-text)]/50">
                      Posts (30d)
                    </p>
                  </div>
                  <div>
                    <p className="text-lg font-bold">
                      {fmt.format(totalEngagement)}
                    </p>
                    <p className="text-[10px] text-[var(--lf-text)]/50">
                      Engagement
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Content Type Performance ── */}
      {contentTypePerformance.length > 0 && (
        <section>
          <h2 className="text-base font-bold mb-3 flex items-center gap-2">
            🎯 Content Type Performance
          </h2>
          <div className="lf-card p-4 space-y-3">
            {contentTypePerformance.map(
              ({ type, posts, engagement, impressions, barWidth }) => (
                <div key={type}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{CONTENT_TYPE_EMOJI[type]}</span>
                      <span className="text-sm font-medium">
                        {CONTENT_TYPE_LABEL[type]}
                      </span>
                      <span className="text-[10px] text-[var(--lf-text)]/50">
                        ({posts} {posts === 1 ? "post" : "posts"})
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--lf-text)]/60">
                      <span>👁️ {fmt.format(impressions)}</span>
                      <span>❤️ {fmt.format(engagement)}</span>
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--lf-indigo)]/10">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-[var(--lf-indigo)] to-[var(--lf-coral)] transition-all duration-500"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              )
            )}
          </div>
        </section>
      )}
    </div>
  );
}

/* ── Stat Pill ── */
function StatPill({
  emoji,
  label,
  value,
  highlight = false,
}: {
  emoji: string;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`lf-card p-3 text-center ${
        highlight
          ? "ring-2 ring-[var(--lf-coral)]/30 bg-[var(--lf-coral)]/5"
          : ""
      }`}
    >
      <span className="text-lg block mb-0.5">{emoji}</span>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[10px] text-[var(--lf-text)]/50 uppercase tracking-wide">
        {label}
      </p>
    </div>
  );
}
