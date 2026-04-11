"use client";

import { useEffect } from "react";

/**
 * ThemeProvider — applies the saved theme on every page load.
 * Reads from localStorage (same keys as ThemeSwitcher).
 * Placed in the dashboard layout so it runs on every route.
 */

const THEME_VARS: Record<string, Record<string, string>> = {
  indigo: { "--primary": "oklch(0.45 0.18 265)", "--brand": "oklch(0.45 0.18 265)", "--brand-dark": "oklch(0.38 0.16 265)", "--brand-light": "oklch(0.65 0.15 265)", "--ring": "oklch(0.45 0.18 265)", "--background": "#f5f3ff", "--secondary": "#ede9fe", "--muted": "#ede9fe", "--accent": "#e0e7ff", "--border": "#ddd6fe", "--input": "#ddd6fe" },
  navy: { "--primary": "oklch(0.35 0.08 245)", "--brand": "oklch(0.35 0.08 245)", "--brand-dark": "oklch(0.28 0.07 245)", "--brand-light": "oklch(0.58 0.08 240)", "--ring": "oklch(0.35 0.08 245)", "--background": "#f0f4f8", "--secondary": "#e2e8f0", "--muted": "#e2e8f0", "--accent": "#dbeafe", "--border": "#cbd5e1", "--input": "#cbd5e1" },
  emerald: { "--primary": "oklch(0.52 0.15 160)", "--brand": "oklch(0.52 0.15 160)", "--brand-dark": "oklch(0.44 0.13 160)", "--brand-light": "oklch(0.72 0.12 160)", "--ring": "oklch(0.52 0.15 160)", "--background": "#f0fdf4", "--secondary": "#dcfce7", "--muted": "#dcfce7", "--accent": "#d1fae5", "--border": "#bbf7d0", "--input": "#bbf7d0" },
  rose: { "--primary": "oklch(0.48 0.18 350)", "--brand": "oklch(0.48 0.18 350)", "--brand-dark": "oklch(0.40 0.16 350)", "--brand-light": "oklch(0.70 0.14 350)", "--ring": "oklch(0.48 0.18 350)", "--background": "#fff1f2", "--secondary": "#ffe4e6", "--muted": "#ffe4e6", "--accent": "#fecdd3", "--border": "#fda4af", "--input": "#fda4af" },
  amber: { "--primary": "oklch(0.55 0.14 65)", "--brand": "oklch(0.55 0.14 65)", "--brand-dark": "oklch(0.47 0.12 65)", "--brand-light": "oklch(0.78 0.12 75)", "--ring": "oklch(0.55 0.14 65)", "--background": "#fffbeb", "--secondary": "#fef3c7", "--muted": "#fef3c7", "--accent": "#fde68a", "--border": "#fcd34d", "--input": "#fcd34d" },
};

export function ThemeProvider() {
  useEffect(() => {
    const themeId = localStorage.getItem("lf-theme-preset") || "teal";
    const mode = localStorage.getItem("lf-color-mode") || "light";

    // Apply theme preset
    if (themeId !== "teal" && THEME_VARS[themeId]) {
      const root = document.documentElement;
      for (const [key, value] of Object.entries(THEME_VARS[themeId])) {
        root.style.setProperty(key, value);
      }
    }

    // Apply color mode
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (mode === "system") {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      }
    }
  }, []);

  return null;
}
