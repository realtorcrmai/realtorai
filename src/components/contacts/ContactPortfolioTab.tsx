"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePortfolioItem } from "@/actions/contact-portfolio";
import type { PortfolioItem } from "@/actions/contact-portfolio";

// ── Config ────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  primary_residence: { emoji: "🏠", label: "Primary",    color: "bg-blue-100 text-blue-800" },
  investment:        { emoji: "💼", label: "Investment",  color: "bg-amber-100 text-amber-800" },
  vacation:          { emoji: "🏖️", label: "Vacation",   color: "bg-teal-100 text-teal-800" },
  commercial:        { emoji: "🏢", label: "Commercial",  color: "bg-purple-100 text-purple-800" },
  other:             { emoji: "🏗️", label: "Other",      color: "bg-gray-100 text-gray-700" },
};

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  owned:       { label: "Owned",       badge: "lf-badge-done" },
  selling:     { label: "For Sale",    badge: "lf-badge-active" },
  sold:        { label: "Sold",        badge: "lf-badge-info" },
  refinancing: { label: "Refinancing", badge: "lf-badge-pending" },
  transferred: { label: "Transferred", badge: "" },
};

const CO_OWNER_ROLE_LABEL: Record<string, string> = {
  individual:  "Joint tenant",
  spouse:      "Spouse / Partner",
  partner:     "Business partner",
  trust:       "Trust / Estate",
  corporation: "Corporation",
};

type FilterType = "all" | "primary_residence" | "investment" | "sold";
type CoOwner = { name: string; role: string; ownership_pct: number };

// ── Component ─────────────────────────────────────────────────

interface ContactPortfolioTabProps {
  contactId: string;
  items: PortfolioItem[];
}

