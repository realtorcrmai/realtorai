"use client";

import { useState, useRef, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Search, User, Users, Settings, LogOut } from "lucide-react";
import { NotificationDropdown } from "@/components/layout/NotificationDropdown";
import { TeamScopeToggle } from "@/components/team/TeamScopeToggle";

export function MondayHeader() {
  const { data: session } = useSession();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const avatarUrl = (session?.user as Record<string, unknown> | undefined)?.avatarUrl as string | null;
  const teamId = (session?.user as Record<string, unknown> | undefined)?.teamId as string | null;
  const teamRole = (session?.user as Record<string, unknown> | undefined)?.teamRole as string | null;
  const teamName = (session?.user as Record<string, unknown> | undefined)?.teamName as string | null;

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  return (
    <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0">
      {/* Left: Mobile hamburger + Team Scope Toggle */}
      <div className="flex items-center gap-3">
        {teamId && teamRole && session?.user?.id && (
          <TeamScopeToggle userId={session.user.id} teamRole={teamRole} />
        )}
        {teamName && (
          <button
            onClick={() => router.push("/settings/team")}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand/10 hover:bg-brand/20 transition-colors text-xs font-medium text-brand"
            aria-label="Team settings"
          >
            <Users className="h-3.5 w-3.5" />
            {teamName}
          </button>
        )}
      </div>

      {/* Right: Search + Notifications + User avatar */}
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Search"
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
          }}
        >
          <Search className="h-4 w-4 text-muted-foreground" />
        </button>
        <NotificationDropdown />

        {/* Avatar with dropdown menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="ml-1 rounded-full ring-2 ring-transparent hover:ring-brand/30 transition-all focus-visible:ring-brand focus-visible:outline-none"
            aria-label="Open profile menu"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
                {initials}
              </div>
            )}
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden animate-float-in">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-border/50 bg-muted/30">
                <div className="flex items-center gap-3">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt={userName} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-semibold">
                      {initials}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { setMenuOpen(false); router.push("/settings/profile"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <User className="h-4 w-4 text-muted-foreground" />
                  My Profile
                </button>
                <button
                  onClick={() => { setMenuOpen(false); router.push("/settings/team"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Users className="h-4 w-4 text-muted-foreground" />
                  {teamName ? teamName : "Create Team"}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Settings
                </button>
              </div>

              {/* Sign out */}
              <div className="border-t border-border/50 py-1">
                <button
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/login" }); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
