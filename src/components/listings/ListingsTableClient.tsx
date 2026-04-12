"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ListingRow {
  id: string;
  address: string;
  status: string;
  mls_number: string | null;
  list_price: number | null;
  property_type: string | null;
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

function formatPrice(price: number | null) {
  if (price == null) return "\u2014";
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(price);
}

export function ListingsTableClient({ listings }: { listings: ListingRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

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
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by address, MLS #, or seller..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
          aria-label="Search listings"
        />
      </div>
      <DataTable
        columns={[
          {
            key: "address",
            header: "Address",
            sortable: true,
            render: (r) => <span className="font-medium">{r.address}</span>,
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
    </div>
  );
}
