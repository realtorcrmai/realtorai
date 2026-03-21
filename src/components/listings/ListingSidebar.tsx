"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Search, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Listing } from "@/types";
import { LISTING_STATUS_COLORS } from "@/lib/constants";

/**
 * Derive 9 workflow phase dot statuses from listing-level data only.
 * Returns an array of "done" | "active" | "pending" for each phase.
 */
function getPhaseDots(listing: Listing): ("done" | "active" | "pending")[] {
  const hasPrice = listing.list_price != null;
  const hasMls = !!listing.mls_number;
  const isSold = listing.status === "sold";
  const isPending = listing.status === "pending";

  return [
    "done", // 1. Seller Intake — always done (listing exists)
    hasPrice ? "done" : "active", // 2. Data Enrichment
    hasPrice ? "done" : "pending", // 3. CMA
    hasPrice ? "done" : "pending", // 4. Pricing & Review
    hasPrice ? "active" : "pending", // 5. Form Generation
    "pending", // 6. E-Signature
    hasMls ? "done" : "pending", // 7. MLS Prep
    hasMls ? "done" : "pending", // 8. MLS Submission
    isSold ? "done" : isPending || hasMls ? "active" : "pending", // 9. Post-Listing
  ];
}

function ListingItem({
  listing,
  isActive,
  isSold,
}: {
  listing: Listing & { contacts?: { name: string; phone: string } | null };
  isActive: boolean;
  isSold?: boolean;
}) {
  return (
    <Link href={`/listings/${listing.id}`}>
      <div
        className={cn(
          "px-4 py-3 border-b border-border/40 cursor-pointer transition-colors",
          isActive
            ? "bg-primary/10 border-l-2 border-l-primary shadow-sm"
            : "hover:bg-muted/50",
          isSold && !isActive && "opacity-60"
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
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
                  {Number(listing.list_price).toLocaleString("en-CA", {
                    style: "currency",
                    currency: "CAD",
                    maximumFractionDigits: 0,
                  })}
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
            {/* Workflow phase dots */}
            <div className="flex gap-1 mt-1.5 ml-[18px]">
              {getPhaseDots(listing).map((status, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-[7px] w-[7px] rounded-full",
                    status === "done"
                      ? "bg-emerald-500"
                      : status === "active"
                        ? "bg-amber-500"
                        : "bg-muted-foreground/20"
                  )}
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
}

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

  const activeListings = filtered.filter((l) => l.status !== "sold");
  const soldListings = filtered.filter((l) => l.status === "sold");

  return (
    <aside className="w-[270px] shrink-0 border-r backdrop-blur-2xl bg-white/78 flex flex-col h-full overflow-hidden">
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
            {/* Active & pending listings */}
            {activeListings.map((listing) => (
              <ListingItem
                key={listing.id}
                listing={listing}
                isActive={pathname === `/listings/${listing.id}`}
              />
            ))}

            {/* Sold listings section */}
            {soldListings.length > 0 && (
              <>
                <div className="px-4 py-2 bg-muted/30 border-y border-border/30">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Sold ({soldListings.length})
                  </p>
                </div>
                {soldListings.map((listing) => (
                  <ListingItem
                    key={listing.id}
                    listing={listing}
                    isActive={pathname === `/listings/${listing.id}`}
                    isSold
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
