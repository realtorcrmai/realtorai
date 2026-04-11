"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, DollarSign, Filter, X } from "lucide-react";
import type { Listing } from "@/types";
import { LISTING_STATUS_COLORS } from "@/lib/constants";

const STATUS_DOT_COLORS: Record<string, string> = {
  active: "bg-success",
  pending: "bg-amber-500",
  sold: "bg-brand-dark",
};

type StepStatus = "completed" | "in-progress" | "pending";

function deriveSimpleWorkflow(listing: Listing): StepStatus[] {
  const hasPrice = listing.list_price != null;
  const hasMls = !!listing.mls_number;
  const isSold = listing.status === "sold";
  const isPending = listing.status === "pending";

  if (isSold) {
    return Array(9).fill("completed") as StepStatus[];
  }

  const raw: StepStatus[] = [
    "completed",
    hasPrice ? "completed" : "in-progress",
    hasPrice ? "completed" : "pending",
    hasPrice ? "completed" : "pending",
    hasPrice ? "in-progress" : "pending",
    "pending",
    hasMls ? "completed" : "pending",
    hasMls ? "completed" : "pending",
    isPending ? "in-progress" : hasMls ? "in-progress" : "pending",
  ];

  for (let i = 1; i < raw.length; i++) {
    if (raw[i - 1] !== "completed") {
      if (raw[i] === "completed") raw[i] = "pending";
      if (raw[i] === "in-progress" && raw[i - 1] === "pending") raw[i] = "pending";
    }
  }

  return raw;
}

const STEP_DOT_STYLES: Record<StepStatus, string> = {
  completed: "bg-success",
  "in-progress": "bg-amber-400",
  pending: "bg-gray-300 dark:bg-gray-600",
};

type StatusFilter = "all" | "active" | "pending" | "sold";

const STATUS_FILTERS: { value: StatusFilter; label: string; dot: string }[] = [
  { value: "all", label: "All", dot: "bg-gray-400" },
  { value: "active", label: "Active", dot: "bg-brand" },
  { value: "pending", label: "Pending", dot: "bg-amber-500" },
  { value: "sold", label: "Sold", dot: "bg-brand" },
];

export function ListingSidebar({
  listings,
  sellers,
}: {
  listings: (Listing & { contacts?: { name: string; phone: string } | null })[];
  sellers: { id: string; name: string; phone: string }[];
}) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilter = statusFilter !== "all";

  const filtered = listings.filter((l) => {
    const matchesSearch =
      !search ||
      l.address.toLowerCase().includes(search.toLowerCase()) ||
      (l.mls_number ?? "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || l.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <aside className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Listings{" "}
            <span className="text-muted-foreground font-normal">
              ({filtered.length})
            </span>
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-md transition-colors relative ${
              showFilters || hasActiveFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
            title="Filter listings"
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilter && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand" />
            )}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search address or MLS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {showFilters && (
          <div className="space-y-2 pt-1 animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    statusFilter === f.value
                      ? "bg-white ring-1 ring-gray-300 shadow-sm text-foreground"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                  {f.label}
                </button>
              ))}
            </div>
            {hasActiveFilter && (
              <button
                onClick={() => setStatusFilter("all")}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Listing items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {search || hasActiveFilter ? "No matching listings" : "No listings yet"}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((listing) => {
              const isActive = pathname === `/listings/${listing.id}`;
              return (
                <Link key={listing.id} href={`/listings/${listing.id}`}>
                  <div
                    className={`px-4 py-3 border-b border-border/40 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary/10 border-l-2 border-l-primary shadow-sm"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-3 w-3 rounded-full shrink-0 ring-2 ring-offset-1 ring-offset-background ${
                              STATUS_DOT_COLORS[listing.status] ?? "bg-gray-400"
                            } ${
                              listing.status === "active"
                                ? "ring-brand/30"
                                : listing.status === "pending"
                                  ? "ring-amber-500/30"
                                  : "ring-blue-500/30"
                            }`}
                            title={listing.status}
                          />
                          <p
                            className={`text-sm font-medium truncate ${
                              isActive ? "text-primary" : ""
                            }`}
                          >
                            {listing.address}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 ml-[18px]">
                          {listing.list_price != null && (
                            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                              <DollarSign className="h-3 w-3" />
                              {Number(listing.list_price).toLocaleString(
                                "en-CA",
                                {
                                  style: "currency",
                                  currency: "CAD",
                                  maximumFractionDigits: 0,
                                }
                              )}
                            </span>
                          )}
                          {listing.mls_number && (
                            <span className="text-xs text-muted-foreground">
                              MLS# {listing.mls_number}
                            </span>
                          )}
                        </div>
                        {listing.contacts && (
                          <p className="text-xs text-muted-foreground mt-1 ml-[18px]">
                            {listing.contacts.name}
                          </p>
                        )}
                        {/* Workflow progress dots */}
                        <div className="flex items-center gap-1 mt-2 ml-[18px]">
                          {deriveSimpleWorkflow(listing).map((stepStatus, idx) => (
                            <span
                              key={idx}
                              className={`h-2 w-2 rounded-full ${STEP_DOT_STYLES[stepStatus]}`}
                            />
                          ))}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={`${LISTING_STATUS_COLORS[listing.status as keyof typeof LISTING_STATUS_COLORS] ?? ""} text-[11px] px-1.5 py-0 shrink-0 capitalize`}
                      >
                        {listing.status}
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
