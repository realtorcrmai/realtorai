"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Palette,
  FileText,
  Building2,
  MessageSquareQuote,
  Image,
  BookOpen,
  Users,
  BarChart3,
  Search,
  Globe,
  Settings,
  ExternalLink,
  Sparkles,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/design", label: "Design", icon: Palette },
  { href: "/pages", label: "Pages", icon: FileText },
  { href: "/listings", label: "Listings", icon: Building2 },
  { href: "/testimonials", label: "Testimonials", icon: MessageSquareQuote },
  { href: "/media", label: "Media", icon: Image },
  { href: "/blog", label: "Blog", icon: BookOpen },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/seo", label: "SEO", icon: Search },
  { href: "/domain", label: "Domain", icon: Globe },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar w-64 min-h-screen flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-teal-400 to-blue-500 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm tracking-tight">
              ListingFlow
            </h1>
            <p className="text-white/40 text-[10px] font-medium uppercase tracking-widest">
              Sites
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn("admin-nav-item", isActive && "active")}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/10 space-y-2">
        <a
          href="/preview"
          target="_blank"
          rel="noopener noreferrer"
          className="admin-nav-item text-teal-300/80 hover:text-teal-200"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          Preview Site
        </a>
        <a
          href={process.env.NEXT_PUBLIC_CRM_URL || "http://localhost:3000"}
          className="admin-nav-item text-white/40 hover:text-white/60"
        >
          <Building2 className="h-4 w-4 shrink-0" />
          Back to CRM
        </a>
      </div>
    </aside>
  );
}
