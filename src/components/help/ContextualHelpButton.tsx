"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { HelpCircle, X, BookOpen, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

/** Maps CRM routes to help slugs + summaries */
const PAGE_TO_HELP: Record<string, { slug: string; summary: string }> = {
  "/": { slug: "", summary: "Dashboard — pipeline overview, tasks, leads, AI recommendations" },
  "/listings": { slug: "listing-workflow", summary: "Property listings — create, filter, advance through 8 phases" },
  "/contacts": { slug: "contact-management", summary: "Buyers, sellers, partners — manage contacts, households, relationships" },
  "/showings": { slug: "showing-management", summary: "Showing requests — schedule, confirm, track feedback" },
  "/calendar": { slug: "showing-management", summary: "Calendar — see availability alongside scheduled showings" },
  "/tasks": { slug: "", summary: "Task management — create, assign, complete tasks tied to listings" },
  "/pipeline": { slug: "deal-pipeline", summary: "Deal pipeline — track transactions from lead to close" },
  "/newsletters": { slug: "email-marketing-engine", summary: "AI email marketing — drafts, campaigns, analytics" },
  "/content": { slug: "ai-content-engine", summary: "AI content — MLS remarks, social captions, video prompts" },
  "/forms": { slug: "bc-forms-generation", summary: "BCREA forms — auto-fill 12 standard forms from listing data" },
  "/automations": { slug: "workflow-automations", summary: "Workflow automations — drip campaigns, triggers, enrollments" },
  "/search": { slug: "listing-workflow", summary: "Property search — find listings by criteria" },
  "/workflow": { slug: "listing-workflow", summary: "MLS workflow — all listings organized by phase" },
  "/import": { slug: "listing-workflow", summary: "Excel import — bulk import listings" },
};

function getHelpForRoute(pathname: string): { slug: string; summary: string } | null {
  // Exact match
  if (PAGE_TO_HELP[pathname]) return PAGE_TO_HELP[pathname];
  // Prefix match (e.g., /listings/123 → /listings)
  for (const [route, help] of Object.entries(PAGE_TO_HELP)) {
    if (route !== "/" && pathname.startsWith(route)) return help;
  }
  return null;
}

export function ContextualHelpButton() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const help = getHelpForRoute(pathname);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div ref={popoverRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Help for this page"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        {open ? <X className="h-4 w-4" /> : <HelpCircle className="h-4 w-4" />}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={`Help for ${help?.summary?.split("—")[0] || "this page"}`}
          aria-modal="false"
          className="absolute top-full right-0 mt-2 w-72 bg-card rounded-xl shadow-lg border border-border p-4 z-50 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          {help ? (
            <>
              <p className="text-sm text-foreground font-medium mb-2">
                {help.summary.split("—")[0]}
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                {help.summary.split("—")[1] || ""}
              </p>

              <div className="space-y-2">
                {help.slug && (
                  <Link
                    href={`/help/${help.slug}`}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Full guide
                    <ArrowRight className="h-3 w-3 ml-auto" />
                  </Link>
                )}
                <Link
                  href="/help"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  All help articles
                  <ArrowRight className="h-3 w-3 ml-auto" />
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground font-medium mb-2">Help</p>
              <p className="text-xs text-muted-foreground mb-4">
                Browse guides, scenarios, and walkthroughs.
              </p>
              <Link
                href="/help"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 text-sm text-primary hover:underline"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Open Help Center
                <ArrowRight className="h-3 w-3 ml-auto" />
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
