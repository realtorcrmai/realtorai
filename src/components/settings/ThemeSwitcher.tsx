"use client";

import { useState, useEffect } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type ColorMode = "light" | "dark" | "system";

const STORAGE_KEY_MODE = "lf-color-mode";

export function ThemeSwitcher() {
  const [colorMode, setColorMode] = useState<ColorMode>("light");

  function applyColorMode(mode: ColorMode) {
    const root = document.documentElement;

    if (mode === "dark") {
      root.classList.add("dark");
    } else if (mode === "light") {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) root.classList.add("dark");
      else root.classList.remove("dark");
    }

    localStorage.setItem(STORAGE_KEY_MODE, mode);
    setColorMode(mode);
  }

  useEffect(() => {
    const savedMode = (localStorage.getItem(STORAGE_KEY_MODE) || "light") as ColorMode;
    setColorMode(savedMode);
    applyColorMode(savedMode);

    // Clean up any old theme overrides from previous presets
    localStorage.removeItem("lf-theme-preset");
    const keysToClean = ["--primary", "--brand", "--brand-dark", "--brand-light", "--ring", "--background", "--secondary", "--muted", "--accent", "--border", "--input"];
    const root = document.documentElement;
    for (const key of keysToClean) {
      root.style.removeProperty(key);
    }
  }, []);

  return (
    <div className="space-y-6">
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
    </div>
  );
}
