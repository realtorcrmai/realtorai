"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

const TONE_OPTIONS = [
  "Warm & Professional",
  "Casual & Friendly",
  "Luxury & Refined",
  "Direct & Data-Driven",
  "Custom",
] as const;

const DEFAULT_EMAIL_TYPES = [
  { type: "listing_alert", effectiveness: 0.85 },
  { type: "market_update", effectiveness: 0.7 },
  { type: "neighbourhood_guide", effectiveness: 0.6 },
  { type: "birthday", effectiveness: 0.5 },
  { type: "just_sold", effectiveness: 0.45 },
  { type: "open_house", effectiveness: 0.4 },
];

const EMAIL_TYPE_LABELS: Record<string, string> = {
  listing_alert: "Listing Alert",
  market_update: "Market Update",
  neighbourhood_guide: "Neighbourhood Guide",
  birthday: "Birthday",
  just_sold: "Just Sold",
  open_house: "Open House",
};

export type VoiceProfileData = {
  brand_name: string;
  tone: string;
  writing_style_rules: string[];
  content_rankings: Array<{ type: string; effectiveness: number }>;
};

type Props = {
  initialData: VoiceProfileData;
  onChange: (data: VoiceProfileData) => void;
};

export function VoiceProfileEditor({ initialData, onChange }: Props) {
  const [brandName, setBrandName] = useState(initialData.brand_name);
  const [tone, setTone] = useState(initialData.tone);
  const [customTone, setCustomTone] = useState(
    TONE_OPTIONS.includes(initialData.tone as (typeof TONE_OPTIONS)[number])
      ? ""
      : initialData.tone
  );
  const [rules, setRules] = useState<string[]>(initialData.writing_style_rules);
  const [newRule, setNewRule] = useState("");
  const [rankings, setRankings] = useState<
    Array<{ type: string; effectiveness: number }>
  >(initialData.content_rankings);

  // Determine if the current tone is a preset or custom
  const isPresetTone = TONE_OPTIONS.includes(
    tone as (typeof TONE_OPTIONS)[number]
  );
  const isCustomSelected = tone === "Custom" || (!isPresetTone && tone !== "");
  const selectedPreset = isCustomSelected ? "Custom" : tone;

  function emitChange(patch: Partial<VoiceProfileData>) {
    const effectiveTone =
      (patch.tone ?? tone) === "Custom"
        ? patch.tone === "Custom"
          ? customTone
          : customTone
        : patch.tone ?? tone;
    const merged: VoiceProfileData = {
      brand_name: patch.brand_name ?? brandName,
      tone: effectiveTone,
      writing_style_rules: patch.writing_style_rules ?? rules,
      content_rankings: patch.content_rankings ?? rankings,
    };
    // If tone is "Custom", use the custom text
    if (
      (patch.tone ?? selectedPreset) === "Custom" &&
      "tone" in patch === false
    ) {
      merged.tone = customTone;
    }
    onChange(merged);
  }

  function handleToneChange(value: string) {
    setTone(value);
    if (value !== "Custom") {
      setCustomTone("");
      emitChange({ tone: value });
    } else {
      emitChange({ tone: customTone || "Custom" });
    }
  }

  function handleCustomToneChange(value: string) {
    setCustomTone(value);
    emitChange({ tone: value });
  }

  function handleBrandNameChange(value: string) {
    setBrandName(value);
    emitChange({ brand_name: value });
  }

  function addRule() {
    const trimmed = newRule.trim();
    if (!trimmed) return;
    const updated = [...rules, trimmed];
    setRules(updated);
    setNewRule("");
    emitChange({ writing_style_rules: updated });
  }

  function removeRule(index: number) {
    const updated = rules.filter((_, i) => i !== index);
    setRules(updated);
    emitChange({ writing_style_rules: updated });
  }

  function moveRanking(index: number, direction: "up" | "down") {
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= rankings.length) return;
    const updated = [...rankings];
    [updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];
    setRankings(updated);
    emitChange({ content_rankings: updated });
  }

  // Build the preview text the same way buildVoiceProfileBlock() does
  function buildPreview(): string {
    const parts: string[] = [];
    const effectiveTone = selectedPreset === "Custom" ? customTone : tone;

    if (brandName) {
      parts.push(`Brand: ${brandName}`);
    }
    if (effectiveTone && effectiveTone !== "Custom") {
      parts.push(`Tone: ${effectiveTone}`);
    }
    if (rules.length > 0) {
      parts.push(
        `Writing style rules:\n${rules.map((r) => `- ${r}`).join("\n")}`
      );
    }
    if (rankings.length > 0) {
      const top3 = rankings.slice(0, 3);
      const formatted = top3
        .map(
          (r) =>
            `${r.type ?? "unknown"} (${Math.round((r.effectiveness ?? 0) * 100)}% effectiveness)`
        )
        .join(", ");
      parts.push(`This realtor's audience responds best to: ${formatted}`);
    }

    if (parts.length === 0) return "(No voice profile configured yet)";
    return `REALTOR VOICE PROFILE (adapt your writing to match):\n${parts.join("\n")}`;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold">AI Voice Profile</h4>
        <p className="text-xs text-muted-foreground">
          Customize how AI writes emails in your voice
        </p>
      </div>

      {/* Brand Name */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <label
              htmlFor="voice-brand-name"
              className="text-sm font-medium block mb-1"
            >
              Brand Name
            </label>
            <input
              id="voice-brand-name"
              type="text"
              value={brandName}
              onChange={(e) => handleBrandNameChange(e.target.value)}
              placeholder="e.g., Aman Dhindsa Real Estate"
              className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
              aria-label="Brand name"
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              How your brand appears in AI-generated emails
            </p>
          </div>

          {/* Tone */}
          <div className="pt-4 border-t border-border">
            <label
              htmlFor="voice-tone"
              className="text-sm font-medium block mb-2"
            >
              Tone
            </label>
            <div className="flex flex-wrap gap-2">
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleToneChange(option)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                    selectedPreset === option
                      ? "bg-primary text-white border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            {isCustomSelected && (
              <input
                id="voice-tone"
                type="text"
                value={customTone}
                onChange={(e) => handleCustomToneChange(e.target.value)}
                placeholder="Describe your preferred tone..."
                className="w-full text-sm border border-border rounded-lg px-3 py-2 mt-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
                aria-label="Custom tone description"
              />
            )}
          </div>

          {/* Writing Style Rules */}
          <div className="pt-4 border-t border-border">
            <label className="text-sm font-medium block mb-2">
              Writing Style Rules
            </label>
            {rules.length > 0 ? (
              <div className="space-y-1.5 mb-3">
                {rules.map((rule, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 px-3 py-2 bg-muted/50 rounded-lg group"
                  >
                    <span className="text-xs text-foreground">{rule}</span>
                    <button
                      type="button"
                      onClick={() => removeRule(i)}
                      className="text-muted-foreground hover:text-destructive text-xs opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      aria-label={`Remove rule: ${rule}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mb-3">
                No rules yet. Add rules like &quot;Always use Canadian
                spelling&quot; or &quot;Never use exclamation marks&quot;.
              </p>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={newRule}
                onChange={(e) => setNewRule(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addRule();
                  }
                }}
                placeholder="e.g., Reference neighbourhood by name"
                className="flex-1 text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30"
                aria-label="New writing style rule"
              />
              <button
                type="button"
                onClick={addRule}
                disabled={!newRule.trim()}
                className="text-xs px-3 py-2 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Rule
              </button>
            </div>
          </div>

          {/* Content Preferences */}
          <div className="pt-4 border-t border-border">
            <label className="text-sm font-medium block mb-1">
              Content Preferences
            </label>
            <p className="text-[11px] text-muted-foreground mb-3">
              Rank email types by priority. Top types get sent more often.
            </p>
            <div className="space-y-1">
              {rankings.map((item, i) => (
                <div
                  key={item.type}
                  className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-center">
                      {i + 1}
                    </span>
                    <span className="text-xs font-medium text-foreground">
                      {EMAIL_TYPE_LABELS[item.type] || item.type}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(item.effectiveness * 100)}% effectiveness
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveRanking(i, "up")}
                      disabled={i === 0}
                      className="w-6 h-6 rounded text-xs font-medium border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Move ${EMAIL_TYPE_LABELS[item.type] || item.type} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRanking(i, "down")}
                      disabled={i === rankings.length - 1}
                      className="w-6 h-6 rounded text-xs font-medium border border-border hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Move ${EMAIL_TYPE_LABELS[item.type] || item.type} down`}
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">👁</span>
            <h4 className="text-sm font-semibold">AI Preview</h4>
          </div>
          <p className="text-[11px] text-muted-foreground mb-2">
            This is exactly what the AI sees when writing your emails:
          </p>
          <pre className="text-xs bg-muted/50 border border-border rounded-lg p-4 whitespace-pre-wrap font-mono text-foreground leading-relaxed">
            {buildPreview()}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
