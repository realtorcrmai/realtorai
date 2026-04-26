"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Home, ListTodo, Building2, Users, Clock, Calendar,
  Mail, Zap, Search, Upload, FileText,
  Wand2, Settings, LogOut, Newspaper, Megaphone, PartyPopper,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import type { FeatureKey } from "@/lib/features";
import { useRecentItems } from "@/stores/recent-items";
import { LogoVideo } from "@/components/brand/Logo";
import { SmartListBuilder } from "@/components/smart-lists/SmartListBuilder";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
  featureKey?: FeatureKey;
}

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: Home },
  { href: "/contacts", label: "Contacts", icon: Users, featureKey: "contacts" },
  { href: "/listings", label: "Listings", icon: Building2 },
  { href: "/showings", label: "Showings", icon: Clock, featureKey: "showings" },
  { href: "/calendar", label: "Calendar", icon: Calendar, featureKey: "calendar" },
  { href: "/tasks", label: "Tasks", icon: ListTodo, featureKey: "tasks" },
];

const VIRAL_NAV: NavItem[] = [
  { href: "/content", label: "Content Engine", icon: Wand2, featureKey: "content" },
];

const TOOLS_NAV: NavItem[] = [
  { href: "/newsletters", label: "AI Agents", icon: Mail, featureKey: "newsletters" },
  { href: "/newsletters/campaigns", label: "Campaigns", icon: Megaphone, featureKey: "newsletters" },
  { href: "/newsletters/editorial", label: "Editorial", icon: Newspaper, featureKey: "newsletters" },
  { href: "/newsletters/greetings", label: "Greetings", icon: PartyPopper, featureKey: "newsletters" },
  { href: "/automations", label: "Automations", icon: Zap, featureKey: "automations" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/forms", label: "Forms", icon: FileText, featureKey: "forms" },
  { href: "/search", label: "Property Search", icon: Search, featureKey: "search" },
  { href: "/import", label: "Import", icon: Upload, featureKey: "import" },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SidebarNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      data-tour={`nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
        active
          ? "bg-sidebar-primary/15 text-white border-l-[3px] border-sidebar-primary font-medium"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
      )}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarGroupHeader({ label }: { label: string }) {
  return (
    <div className="text-xs uppercase tracking-wider text-sidebar-foreground/70 px-4 pt-4 pb-2 font-semibold">
      {label}
    </div>
  );
}

// Map page sections to accent colors for logo glow
const SECTION_COLORS: Record<string, string> = {
  "/": "#FF7A59",           // coral — dashboard
  "/contacts": "#00BDA5",   // teal
  "/listings": "#E4C378",   // gold
  "/showings": "#7C98B6",   // slate
  "/calendar": "#9B59B6",   // purple
  "/tasks": "#F39C12",      // amber
  "/content": "#E74C3C",    // red
  "/newsletters": "#3498DB",// blue
  "/automations": "#1ABC9C",// green
  "/forms": "#95A5A6",      // gray
  "/search": "#D4B060",     // dark gold
  "/import": "#8E44AD",     // violet
  "/settings": "#7F8C8D",   // muted
};

function getSectionColor(pathname: string): string {
  if (pathname === "/") return SECTION_COLORS["/"];
  const section = "/" + pathname.split("/")[1];
  return SECTION_COLORS[section] || "#FF7A59";
}

export function MondaySidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const initials = userName.split(" ").map((w: string) => w[0]).filter(Boolean).join("").toUpperCase().slice(0, 2) || "U";
  const avatarUrl = (session?.user as Record<string, unknown> | undefined)?.avatarUrl as string | null;

  const enabledFeatures: string[] = (session?.user as Record<string, unknown>)?.enabledFeatures as string[] || [];
  const teamName = (session?.user as Record<string, unknown> | undefined)?.teamName as string | null;
  const teamRole = (session?.user as Record<string, unknown> | undefined)?.teamRole as string | null;

  // Recent items — hydration guard (Zustand persist rehydrates from localStorage after mount)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const storeItems = useRecentItems((s) => s.items);
  // Only read Zustand-derived values after mount to prevent SSR/client mismatch
  const recentItems = mounted ? storeItems : [];

  // Active section glow color
  const glowColor = getSectionColor(pathname);

  // Notification pulse — poll for unread count
  const [hasUnread, setHasUnread] = useState(false);
  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const res = await fetch("/api/notifications?limit=1&unread=true");
        if (res.ok) {
          const data = await res.json();
          if (active) setHasUnread((data.notifications?.length ?? 0) > 0);
        }
      } catch { /* ignore */ }
    };
    check();
    const interval = setInterval(check, 30000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  // Smart Lists — poll for pinned list counts
  const [smartLists, setSmartLists] = useState<{ id: string; name: string; icon: string; count: number; entity_type: string }[]>([]);
  const [showSmartListBuilder, setShowSmartListBuilder] = useState(false);
  useEffect(() => {
    let active = true;
    const fetchCounts = async () => {
      try {
        const res = await fetch("/api/smart-lists/counts");
        if (res.ok) {
          const data = await res.json();
          if (active) setSmartLists(data.counts ?? []);
        }
      } catch { /* ignore */ }
    };
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => { active = false; clearInterval(interval); };
  }, []);

  function isVisible(featureKey?: FeatureKey) {
    if (!featureKey) return true;
    return enabledFeatures.length === 0 || enabledFeatures.includes(featureKey);
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    if (!pathname.startsWith(href)) return false;
    // If a more-specific nav item also matches, defer to it
    const allHrefs = [...MAIN_NAV, ...VIRAL_NAV, ...TOOLS_NAV, ...ADMIN_NAV].map(i => i.href);
    const hasMoreSpecific = allHrefs.some(
      h => h !== href && h.length > href.length && h.startsWith(href) && pathname.startsWith(h)
    );
    return !hasMoreSpecific;
  }

  function renderNavGroup(label: string, items: NavItem[]) {
    const visible = items.filter(item => isVisible(item.featureKey));
    if (visible.length === 0) return null;
    return (
      <>
        <SidebarGroupHeader label={label} />
        <div className="px-2 space-y-0.5">
          {visible.map(item => (
            <SidebarNavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}
        </div>
      </>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-sidebar h-full overflow-y-auto">
      {/* Brand — logo glow changes per active section, pulses on notifications */}
      <div
        className={cn(
          "flex flex-col items-center justify-center h-[140px] px-3 shrink-0 transition-all duration-700",
          hasUnread && "animate-[logo-pulse_2s_ease-in-out_infinite]"
        )}
        style={{ filter: `drop-shadow(0 0 18px ${glowColor}30)` }}
      >
        <LogoVideo size={72} />
        <div className="text-center mt-1">
          <span className="text-[15px] font-semibold text-sidebar-foreground tracking-tight">Magnate</span>
          <span className="block text-[9px] text-sidebar-foreground/70 tracking-widest uppercase">AI Platform</span>
        </div>
      </div>

      {renderNavGroup("Main", MAIN_NAV)}

      {/* Smart Lists — pinned dynamic filters */}
      {smartLists.length > 0 && (
        <>
          <div className="flex items-center justify-between px-5 pt-4 pb-1">
            <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/70 font-semibold">Smart Lists</span>
            <button
              onClick={() => setShowSmartListBuilder(true)}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground transition-colors"
              aria-label="Create smart list"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="px-2 space-y-0.5">
            {smartLists.map((sl) => {
              const href = `/${sl.entity_type === "showings" ? "showings" : sl.entity_type}?smart_list=${sl.id}`;
              const active = pathname.includes(`smart_list=${sl.id}`);
              return (
                <Link
                  key={sl.id}
                  href={href}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors",
                    active
                      ? "bg-sidebar-primary/15 text-white font-medium"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
                  )}
                >
                  <span className="text-xs shrink-0">{sl.icon}</span>
                  <span className="flex-1 truncate">{sl.name}</span>
                  {sl.count > 0 && (
                    <span className="text-[10px] bg-sidebar-primary/20 text-sidebar-primary px-1.5 py-0.5 rounded-full font-medium tabular-nums">
                      {sl.count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </>
      )}

      {renderNavGroup("Viral Engine", VIRAL_NAV)}
      {renderNavGroup("Newsletters", TOOLS_NAV)}
      {renderNavGroup("Admin", ADMIN_NAV)}

      {/* Team — visible to all users (solo users see Create Team, members see team page) */}
      <div className="px-2 pt-1">
        <Link
          href="/settings/team"
          data-tour="nav-team"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
            pathname === "/settings/team"
              ? "bg-sidebar-primary/15 text-white border-l-[3px] border-sidebar-primary font-medium"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-white"
          )}
        >
          <Users className="h-4 w-4" />
          Team
        </Link>
      </div>

      {/* Recent Items */}
      {mounted && recentItems.length > 0 && (
        <div className="px-2 pt-2 border-t border-sidebar-accent mt-2">
          <div className="text-xs uppercase tracking-wider text-sidebar-foreground/70 px-3 pt-2 pb-1 font-semibold">Recent</div>
          {recentItems.slice(0, 5).map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60 rounded-md"
            >
              <span className="text-xs">{item.type === "contact" ? "👤" : "🏠"}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Version */}
      <div className="px-3 pb-1 text-center">
        <span className="text-[10px] text-sidebar-foreground/70 tabular-nums">
          v{process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0"}
          {process.env.NEXT_PUBLIC_BUILD_ID && process.env.NEXT_PUBLIC_BUILD_ID !== "local" && (
            <span className="ml-1">({process.env.NEXT_PUBLIC_BUILD_ID})</span>
          )}
        </span>
      </div>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-accent shrink-0">
        {/* Team indicator — links to team settings */}
        {teamName && (
          <Link
            href="/settings/team"
            className="flex items-center gap-2 px-2 py-1.5 mb-2 rounded-md bg-sidebar-primary/10 hover:bg-sidebar-primary/20 transition-colors"
          >
            <Users className="h-3.5 w-3.5 text-sidebar-primary shrink-0" />
            <span className="text-xs font-medium text-sidebar-primary truncate">{teamName}</span>
            {teamRole && (
              <span className="ml-auto text-[10px] text-sidebar-foreground/70 capitalize shrink-0">{teamRole}</span>
            )}
          </Link>
        )}
        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <img src={avatarUrl} alt={userName} className="h-8 w-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 text-sidebar-primary flex items-center justify-center text-xs font-semibold shrink-0">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-xs text-sidebar-foreground/70 truncate">{userEmail}</p>
          </div>
          <button
            onClick={() => {
              useRecentItems.getState().clearItems();
              signOut({ callbackUrl: "/login" });
            }}
            className="p-1.5 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
      <SmartListBuilder
        open={showSmartListBuilder}
        onOpenChange={setShowSmartListBuilder}
        onSaved={() => {
          // Refresh counts
          fetch("/api/smart-lists/counts").then(r => r.json()).then(d => setSmartLists(d.counts ?? [])).catch(() => {});
        }}
      />
    </aside>
  );
}
