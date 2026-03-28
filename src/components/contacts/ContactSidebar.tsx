"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, X, ArrowDownAZ, Clock, Upload, Download, GitMerge } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types";
import { CONTACT_TYPE_COLORS, type ContactType } from "@/lib/constants";
import {
  BUYER_STAGES,
  SELLER_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
} from "@/lib/constants/contacts";

// Map pipeline keys to stage_bar filter values
const PIPELINE_TO_STAGE: Record<string, string> = {
  new: "new",
  qualified: "qualified",
  active: "active_search", // matches both active_search and active_listing
  under_contract: "under_contract",
  closed: "closed",
  cold: "cold",
};

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

// Mini stage dots for sidebar — shows pipeline progress as colored circles
function MiniStageDots({
  contactType,
  currentStage,
}: {
  contactType: string;
  currentStage: string | null;
}) {
  const stages =
    contactType === "seller"
      ? SELLER_STAGES.filter((s) => s !== "cold")
      : BUYER_STAGES.filter((s) => s !== "cold");
  const stage = currentStage ?? "new";
  const isCold = stage === "cold";
  const currentIndex = stages.indexOf(stage as any);

  return (
    <div className="flex items-center gap-0.5 mt-1">
      {stages.map((s, i) => {
        // Past stages use neutral gray-500 (visited), NOT green (complete).
        // We have no subtask data here, so green would falsely imply "all tasks done".
        // Only the full StageBar (which receives stage data) should ever show green/amber.
        const isVisited = !isCold && currentIndex > i;
        const isCurrent = !isCold && stage === s;
        const colors = STAGE_COLORS[s];

        return (
          <div
            key={s}
            title={STAGE_LABELS[s]}
            className={`
              w-1.5 h-1.5 rounded-full transition-all
              ${
                isVisited
                  ? "bg-gray-500"
                  : isCurrent
                  ? `${colors.dot} ring-1 ring-offset-0.5 ring-current`
                  : "bg-gray-200"
              }
            `}
          />
        );
      })}
      {isCold && (
        <div
          title="Cold"
          className="w-1.5 h-1.5 rounded-full bg-gray-400 ml-0.5"
        />
      )}
    </div>
  );
}

// Filter chip types
type TypeFilter = "all" | "buyer" | "seller" | "customer" | "agent" | "partner" | "other";
type StageFilter = "all" | string;

const TYPE_FILTERS: { value: TypeFilter; label: string; color: string }[] = [
  { value: "all", label: "All", color: "bg-gray-100 text-gray-700" },
  { value: "customer", label: "Lead", color: "bg-green-100 text-green-700" },
  { value: "buyer", label: "Buyer", color: "bg-blue-100 text-blue-700" },
  { value: "seller", label: "Seller", color: "bg-purple-100 text-purple-700" },
  { value: "agent", label: "Agent", color: "bg-orange-100 text-orange-700" },
  { value: "partner", label: "Partner", color: "bg-teal-100 text-teal-700" },
];

const STAGE_FILTERS: { value: StageFilter; label: string; dot: string }[] = [
  { value: "all", label: "All Stages", dot: "bg-gray-400" },
  { value: "new", label: "New", dot: "bg-sky-500" },
  { value: "qualified", label: "Qualified", dot: "bg-amber-500" },
  { value: "active_search", label: "Active", dot: "bg-green-500" },
  { value: "under_contract", label: "Contract", dot: "bg-orange-500" },
  { value: "closed", label: "Closed", dot: "bg-emerald-600" },
  { value: "cold", label: "Cold", dot: "bg-gray-400" },
];

type SortMode = "recent" | "alpha";

