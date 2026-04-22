"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, LayoutGrid, List, MapPin } from "lucide-react";

interface ListingRow {
  id: string;
  address: string;
  status: string;
  mls_number: string | null;
  list_price: number | null;
  property_type: string | null;
  hero_image_url: string | null;
  created_at: string;
  contacts: { name: string } | null;
}

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  active: { className: "bg-success/15 text-success border-success/30 font-semibold", label: "Active" },
  pending: { className: "bg-[#f5c26b]/15 text-[#8a5a1e] border-[#f5c26b]/30 font-semibold", label: "Pending" },
  sold: { className: "bg-primary/15 text-primary border-primary/30 font-semibold", label: "Sold" },
  conditional: { className: "bg-[#f5c26b]/15 text-[#8a5a1e] border-[#f5c26b]/30", label: "Conditional" },
  expired: { className: "bg-destructive/15 text-destructive border-destructive/30", label: "Expired" },
  withdrawn: { className: "bg-muted text-muted-foreground border-border", label: "Withdrawn" },
};

const STATUS_DOT: Record<string, string> = {
  active: "bg-success",
  pending: "bg-[#f5c26b]",
  sold: "bg-primary",
  conditional: "bg-[#f5c26b]",
  expired: "bg-destructive",
  withdrawn: "bg-muted-foreground",
};

function formatPrice(price: number | null) {
  if (price == null) return "\u2014";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(price);
}

function formatPriceShort(price: number | null) {
  if (price == null) return "\u2014";
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`;
  return `$${price}`;
}

// ── Card View ──────────────────────────
function ListingCard({ listing, onClick }: { listing: ListingRow; onClick: () => void }) {
  const status = STATUS_STYLES[listing.status] || { className: "bg-muted text-muted-foreground", label: listing.status };
  const dotColor = STATUS_DOT[listing.status] || "bg-muted-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left w-full rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm hover:shadow-md hover:border-brand/30 transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
    >
      {/* Photo */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted/30">
        {listing.hero_image_url ? (
          <img
            src={`${listing.hero_image_url}&w=600&h=375&fit=crop`}
            alt={listing.address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-muted-foreground/30">
            🏠
          </div>
        )}
        {/* Status pill overlay */}
        <div className="absolute top-3 left-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm bg-white/90 dark:bg-zinc-900/90 shadow-sm ${listing.status === "sold" ? "text-primary" : listing.status === "pending" ? "text-[#8a5a1e]" : "text-success"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
            {status.label}
          </span>
        </div>
        {/* Price overlay */}
        <div className="absolute bottom-3 right-3">
          <span className="px-3 py-1.5 rounded-lg text-sm font-bold bg-black/70 text-white backdrop-blur-sm">
            {formatPriceShort(listing.list_price)}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="p-4 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-brand shrink-0 mt-0.5" />
          <h3 className="text-sm font-semibold leading-tight line-clamp-2 group-hover:text-brand transition-colors">
            {listing.address}
          </h3>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{listing.property_type || "Residential"}</span>
          {listing.mls_number && (
            <span className="font-mono">{listing.mls_number}</span>
          )}
        </div>
        {(listing.contacts as any)?.name && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1 border-t border-border/30">
            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0">
              {(listing.contacts as any).name.split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
            </span>
            <span className="truncate">{(listing.contacts as any).name}</span>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Main Component ──────────────────────────
export function ListingsTableClient({
  listings,
  currentPage = 1,
  totalPages = 1,
  totalCount,
}: {
  listings: ListingRow[];
  currentPage?: number;
  totalPages?: number;
  totalCount?: number;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "table">("grid");

  const filtered = listings.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.address.toLowerCase().includes(q) ||
      (l.mls_number?.toLowerCase().includes(q)) ||
      l.status.toLowerCase().includes(q) ||
      ((l.contacts as any)?.name?.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address, MLS #, or seller..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search listings"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5 bg-muted/30">
          <button
            type="button"
            onClick={() => setView("grid")}
            className={`p-1.5 rounded-md transition-colors ${view === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`p-1.5 rounded-md transition-colors ${view === "table" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-label="Table view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Grid View */}
      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              onClick={() => router.push(`/listings/${listing.id}`)}
            />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              No listings found.
            </div>
          )}
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <DataTable
          columns={[
            {
              key: "address",
              header: "Property",
              sortable: true,
              render: (r) => (
                <div className="flex items-center gap-3">
                  {r.hero_image_url ? (
                    <img
                      src={`${r.hero_image_url}&w=80&h=56&fit=crop`}
                      alt=""
                      className="w-[56px] h-[40px] rounded-md object-cover shrink-0 border border-border/50"
                    />
                  ) : (
                    <div className="w-[56px] h-[40px] rounded-md bg-muted/50 border border-border/50 shrink-0 flex items-center justify-center text-muted-foreground text-xs">
                      🏠
                    </div>
                  )}
                  <span className="font-medium">{r.address}</span>
                </div>
              ),
            },
            {
              key: "mls_number",
              header: "MLS #",
              render: (r) => <span className="text-muted-foreground font-mono text-xs">{r.mls_number || "\u2014"}</span>,
            },
            {
              key: "status",
              header: "Status",
              sortable: true,
              render: (r) => {
                const style = STATUS_STYLES[r.status] || { className: "bg-muted text-muted-foreground", label: r.status };
                return <Badge variant="outline" className={style.className}>{style.label}</Badge>;
              },
            },
            {
              key: "list_price",
              header: "Price",
              sortable: true,
              render: (r) => <span className="font-medium">{formatPrice(r.list_price)}</span>,
            },
            {
              key: "contacts",
              header: "Seller",
              render: (r) => <span className="text-muted-foreground">{(r.contacts as any)?.name || "\u2014"}</span>,
            },
            {
              key: "created_at",
              header: "Created",
              render: (r) =>
                <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString("en-CA", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}</span>,
            },
          ]}
          data={filtered}
          onRowClick={(row) => router.push(`/listings/${row.id}`)}
          emptyMessage="No listings found."
          ariaLabel="Listings list"
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border/50">
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages} ({totalCount} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push(`/listings?page=${currentPage - 1}`)}
              disabled={currentPage <= 1}
              className="px-3 py-1.5 text-sm rounded-md border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => router.push(`/listings?page=${currentPage + 1}`)}
              disabled={currentPage >= totalPages}
              className="px-3 py-1.5 text-sm rounded-md border border-border bg-card hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
