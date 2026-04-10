"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Home, ListTodo, Building2, Users, Clock, Calendar,
  Mail, Zap, GitBranch, Search, Upload, FileText,
  Wand2, ChevronDown, ChevronRight,
  BarChart3, Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { FeatureKey } from "@/lib/features";

// Nav items matching the current AppHeader
const MAIN_NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/tasks", label: "My Work", icon: ListTodo },
];

const CRM_NAV: { href: string; label: string; icon: typeof Home; featureKey?: FeatureKey }[] = [
  { href: "/listings", label: "Listings", icon: Building2 },
  { href: "/contacts", label: "Contacts", icon: Users, featureKey: "contacts" },
  { href: "/showings", label: "Showings", icon: Clock, featureKey: "showings" },
  { href: "/calendar", label: "Calendar", icon: Calendar, featureKey: "calendar" },
  { href: "/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/tasks", label: "Tasks", icon: ListTodo, featureKey: "tasks" },
];

const TOOLS_NAV: { href: string; label: string; icon: typeof Home; featureKey?: FeatureKey }[] = [
  { href: "/newsletters", label: "Email Marketing", icon: Mail, featureKey: "newsletters" },
  { href: "/automations", label: "Automations", icon: Zap, featureKey: "automations" },
  { href: "/content", label: "Content Engine", icon: Wand2, featureKey: "content" },
  { href: "/forms", label: "BC Forms", icon: FileText, featureKey: "forms" },
  { href: "/import", label: "Import", icon: Upload, featureKey: "import" },
  { href: "/search", label: "Search", icon: Search, featureKey: "search" },
];

const BOTTOM_NAV = [
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MondaySidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [crmOpen, setCrmOpen] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(true);

  const enabledFeatures: string[] = (session?.user as Record<string, unknown>)?.enabledFeatures as string[] || [];

  function isVisible(featureKey?: FeatureKey) {
    if (!featureKey) return true;
    return enabledFeatures.length === 0 || enabledFeatures.includes(featureKey);
  }

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <aside className="hidden md:flex flex-col w-[240px] shrink-0 border-r border-[#d0d4e4] bg-white h-full overflow-y-auto">
      {/* Main nav */}
      <div className="p-2 space-y-0.5">
        {MAIN_NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
              isActive(item.href)
                ? "bg-primary/10 text-primary font-medium"
                : "text-[#323338] hover:bg-[rgba(103,104,121,0.1)]"
            )}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </Link>
        ))}
      </div>

      {/* CRM section */}
      <div className="px-2 mt-2">
        <button
          onClick={() => setCrmOpen(!crmOpen)}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-foreground"
        >
          {crmOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          CRM
        </button>
        {crmOpen && (
          <div className="space-y-0.5 mt-0.5">
            {CRM_NAV.filter(item => isVisible(item.featureKey)).map(item => (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-[#323338] hover:bg-[rgba(103,104,121,0.1)]"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Tools section */}
      <div className="px-2 mt-2">
        <button
          onClick={() => setToolsOpen(!toolsOpen)}
          className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider w-full hover:text-foreground"
        >
          {toolsOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Tools
        </button>
        {toolsOpen && (
          <div className="space-y-0.5 mt-0.5">
            {TOOLS_NAV.filter(item => isVisible(item.featureKey)).map(item => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-[#323338] hover:bg-[rgba(103,104,121,0.1)]"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Bottom nav */}
      <div className="p-2 border-t border-[#d0d4e4] space-y-0.5">
        {BOTTOM_NAV.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded text-sm transition-colors",
              isActive(item.href)
                ? "bg-primary/10 text-primary font-medium"
                : "text-[#323338] hover:bg-[rgba(103,104,121,0.1)]"
            )}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
          </Link>
        ))}
      </div>
    </aside>
  );
}
