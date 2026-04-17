"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ─── Types ───────────────────────────────────────────────────────────────────
type EditionType =
  | "market_update"
  | "just_sold"
  | "open_house"
  | "neighbourhood_spotlight"
  | "rate_watch"
  | "seasonal";

interface EditionTypeMeta {
  value: EditionType;
  emoji: string;
  label: string;
  description: string;
  titlePlaceholder: string;
}

// ─── Edition type options ─────────────────────────────────────────────────────
const EDITION_TYPES: EditionTypeMeta[] = [
  {
    value: "market_update",
    emoji: "📊",
    label: "Market Update",
    description: "Monthly market stats and commentary",
    titlePlaceholder: "April 2026 Market Update — Vancouver West",
  },
  {
    value: "just_sold",
    emoji: "🏷️",
    label: "Just Sold",
    description: "Celebrate a recent sale in your market",
    titlePlaceholder: "Just Sold: 1234 Oak Street",
  },
  {
    value: "open_house",
    emoji: "🏠",
    label: "Open House",
    description: "Invite contacts to an upcoming open house",
    titlePlaceholder: "Open House This Saturday — 4567 Maple Ave",
  },
  {
    value: "neighbourhood_spotlight",
    emoji: "📍",
    label: "Neighbourhood Spotlight",
    description: "Feature a specific neighbourhood",
    titlePlaceholder: "Spotlight: Kitsilano Living",
  },
  {
    value: "rate_watch",
    emoji: "📉",
    label: "Rate Watch",
    description: "Current mortgage rate insights",
    titlePlaceholder: "Rate Watch — Spring 2026",
  },
  {
    value: "seasonal",
    emoji: "🌸",
    label: "Seasonal",
    description: "Seasonal tips and market outlook",
    titlePlaceholder: "Spring Buying Guide 2026",
  },
];

// ─── Form component ───────────────────────────────────────────────────────────
export function NewEditionForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedType, setSelectedType] = useState<EditionType | null>(null);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const activeMeta = EDITION_TYPES.find((t) => t.value === selectedType);
  const placeholder = activeMeta?.titlePlaceholder ?? "Edition title…";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedType) {
      setError("Please select an edition type.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a title for this edition.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/editorial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            edition_type: selectedType,
            title: title.trim(),
          }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? "Failed to create edition. Please try again.");
          return;
        }

        const { id } = await res.json();
        router.push(`/newsletters/editorial/${id}/edit`);
      } catch {
        setError("Network error. Please try again.");
      }
    });
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* ── Heading ── */}
        <div>
          <h2 className="text-base font-semibold text-foreground">
            What kind of edition?
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Choose a type — AI will draft the content, you approve it.
          </p>
        </div>

        {/* ── Type grid ── */}
        <div
          className="grid grid-cols-2 gap-3"
          role="radiogroup"
          aria-label="Edition type"
        >
          {EDITION_TYPES.map((type) => {
            const isSelected = selectedType === type.value;
            return (
              <button
                key={type.value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => {
                  setSelectedType(type.value);
                  setError(null);
                }}
                className={cn(
                  "text-left rounded-lg border p-3 transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  isSelected
                    ? "border-brand bg-brand/10 shadow-sm"
                    : "border-border bg-background hover:border-brand/30 hover:bg-muted/50"
                )}
              >
                <span className="text-xl leading-none">{type.emoji}</span>
                <p
                  className={cn(
                    "text-sm font-medium mt-1.5",
                    isSelected ? "text-brand" : "text-foreground"
                  )}
                >
                  {type.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                  {type.description}
                </p>
              </button>
            );
          })}
        </div>

        {/* ── Title input ── */}
        <div className="space-y-1.5">
          <label
            htmlFor="edition-title"
            className="text-sm font-medium text-foreground"
          >
            Edition title
          </label>
          <input
            id="edition-title"
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (error) setError(null);
            }}
            placeholder={placeholder}
            maxLength={200}
            className={cn(
              "w-full rounded-lg border bg-background px-3 py-2 text-sm",
              "text-foreground placeholder:text-muted-foreground",
              "focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand/60",
              "transition-colors",
              error && !selectedType
                ? "border-destructive"
                : "border-border"
            )}
            aria-describedby={error ? "form-error" : undefined}
          />
        </div>

        {/* ── Inline error ── */}
        {error && (
          <p id="form-error" className="text-xs text-destructive" role="alert">
            {error}
          </p>
        )}

        {/* ── Submit ── */}
        <Button
          type="submit"
          variant="brand"
          className="w-full"
          disabled={isPending}
          aria-busy={isPending}
        >
          {isPending ? "Creating…" : "Create & Generate Content"}
        </Button>
      </form>
    </div>
  );
}
