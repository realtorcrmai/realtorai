"use client";

import { useState, useMemo } from "react";
import type {
  SocialTemplate,
  ContentType,
  SocialPlatform,
  MediaType,
} from "@/lib/social/types";

// ============================================================
// Constants
// ============================================================

const CATEGORIES: { type: ContentType | "all"; emoji: string; label: string }[] = [
  { type: "all", emoji: "📋", label: "All" },
  { type: "just_listed", emoji: "🏠", label: "Just Listed" },
  { type: "just_sold", emoji: "🎉", label: "Just Sold" },
  { type: "open_house", emoji: "🏡", label: "Open House" },
  { type: "price_reduced", emoji: "💰", label: "Price Reduced" },
  { type: "market_update", emoji: "📊", label: "Market Update" },
  { type: "neighbourhood", emoji: "🏘️", label: "Neighbourhood" },
  { type: "testimonial", emoji: "⭐", label: "Testimonial" },
  { type: "tips", emoji: "💡", label: "Tips" },
  { type: "holiday", emoji: "🎄", label: "Holiday" },
  { type: "milestone", emoji: "🏆", label: "Milestone" },
  { type: "coming_soon", emoji: "🔜", label: "Coming Soon" },
];

const CATEGORY_EMOJI: Record<ContentType, string> = {
  just_listed: "🏠",
  just_sold: "🎉",
  open_house: "🏡",
  price_reduced: "💰",
  market_update: "📊",
  neighbourhood: "🏘️",
  testimonial: "⭐",
  tips: "💡",
  holiday: "🎄",
  milestone: "🏆",
  coming_soon: "🔜",
  custom: "✨",
};

const CATEGORY_GRADIENT: Record<ContentType, string> = {
  just_listed: "from-blue-400 to-[#0F7694]",
  just_sold: "from-[#0F7694] to-[#0F7694]",
  open_house: "from-amber-400 to-[#0F7694]",
  price_reduced: "from-rose-400 to-pink-500",
  market_update: "from-[#67D4E8] to-[#1a1535]",
  neighbourhood: "from-lime-400 to-[#0F7694]",
  testimonial: "from-yellow-400 to-amber-500",
  tips: "from-[#67D4E8] to-[#1a1535]",
  holiday: "from-red-400 to-rose-500",
  milestone: "from-fuchsia-400 to-pink-500",
  coming_soon: "from-[#67D4E8] to-[#0F7694]",
  custom: "from-gray-400 to-slate-500",
};

const PLATFORM_EMOJI: Record<SocialPlatform, string> = {
  facebook: "📘",
  instagram: "📸",
  tiktok: "🎵",
  youtube: "▶️",
  linkedin: "💼",
  pinterest: "📌",
  google_business: "🏢",
};

const MEDIA_DISPLAY: Record<MediaType, { emoji: string; label: string; colour: string }> = {
  image: { emoji: "🖼️", label: "Image", colour: "bg-brand-muted text-brand-dark" },
  carousel: { emoji: "📱", label: "Carousel", colour: "bg-brand-muted-strong text-brand-dark" },
  video: { emoji: "🎬", label: "Video", colour: "bg-red-100 text-red-700" },
  reel: { emoji: "🎞️", label: "Reel", colour: "bg-pink-100 text-pink-700" },
  story: { emoji: "📖", label: "Story", colour: "bg-amber-100 text-amber-700" },
};

// ============================================================
// Props
// ============================================================

interface Props {
  templates: SocialTemplate[];
  onUseTemplate?: (template: SocialTemplate) => void;
}

// ============================================================
// Component
// ============================================================

