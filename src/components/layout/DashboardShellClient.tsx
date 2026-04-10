"use client";

import { useLayout } from "@/components/layout/LayoutProvider";
import { AppHeader } from "@/components/layout/AppHeader";
import { MondayHeader } from "@/components/layout/MondayHeader";
import { MondaySidebar } from "@/components/layout/MondaySidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export function DashboardShellClient({ children }: { children: React.ReactNode }) {
  const { layout } = useLayout();

  if (layout === "sidebar") {
    return (
      <>
        <MondayHeader />
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <MondaySidebar />
          <main className="flex-1 min-h-0 overflow-y-auto bg-background">
            <div className="pb-24 animate-fade-in">
              {children}
            </div>
          </main>
        </div>
        <MobileNav />
      </>
    );
  }

  // Default: top-nav layout
  return (
    <>
      <AppHeader />
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <main className="flex-1 min-h-0 overflow-y-auto bg-background bg-canvas">
          <div className="pb-24 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
      <MobileNav />
    </>
  );
}
