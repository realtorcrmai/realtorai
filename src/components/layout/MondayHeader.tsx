"use client";

import { useSession } from "next-auth/react";
import { Bell, Search, Menu } from "lucide-react";

export function MondayHeader() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      {/* Left: Mobile hamburger + optional breadcrumb context */}
      <div className="flex items-center gap-3">
        <button className="md:hidden p-2 rounded-lg hover:bg-muted" aria-label="Open navigation menu">
          <Menu className="h-5 w-5 text-muted-foreground" />
        </button>
      </div>

      {/* Right: Search + Notifications + User avatar */}
      <div className="flex items-center gap-2">
        <button className="p-2 rounded-lg hover:bg-muted transition-colors" aria-label="Search">
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
        <button className="p-2 rounded-lg hover:bg-muted transition-colors relative" aria-label="Notifications">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-brand rounded-full" aria-hidden="true" />
        </button>
        <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold ml-1">
          {initials}
        </div>
      </div>
    </header>
  );
}
