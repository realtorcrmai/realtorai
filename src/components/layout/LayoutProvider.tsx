"use client";

import { createContext, useContext, useState } from "react";

type LayoutMode = "top-nav" | "sidebar";

const LayoutContext = createContext<{
  layout: LayoutMode;
  setLayout: (mode: LayoutMode) => void;
}>({ layout: "top-nav", setLayout: () => {} });

export function useLayout() {
  return useContext(LayoutContext);
}

/**
 * Read the layout preference set by the inline script in root layout.
 * The script sets `document.documentElement.dataset.layout = "sidebar"` before
 * React hydrates, so this reads it synchronously — no flash.
 */
function getInitialLayout(): LayoutMode {
  if (typeof window === "undefined") return "top-nav";
  return document.documentElement.dataset.layout === "sidebar" ? "sidebar" : "top-nav";
}

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayoutState] = useState<LayoutMode>(getInitialLayout);

  function setLayout(mode: LayoutMode) {
    setLayoutState(mode);
    localStorage.setItem("lf-layout-mode", mode);
    document.documentElement.dataset.layout = mode;
  }

  return (
    <LayoutContext.Provider value={{ layout, setLayout }}>
      {children}
    </LayoutContext.Provider>
  );
}
