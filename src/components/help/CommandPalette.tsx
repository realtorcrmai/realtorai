"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Search, BookOpen, ArrowRight, Zap } from "lucide-react";

interface HelpItem {
  slug: string;
  title: string;
  problem: string;
  icon: string;
}

const ACTIONS = [
  { label: "Create Listing", href: "/listings", icon: "🏠" },
  { label: "Add Contact", href: "/contacts", icon: "👤" },
  { label: "Schedule Showing", href: "/showings", icon: "🔑" },
  { label: "Create Task", href: "/tasks", icon: "📋" },
  { label: "Create Deal", href: "/pipeline", icon: "💰" },
  { label: "Open Help Center", href: "/help", icon: "❓" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

// Static help items (no server import needed)
const HELP_ITEMS: HelpItem[] = [
  { slug: "listing-workflow", title: "Listing Workflow", problem: "8-phase pipeline from seller intake to MLS submission", icon: "🏠" },
  { slug: "contact-management", title: "Contact Management", problem: "Manage buyers, sellers, partners, households, relationships", icon: "👥" },
  { slug: "showing-management", title: "Showing Management", problem: "Schedule, confirm, track showings and buyer feedback", icon: "🔑" },
  { slug: "deal-pipeline", title: "Deal Pipeline", problem: "Track transactions from lead to close", icon: "💰" },
  { slug: "email-marketing-engine", title: "Email Marketing", problem: "AI-powered email drafts, campaigns, analytics", icon: "📧" },
  { slug: "ai-content-engine", title: "AI Content Engine", problem: "MLS remarks, social captions, video prompts", icon: "✨" },
  { slug: "bc-forms-generation", title: "BC Forms Generation", problem: "Auto-fill 12 BCREA standard forms", icon: "📋" },
  { slug: "fintrac-compliance", title: "FINTRAC Compliance", problem: "Identity verification and AML compliance", icon: "🛡️" },
  { slug: "voice-agent", title: "Voice Agent", problem: "Voice-controlled CRM assistant", icon: "🎙️" },
  { slug: "workflow-automations", title: "Workflow Automations", problem: "Drip campaigns, triggers, enrollments", icon: "⚡" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const navigate = useCallback((href: string) => {
    setOpen(false);
    router.push(href);
  }, [router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Command palette">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90vw] max-w-lg">
        <Command className="bg-card rounded-xl border border-border shadow-2xl overflow-hidden" label="Search everything">
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Search help, CRM, or type a command..."
              className="flex-1 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              autoFocus
            />
            <kbd className="text-[10px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">ESC</kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Help" className="mb-2">
              {HELP_ITEMS.map((f) => (
                <Command.Item
                  key={f.slug}
                  value={`help ${f.title} ${f.problem}`}
                  onSelect={() => navigate(`/help/${f.slug}`)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent transition-colors"
                >
                  <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-foreground">{f.icon} {f.title}</span>
                    <p className="text-xs text-muted-foreground truncate">{f.problem}</p>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                </Command.Item>
              ))}
            </Command.Group>

            <Command.Group heading="Actions" className="mb-2">
              {ACTIONS.map((action) => (
                <Command.Item
                  key={action.href}
                  value={`action ${action.label}`}
                  onSelect={() => navigate(action.href)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent transition-colors"
                >
                  <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground">{action.icon} {action.label}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0 ml-auto" />
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>

          <div className="px-4 py-2 border-t border-border flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Tip: Start with &ldquo;how&rdquo; for help, &ldquo;create&rdquo; for actions
            </span>
            <span className="text-[10px] text-muted-foreground">
              <kbd className="bg-muted px-1 rounded">↑↓</kbd> navigate <kbd className="bg-muted px-1 rounded">↵</kbd> select
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
}
