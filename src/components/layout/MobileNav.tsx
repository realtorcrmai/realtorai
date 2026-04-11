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
import { QuickAddButton } from "@/components/layout/QuickAddButton";
import type { FeatureKey } from "@/lib/features";

// featureKey is REQUIRED — every gated nav item must declare its plan gate.
const navItems: { href: string; label: string; icon: typeof Building2; featureKey: FeatureKey }[] = [
  { href: "/contacts", label: "Contacts", icon: Users, featureKey: "contacts" },
  { href: "/tasks", label: "Tasks", icon: ListTodo, featureKey: "tasks" },
  { href: "/listings", label: "Listings", icon: Building2, featureKey: "listings" },
  { href: "/calendar", label: "Calendar", icon: Calendar, featureKey: "calendar" },
];

// Always-visible items (not plan-gated)
const homeItem = { href: "/", label: "Home", icon: LayoutDashboard };

export function MobileNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const enabledFeatures = session?.user?.enabledFeatures;
  const hasFeatureData = Array.isArray(enabledFeatures) && enabledFeatures.length > 0;

  const gatedItems = hasFeatureData
    ? navItems.filter((item) => enabledFeatures.includes(item.featureKey))
    : navItems;
  const filteredItems = [homeItem, ...gatedItems];

  // Split items: first 2 on left, rest on right, with center + button
  const leftItems = filteredItems.slice(0, 2);
  const rightItems = filteredItems.slice(2);

  function NavLink({ item }: { item: typeof filteredItems[number] }) {
    const isActive =
      pathname === item.href ||
      (item.href !== "/" && pathname.startsWith(item.href));
    return (
      <Link
        href={item.href}
        className={cn(
          "flex flex-col items-center gap-1 py-2.5 px-2 min-w-[44px] min-h-[44px] text-[10px] font-medium transition-colors",
          isActive
            ? "text-brand"
            : "text-muted-foreground"
        )}
      >
        <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
        <span>{item.label}</span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card md:hidden">
      <div className="flex items-end justify-around">
        {leftItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}

        {/* Raised center Quick Add button */}
        <div className="flex flex-col items-center -mt-4">
          <div className="rounded-full bg-brand p-1 shadow-lg text-white">
            <QuickAddButton />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Add</span>
        </div>

        {rightItems.map((item) => (
          <NavLink key={item.href} item={item} />
        ))}
      </div>
    </nav>
  );
}
