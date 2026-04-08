"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Users, Building2, Calendar, Clock, ListTodo, Search,
  GitBranch, Upload, FileText, Wand2, Zap, Mail, Globe, BookOpen,
  LogOut, Home, ChevronDown, Menu, Shield, Grid3X3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { QuickAddButton } from "@/components/layout/QuickAddButton";
import { ContextualHelpButton } from "@/components/help/ContextualHelpButton";
import { VoiceStatusIndicator } from "@/components/voice-agent/VoiceStatusIndicator";
import type { FeatureKey } from "@/lib/features";

const mainTabs: { href: string; label: string; icon: typeof Building2 }[] = [
  { href: "/listings", label: "Listings", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/showings", label: "Showings", icon: Clock },
  { href: "/calendar", label: "Calendar", icon: Calendar },
];

const moreItems: { href: string; label: string; icon: typeof Building2 }[] = [
  { href: "/tasks", label: "Tasks", icon: ListTodo },
  { href: "/automations", label: "Automations", icon: Zap },
  { href: "/content", label: "Content Engine", icon: Wand2 },
  { href: "/search", label: "Property Search", icon: Search },
  { href: "/workflow", label: "MLS Workflow", icon: GitBranch },
  { href: "/import", label: "Excel Import", icon: Upload },
  { href: "/forms", label: "BC Forms", icon: FileText },
  { href: "/newsletters", label: "Email Marketing", icon: Mail },
  { href: "/websites", label: "Website Marketing", icon: Globe },
  { href: "/social", label: "Social Media", icon: Globe },
  { href: "/assistant/knowledge", label: "Knowledge Base", icon: BookOpen },
];

const mobileSections = [
  { label: "Overview", items: [{ href: "/", label: "Dashboard", icon: LayoutDashboard }] },
  { label: "CRM", items: [
    { href: "/contacts", label: "Contacts", icon: Users },
    { href: "/tasks", label: "Tasks", icon: ListTodo },
    { href: "/showings", label: "Showings", icon: Clock },
    { href: "/calendar", label: "Calendar", icon: Calendar },
    { href: "/automations", label: "Automations", icon: Zap },
  ]},
  { label: "Listings", items: [
    { href: "/listings", label: "Listings", icon: Building2 },
    { href: "/search", label: "Property Search", icon: Search },
    { href: "/workflow", label: "MLS Workflow", icon: GitBranch },
    { href: "/import", label: "Excel Import", icon: Upload },
  ]},
  { label: "Marketing", items: [
    { href: "/content", label: "Content Engine", icon: Wand2 },
    { href: "/newsletters", label: "Email Marketing", icon: Mail },
    { href: "/websites", label: "Websites", icon: Globe },
    { href: "/social", label: "Social Media", icon: Globe },
  ]},
  { label: "Resources", items: [
    { href: "/forms", label: "BC Forms", icon: FileText },
    { href: "/assistant/knowledge", label: "Knowledge Base", icon: BookOpen },
  ]},
];

export function AppHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const isAdmin = session?.user?.role === "admin";

  const initials = session?.user?.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false);
    }
    if (moreOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [moreOpen]);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href);
  }

  const moreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      {/* ━━━ Desktop Header ━━━ */}
      <header className="hidden md:flex items-center h-[56px] px-5 gap-4 shrink-0 z-30 bg-card/90 backdrop-blur-sm border-b border-border">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0 group">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary transition-all duration-200 shadow-sm group-hover:shadow-md group-hover:shadow-primary/30 group-hover:scale-105">
            <Home className="h-4 w-4 text-white" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-foreground">RealtorAI</span>
        </Link>

        {/* Separator */}
        <div className="h-6 w-px bg-foreground/[0.10] shrink-0" />

        {/* ── Center Nav ── */}
        <nav className="flex items-center gap-0.5 flex-1">
          <Link href="/" className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200", isActive("/") ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]")}>
            <LayoutDashboard className="h-4 w-4" />
            <span className="hidden lg:inline">Dashboard</span>
          </Link>

          {mainTabs.map((tab) => (
            <Link key={tab.href} href={tab.href} className={cn("flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200", isActive(tab.href) ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]")}>
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </Link>
          ))}

          {/* More */}
          <div ref={moreRef} className="relative">
            <button onClick={() => setMoreOpen(!moreOpen)} className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200", moreActive || moreOpen ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]")}>
              <Grid3X3 className="h-4 w-4" /><span>More</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", moreOpen && "rotate-180")} />
            </button>
            {moreOpen && (
              <div className="absolute top-full left-0 mt-2 w-56 rounded-xl overflow-hidden z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150 bg-card/90 backdrop-blur-sm border border-border shadow-xl shadow-foreground/8">
                <div className="py-1.5">
                  {moreItems.map((item) => (
                    <Link key={item.href} href={item.href} onClick={() => setMoreOpen(false)} className={cn("flex items-center gap-3 px-3.5 py-2.5 text-sm transition-colors", isActive(item.href) ? "bg-primary/10 text-primary font-medium" : "text-foreground/70 hover:bg-foreground/[0.04] hover:text-foreground")}>
                      <item.icon className="h-4 w-4 text-foreground/40" />
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* ── Right Actions ── */}
        <div className="flex items-center gap-2 shrink-0">
          {isAdmin && (
            <Link href="/admin" className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200", isActive("/admin") ? "bg-primary text-primary-foreground shadow-sm" : "text-foreground/55 hover:text-foreground hover:bg-foreground/[0.04]")}>
              <Shield className="h-4 w-4" />
              <span className="hidden lg:inline">Admin</span>
            </Link>
          )}
          <VoiceStatusIndicator />
          <ContextualHelpButton />
          <QuickAddButton />

          <div className="h-6 w-px bg-foreground/[0.10] shrink-0 mx-0.5" />

          {/* User */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-lg hover:bg-foreground/[0.04] transition-colors cursor-default group">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold shadow-sm">
                {initials}
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background" />
              </div>
              <div className="hidden lg:block">
                <p className="text-[13px] font-medium leading-none text-foreground">{session?.user?.name ?? "User"}</p>
                <p className="text-[10px] text-foreground/45 mt-0.5 leading-none">{session?.user?.email ?? ""}</p>
              </div>
            </div>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="p-1.5 rounded-lg text-foreground/30 hover:text-foreground/70 hover:bg-foreground/[0.06] transition-all duration-200" title="Sign out">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ━━━ Mobile Header ━━━ */}
      <header className="flex md:hidden items-center h-14 px-4 shrink-0 bg-card/90 backdrop-blur-sm border-b border-border">
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="mr-2 rounded-lg text-foreground/50 hover:text-foreground hover:bg-foreground/[0.06]"><Menu className="h-5 w-5" /></Button>} />
          <SheetContent side="left" className="p-0 w-[280px] border-r-0">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <div className="flex flex-col h-full bg-gradient-to-b from-[#1a1535] to-[#332618]">
              <div className="flex items-center gap-2.5 px-5 h-14 border-b border-white/[0.10]">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Home className="h-4 w-4 text-white" />
                </div>
                <span className="font-bold text-[15px] text-white tracking-tight">RealtorAI</span>
              </div>
              <nav className="flex-1 overflow-y-auto p-3 space-y-4">
                {mobileSections.map((section) => (
                  <div key={section.label}>
                    <p className="px-3 mb-1 text-[9px] font-bold uppercase tracking-[0.15em] text-white/30">{section.label}</p>
                    <div className="space-y-0.5">
                      {section.items.map((item) => (
                        <Link key={item.href} href={item.href} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200", isActive(item.href) ? "bg-white/[0.10] text-white" : "text-white/55 hover:text-white/85 hover:bg-white/[0.06]")}>
                          <item.icon className="h-4 w-4" />
                          <span className="flex-1">{item.label}</span>
                          {isActive(item.href) && <div className="h-1.5 w-1.5 rounded-full bg-primary" />}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="border-t border-white/[0.10] p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold">{initials}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{session?.user?.name ?? "User"}</p>
                    <p className="text-[11px] text-white/45 truncate">{session?.user?.email ?? ""}</p>
                  </div>
                  <button onClick={() => signOut({ callbackUrl: "/login" })} className="p-2 rounded-lg text-white/40 hover:text-white/75 transition-colors"><LogOut className="h-4 w-4" /></button>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary"><Home className="h-3.5 w-3.5 text-white" /></div>
          <span className="font-bold text-sm tracking-tight text-foreground">RealtorAI</span>
        </Link>
        <div className="ml-auto flex items-center gap-1"><QuickAddButton /></div>
      </header>
    </>
  );
}
