"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  Home, ListTodo, Building2, Users, Clock, Calendar,
  Mail, Zap, Search, Upload, FileText,
  Wand2, Settings, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeatureKey } from "@/lib/features";

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
];

const TOOLS_NAV: NavItem[] = [
  { href: "/tasks", label: "Tasks", icon: ListTodo, featureKey: "tasks" },
  { href: "/content", label: "Content Engine", icon: Wand2, featureKey: "content" },
  { href: "/newsletters", label: "Email Marketing", icon: Mail, featureKey: "newsletters" },
  { href: "/automations", label: "Automations", icon: Zap, featureKey: "automations" },
];

const ADMIN_NAV: NavItem[] = [
  { href: "/forms", label: "Forms", icon: FileText, featureKey: "forms" },
  { href: "/search", label: "Property Search", icon: Search, featureKey: "search" },
  { href: "/import", label: "Import", icon: Upload, featureKey: "import" },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MondaySidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const initials = userName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const enabledFeatures: string[] = (session?.user as Record<string, unknown>)?.enabledFeatures as string[] || [];

  function isVisible(featureKey?: FeatureKey) {
    if (!featureKey) return true;
    return enabledFeatures.length === 0 || enabledFeatures.includes(featureKey);
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
          active
            ? "bg-sidebar-accent text-white border-l-3 border-sidebar-primary"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        )}
      >
        <item.icon className="h-[18px] w-[18px] shrink-0" />
        {item.label}
      </Link>
    );
  }

  function GroupHeader({ label }: { label: string }) {
    return (
      <div className="text-xs uppercase tracking-wider text-sidebar-foreground/40 px-4 pt-4 pb-2 font-semibold">
        {label}
      </div>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 bg-sidebar h-full overflow-y-auto">
      {/* Brand */}
      <div className="flex items-center gap-2.5 h-16 px-4 shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-sidebar-foreground">Realtors360</span>
      </div>

      {/* MAIN group */}
      <GroupHeader label="Main" />
      <div className="px-2 space-y-0.5">
        {MAIN_NAV.filter(item => isVisible(item.featureKey)).map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* TOOLS group */}
      <GroupHeader label="Tools" />
      <div className="px-2 space-y-0.5">
        {TOOLS_NAV.filter(item => isVisible(item.featureKey)).map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* ADMIN group */}
      <GroupHeader label="Admin" />
      <div className="px-2 space-y-0.5">
        {ADMIN_NAV.filter(item => isVisible(item.featureKey)).map(item => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User section */}
      <div className="p-3 border-t border-sidebar-accent shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-sidebar-primary/20 text-sidebar-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
            <p className="text-xs text-sidebar-foreground/50 truncate">{userEmail}</p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-1.5 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors shrink-0"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
