"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  Clock,
  ListTodo,
  Search,
  GitBranch,
  Upload,
  FileText,
  Wand2,
  Zap,
  Mail,
  Globe,
  LogOut,
  Home,
  ChevronDown,
  Menu,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { QuickAddButton } from "@/components/layout/QuickAddButton";
import { ContextualHelpButton } from "@/components/help/ContextualHelpButton";
import { VoiceStatusIndicator } from "@/components/voice-agent/VoiceStatusIndicator";

import type { FeatureKey } from "@/lib/features";

// featureKey is REQUIRED — every nav item must declare its plan gate.
// Items without a featureKey bypass plan gating (TypeScript will catch omissions).
const mainTabs: { href: string; label: string; icon: typeof Building2; featureKey: FeatureKey }[] = [
  { href: "/listings", label: "Listings", icon: Building2, featureKey: "listings" },
  { href: "/contacts", label: "Contacts", icon: Users, featureKey: "contacts" },
  { href: "/showings", label: "Showings", icon: Clock, featureKey: "showings" },
  { href: "/calendar", label: "Calendar", icon: Calendar, featureKey: "calendar" },
];

const moreItems: { href: string; label: string; icon: typeof Building2; featureKey: FeatureKey }[] = [
  { href: "/tasks", label: "Tasks", icon: ListTodo, featureKey: "tasks" },
  { href: "/automations", label: "Automations", icon: Zap, featureKey: "automations" },
  { href: "/content", label: "Content Engine", icon: Wand2, featureKey: "content" },
  { href: "/search", label: "Property Search", icon: Search, featureKey: "search" },
  { href: "/workflow", label: "MLS Workflow", icon: GitBranch, featureKey: "workflow" },
  { href: "/import", label: "Excel Import", icon: Upload, featureKey: "import" },
  { href: "/forms", label: "BC Forms", icon: FileText, featureKey: "forms" },
  { href: "/newsletters", label: "Email Marketing", icon: Mail, featureKey: "newsletters" },
  { href: "/websites", label: "Website Marketing", icon: Globe, featureKey: "website" },
  { href: "/search", label: "MLS Browse", icon: Search, featureKey: "mls-browse" },
];

export function AppHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  const enabledFeatures = session?.user?.enabledFeatures;
  const hasFeatureData = Array.isArray(enabledFeatures) && enabledFeatures.length > 0;
  const isAdmin = session?.user?.role === "admin";

  // Always filter when feature data is loaded; show all while session is loading
  const filteredMainTabs = hasFeatureData
    ? mainTabs.filter((tab) => enabledFeatures.includes(tab.featureKey))
    : mainTabs;
  const filteredMoreItems = hasFeatureData
    ? moreItems.filter((item) => enabledFeatures.includes(item.featureKey))
    : moreItems;
  const allNav = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard, featureKey: undefined as FeatureKey | undefined },
    ...filteredMainTabs,
    ...filteredMoreItems,
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield, featureKey: undefined as FeatureKey | undefined }] : []),
  ];

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    }
    if (moreOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href);
  }

  // Check if any "more" item is active
  const moreActive = filteredMoreItems.some((item) => isActive(item.href));

  return (
    <>
      {/* Desktop Header */}
      <header className="hidden md:flex items-center h-16 px-6 gap-6 shrink-0 bg-card border-b border-border shadow-sm z-30">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 mr-4 shrink-0 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-indigo elevation-4 transition-transform duration-200 group-hover:scale-105">
            <Home className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight text-foreground">
              RealtorAI
            </span>
            <span className="text-[9px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
              BC AI Agent
            </span>
          </div>
        </Link>

        {/* Separator */}
        <div className="h-6 w-px bg-border/60 shrink-0" />

        {/* Nav Tabs */}
        <nav className="flex items-center gap-1 flex-1">
          {filteredMainTabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isActive(tab.href)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          ))}

          {/* More dropdown */}
          <div ref={moreRef} className="relative">
            <button
              onClick={() => setMoreOpen(!moreOpen)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                moreActive || moreOpen
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>More</span>
              <ChevronDown
                className={cn(
                  "h-3 w-3 transition-transform duration-200",
                  moreOpen && "rotate-180"
                )}
              />
            </button>

            {moreOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-card rounded-xl shadow-lg border border-border py-2 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
                {filteredMoreItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors mx-1.5 rounded-lg",
                      isActive(item.href)
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        {/* Admin Link */}
        {isAdmin && (
          <Link
            href="/admin"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 shrink-0",
              isActive("/admin")
                ? "bg-amber-100 text-amber-700"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Shield className="h-4 w-4" />
            <span className="hidden lg:inline">Admin</span>
          </Link>
        )}

        {/* Voice Agent Status — professional+ only */}
        {hasFeatureData && enabledFeatures.includes("assistant") && (
          <VoiceStatusIndicator />
        )}

        {/* Search shortcut hint */}
        <button
          onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
          className="hidden md:flex items-center justify-center size-8 shrink-0 aspect-square rounded-lg border border-border bg-card text-[10px] text-foreground/70 font-mono shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)] hover:bg-accent hover:text-foreground hover:shadow-[0_3px_8px_rgba(0,0,0,0.15)] transition-all"
          aria-label="Search (⌘K)"
        >⌘K</button>

        {/* Help — professional+ only */}
        {hasFeatureData && enabledFeatures.includes("assistant") && (
          <ContextualHelpButton />
        )}

        {/* Quick Add */}
        <QuickAddButton />

        {/* Separator */}
        <div className="h-6 w-px bg-border/60 shrink-0" />

        {/* Right: User */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-3 pl-2 pr-3 py-1.5 rounded-xl hover:bg-accent/60 transition-colors cursor-default">
            <div className="flex h-9 w-9 items-center justify-center rounded-full gradient-indigo text-white text-xs font-bold ring-2 ring-primary/20 elevation-2">
              {initials}
            </div>
            <div className="hidden lg:block">
              <p className="text-sm font-semibold leading-none text-foreground">
                {session?.user?.name ?? "User"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {session?.user?.email ?? ""}
              </p>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="flex md:hidden items-center h-14 border-b px-4 bg-card shrink-0">
        <Sheet>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon" className="mr-2">
                <Menu className="h-5 w-5" />
              </Button>
            }
          />
          <SheetContent side="left" className="p-0 w-72">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex flex-col h-full bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
              {/* Brand */}
              <div className="flex items-center gap-2.5 px-5 h-14 border-b border-[var(--sidebar-border)]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--sidebar-primary)]">
                  <Home className="h-4 w-4 text-[var(--sidebar-primary-foreground)]" />
                </div>
                <span className="font-bold text-base">RealtorAI</span>
              </div>
              {/* Nav */}
              <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                {allNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive(item.href)
                        ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)]"
                        : "text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)]"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>
              {/* User */}
              <div className="border-t border-[var(--sidebar-border)] p-3">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="h-8 w-8 rounded-full bg-[var(--sidebar-accent)] flex items-center justify-center text-xs font-bold text-[var(--sidebar-primary)]">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {session?.user?.name ?? "User"}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="p-1.5 rounded-md text-[var(--sidebar-foreground)]/50 hover:text-[var(--sidebar-foreground)]"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Home className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm">RealtorAI</span>
          <span className="text-[8px] font-semibold tracking-wider uppercase px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
            BC AI Agent
          </span>
        </Link>
      </header>
    </>
  );
}
