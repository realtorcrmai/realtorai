"use client";

import { MondayHeader } from "@/components/layout/MondayHeader";
import { MondaySidebar } from "@/components/layout/MondaySidebar";
import { MobileNav } from "@/components/layout/MobileNav";

export function DashboardShellClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Desktop sidebar (hidden on mobile) */}
      <MondaySidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <MondayHeader />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="pb-24 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <MobileNav />
    </div>
  );
}
