"use client";

import { createContext, useContext } from "react";

type LayoutMode = "sidebar";

const LayoutContext = createContext<{
  layout: LayoutMode;
}>({ layout: "sidebar" });

export function useLayout() {
  return useContext(LayoutContext);
}

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  return (
    <LayoutContext.Provider value={{ layout: "sidebar" }}>
      {children}
    </LayoutContext.Provider>
  );
}
