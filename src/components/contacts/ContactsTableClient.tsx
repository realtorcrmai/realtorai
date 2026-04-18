"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Phone, Mail, Eye } from "lucide-react";
import { ContactPreviewSheet } from "@/components/contacts/ContactPreviewSheet";
import { bulkUpdateContactStage, bulkDeleteContacts, bulkExportContacts } from "@/actions/contacts";
import { toast } from "sonner";

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
  newsletter_intelligence: { engagement_score?: number } | null;
}

const STAGE_COLORS: Record<string, string> = {
  new: "bg-[#516f90]/10 text-[#516f90] border-[#516f90]/20",
  qualified: "bg-brand/10 text-brand border-brand/20",
  active_search: "bg-brand/10 text-brand-dark border-brand/20",
  active_listing: "bg-brand/10 text-brand-dark border-brand/20",
  under_contract: "bg-[#f5c26b]/10 text-[#8a5a1e] border-[#f5c26b]/20",
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

type FilterState = {
  type: string;
  stage: string;
  engagement: string;
};

const TYPE_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "buyer", label: "Buyer" },
  { value: "seller", label: "Seller" },
  { value: "dual", label: "Dual" },
  { value: "customer", label: "Customer" },
  { value: "partner", label: "Partner" },
  { value: "other", label: "Other" },
];

const STAGE_OPTIONS = [
  { value: "", label: "All Stages" },
  { value: "new", label: "New" },
  { value: "qualified", label: "Qualified" },
  { value: "active_search", label: "Active Search" },
  { value: "active_listing", label: "Active Listing" },
  { value: "under_contract", label: "Under Contract" },
  { value: "closed", label: "Closed" },
  { value: "cold", label: "Cold" },
];

const ENGAGEMENT_OPTIONS = [
  { value: "", label: "All Scores" },
  { value: "hot", label: "Hot (60+)" },
  { value: "warm", label: "Warm (30-59)" },
  { value: "cold", label: "Cold (<30)" },
  { value: "none", label: "No Score" },
];

