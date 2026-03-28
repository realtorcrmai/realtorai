"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedbackControlsProps {
  slug: string;
  section?: string;   // optional: which section of the article
}

const TAGS = [
  { id: "incorrect", label: "Incorrect information" },
  { id: "incomplete", label: "Incomplete — missing steps" },
  { id: "confusing", label: "Confusing / hard to follow" },
  { id: "outdated", label: "Outdated — feature has changed" },
  { id: "wrong_topic", label: "Didn't answer my question" },
] as const;

export function FeedbackControls({ slug, section }: FeedbackControlsProps) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function submitFeedback(r: "up" | "down") {
    setRating(r);
    if (r === "up") {
      // Positive feedback — submit immediately
      await saveFeedback(r, [], "");
      setSubmitted(true);
    }
    // Negative feedback — show tag selector (don't submit yet)
  }

  async function submitNegative() {
    await saveFeedback("down", selectedTags, comment);
    setSubmitted(true);
  }

  async function saveFeedback(r: string, tags: string[], cmt: string) {
    // TODO: POST to /api/help/feedback when help_events table exists
    // For now, log to console
    console.log("[Help Feedback]", { slug, section, rating: r, tags, comment: cmt, timestamp: new Date().toISOString() });
  }

  if (submitted) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground">
          {rating === "up" ? "Thanks for the feedback!" : "Thanks — we'll improve this article."}
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4 mt-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Was this helpful?</span>
        <button
          onClick={() => submitFeedback("up")}
          aria-label="Yes, this was helpful"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
            rating === "up" ? "bg-green-100 text-green-700" : "hover:bg-accent text-muted-foreground"
          )}
        >
          <ThumbsUp className="h-3.5 w-3.5" /> Yes
        </button>
        <button
          onClick={() => submitFeedback("down")}
          aria-label="No, this was not helpful"
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors",
            rating === "down" ? "bg-red-100 text-red-700" : "hover:bg-accent text-muted-foreground"
          )}
        >
          <ThumbsDown className="h-3.5 w-3.5" /> No
        </button>
      </div>

      {/* Expanded feedback for negative rating */}
      {rating === "down" && (
        <div className="mt-4 space-y-3 animate-in fade-in-0 duration-200">
          <p className="text-xs text-muted-foreground font-medium">What was wrong?</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag.id}
                onClick={() =>
                  setSelectedTags((prev) =>
                    prev.includes(tag.id) ? prev.filter((t) => t !== tag.id) : [...prev, tag.id]
                  )
                }
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs transition-colors border",
                  selectedTags.includes(tag.id)
                    ? "bg-primary/10 border-primary/30 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/20"
                )}
              >
                {tag.label}
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional: tell us more..."
            className="lf-textarea text-sm w-full h-20"
          />
          <button onClick={submitNegative} className="lf-btn text-sm">
            Submit Feedback
          </button>
        </div>
      )}
    </div>
  );
}
