"use client";

import { MondayHeader } from "@/components/layout/MondayHeader";
import { MondaySidebar } from "@/components/layout/MondaySidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { AnnouncementBanner } from "@/components/layout/AnnouncementBanner";

export function DashboardShellClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen">
      {/* Skip to content — keyboard accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:px-4 focus:py-2 focus:bg-brand focus:text-white focus:rounded-lg focus:text-sm focus:font-medium">
        Skip to content
      </a>

      {/* Desktop sidebar (hidden on mobile) */}
      <MondaySidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        <MondayHeader />
        <AnnouncementBanner />
        <main id="main-content" className="flex-1 overflow-y-auto bg-background">
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
