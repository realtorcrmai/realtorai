"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Command } from "cmdk";
import { Search, BookOpen, ArrowRight, Zap } from "lucide-react";
import { getAllFeatures, getFeatureIcon } from "@/lib/help-parser";

const BASE_ACTIONS = [
  { label: "Create Listing", href: "/listings", icon: "🏠" },
  { label: "Add Contact", href: "/contacts", icon: "👤" },
  { label: "Schedule Showing", href: "/showings", icon: "🔑" },
  { label: "Create Task", href: "/tasks", icon: "📋" },
  { label: "Create Deal", href: "/pipeline", icon: "💰" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
];

const HELP_ACTION = { label: "Open Help Center", href: "/help", icon: "❓" };

function routeQuery(query: string): "help" | "action" | "mixed" {
  if (/^(how|what|why|when|where|can i|do i|is there|help|guide|tutorial)/i.test(query)) return "help";
  if (/^(create|add|new|open|go to|navigate|delete|update)/i.test(query)) return "action";
  return "mixed";
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const { data: session } = useSession();
  const enabledFeatures = session?.user?.enabledFeatures as string[] | undefined;
  const hasHelp = Array.isArray(enabledFeatures) && enabledFeatures.includes("assistant");
  const features = useMemo(() => {
    if (!hasHelp || typeof window === "undefined") return [];
    try { return getAllFeatures(); } catch { return []; }
  }, [hasHelp]);

  // Cmd+K shortcut
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
    setSearchQuery("");
    router.push(href);
  }, [router]);

  // Search contacts + listings
  const [searchResults, setSearchResults] = useState<{ contacts: any[]; listings: any[] }>({ contacts: [], listings: [] });
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) { setSearchResults({ contacts: [], listings: [] }); return; }
    if (searchQuery.length < 2) { setSearchResults({ contacts: [], listings: [] }); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const [c, l] = await Promise.all([
          fetch(`/api/contacts?search=${encodeURIComponent(searchQuery)}&limit=5`).then(r => r.ok ? r.json() : []),
          fetch(`/api/listings?search=${encodeURIComponent(searchQuery)}&limit=5`).then(r => r.ok ? r.json().then(j => j.data ?? j) : []),
        ]);
        setSearchResults({
          contacts: Array.isArray(c) ? c.slice(0, 5) : [],
          listings: Array.isArray(l) ? l.slice(0, 5) : [],
        });
      } catch { setSearchResults({ contacts: [], listings: [] }); }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-label="Command palette">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Dialog */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 w-[90vw] max-w-lg">
        <Command className="bg-card rounded-xl border border-border shadow-2xl overflow-hidden" label="Search everything">
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder={hasHelp ? "Search help, CRM, or type a command..." : "Search CRM or type a command..."}
              className="flex-1 py-3 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
              autoFocus
              onValueChange={setSearchQuery}
            />
            <kbd className="text-[10px] text-muted-foreground/50 bg-muted px-1.5 py-0.5 rounded">ESC</kbd>
          </div>

          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Search Results — Contacts */}
            {searchResults.contacts.length > 0 && (
              <Command.Group heading="Contacts" className="mb-2">
                {searchResults.contacts.map((c: any) => (
                  <Command.Item
                    key={c.id}
                    value={`contact ${c.name} ${c.email || ""} ${c.phone || ""}`}
                    onSelect={() => navigate(`/contacts/${c.id}`)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent transition-colors"
                  >
                    <span className="text-lg shrink-0">👤</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-medium">{c.name}</span>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.type} {c.email ? `· ${c.email}` : ""} {c.phone ? `· ${c.phone}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Search Results — Listings */}
            {searchResults.listings.length > 0 && (
              <Command.Group heading="Listings" className="mb-2">
                {searchResults.listings.map((l: any) => (
                  <Command.Item
                    key={l.id}
                    value={`listing ${l.address} ${l.mls_number || ""}`}
                    onSelect={() => navigate(`/listings/${l.id}`)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent transition-colors"
                  >
                    <span className="text-lg shrink-0">🏠</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground font-medium">{l.address}</span>
                      <p className="text-xs text-muted-foreground truncate">
                        {l.status} {l.list_price ? `· $${Number(l.list_price).toLocaleString()}` : ""} {l.mls_number ? `· MLS ${l.mls_number}` : ""}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Help Articles — professional+ only */}
            {features.length > 0 && (
              <Command.Group heading="Help" className="mb-2">
                {features.map((f) => (
                  <Command.Item
                    key={f.slug}
                    value={`help ${f.title} ${f.problem}`}
                    onSelect={() => navigate(`/help/${f.slug}`)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent transition-colors"
                  >
                    <BookOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-foreground">{getFeatureIcon(f.slug)} {f.title}</span>
                      <p className="text-xs text-muted-foreground truncate">{f.problem.slice(0, 80)}</p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Quick Actions */}
            <Command.Group heading="Actions" className="mb-2">
              {[...BASE_ACTIONS, ...(hasHelp ? [HELP_ACTION] : [])].map((action) => (
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

            {/* Ask AI — always visible when there is a query */}
            {searchQuery.trim() && (
              <Command.Group heading="AI" className="mb-2">
                <Command.Item
                  value={`ask ai ${searchQuery}`}
                  onSelect={() => {
                    setOpen(false);
                    window.dispatchEvent(new CustomEvent("open-agent", { detail: { query: searchQuery } }));
                  }}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm cursor-pointer data-[selected=true]:bg-accent transition-colors"
                >
                  <span className="text-lg shrink-0">✨</span>
                  <span className="text-foreground">Ask AI: &ldquo;{searchQuery.length > 50 ? searchQuery.slice(0, 50) + "..." : searchQuery}&rdquo;</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/50 shrink-0 ml-auto" />
                </Command.Item>
              </Command.Group>
            )}
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
