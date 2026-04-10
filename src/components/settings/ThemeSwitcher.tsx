"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Monitor, Check, PanelLeft, PanelTop } from "lucide-react";
import { useLayout } from "@/components/layout/LayoutProvider";
import { cn } from "@/lib/utils";

// ── Theme Presets ────────────────────────────────────────────
// Each preset defines the CSS custom property overrides.
// Only the values that differ from the default (teal) need to be listed.

const THEME_PRESETS = [
  {
    id: "teal",
    name: "Professional Teal",
    desc: "Real estate industry standard",
    preview: { primary: "#0F7694", accent: "#67D4E8", bg: "#f4f2ff" },
    vars: {}, // default — no overrides needed
  },
  {
    id: "indigo",
    name: "Modern Indigo",
    desc: "Bold and contemporary",
    preview: { primary: "#4f46e5", accent: "#818cf8", bg: "#f5f3ff" },
    vars: {
      "--primary": "oklch(0.45 0.18 265)",
      "--brand": "oklch(0.45 0.18 265)",
      "--brand-dark": "oklch(0.38 0.16 265)",
      "--brand-light": "oklch(0.65 0.15 265)",
      "--ring": "oklch(0.45 0.18 265)",
      "--background": "#f5f3ff",
      "--secondary": "#ede9fe",
      "--muted": "#ede9fe",
      "--accent": "#e0e7ff",
      "--border": "#ddd6fe",
      "--input": "#ddd6fe",
    },
  },
  {
    id: "navy",
    name: "Executive Navy",
    desc: "Classic and authoritative",
    preview: { primary: "#1e3a5f", accent: "#5b8cb5", bg: "#f0f4f8" },
    vars: {
      "--primary": "oklch(0.35 0.08 245)",
      "--brand": "oklch(0.35 0.08 245)",
      "--brand-dark": "oklch(0.28 0.07 245)",
      "--brand-light": "oklch(0.58 0.08 240)",
      "--ring": "oklch(0.35 0.08 245)",
      "--background": "#f0f4f8",
      "--secondary": "#e2e8f0",
      "--muted": "#e2e8f0",
      "--accent": "#dbeafe",
      "--border": "#cbd5e1",
      "--input": "#cbd5e1",
    },
  },
  {
    id: "emerald",
    name: "Fresh Emerald",
    desc: "Vibrant and energetic",
    preview: { primary: "#059669", accent: "#6ee7b7", bg: "#f0fdf4" },
    vars: {
      "--primary": "oklch(0.52 0.15 160)",
      "--brand": "oklch(0.52 0.15 160)",
      "--brand-dark": "oklch(0.44 0.13 160)",
      "--brand-light": "oklch(0.72 0.12 160)",
      "--ring": "oklch(0.52 0.15 160)",
      "--background": "#f0fdf4",
      "--secondary": "#dcfce7",
      "--muted": "#dcfce7",
      "--accent": "#d1fae5",
      "--border": "#bbf7d0",
      "--input": "#bbf7d0",
    },
  },
  {
    id: "rose",
    name: "Warm Rose",
    desc: "Elegant and inviting",
    preview: { primary: "#be185d", accent: "#f9a8d4", bg: "#fff1f2" },
    vars: {
      "--primary": "oklch(0.48 0.18 350)",
      "--brand": "oklch(0.48 0.18 350)",
      "--brand-dark": "oklch(0.40 0.16 350)",
      "--brand-light": "oklch(0.70 0.14 350)",
      "--ring": "oklch(0.48 0.18 350)",
      "--background": "#fff1f2",
      "--secondary": "#ffe4e6",
      "--muted": "#ffe4e6",
      "--accent": "#fecdd3",
      "--border": "#fda4af",
      "--input": "#fda4af",
    },
  },
  {
    id: "amber",
    name: "Luxury Gold",
    desc: "Premium and warm",
    preview: { primary: "#b45309", accent: "#fbbf24", bg: "#fffbeb" },
    vars: {
      "--primary": "oklch(0.55 0.14 65)",
      "--brand": "oklch(0.55 0.14 65)",
      "--brand-dark": "oklch(0.47 0.12 65)",
      "--brand-light": "oklch(0.78 0.12 75)",
      "--ring": "oklch(0.55 0.14 65)",
      "--background": "#fffbeb",
      "--secondary": "#fef3c7",
      "--muted": "#fef3c7",
      "--accent": "#fde68a",
      "--border": "#fcd34d",
      "--input": "#fcd34d",
    },
  },
];

