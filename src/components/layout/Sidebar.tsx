"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  Clock,
  LogOut,
  Home,
  FileText,
  Upload,
  GitBranch,
  ChevronRight,
  ListTodo,
  Search,
  Zap,
  Inbox,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { LogoIconDark } from "@/components/brand/Logo";

const navSections = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/contacts", label: "Contacts", icon: Users },
      { href: "/inbox", label: "Inbox", icon: Inbox },
      { href: "/tasks", label: "Tasks", icon: ListTodo },
      { href: "/automations", label: "Automations", icon: Zap },
      { href: "/showings", label: "Showings", icon: Clock },
      { href: "/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    label: "Listings",
    items: [
      { href: "/listings", label: "Listings", icon: Building2 },
      { href: "/search", label: "Property Search", icon: Search },
      { href: "/workflow", label: "MLS Workflow", icon: GitBranch },
      { href: "/import", label: "Excel Import", icon: Upload },
    ],
  },
  {
    label: "BC Forms",
    items: [
      { href: "/forms", label: "Standard Forms", icon: FileText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col bg-[var(--sidebar)] text-[var(--sidebar-foreground)]">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-6 border-b border-[var(--sidebar-border)]">
        <LogoIconDark size={32} />
        <div>
          <span className="font-bold text-base tracking-tight">Magnate</span>
          <span className="block text-[9px] text-[var(--sidebar-foreground)]/40 tracking-widest uppercase">AI Platform</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 mt-1 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 mb-1 text-[9px] font-semibold uppercase tracking-widest text-[var(--sidebar-foreground)]/40">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 group",
                      isActive
                        ? "bg-[var(--sidebar-accent)] text-[var(--sidebar-primary)]"
                        : "text-[var(--sidebar-foreground)]/70 hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-foreground)]"
                    )}
                  >
                    <item.icon className="h-[17px] w-[17px] shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-[var(--sidebar-border)] p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--sidebar-accent)] text-xs font-bold text-[var(--sidebar-primary)]">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">
              {session?.user?.name ?? "User"}
            </p>
            <p className="text-[11px] text-[var(--sidebar-foreground)]/50 truncate">
              {session?.user?.email ?? ""}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md p-1.5 text-[var(--sidebar-foreground)]/50 hover:text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
