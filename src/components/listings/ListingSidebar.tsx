"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, DollarSign } from "lucide-react";
import type { Listing } from "@/types";
import { LISTING_STATUS_COLORS } from "@/lib/constants";

const STATUS_DOT_COLORS: Record<string, string> = {
  active: "bg-emerald-500",
  pending: "bg-amber-500",
  sold: "bg-blue-500",
};

// Simplified workflow derivation for sidebar (no document data available)
type StepStatus = "completed" | "in-progress" | "pending";

function deriveSimpleWorkflow(listing: Listing): StepStatus[] {
  const hasPrice = listing.list_price != null;
  const hasMls = !!listing.mls_number;
  const isSold = listing.status === "sold";
  const isPending = listing.status === "pending";

  // If sold, all phases are complete — the sale proves the workflow was done.
  if (isSold) {
    return Array(9).fill("completed") as StepStatus[];
  }

  // Raw statuses for 9 phases (same order as ListingWorkflow)
  const raw: StepStatus[] = [
    "completed", // 1. Seller Intake — always done
    hasPrice ? "completed" : "in-progress", // 2. Data Enrichment
    hasPrice ? "completed" : "pending", // 3. CMA
    hasPrice ? "completed" : "pending", // 4. Pricing & Review
    hasPrice ? "in-progress" : "pending", // 5. Form Generation (no doc data, assume in-progress if price set)
    "pending", // 6. E-Signature
    hasMls ? "completed" : "pending", // 7. MLS Prep
    hasMls ? "completed" : "pending", // 8. MLS Submission
    isPending ? "in-progress" : hasMls ? "in-progress" : "pending", // 9. Post-Listing
  ];

  // Sequential enforcement
  for (let i = 1; i < raw.length; i++) {
    if (raw[i - 1] !== "completed") {
      if (raw[i] === "completed") raw[i] = "pending";
      if (raw[i] === "in-progress" && raw[i - 1] === "pending") raw[i] = "pending";
    }
  }

  return raw;
}

const STEP_DOT_STYLES: Record<StepStatus, string> = {
  completed: "bg-green-500",
  "in-progress": "bg-orange-400",
  pending: "bg-gray-300 dark:bg-gray-600",
};

export function ListingSidebar({
  listings,
  sellers,
}: {
  listings: (Listing & { contacts?: { name: string; phone: string } | null })[];
  sellers: { id: string; name: string; phone: string }[];
}) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");

  const filtered = listings.filter(
    (l) =>
      l.address.toLowerCase().includes(search.toLowerCase()) ||
      (l.mls_number ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="w-[280px] shrink-0 border-r bg-card/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Listings{" "}
            <span className="text-muted-foreground font-normal">
              ({listings.length})
            </span>
          </h2>
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
      </div>

      {/* Listing items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {search ? "No matching listings" : "No listings yet"}
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
                                ? "ring-emerald-500/30"
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
