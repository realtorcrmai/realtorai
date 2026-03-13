"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { MapPin, Search, DollarSign } from "lucide-react";
import type { Listing } from "@/types";
import { LISTING_STATUS_COLORS } from "@/lib/constants";

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
