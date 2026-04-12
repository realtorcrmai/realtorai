"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  BarChart3,
  DollarSign,
  Activity,
  Mail,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const MOBILE_NAV = [
  { label: "Overview", icon: LayoutDashboard, href: "/admin" },
  { label: "Users", icon: Users, href: "/admin/users" },
  { label: "Revenue", icon: DollarSign, href: "/admin/revenue" },
  { label: "System", icon: Activity, href: "/admin/system" },
  { label: "Emails", icon: Mail, href: "/admin/emails" },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { label: "Settings", icon: Settings, href: "/admin/settings" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/admin") {
    return pathname === "/admin" || pathname === "/admin/users";
  }
  return pathname.startsWith(href);
}

export function AdminMobileNav() {
  const pathname = usePathname();

  return (
    <div className="md:hidden overflow-x-auto border-b border-border bg-card shrink-0">
      <nav className="flex px-2 py-1.5 gap-1 min-w-max">
        {MOBILE_NAV.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs whitespace-nowrap transition-colors",
                active
                  ? "bg-brand/10 text-brand font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