export function ContactSidebar({ contacts }: { contacts: Contact[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);

  // Auto-apply stage filter from ?stage= query param (from pipeline click)
  useEffect(() => {
    const stageParam = searchParams.get("stage");
    if (stageParam && PIPELINE_TO_STAGE[stageParam]) {
      setStageFilter(PIPELINE_TO_STAGE[stageParam]);
      setShowFilters(true);
    }
  }, [searchParams]);

  const hasActiveFilter = typeFilter !== "all" || stageFilter !== "all";

  // Compute stage counts from full contact list (before filtering)
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = { all: contacts.length };
    for (const c of contacts) {
      const stage = ((c as Record<string, unknown>).stage_bar as string | null) ?? "new";
      counts[stage] = (counts[stage] || 0) + 1;
      // Count active_listing under active_search as well
      if (stage === "active_listing") {
        counts["active_search"] = (counts["active_search"] || 0) + 1;
      }
    }
    return counts;
  }, [contacts]);

  const filtered = contacts.filter((c) => {
    // Text search
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase());

    // Type filter
    const matchesType = typeFilter === "all" || c.type === typeFilter;

    // Stage filter — "active_search" also matches "active_listing"
    const contactStage = (c as Record<string, unknown>).stage_bar as string | null;
    const effectiveStage = contactStage ?? "new";
    const matchesStage =
      stageFilter === "all" ||
      effectiveStage === stageFilter ||
      (stageFilter === "active_search" && effectiveStage === "active_listing") ||
      (stageFilter === "active_listing" && effectiveStage === "active_search");

    return matchesSearch && matchesType && matchesStage;
  });

  // Apply sort
  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortMode === "alpha") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list;
  }, [filtered, sortMode]);

  return (
    <aside className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Contacts{" "}
            <span className="text-muted-foreground font-normal">
              ({sorted.length})
            </span>
          </h2>
          <div className="flex items-center gap-0.5">
            <a
              href="/api/contacts/export"
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
              title="Export CSV"
            >
              <Download className="h-3.5 w-3.5" />
            </a>
            <label
              className={cn(
                "p-1.5 rounded-md transition-colors cursor-pointer",
                importing ? "opacity-50 pointer-events-none" : "text-muted-foreground hover:bg-muted"
              )}
              title="Import CSV"
            >
              <Upload className="h-3.5 w-3.5" />
              <input
                type="file"
                accept=".csv"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setImporting(true);
                  setImportResult(null);
                  try {
                    const fd = new FormData();
                    fd.append("file", file);
                    const res = await fetch("/api/contacts/import", { method: "POST", body: fd });
                    const data = await res.json();
                    setImportResult(`Imported ${data.imported}, skipped ${data.skipped}`);
                    if (data.imported > 0) window.location.reload();
                  } catch {
                    setImportResult("Import failed");
                  }
                  setImporting(false);
                  e.target.value = "";
                }}
              />
            </label>
            <a
              href="/contacts/merge"
              className="p-1.5 rounded-md text-muted-foreground hover:bg-muted transition-colors"
              title="Find duplicates"
            >
              <GitMerge className="h-3.5 w-3.5" />
            </a>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`
                p-1.5 rounded-md transition-colors relative
                ${showFilters || hasActiveFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}
              `}
              title="Filter contacts"
            >
              <Filter className="h-4 w-4" />
              {hasActiveFilter && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
              )}
            </button>
          </div>
        </div>
        {importResult && (
          <div className="text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1 flex items-center justify-between">
            <span>{importResult}</span>
            <button onClick={() => setImportResult(null)} className="text-emerald-400 hover:text-emerald-600"><X className="h-3 w-3" /></button>
          </div>
        )}

        {/* Search + sort toggle */}
        <div className="flex gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-7 h-9 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setSortMode(sortMode === "recent" ? "alpha" : "recent")}
            className={cn(
              "h-9 w-9 flex items-center justify-center rounded-md border shrink-0 transition-colors",
              "hover:bg-muted text-muted-foreground hover:text-foreground"
            )}
            title={sortMode === "recent" ? "Sort A-Z" : "Sort by Recent"}
          >
            {sortMode === "recent" ? (
              <Clock className="h-4 w-4" />
            ) : (
              <ArrowDownAZ className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Filters — collapsible */}
        {showFilters && (
          <div className="space-y-2 pt-1 animate-in slide-in-from-top-2 duration-150">
            {/* Type filter chips */}
            <div className="flex flex-wrap gap-1">
              {TYPE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  className={`
                    px-2 py-0.5 rounded-full text-[10px] font-medium transition-all
                    ${
                      typeFilter === f.value
                        ? `${f.color} ring-1 ring-current shadow-sm`
                        : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                    }
                  `}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Stage filter chips */}
            <div className="flex flex-wrap gap-1">
              {STAGE_FILTERS.map((f) => {
                const count = f.value === "all" ? contacts.length : (stageCounts[f.value] ?? 0);
                return (
                  <button
                    key={f.value}
                    onClick={() => setStageFilter(f.value)}
                    className={`
                      flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all
                      ${
                        stageFilter === f.value
                          ? "bg-white ring-1 ring-gray-300 shadow-sm text-foreground"
                          : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                      }
                    `}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                    {f.label}
                    {count > 0 && (
                      <span className="opacity-60">({count})</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Clear filters */}
            {hasActiveFilter && (
              <button
                onClick={() => {
                  setTypeFilter("all");
                  setStageFilter("all");
                }}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Contact items */}
      <div className="flex-1 overflow-y-auto">
        {sorted.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {search || hasActiveFilter
                ? "No matching contacts"
                : "No contacts yet"}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {sorted.map((contact) => {
              const isActive = pathname === `/contacts/${contact.id}`;
              const initials = getInitials(contact.name);
              const avatarBg =
                contact.type === "seller"
                  ? "bg-purple-500"
                  : contact.type === "partner"
                  ? "bg-teal-500"
                  : contact.type === "customer"
                  ? "bg-green-500"
                  : contact.type === "agent"
                  ? "bg-orange-500"
                  : "bg-blue-500";
              const contactStage = (contact as Record<string, unknown>)
                .stage_bar as string | null;

              return (
                <Link key={contact.id} href={`/contacts/${contact.id}`}>
                  <div
                    className={`px-4 py-3 border-b border-border/40 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary/10 border-l-2 border-l-primary shadow-sm"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div
                        className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${avatarBg}`}
                      >
                        <span className="text-xs font-semibold text-white">
                          {initials}
                        </span>
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-sm font-medium truncate ${
                            isActive ? "text-primary" : ""
                          }`}
                        >
                          {contact.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {contact.phone}
                        </p>
                        {/* Mini stage dots */}
                        <MiniStageDots
                          contactType={contact.type}
                          currentStage={contactStage}
                        />
                      </div>

                      {/* Type badge */}
                      <Badge
                        variant="secondary"
                        className={`${CONTACT_TYPE_COLORS[contact.type as ContactType] ?? ""} text-[11px] px-1.5 py-0 shrink-0 capitalize`}
                      >
                        {contact.type}
                      </Badge>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