export function ContactsTableClient({ contacts }: { contacts: ContactRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<FilterState>({ type: "", stage: "", engagement: "" });

  // Sync filters from URL search params (stat card clicks)
  useEffect(() => {
    const stage = searchParams.get("stage") ?? "";
    const engagement = searchParams.get("engagement") ?? "";
    if (stage || engagement) {
      setFilters((f) => ({ ...f, stage, engagement }));
    }
  }, [searchParams]);
  const [previewContact, setPreviewContact] = useState<ContactRow | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const weekAgo = searchParams.get("recent") === "week"
    ? new Date(Date.now() - 7 * 86_400_000).toISOString()
    : null;
  const pipelineView = searchParams.get("view") === "pipeline";
  const urlFilterCount = (weekAgo ? 1 : 0) + (pipelineView ? 1 : 0);
  const activeFilterCount = [filters.type, filters.stage, filters.engagement].filter(Boolean).length + urlFilterCount;

  const filtered = contacts.filter((c) => {
    // Recent filter (from stat card click)
    if (weekAgo && c.created_at < weekAgo) return false;
    // Pipeline view — show contacts with active pipeline stage (not closed/cold)
    if (pipelineView && (!c.stage_bar || ["closed", "cold"].includes(c.stage_bar))) return false;
    // Text search
    if (search) {
      const q = search.toLowerCase();
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        (c.email?.toLowerCase().includes(q)) ||
        (c.phone?.includes(q)) ||
        c.type.toLowerCase().includes(q);
      if (!matchesSearch) return false;
    }
    // Type filter
    if (filters.type && c.type !== filters.type) return false;
    // Stage filter
    if (filters.stage && (c.stage_bar || "new") !== filters.stage) return false;
    // Engagement filter
    if (filters.engagement) {
      const score = (c.newsletter_intelligence as Record<string, unknown>)?.engagement_score as number | undefined;
      if (filters.engagement === "hot" && (score == null || score < 60)) return false;
      if (filters.engagement === "warm" && (score == null || score < 30 || score >= 60)) return false;
      if (filters.engagement === "cold" && (score == null || score >= 30)) return false;
      if (filters.engagement === "none" && score != null) return false;
    }
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            aria-label="Search contacts"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            aria-label="Filter by type"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={filters.stage}
            onChange={(e) => setFilters((f) => ({ ...f, stage: e.target.value }))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            aria-label="Filter by stage"
          >
            {STAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <select
            value={filters.engagement}
            onChange={(e) => setFilters((f) => ({ ...f, engagement: e.target.value }))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
            aria-label="Filter by engagement"
          >
            {ENGAGEMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          {activeFilterCount > 0 && (
            <button
              onClick={() => { setFilters({ type: "", stage: "", engagement: "" }); router.push("/contacts"); }}
              className="h-9 px-3 text-xs font-medium rounded-md border border-border bg-background text-muted-foreground hover:bg-muted transition-colors"
            >
              Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>
      <DataTable
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        bulkActions={(ids) => (
          <div className="flex items-center gap-2 flex-wrap">
            <select
              onChange={async (e) => {
                const stage = e.target.value;
                if (!stage) return;
                const result = await bulkUpdateContactStage(Array.from(ids), stage);
                if (result.error) { toast.error(result.error); } else { toast.success(`Updated ${result.updated} contacts${result.skipped ? ` (${result.skipped} skipped — incompatible type)` : ""}`); setSelectedIds(new Set()); }
                e.target.value = "";
              }}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs font-medium"
              defaultValue=""
            >
              <option value="" disabled>Change Stage...</option>
              <option value="new">New</option>
              <option value="qualified">Qualified</option>
              <option value="active_search">Active Search</option>
              <option value="active_listing">Active Listing</option>
              <option value="under_contract">Under Contract</option>
              <option value="closed">Closed</option>
              <option value="cold">Cold</option>
            </select>
            <button
              onClick={async () => {
                const result = await bulkExportContacts(Array.from(ids));
                if (result.error) { toast.error(result.error); return; }
                const blob = new Blob([result.csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url; a.download = `contacts-export-${new Date().toISOString().slice(0,10)}.csv`; a.click();
                URL.revokeObjectURL(url);
                toast.success(`Exported ${ids.size} contacts`);
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-background hover:bg-muted transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={async () => {
                if (!confirm(`Delete ${ids.size} contacts? This cannot be undone.`)) return;
                const result = await bulkDeleteContacts(Array.from(ids));
                if (result.error) { toast.error(result.error); } else { toast.success(`Deleted ${result.deleted} contacts`); setSelectedIds(new Set()); }
              }}
              className="px-3 py-1.5 text-xs font-medium rounded-md border border-destructive/30 bg-destructive/5 text-destructive hover:bg-destructive/10 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
        columns={[
          {
            key: "name",
            header: "Name",
            sortable: true,
            render: (r) => (
              <div className="flex items-center gap-2.5">
                {(r as any).photo_url ? (
                  <img src={(r as any).photo_url} alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                ) : (
                  <div className={`h-7 w-7 rounded-full ${hashColor(r.name)} flex items-center justify-center text-white text-[10px] font-semibold shrink-0`}>
                    {getInitials(r.name)}
                  </div>
                )}
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
            key: "newsletter_intelligence",
            header: "Score",
            sortable: true,
            render: (r) => {
              const score = (r.newsletter_intelligence as Record<string, unknown>)?.engagement_score as number | undefined;
              if (score == null) return <span className="text-muted-foreground text-xs">{"\u2014"}</span>;
              const label = score >= 60 ? "Hot" : score >= 30 ? "Warm" : "Cold";
              const color = score >= 60 ? "bg-destructive/15 text-destructive border-destructive/30" : score >= 30 ? "bg-[#f5c26b]/15 text-[#8a5a1e] border-[#f5c26b]/30" : "bg-muted text-muted-foreground";
              return <Badge variant="outline" className={`${color} text-[10px]`}>{label} {score}</Badge>;
            },
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
        ariaLabel="Contacts list"
        rowActions={(row) => (
          <div className="flex items-center gap-0.5">
            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); setPreviewContact(row); }} className="p-1.5 hover:bg-muted rounded-md" aria-label={`Preview ${row.name}`}>
              <Eye className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            {row.phone && (
              <a href={`tel:${row.phone}`} className="p-1.5 hover:bg-muted rounded-md" aria-label={`Call ${row.name}`}>
                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            )}
            {row.email && (
              <a href={`mailto:${row.email}`} className="p-1.5 hover:bg-muted rounded-md" aria-label={`Email ${row.name}`}>
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
              </a>
            )}
          </div>
        )}
      />
      <ContactPreviewSheet
        contact={previewContact}
        open={!!previewContact}
        onOpenChange={(open) => { if (!open) setPreviewContact(null); }}
      />
    </div>
  );
}
