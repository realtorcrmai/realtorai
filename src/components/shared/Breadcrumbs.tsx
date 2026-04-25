"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  "": "Home",
  "contacts": "Contacts",
  "listings": "Listings",
  "showings": "Showings",
  "calendar": "Calendar",
  "tasks": "Tasks",
  "pipeline": "Pipeline",
  "newsletters": "AI Agents",
  "automations": "Automations",
  "settings": "Settings",
  "content": "Content",
  "search": "Search",
  "import": "Import",
  "forms": "Forms",
  "workflow": "Workflow",
  "inbox": "Inbox",
  "reports": "Reports",
};

export function Breadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length <= 1) return null; // Don't show on top-level pages

  const crumbs = segments.map((seg, i) => ({
    label: ROUTE_LABELS[seg] || seg.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mb-3 px-5">
      <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
      {crumbs.map((crumb) => (
        <span key={crumb.href} className="flex items-center gap-1">
          <ChevronRight className="h-3 w-3" />
          {crumb.isLast ? (
            <span className="text-foreground font-medium">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-foreground transition-colors">{crumb.label}</Link>
          )}
        </span>
      ))}
    </nav>
  );
}