export function SocialTemplatesTab({ templates, onUseTemplate }: Props) {
  const [selectedCategory, setSelectedCategory] = useState<ContentType | "all">("all");

  // Sort: system templates first, then by usage_count descending
  const sortedAndFiltered = useMemo(() => {
    const filtered =
      selectedCategory === "all"
        ? templates
        : templates.filter((t) => t.category === selectedCategory);

    return [...filtered].sort((a, b) => {
      // System templates first
      if (a.is_system !== b.is_system) return a.is_system ? -1 : 1;
      // Then by usage count
      return b.usage_count - a.usage_count;
    });
  }, [templates, selectedCategory]);

  const filteredCount = sortedAndFiltered.length;

  return (
    <div className="space-y-5">
      {/* ── Category Filter Bar ── */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {CATEGORIES.map((cat) => {
          const isActive = selectedCategory === cat.type;
          const count =
            cat.type === "all"
              ? templates.length
              : templates.filter((t) => t.category === cat.type).length;

          return (
            <button
              key={cat.type}
              onClick={() => setSelectedCategory(cat.type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                isActive
                  ? "bg-[var(--lf-indigo)] text-white shadow-md"
                  : "bg-white/60 text-[var(--lf-text)]/70 hover:bg-white/80"
              }`}
            >
              <span>{cat.emoji}</span>
              <span>{cat.label}</span>
              {count > 0 && (
                <span
                  className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-gray-200/60 text-[var(--lf-text)]/50"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Empty State ── */}
      {filteredCount === 0 && (
        <div className="lf-card p-10 text-center">
          <span className="text-4xl block mb-3">📭</span>
          <h3 className="text-base font-semibold mb-1">No templates in this category</h3>
          <p className="text-sm text-[var(--lf-text)]/50">
            Try selecting a different category or create a custom template.
          </p>
        </div>
      )}

      {/* ── Template Grid ── */}
      {filteredCount > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedAndFiltered.map((template) => {
            const catEmoji = CATEGORY_EMOJI[template.category] ?? "✨";
            const gradient = CATEGORY_GRADIENT[template.category] ?? "from-gray-400 to-slate-500";
            const mediaInfo = MEDIA_DISPLAY[template.media_type];

            return (
              <div
                key={template.id}
                className="lf-card overflow-hidden hover:shadow-md transition-shadow flex flex-col"
              >
                {/* Thumbnail or Gradient Placeholder */}
                {template.thumbnail_url ? (
                  <div className="w-full h-36 bg-gray-100 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={template.thumbnail_url}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div
                    className={`w-full h-36 bg-gradient-to-br ${gradient} flex items-center justify-center`}
                  >
                    <span className="text-5xl opacity-80">{catEmoji}</span>
                  </div>
                )}

                {/* Card Body */}
                <div className="p-4 flex flex-col flex-1">
                  {/* Name */}
                  <h3 className="font-bold text-sm mb-2 line-clamp-1">{template.name}</h3>

                  {/* Badges Row */}
                  <div className="flex items-center flex-wrap gap-1.5 mb-3">
                    {/* Category badge */}
                    <span className="lf-badge lf-badge-info text-[11px] flex items-center gap-0.5">
                      <span>{catEmoji}</span>
                      <span className="capitalize">
                        {template.category.replace(/_/g, " ")}
                      </span>
                    </span>

                    {/* Media type badge */}
                    <span
                      className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium ${mediaInfo.colour}`}
                    >
                      <span>{mediaInfo.emoji}</span>
                      <span>{mediaInfo.label}</span>
                    </span>

                    {/* System badge */}
                    {template.is_system && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[11px] font-medium bg-brand-muted text-brand-dark">
                        🔒 System
                      </span>
                    )}
                  </div>

                  {/* Platforms */}
                  <div className="flex items-center gap-1 mb-3">
                    <span className="text-[11px] text-[var(--lf-text)]/40 mr-0.5">Platforms:</span>
                    {template.supported_platforms.map((p) => (
                      <span
                        key={p}
                        title={p}
                        className="text-base"
                      >
                        {PLATFORM_EMOJI[p]}
                      </span>
                    ))}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-[11px] text-[var(--lf-text)]/50 mb-4">
                    <span title="Times used">
                      📊 {template.usage_count.toLocaleString()} uses
                    </span>
                    <span title="Average engagement">
                      💬 {template.avg_engagement.toFixed(1)}% avg engagement
                    </span>
                  </div>

                  {/* Description */}
                  {template.description && (
                    <p className="text-xs text-[var(--lf-text)]/50 mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  {/* Action */}
                  <div className="mt-auto">
                    <button
                      className="lf-btn w-full text-sm flex items-center justify-center gap-1.5"
                      onClick={() => {
                        if (onUseTemplate) {
                          onUseTemplate(template);
                        } else {
                          // Fallback: navigate to studio tab via hash
                          window.location.hash = "#studio";
                          alert(`Template "${template.name}" selected.\n\nCaption preview:\n${template.caption_template.slice(0, 200)}${template.caption_template.length > 200 ? "..." : ""}`);
                        }
                      }}
                    >
                      ✨ Use Template
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
