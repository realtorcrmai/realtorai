"use client";

import { useState, useEffect } from "react";
import { updateSite } from "@/actions/site";
import { Palette, Check, Loader2 } from "lucide-react";

const COLOR_PRESETS = [
  { name: "Teal", primary: "#0f7694", accent: "#ff5c3a" },
  { name: "Navy", primary: "#1e3a5f", accent: "#e8952e" },
  { name: "Forest", primary: "#2d5a3d", accent: "#c4883a" },
  { name: "Plum", primary: "#6c2bd9", accent: "#ff3d71" },
  { name: "Charcoal", primary: "#333333", accent: "#0066ff" },
  { name: "Burgundy", primary: "#7a2033", accent: "#d4af37" },
];

const TEMPLATES = [
  { id: "modern", name: "Modern" },
  { id: "classic", name: "Classic" },
  { id: "luxury", name: "Luxury" },
  { id: "minimal", name: "Minimal" },
  { id: "bold", name: "Bold" },
];

export default function DesignPage() {
  const [site, setSite] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/site").then((r) => r.json()).then((d) => setSite(d.site));
  }, []);

  const save = async (updates: Record<string, unknown>) => {
    if (!site) return;
    setSaving(true);
    await updateSite(site.id as string, updates);
    setSite((prev) => (prev ? { ...prev, ...updates } : prev));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  if (!site) {
    return <div className="p-8 text-center text-gray-400">Loading...</div>;
  }

  const colors = (site.colors as Record<string, string>) || {};

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Design</h1>
          <p className="text-gray-500 text-sm mt-1">Customize your website appearance</p>
        </div>
        {saved && (
          <span className="badge badge-success">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
        {saving && (
          <Loader2 className="h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* Template Selection */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Template</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => save({ template: t.id })}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  site.template === t.id
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <p className="text-sm font-medium">{t.name}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Color Presets */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold text-gray-900">Colors</h2>
        </div>
        <div className="card-body space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => save({ colors: { ...colors, primary: preset.primary, accent: preset.accent } })}
                className={`p-3 rounded-xl border-2 text-center transition-all ${
                  colors.primary === preset.primary
                    ? "border-teal-500"
                    : "border-gray-100 hover:border-gray-200"
                }`}
              >
                <div className="flex gap-1 justify-center mb-2">
                  <div className="h-6 w-6 rounded-full" style={{ background: preset.primary }} />
                  <div className="h-6 w-6 rounded-full" style={{ background: preset.accent }} />
                </div>
                <p className="text-xs font-medium text-gray-600">{preset.name}</p>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div>
              <label className="label">Primary Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colors.primary || "#0f7694"}
                  onChange={(e) => save({ colors: { ...colors, primary: e.target.value } })}
                  className="h-10 w-14 rounded cursor-pointer"
                />
                <input className="input flex-1" value={colors.primary || "#0f7694"} readOnly />
              </div>
            </div>
            <div>
              <label className="label">Accent Color</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={colors.accent || "#ff5c3a"}
                  onChange={(e) => save({ colors: { ...colors, accent: e.target.value } })}
                  className="h-10 w-14 rounded cursor-pointer"
                />
                <input className="input flex-1" value={colors.accent || "#ff5c3a"} readOnly />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
