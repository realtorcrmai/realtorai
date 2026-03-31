"use client";

import { useState, useTransition } from "react";
import type {
  SocialBrandKit,
  SocialPost,
  SocialTemplate,
  ContentType,
  SocialPlatform,
} from "@/lib/social/types";
import { approvePost, skipPost, regeneratePost } from "@/actions/social-content";

// ============================================================
// Constants
// ============================================================

const CONTENT_TYPES: { type: ContentType; emoji: string; label: string }[] = [
  { type: "just_listed", emoji: "🏠", label: "Just Listed" },
  { type: "just_sold", emoji: "🎉", label: "Just Sold" },
  { type: "open_house", emoji: "🏡", label: "Open House" },
  { type: "price_reduced", emoji: "💰", label: "Price Reduced" },
  { type: "market_update", emoji: "📊", label: "Market Update" },
  { type: "neighbourhood", emoji: "🏘️", label: "Neighbourhood" },
  { type: "tips", emoji: "💡", label: "Tips" },
  { type: "holiday", emoji: "🎄", label: "Holiday" },
  { type: "custom", emoji: "✨", label: "Custom" },
];

const PLATFORM_DISPLAY: Record<SocialPlatform, { emoji: string; label: string; colour: string }> = {
  facebook: { emoji: "📘", label: "Facebook", colour: "bg-blue-100 text-blue-700" },
  instagram: { emoji: "📸", label: "Instagram", colour: "bg-pink-100 text-pink-700" },
  tiktok: { emoji: "🎵", label: "TikTok", colour: "bg-gray-100 text-gray-700" },
  youtube: { emoji: "▶️", label: "YouTube", colour: "bg-red-100 text-red-700" },
  linkedin: { emoji: "💼", label: "LinkedIn", colour: "bg-sky-100 text-sky-700" },
  pinterest: { emoji: "📌", label: "Pinterest", colour: "bg-rose-100 text-rose-700" },
  google_business: { emoji: "🏢", label: "Google", colour: "bg-emerald-100 text-emerald-700" },
};

// ============================================================
// Props
// ============================================================

interface Props {
  brandKit: SocialBrandKit;
  pendingDrafts: SocialPost[];
  templates: SocialTemplate[];
}

// ============================================================
// Component
// ============================================================

