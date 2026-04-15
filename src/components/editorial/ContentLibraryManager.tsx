"use client";

import { useState, useTransition, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { createLibraryTip } from "@/actions/editorial";
import type { ContentLibraryTip } from "@/actions/editorial";

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "buyers", label: "Buyers" },
  { value: "sellers", label: "Sellers" },
  { value: "owners", label: "Owners" },
  { value: "market", label: "Market" },
  { value: "mortgage", label: "Mortgage" },
];

const SEASONS = [
  { value: "", label: "All seasons" },
  { value: "spring", label: "Spring" },
  { value: "summer", label: "Summer" },
  { value: "fall", label: "Fall" },
  { value: "winter", label: "Winter" },
  { value: "all", label: "Year-round" },
];

const COUNTRIES = [
  { value: "", label: "All" },
  { value: "CA", label: "Canada" },
  { value: "US", label: "United States" },
  { value: "BOTH", label: "Both" },
];

// ── Category badge color ──────────────────────────────────────────────────────

function categoryVariant(
  cat: string
): "default" | "success" | "warning" | "info" | "secondary" {
  switch (cat) {
    case "buyers":
      return "info";
    case "sellers":
      return "warning";
    case "mortgage":
      return "success";
    case "market":
      return "secondary";
    default:
      return "default";
  }
}

function seasonLabel(season: string): string {
  switch (season) {
    case "spring":
      return "🌱 Spring";
    case "summer":
      return "☀️ Summer";
    case "fall":
      return "🍂 Fall";
    case "winter":
      return "❄️ Winter";
    case "all":
      return "📅 Year-round";
    default:
      return season;
  }
}

function countryLabel(country: string): string {
  if (country === "CA") return "🇨🇦";
  if (country === "US") return "🇺🇸";
  if (country === "BOTH") return "🌎";
  return country;
}

// ── Tip card ─────────────────────────────────────────────────────────────────

function TipCard({ tip }: { tip: ContentLibraryTip }) {
  const [expanded, setExpanded] = useState(false);
  const headline = tip.content.headline ?? "Untitled tip";
  const tipText = tip.content.tip_text ?? "";
  const category = tip.content.tip_category ?? "";
  const preview = tipText.length > 120 ? `${tipText.slice(0, 120)}…` : tipText;

  return (
    <div className="bg-card border border-border rounded-lg p-4 flex flex-col gap-3 hover:border-brand/30 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground leading-snug">{headline}</h3>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-muted-foreground" title="Uses">
            {tip.use_count > 0 ? `${tip.use_count}×` : ""}
          </span>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        {expanded ? tipText : preview}
        {tipText.length > 120 && (
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="ml-1 text-brand hover:underline"
          >
            {expanded ? "show less" : "more"}
          </button>
        )}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {category && (
          <Badge variant={categoryVariant(category)} className="capitalize">
            {category}
          </Badge>
        )}
        <span className="text-xs text-muted-foreground">{seasonLabel(tip.season)}</span>
        <span className="text-xs text-muted-foreground">{countryLabel(tip.country)}</span>
        {tip.realtor_id === null && (
          <span className="text-xs text-muted-foreground italic">Platform</span>
        )}
      </div>
    </div>
  );
}

// ── Add tip modal ─────────────────────────────────────────────────────────────

interface AddTipModalProps {
  onClose: () => void;
  onAdded: (tip: ContentLibraryTip) => void;
}

