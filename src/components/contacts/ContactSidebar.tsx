"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Filter, X } from "lucide-react";
import type { Contact } from "@/types";
import { CONTACT_TYPE_COLORS, type ContactType } from "@/lib/constants";
import {
  BUYER_STAGES,
  SELLER_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
} from "@/lib/constants/contacts";

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
  const currentIndex = stages.indexOf(stage as (typeof stages)[number]);

  return (
    <div className="flex items-center gap-0.5 mt-1">
      {stages.map((s, i) => {
        const isCompleted = !isCold && currentIndex > i;
        const isCurrent = !isCold && stage === s;
        const colors = STAGE_COLORS[s];

        return (
          <div
            key={s}
            title={STAGE_LABELS[s]}
            className={`
              w-1.5 h-1.5 rounded-full transition-all
              ${
                isCompleted
                  ? "bg-emerald-500"
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
type TypeFilter = "all" | "buyer" | "seller" | "partner" | "other";
type StageFilter = "all" | string;

const TYPE_FILTERS: { value: TypeFilter; label: string; color: string }[] = [
  { value: "all", label: "All", color: "bg-gray-100 text-gray-700" },
  { value: "buyer", label: "Buyer", color: "bg-blue-100 text-blue-700" },
  { value: "seller", label: "Seller", color: "bg-purple-100 text-purple-700" },
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

export function ContactSidebar({ contacts }: { contacts: Contact[] }) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilter = typeFilter !== "all" || stageFilter !== "all";

  const filtered = contacts.filter((c) => {
    // Text search
    const matchesSearch =
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase());

    // Type filter
    const matchesType = typeFilter === "all" || c.type === typeFilter;

    // Stage filter
    const contactStage = (c as Record<string, unknown>).stage_bar as string | null;
    const matchesStage =
      stageFilter === "all" ||
      (contactStage ?? "new") === stageFilter;

    return matchesSearch && matchesType && matchesStage;
  });

  return (
    <aside className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Contacts{" "}
            <span className="text-muted-foreground font-normal">
              ({filtered.length})
            </span>
          </h2>
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

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
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
              {STAGE_FILTERS.map((f) => (
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
                </button>
              ))}
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
        {filtered.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {search || hasActiveFilter
                ? "No matching contacts"
                : "No contacts yet"}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((contact) => {
              const isActive = pathname === `/contacts/${contact.id}`;
              const initials = getInitials(contact.name);
              const avatarBg =
                contact.type === "seller"
                  ? "bg-purple-500"
                  : contact.type === "partner"
                  ? "bg-teal-500"
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