export function ContactPortfolioTab({ contactId, items: initialItems }: ContactPortfolioTabProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [items, setItems] = useState<PortfolioItem[]>(initialItems);
  const [filter, setFilter] = useState<FilterType>("all");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "sold") return item.status === "sold";
    return item.property_category === filter;
  });

  const totalValue = items
    .filter((i) => i.status === "owned" && i.estimated_value)
    .reduce((sum, i) => sum + (i.estimated_value ?? 0), 0);

  const totalEquity = items
    .filter((i) => i.status === "owned" && i.estimated_value)
    .reduce((sum, i) => sum + ((i.estimated_value ?? 0) - (i.mortgage_balance ?? 0)), 0);

  const filterLabels: { key: FilterType; label: string }[] = [
    { key: "all",               label: `All (${items.length})` },
    { key: "primary_residence", label: "Primary" },
    { key: "investment",        label: "Investment" },
    { key: "sold",              label: "Sold" },
  ];

  function handleDelete(itemId: string) {
    setDeleteError(null);
    startTransition(async () => {
      const result = await deletePortfolioItem(itemId);
      if (result.error) {
        setDeleteError(result.error);
      } else {
        setItems((prev) => prev.filter((i) => i.id !== itemId));
        setConfirmDelete(null);
        router.refresh();
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="lf-card p-6 text-center space-y-3">
        <div className="text-3xl">🏠</div>
        <p className="font-medium text-sm">No properties in portfolio</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          Add properties this contact owns, co-owns, or has previously owned. Updating the
          contact&apos;s address will automatically create a primary residence entry.
        </p>
        <Link href={`/contacts/${contactId}/portfolio/new`} className="lf-btn-sm inline-block">
          + Add Property
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Portfolio summary bar */}
      <div className="lf-card p-4 grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Properties</p>
          <p className="text-2xl font-bold text-indigo-700">{items.filter(i => i.status === "owned").length}</p>
          <p className="text-xs text-muted-foreground">owned</p>
        </div>
        {totalValue > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Portfolio Value</p>
            <p className="text-2xl font-bold text-indigo-700">
              ${(totalValue / 1_000_000).toFixed(2)}M
            </p>
            <p className="text-xs text-muted-foreground">estimated</p>
          </div>
        )}
        {totalEquity > 0 && (
          <div>
            <p className="text-xs text-muted-foreground">Total Equity</p>
            <p className="text-2xl font-bold text-emerald-600">
              ${(totalEquity / 1_000_000).toFixed(2)}M
            </p>
            <p className="text-xs text-muted-foreground">net of mortgage</p>
          </div>
        )}
      </div>

      {deleteError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{deleteError}</div>
      )}

      {/* Filter + Add button */}
      <div className="flex items-center gap-2 flex-wrap">
        {filterLabels.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === key
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
        <Link href={`/contacts/${contactId}/portfolio/new`} className="lf-btn-sm ml-auto">
          + Add Property
        </Link>
      </div>

      {/* Property cards */}
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No properties match this filter.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item) => {
            const cat = item.property_category ? CATEGORY_CONFIG[item.property_category] : null;
            const st = STATUS_CONFIG[item.status];
            const equity = item.estimated_value && item.mortgage_balance
              ? item.estimated_value - item.mortgage_balance
              : null;
            const coOwners = (item.co_owners as CoOwner[] | null) ?? [];

            return (
              <div key={item.id} className="lf-card p-4 space-y-3">
                {/* Header row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{cat?.emoji ?? "🏠"}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm">
                        {item.unit_number ? `${item.unit_number} – ` : ""}{item.address}
                      </p>
                      {(item.city || item.postal_code) && (
                        <p className="text-xs text-muted-foreground">
                          {[item.city, item.province, item.postal_code].filter(Boolean).join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {cat && (
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cat.color}`}>{cat.label}</span>
                    )}
                    <span className={`lf-badge ${st?.badge ?? ""} text-xs`}>{st?.label ?? item.status}</span>
                  </div>
                </div>

                {/* Ownership row */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">
                    👤 Owner: <strong>{item.ownership_pct}%</strong>
                  </span>
                  {coOwners.map((co, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">
                      {co.name} · {co.ownership_pct}% ({CO_OWNER_ROLE_LABEL[co.role] ?? co.role})
                    </span>
                  ))}
                  {item.property_type && (
                    <span className="text-xs text-muted-foreground ml-auto">{item.property_type}</span>
                  )}
                </div>

                {/* Financial row */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {item.purchase_price && (
                    <span>🏷️ Paid: <strong>${item.purchase_price.toLocaleString()}</strong></span>
                  )}
                  {item.estimated_value && (
                    <span>📈 Est: <strong>${item.estimated_value.toLocaleString()}</strong></span>
                  )}
                  {item.mortgage_balance && (
                    <span>🏦 Mortgage: <strong>${item.mortgage_balance.toLocaleString()}</strong></span>
                  )}
                  {equity !== null && (
                    <span className="text-emerald-700 font-semibold">
                      💰 Equity: ${equity.toLocaleString()}
                    </span>
                  )}
                  {item.monthly_rental_income && (
                    <span>🔑 Rental: <strong>${item.monthly_rental_income.toLocaleString()}/mo</strong></span>
                  )}
                  {item.strata_fee && (
                    <span>🏢 Strata: <strong>${item.strata_fee.toLocaleString()}/mo</strong></span>
                  )}
                </div>

                {item.notes && (
                  <p className="text-xs text-muted-foreground border-t pt-2">{item.notes}</p>
                )}

                {/* Action links */}
                <div className="flex gap-3 pt-1 border-t">
                  <Link
                    href={`/contacts/${contactId}/portfolio/${item.id}/edit`}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    ✏️ Edit
                  </Link>
                  {item.linked_listing_id && (
                    <Link
                      href={`/listings/${item.linked_listing_id}`}
                      className="text-xs text-teal-600 hover:text-teal-800 font-medium"
                    >
                      📋 View Listing
                    </Link>
                  )}

                  {/* Delete — confirm pattern */}
                  {confirmDelete === item.id ? (
                    <span className="ml-auto flex items-center gap-2">
                      <span className="text-xs text-red-600">Remove?</span>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                        className="text-xs text-red-600 hover:text-red-800 font-semibold"
                      >
                        {isPending ? "…" : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(item.id)}
                      className="ml-auto text-xs text-muted-foreground hover:text-red-600 transition-colors"
                    >
                      🗑️ Remove
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