function AddTipModal({ onClose, onAdded }: AddTipModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    headline: "",
    tip_text: "",
    tip_category: "buyers",
    season: "all",
    country: "BOTH",
  });

  function setField<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.headline.trim() || !form.tip_text.trim()) {
      setError("Headline and tip text are required.");
      return;
    }

    startTransition(async () => {
      const result = await createLibraryTip(form);
      if (result.error) {
        setError(result.error);
        return;
      }

      const newTip: ContentLibraryTip = {
        id: result.data!.id,
        realtor_id: "mine",
        block_type: "quick_tip",
        content: {
          headline: form.headline.trim(),
          tip_text: form.tip_text.trim(),
          tip_category: form.tip_category,
        },
        context_tags: [],
        country: form.country,
        season: form.season,
        use_count: 0,
        created_at: new Date().toISOString(),
      };

      onAdded(newTip);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-card border border-border rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Add a custom tip</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-lg leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="modal-headline">
              Headline <span className="text-muted-foreground font-normal">(max 60 chars)</span>
            </label>
            <input
              id="modal-headline"
              type="text"
              maxLength={60}
              className="w-full h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
              placeholder="e.g. Always review strata minutes before waiving subjects"
              value={form.headline}
              onChange={(e) => setField("headline", e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right">{form.headline.length}/60</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium text-foreground" htmlFor="modal-tip">
              Tip text <span className="text-muted-foreground font-normal">(40–80 words)</span>
            </label>
            <textarea
              id="modal-tip"
              rows={4}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40 resize-none"
              placeholder="Write a specific, actionable tip..."
              value={form.tip_text}
              onChange={(e) => setField("tip_text", e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground" htmlFor="modal-cat">
                Category
              </label>
              <select
                id="modal-cat"
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                value={form.tip_category}
                onChange={(e) => setField("tip_category", e.target.value)}
              >
                {CATEGORIES.filter((c) => c.value).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground" htmlFor="modal-season">
                Season
              </label>
              <select
                id="modal-season"
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                value={form.season}
                onChange={(e) => setField("season", e.target.value)}
              >
                {SEASONS.filter((s) => s.value).map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground" htmlFor="modal-country">
                Country
              </label>
              <select
                id="modal-country"
                className="w-full h-9 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
                value={form.country}
                onChange={(e) => setField("country", e.target.value)}
              >
                {COUNTRIES.filter((c) => c.value).map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2 border border-destructive/20">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="brand" disabled={isPending}>
              {isPending ? "Saving…" : "Add tip"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Filter bar ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  category: string;
  season: string;
  country: string;
  onCategory: (v: string) => void;
  onSeason: (v: string) => void;
  onCountry: (v: string) => void;
}

function FilterBar({
  category,
  season,
  country,
  onCategory,
  onSeason,
  onCountry,
}: FilterBarProps) {
  const selectClass =
    "h-8 rounded-md border border-border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-xs text-muted-foreground">Filter:</span>
      <select
        className={selectClass}
        value={category}
        onChange={(e) => onCategory(e.target.value)}
        aria-label="Filter by category"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={season}
        onChange={(e) => onSeason(e.target.value)}
        aria-label="Filter by season"
      >
        {SEASONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <select
        className={selectClass}
        value={country}
        onChange={(e) => onCountry(e.target.value)}
        aria-label="Filter by country"
      >
        {COUNTRIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface ContentLibraryManagerProps {
  initialPlatformTips: ContentLibraryTip[];
  initialMyTips: ContentLibraryTip[];
}

export function ContentLibraryManager({
  initialPlatformTips,
  initialMyTips,
}: ContentLibraryManagerProps) {
  const [activeTab, setActiveTab] = useState<"platform" | "mine">("platform");
  const [showModal, setShowModal] = useState(false);
  const [myTips, setMyTips] = useState<ContentLibraryTip[]>(initialMyTips);

  const [filterCategory, setFilterCategory] = useState("");
  const [filterSeason, setFilterSeason] = useState("");
  const [filterCountry, setFilterCountry] = useState("");

  function applyFilters(tips: ContentLibraryTip[]) {
    return tips.filter((t) => {
      if (filterCategory && t.content.tip_category !== filterCategory) return false;
      if (filterSeason && filterSeason !== "all") {
        if (t.season !== filterSeason && t.season !== "all") return false;
      }
      if (filterCountry && filterCountry !== "BOTH") {
        if (t.country !== filterCountry && t.country !== "BOTH") return false;
      }
      return true;
    });
  }

  const visiblePlatform = useMemo(
    () => applyFilters(initialPlatformTips),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [initialPlatformTips, filterCategory, filterSeason, filterCountry]
  );

  const visibleMine = useMemo(
    () => applyFilters(myTips),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [myTips, filterCategory, filterSeason, filterCountry]
  );

  const currentTips = activeTab === "platform" ? visiblePlatform : visibleMine;

  function handleTipAdded(tip: ContentLibraryTip) {
    setMyTips((prev) => [tip, ...prev]);
    setActiveTab("mine");
  }

  return (
    <>
      {showModal && (
        <AddTipModal onClose={() => setShowModal(false)} onAdded={handleTipAdded} />
      )}

      {/* Header actions */}
      <div className="flex items-center justify-between mb-4">
        {/* Tab switcher */}
        <div className="flex gap-0 border border-border rounded-lg overflow-hidden">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "platform"}
            onClick={() => setActiveTab("platform")}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "platform"
                ? "bg-brand text-white"
                : "bg-card text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            Platform Tips{" "}
            <span className="ml-1 text-xs opacity-70">({initialPlatformTips.length})</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "mine"}
            onClick={() => setActiveTab("mine")}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors",
              activeTab === "mine"
                ? "bg-brand text-white"
                : "bg-card text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            My Tips{" "}
            <span className="ml-1 text-xs opacity-70">({myTips.length})</span>
          </button>
        </div>

        <Button variant="brand" size="sm" onClick={() => setShowModal(true)}>
          + Add Tip
        </Button>
      </div>

      {/* Filter bar */}
      <div className="mb-4">
        <FilterBar
          category={filterCategory}
          season={filterSeason}
          country={filterCountry}
          onCategory={setFilterCategory}
          onSeason={setFilterSeason}
          onCountry={setFilterCountry}
        />
      </div>

      {/* Platform tips are read-only notice */}
      {activeTab === "platform" && (
        <div className="mb-4 p-3 rounded-md bg-muted/50 border border-border text-xs text-muted-foreground">
          💡 Platform tips are curated by Realtors360 and available to all agents. They are
          read-only. Add your own tips under &ldquo;My Tips&rdquo;.
        </div>
      )}

      {/* Empty state */}
      {currentTips.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 flex flex-col items-center justify-center text-center gap-3">
          <span className="text-4xl">💡</span>
          <div>
            <p className="text-sm font-medium text-foreground">
              {activeTab === "mine" ? "No custom tips yet" : "No tips match your filters"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeTab === "mine"
                ? "Add your own quick tips to reuse across editions."
                : "Try adjusting the filters above."}
            </p>
          </div>
          {activeTab === "mine" && (
            <Button variant="brand" size="sm" onClick={() => setShowModal(true)}>
              + Add your first tip
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {currentTips.map((tip) => (
            <TipCard key={tip.id} tip={tip} />
          ))}
        </div>
      )}
    </>
  );
}
