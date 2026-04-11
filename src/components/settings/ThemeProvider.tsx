"use client";

import { useEffect } from "react";

/**
 * ThemeProvider — applies the saved color mode (light/dark/system) on page load.
 * Placed in the dashboard layout so it runs on every route.
 */

export function ThemeProvider() {
  useEffect(() => {
    const mode = localStorage.getItem("lf-color-mode") || "light";

    // Apply color mode
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (mode === "system") {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      }
    }

    // Clean up any old theme preset overrides
    const oldTheme = localStorage.getItem("lf-theme-preset");
    if (oldTheme && oldTheme !== "teal") {
      const keysToClean = ["--primary", "--brand", "--brand-dark", "--brand-light", "--ring", "--background", "--secondary", "--muted", "--accent", "--border", "--input"];
      const root = document.documentElement;
      for (const key of keysToClean) {
        root.style.removeProperty(key);
      }
      localStorage.removeItem("lf-theme-preset");
    }
  }, []);

  return null;
}
