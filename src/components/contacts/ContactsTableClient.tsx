"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface ContactRow {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type: string;
  stage_bar: string | null;
  lead_status: string | null;
  last_activity_date: string | null;
  created_at: string;
}

const STAGE_COLORS: Record<string, string> = {
  new: "bg-[#516f90]/10 text-[#516f90] border-[#516f90]/20",
  qualified: "bg-brand/10 text-brand border-brand/20",
  active_search: "bg-brand/10 text-brand-dark border-brand/20",
  active_listing: "bg-brand/10 text-brand-dark border-brand/20",
  under_contract: "bg-[#f5c26b]/10 text-[#c87d2f] border-[#f5c26b]/20",
  closed: "bg-success/10 text-success border-success/20",
  cold: "bg-muted text-muted-foreground",
};

const STAGE_LABELS: Record<string, string> = {
  new: "New",
  qualified: "Qualified",
  active_search: "Active",
  active_listing: "Active",
  under_contract: "Contract",
  closed: "Closed",
  cold: "Cold",
};

const TYPE_COLORS: Record<string, string> = {
  buyer: "bg-primary/10 text-primary border-primary/20",
  seller: "bg-brand/10 text-brand border-brand/20",
  dual: "bg-[#516f90]/10 text-[#516f90] border-[#516f90]/20",
  customer: "bg-muted text-muted-foreground",
  partner: "bg-success/10 text-success border-success/20",
  other: "bg-muted text-muted-foreground",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).join("").substring(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-primary", "bg-brand", "bg-success", "bg-[#516f90]", "bg-[#c87d2f]", "bg-destructive",
];

function hashColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function ContactsTableClient({ contacts }: { contacts: ContactRow[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = contacts.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email?.toLowerCase().includes(q)) ||
      (c.phone?.includes(q)) ||
      c.type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <DataTable
        columns={[
          {
            key: "name",
            header: "Name",
            sortable: true,
            render: (r) => (
              <div className="flex items-center gap-2.5">
                <div className={`h-7 w-7 rounded-full ${hashColor(r.name)} flex items-center justify-center text-white text-[10px] font-semibold shrink-0`}>
                  {getInitials(r.name)}
                </div>
                <span className="font-medium">{r.name}</span>
              </div>
            ),
          },
          { key: "email", header: "Email", render: (r) => <span className="text-muted-foreground">{r.email || "\u2014"}</span> },
          { key: "phone", header: "Phone", render: (r) => <span className="text-muted-foreground">{r.phone || "\u2014"}</span> },
          {
            key: "type",
            header: "Type",
            sortable: true,
            render: (r) => <Badge variant="outline" className={`capitalize ${TYPE_COLORS[r.type] || ""}`}>{r.type}</Badge>,
          },
          {
            key: "stage_bar",
            header: "Stage",
            sortable: true,
            render: (r) => {
              const stage = r.stage_bar || "new";
              return <Badge variant="outline" className={STAGE_COLORS[stage] || STAGE_COLORS.new}>{STAGE_LABELS[stage] || stage}</Badge>;
            },
          },
          {
            key: "last_activity_date",
            header: "Last Activity",
            render: (r) => <span className="text-muted-foreground">{r.last_activity_date ? formatDate(r.last_activity_date) : "\u2014"}</span>,
          },
        ]}
        data={filtered}
        onRowClick={(row) => router.push(`/contacts/${row.id}`)}
        emptyMessage="No contacts found."
      />
    </div>
  );
}