export function SocialStudioTab({ brandKit, pendingDrafts, templates }: Props) {
  const [showContentTypes, setShowContentTypes] = useState(false);
  const [showTemplateSelect, setShowTemplateSelect] = useState(false);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [customCaption, setCustomCaption] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedCaptions, setEditedCaptions] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();

  // ----------------------------------------------------------
  // Handlers
  // ----------------------------------------------------------

  function handleApprove(postId: string) {
    startTransition(async () => {
      await approvePost(postId);
    });
  }

  function handleApproveAll() {
    startTransition(async () => {
      for (const post of pendingDrafts) {
        await approvePost(post.id);
      }
    });
  }

  function handleSkip(postId: string) {
    startTransition(async () => {
      await skipPost(postId);
    });
  }

  function handleRegenerate(postId: string) {
    startTransition(async () => {
      await regeneratePost(postId);
    });
  }

  function startEditing(post: SocialPost) {
    setEditingId(post.id);
    setEditedCaptions((prev) => ({
      ...prev,
      [post.id]: post.caption ?? "",
    }));
  }

  function cancelEditing() {
    setEditingId(null);
  }

  function getContentTypeInfo(type: ContentType) {
    return CONTENT_TYPES.find((ct) => ct.type === type) ?? { type, emoji: "📝", label: type };
  }

  function getScoreColour(score: number): string {
    if (score > 70) return "bg-emerald-100 text-emerald-700";
    if (score >= 40) return "bg-amber-100 text-amber-700";
    return "bg-red-100 text-red-700";
  }

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ── Create New Section ── */}
      <div className="lf-card p-5">
        <h2 className="text-base font-bold mb-3">
          ✨ Create New Content
        </h2>

        <div className="flex flex-wrap gap-2">
          {/* Generate from Listing */}
          <div className="relative">
            <button
              onClick={() => {
                setShowContentTypes(!showContentTypes);
                setShowTemplateSelect(false);
                setShowCustomEditor(false);
              }}
              className="lf-btn text-sm flex items-center gap-1.5"
            >
              🏠 Generate from Listing
            </button>

            {showContentTypes && (
              <div className="absolute top-full left-0 mt-1.5 z-40 bg-white rounded-xl shadow-lg border border-gray-100 p-2 min-w-[200px]">
                {CONTENT_TYPES.map((ct) => (
                  <button
                    key={ct.type}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--lf-indigo)]/5 transition-colors flex items-center gap-2"
                    onClick={() => {
                      setShowContentTypes(false);
                      // Future: trigger content generation with selected type
                    }}
                  >
                    <span>{ct.emoji}</span>
                    <span>{ct.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Use Template */}
          <div className="relative">
            <button
              onClick={() => {
                setShowTemplateSelect(!showTemplateSelect);
                setShowContentTypes(false);
                setShowCustomEditor(false);
              }}
              className="lf-btn-ghost text-sm flex items-center gap-1.5"
            >
              📋 Use Template
            </button>

            {showTemplateSelect && templates.length > 0 && (
              <div className="absolute top-full left-0 mt-1.5 z-40 bg-white rounded-xl shadow-lg border border-gray-100 p-2 min-w-[240px] max-h-[280px] overflow-y-auto">
                {templates.slice(0, 10).map((tpl) => {
                  const info = getContentTypeInfo(tpl.category);
                  return (
                    <button
                      key={tpl.id}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[var(--lf-indigo)]/5 transition-colors flex items-center gap-2"
                      onClick={() => {
                        setShowTemplateSelect(false);
                        // Future: open template editor with selected template
                      }}
                    >
                      <span>{info.emoji}</span>
                      <span className="truncate">{tpl.name}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {showTemplateSelect && templates.length === 0 && (
              <div className="absolute top-full left-0 mt-1.5 z-40 bg-white rounded-xl shadow-lg border border-gray-100 p-3 min-w-[200px]">
                <p className="text-sm text-[var(--lf-text)]/50">No templates available</p>
              </div>
            )}
          </div>

          {/* Custom Post */}
          <button
            onClick={() => {
              setShowCustomEditor(!showCustomEditor);
              setShowContentTypes(false);
              setShowTemplateSelect(false);
            }}
            className="lf-btn-ghost text-sm flex items-center gap-1.5"
          >
            ✏️ Custom Post
          </button>
        </div>

        {/* Custom Post Editor */}
        {showCustomEditor && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
            <label className="block text-sm font-medium text-[var(--lf-text)]">
              Write your caption
            </label>
            <textarea
              className="lf-textarea w-full min-h-[120px]"
              placeholder="Write your post caption here... AI can help refine it."
              value={customCaption}
              onChange={(e) => setCustomCaption(e.target.value)}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--lf-text)]/50">
                {customCaption.length} characters
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCustomEditor(false);
                    setCustomCaption("");
                  }}
                  className="lf-btn-ghost text-sm"
                >
                  Cancel
                </button>
                <button
                  className="lf-btn text-sm"
                  disabled={!customCaption.trim()}
                >
                  🚀 Create Draft
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Approval Queue Section ── */}
      <div className="space-y-3">
        {/* Queue Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold">
              🤖 AI Drafts Ready for Review
            </h2>
            {pendingDrafts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--lf-coral)] text-white text-xs font-bold">
                {pendingDrafts.length}
              </span>
            )}
          </div>

          {pendingDrafts.length > 1 && (
            <button
              onClick={handleApproveAll}
              disabled={isPending}
              className="lf-btn text-sm flex items-center gap-1.5"
            >
              {isPending ? "..." : "✅ Approve All"}
            </button>
          )}
        </div>

        {/* Empty State */}
        {pendingDrafts.length === 0 && (
          <div className="lf-card p-10 text-center">
            <span className="text-4xl block mb-3">📭</span>
            <h3 className="text-base font-semibold mb-1">No drafts pending</h3>
            <p className="text-sm text-[var(--lf-text)]/50 max-w-md mx-auto">
              Create a new post or wait for AI to generate content from your CRM events.
            </p>
          </div>
        )}

        {/* Draft Cards */}
        {pendingDrafts.map((post) => {
          const info = getContentTypeInfo(post.content_type);
          const isEditing = editingId === post.id;
          const captionText = isEditing
            ? (editedCaptions[post.id] ?? post.caption ?? "")
            : (post.caption ?? "");

          return (
            <div
              key={post.id}
              className="lf-card p-5 space-y-3 hover:shadow-md transition-shadow"
            >
              {/* Top Row: Type Badge + Score */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Content type badge */}
                  <span className="lf-badge lf-badge-info text-sm flex items-center gap-1">
                    <span>{info.emoji}</span>
                    <span>{info.label}</span>
                  </span>

                  {/* Platform pills */}
                  {post.target_platforms.map((platform) => {
                    const pInfo = PLATFORM_DISPLAY[platform];
                    return (
                      <span
                        key={platform}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${pInfo.colour}`}
                      >
                        <span>{pInfo.emoji}</span>
                        <span>{pInfo.label}</span>
                      </span>
                    );
                  })}

                  {post.ai_generated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                      🤖 AI Generated
                    </span>
                  )}
                </div>

                {/* Content Score */}
                {post.content_score != null && (
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${getScoreColour(post.content_score)}`}
                  >
                    {post.content_score > 70 ? "🟢" : post.content_score >= 40 ? "🟡" : "🔴"}
                    {post.content_score}/100
                  </span>
                )}
              </div>

              {/* Caption */}
              <div>
                {isEditing ? (
                  <textarea
                    className="lf-textarea w-full min-h-[100px]"
                    value={editedCaptions[post.id] ?? ""}
                    onChange={(e) =>
                      setEditedCaptions((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-sm text-[var(--lf-text)]/80 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors"
                    onClick={() => startEditing(post)}
                    title="Click to edit"
                  >
                    {captionText || (
                      <span className="italic text-[var(--lf-text)]/40">No caption</span>
                    )}
                  </p>
                )}

                {/* Hashtags */}
                {post.hashtags.length > 0 && !isEditing && (
                  <p className="text-xs text-[var(--lf-indigo)]/70 mt-1">
                    {post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
                  </p>
                )}
              </div>

              {/* Media Previews */}
              {post.media_urls.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {post.media_urls.slice(0, 4).map((url, i) => (
                    <div
                      key={i}
                      className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-100 overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Media ${i + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                  {post.media_urls.length > 4 && (
                    <div className="w-20 h-20 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center">
                      <span className="text-sm font-medium text-[var(--lf-text)]/50">
                        +{post.media_urls.length - 4}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* AI Reasoning */}
              {post.ai_reasoning && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-[var(--lf-text)]/40 hover:text-[var(--lf-text)]/60">
                    🧠 AI reasoning
                  </summary>
                  <p className="mt-1 text-[var(--lf-text)]/50 pl-4 border-l-2 border-gray-200">
                    {post.ai_reasoning}
                  </p>
                </details>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1 border-t border-gray-100">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => {
                        // Future: save edited caption via server action
                        cancelEditing();
                      }}
                      className="lf-btn text-sm flex items-center gap-1"
                    >
                      💾 Save
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="lf-btn-ghost text-sm"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleApprove(post.id)}
                      disabled={isPending}
                      className="lf-btn-success text-sm flex items-center gap-1"
                    >
                      ✅ Approve
                    </button>
                    <button
                      onClick={() => startEditing(post)}
                      className="lf-btn-ghost text-sm flex items-center gap-1"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleRegenerate(post.id)}
                      disabled={isPending}
                      className="lf-btn-ghost text-sm flex items-center gap-1"
                    >
                      🔄 Regenerate
                    </button>
                    <button
                      onClick={() => handleSkip(post.id)}
                      disabled={isPending}
                      className="lf-btn-ghost text-sm flex items-center gap-1"
                    >
                      ⏭️ Skip
                    </button>
                  </>
                )}

                {/* Timestamp */}
                <span className="ml-auto text-[10px] text-[var(--lf-text)]/30">
                  {new Date(post.created_at).toLocaleDateString("en-CA", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
