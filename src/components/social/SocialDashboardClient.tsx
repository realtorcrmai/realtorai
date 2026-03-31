"use client";

import { useState } from "react";
import type { SocialBrandKit, SocialAccount, SocialPost, SocialTemplate, SocialTab } from "@/lib/social/types";
import { SocialOverviewTab } from "./SocialOverviewTab";
import { SocialCalendarTab } from "./SocialCalendarTab";
import { SocialStudioTab } from "./SocialStudioTab";
import { SocialTemplatesTab } from "./SocialTemplatesTab";
import { SocialAnalyticsTab } from "./SocialAnalyticsTab";
import { SocialSettingsTab } from "./SocialSettingsTab";

interface Props {
  brandKit: SocialBrandKit | null;
  accounts: SocialAccount[];
  recentPosts: SocialPost[];
  pendingDrafts: SocialPost[];
  scheduledPosts: SocialPost[];
  templates: SocialTemplate[];
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
}

const TABS: { key: SocialTab; label: string; emoji: string; badge?: string }[] = [
  { key: "overview", label: "Overview", emoji: "📊" },
  { key: "studio", label: "AI Studio", emoji: "🎨" },
  { key: "calendar", label: "Calendar", emoji: "📅" },
  { key: "templates", label: "Templates", emoji: "📋" },
  { key: "analytics", label: "Analytics", emoji: "📈" },
  { key: "settings", label: "Settings", emoji: "⚙️" },
];

export function SocialDashboardClient({
  brandKit,
  accounts,
  recentPosts,
  pendingDrafts,
  scheduledPosts,
  templates,
  stats,
}: Props) {
  const [activeTab, setActiveTab] = useState<SocialTab>("overview");

  const needsSetup = !brandKit;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="lf-glass sticky top-[60px] z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📱</span>
          <div>
            <h1 className="text-lg font-bold bg-gradient-to-r from-[var(--lf-indigo)] to-[var(--lf-coral)] bg-clip-text text-transparent">
              Social Media Studio
            </h1>
            <p className="text-xs text-[var(--lf-text)]/60">
              {needsSetup
                ? "Set up your brand kit to get started"
                : `${stats.connectedPlatforms} platforms connected · ${stats.pendingCount} drafts pending`}
            </p>
          </div>
        </div>

        {!needsSetup && (
          <button
            onClick={() => setActiveTab("studio")}
            className="lf-btn text-sm flex items-center gap-1.5"
          >
            ✨ Create Post
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-[var(--lf-indigo)] text-white shadow-md"
                : "bg-white/60 text-[var(--lf-text)]/70 hover:bg-white/80"
            }`}
          >
            <span>{tab.emoji}</span>
            <span>{tab.label}</span>
            {tab.key === "studio" && stats.pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-[var(--lf-coral)] text-white text-[10px] font-bold">
                {stats.pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-4 pb-8">
        {needsSetup && activeTab !== "settings" ? (
          <div className="lf-card p-12 text-center">
            <span className="text-5xl mb-4 block">🎨</span>
            <h2 className="text-xl font-bold mb-2">Set Up Your Brand Kit</h2>
            <p className="text-sm text-[var(--lf-text)]/60 mb-6 max-w-md mx-auto">
              Before AI can generate content for you, we need to know your brand — your colours, voice, and style.
              It takes 2 minutes.
            </p>
            <button
              onClick={() => setActiveTab("settings")}
              className="lf-btn"
            >
              ⚙️ Set Up Brand Kit
            </button>
          </div>
        ) : (
          <>
            {activeTab === "overview" && (
              <SocialOverviewTab
                stats={stats}
                recentPosts={recentPosts}
                pendingDrafts={pendingDrafts}
                scheduledPosts={scheduledPosts}
                accounts={accounts}
                onTabChange={setActiveTab}
              />
            )}
            {activeTab === "studio" && (
              <SocialStudioTab
                brandKit={brandKit!}
                pendingDrafts={pendingDrafts}
                templates={templates}
              />
            )}
            {activeTab === "calendar" && (
              <SocialCalendarTab
                posts={[...scheduledPosts, ...recentPosts.filter(p => p.status === "published")]}
              />
            )}
            {activeTab === "templates" && (
              <SocialTemplatesTab templates={templates} />
            )}
            {activeTab === "analytics" && (
              <SocialAnalyticsTab
                stats={stats}
                recentPosts={recentPosts}
                accounts={accounts}
              />
            )}
            {activeTab === "settings" && (
              <SocialSettingsTab
                brandKit={brandKit}
                accounts={accounts}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
