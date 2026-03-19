"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Building2,
  Calendar,
  ListTodo,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeatureKey } from "@/lib/features";

const navItems: { href: string; label: string; icon: typeof Building2; featureKey?: FeatureKey }[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users, featureKey: "contacts" },
  { href: "/tasks", label: "Tasks", icon: ListTodo, featureKey: "tasks" },
  { href: "/listings", label: "Listings", icon: Building2, featureKey: "listings" },
  { href: "/calendar", label: "Calendar", icon: Calendar, featureKey: "calendar" },
];

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const enabledFeatures = session?.user?.enabledFeatures ?? [];

  const filteredItems = enabledFeatures.length > 0
    ? navItems.filter((item) => !item.featureKey || enabledFeatures.includes(item.featureKey))
    : navItems;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-sm md:hidden">
      <div className="flex items-center justify-around">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 px-2 min-w-[44px] min-h-[44px] text-[10px] font-medium transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
