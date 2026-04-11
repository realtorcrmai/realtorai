"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShowingRow {
  id: string;
  start_time: string;
  status: string;
  buyer_agent_name: string | null;
  buyer_agent_phone: string | null;
  listing_id: string;
  listings: { address: string };
}

const STATUS_STYLES: Record<string, { className: string; label: string }> = {
  confirmed: { className: "bg-success/15 text-success border-success/30 font-semibold", label: "Confirmed" },
  requested: { className: "bg-[#f5c26b]/15 text-[#c87d2f] border-[#f5c26b]/30", label: "Requested" },
  denied: { className: "bg-destructive/15 text-destructive border-destructive/30", label: "Denied" },
  cancelled: { className: "bg-muted text-muted-foreground border-border", label: "Cancelled" },
  completed: { className: "bg-primary/15 text-primary border-primary/30", label: "Completed" },
};

export function ShowingsTableClient({ showings }: { showings: ShowingRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const STATUS_FILTERS = [
    { value: "all", label: "All" },
    { value: "requested", label: "Requested" },
    { value: "confirmed", label: "Confirmed" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const requestedCount = showings.filter((s) => s.status === "requested").length;

  const filtered = showings.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (s.listings as any)?.address?.toLowerCase().includes(q) ||
      s.buyer_agent_name?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by property or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => { setStatusFilter(f.value); }}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                statusFilter === f.value
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
              {f.value === "requested" && requestedCount > 0 && (
                <span className="ml-1.5 bg-brand/15 text-brand text-[10px] font-semibold px-1.5 py-0.5 rounded-full">{requestedCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>
      <DataTable
        columns={[
          {
            key: "listings",
            header: "Property",
            render: (r) => <span className="font-medium">{(r.listings as any)?.address || "\u2014"}</span>,
          },
          {
            key: "buyer_agent_name",
            header: "Buyer Agent",
            render: (r) => <span className="text-muted-foreground">{r.buyer_agent_name || "\u2014"}</span>,
          },
          {
            key: "start_time",
            header: "Date / Time",
            sortable: true,
            render: (r) =>
              <span className="text-muted-foreground">{new Date(r.start_time).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}</span>,
          },
          {
            key: "status",
            header: "Status",
            render: (r) => {
              const style = STATUS_STYLES[r.status] || { className: "bg-muted text-muted-foreground", label: r.status };
              return <Badge variant="outline" className={style.className}>{style.label}</Badge>;
            },
          },
        ]}
        data={filtered}
        onRowClick={(row) => router.push(`/showings/${row.id}`)}
        emptyMessage="No showings found."
      />
    </div>
  );
}
