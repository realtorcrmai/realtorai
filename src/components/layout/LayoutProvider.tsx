"use client";

import { createContext, useContext, useState, useEffect } from "react";

type LayoutMode = "top-nav" | "sidebar";

const LayoutContext = createContext<{
  layout: LayoutMode;
  setLayout: (mode: LayoutMode) => void;
}>({ layout: "top-nav", setLayout: () => {} });

export function useLayout() {
  return useContext(LayoutContext);
}

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [layout, setLayoutState] = useState<LayoutMode>("top-nav");

  useEffect(() => {
    const saved = localStorage.getItem("lf-layout-mode") as LayoutMode;
    if (saved === "sidebar" || saved === "top-nav") {
      setLayoutState(saved);
    }
  }, []);

  function setLayout(mode: LayoutMode) {
    setLayoutState(mode);
    localStorage.setItem("lf-layout-mode", mode);
  }

  return (
    <LayoutContext.Provider value={{ layout, setLayout }}>
      {children}
    </LayoutContext.Provider>
  );
}