type ColorMode = "light" | "dark" | "system";

const STORAGE_KEY_THEME = "lf-theme-preset";
const STORAGE_KEY_MODE = "lf-color-mode";

export function ThemeSwitcher() {
  const { layout, setLayout } = useLayout();
  const [activeTheme, setActiveTheme] = useState("teal");
  const [colorMode, setColorMode] = useState<ColorMode>("light");

  // Functions declared BEFORE the useEffect that calls them.
  // React Compiler treats function declarations inside component
  // bodies as const-like (no hoisting), so referencing them before
  // their lexical position is an error.
  function applyTheme(themeId: string) {
    const preset = THEME_PRESETS.find(t => t.id === themeId);
    if (!preset) return;

    const root = document.documentElement;

    // Reset to default by removing overrides
    for (const key of Object.keys(THEME_PRESETS[0].vars)) {
      root.style.removeProperty(key);
    }
    // Also clear vars from other presets
    for (const p of THEME_PRESETS) {
      for (const key of Object.keys(p.vars)) {
        root.style.removeProperty(key);
      }
    }

    // Apply new preset
    for (const [key, value] of Object.entries(preset.vars)) {
      root.style.setProperty(key, value);
    }

    localStorage.setItem(STORAGE_KEY_THEME, themeId);
    setActiveTheme(themeId);
  }

  function applyColorMode(mode: ColorMode) {
    const root = document.documentElement;

    if (mode === "dark") {
      root.classList.add("dark");
    } else if (mode === "light") {
      root.classList.remove("dark");
    } else {
      // System preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) root.classList.add("dark");
      else root.classList.remove("dark");
    }

    localStorage.setItem(STORAGE_KEY_MODE, mode);
    setColorMode(mode);
  }

  // Load saved preferences on mount — AFTER function declarations.
  useEffect(() => {
    const savedTheme = localStorage.getItem(STORAGE_KEY_THEME) || "teal";
    const savedMode = (localStorage.getItem(STORAGE_KEY_MODE) || "light") as ColorMode;
    setActiveTheme(savedTheme);
    setColorMode(savedMode);
    applyTheme(savedTheme);
    applyColorMode(savedMode);
  }, []);

  return (
    <div className="space-y-6">
      {/* Layout Mode */}
      <div>
        <h4 className="text-sm font-medium mb-2">Layout</h4>
        <div className="flex gap-2">
          <button
            onClick={() => setLayout("top-nav")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium flex-1",
              layout === "top-nav"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/30"
            )}
          >
            <PanelTop className="h-4 w-4" />
            Top Nav
          </button>
          <button
            onClick={() => setLayout("sidebar")}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium flex-1",
              layout === "sidebar"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/30"
            )}
          >
            <PanelLeft className="h-4 w-4" />
            Sidebar
          </button>
        </div>
      </div>

      {/* Color Mode */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Appearance</h4>
        <div className="flex gap-2">
          {[
            { mode: "light" as const, icon: Sun, label: "Light" },
            { mode: "dark" as const, icon: Moon, label: "Dark" },
            { mode: "system" as const, icon: Monitor, label: "System" },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => applyColorMode(mode)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all text-sm font-medium ${
                colorMode === mode
                  ? "border-brand bg-brand-muted text-brand"
                  : "border-border bg-background text-muted-foreground hover:border-brand/30"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Theme Presets */}
      <div>
        <h4 className="text-sm font-semibold mb-3">Color Theme</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {THEME_PRESETS.map(preset => (
            <Card
              key={preset.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                activeTheme === preset.id ? "ring-2 ring-brand shadow-md" : "hover:ring-1 hover:ring-border"
              }`}
              onClick={() => applyTheme(preset.id)}
            >
              <CardContent className="p-4">
                {/* Color preview */}
                <div className="flex gap-1.5 mb-3">
                  <div
                    className="w-8 h-8 rounded-lg shadow-sm border"
                    style={{ backgroundColor: preset.preview.primary }}
                  />
                  <div
                    className="w-8 h-8 rounded-lg shadow-sm border"
                    style={{ backgroundColor: preset.preview.accent }}
                  />
                  <div
                    className="w-8 h-8 rounded-lg shadow-sm border"
                    style={{ backgroundColor: preset.preview.bg }}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{preset.name}</p>
                    <p className="text-[10px] text-muted-foreground">{preset.desc}</p>
                  </div>
                  {activeTheme === preset.id && (
                    <Badge className="bg-brand text-brand-foreground text-[9px]">
                      <Check className="h-3 w-3" />
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
