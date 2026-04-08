"use client";

import { useState } from "react";
import Link from "next/link";
import type { PortfolioItem } from "@/actions/contact-portfolio";

const CATEGORY_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  primary_residence: { emoji: "🏠", label: "Primary",    color: "bg-blue-100 text-blue-800" },
  investment:        { emoji: "💼", label: "Investment",  color: "bg-amber-100 text-amber-800" },
  vacation:          { emoji: "🏖️", label: "Vacation",   color: "bg-teal-100 text-teal-800" },
  commercial:        { emoji: "🏢", label: "Commercial",  color: "bg-purple-100 text-purple-800" },
  other:             { emoji: "🏗️", label: "Other",      color: "bg-gray-100 text-gray-700" },
};

const STATUS_CONFIG: Record<string, { label: string; badge: string }> = {
  owned:       { label: "Owned",       badge: "lf-badge-done" },
  selling:     { label: "Selling",     badge: "lf-badge-active" },
  sold:        { label: "Sold",        badge: "lf-badge-info" },
  refinancing: { label: "Refinancing", badge: "lf-badge-pending" },
  transferred: { label: "Transferred", badge: "" },
};

type FilterType = "all" | "primary_residence" | "investment" | "sold";

interface ContactPortfolioTabProps {
  contactId: string;
  items: PortfolioItem[];
}

export function ContactPortfolioTab({ contactId, items }: ContactPortfolioTabProps) {
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "sold") return item.status === "sold";
    return item.property_category === filter;
  });

  const totalValue = items
    .filter((i) => i.status === "owned" && i.estimated_value)
    .reduce((sum, i) => sum + (i.estimated_value ?? 0), 0);

  const filterLabels: { key: FilterType; label: string }[] = [
    { key: "all",               label: `All (${items.length})` },
    { key: "primary_residence", label: "Primary" },
    { key: "investment",        label: "Investment" },
    { key: "sold",              label: "Sold" },
  ];

  if (items.length === 0) {
    return (
      <div className="lf-card p-6 text-center space-y-3">
        <div className="text-3xl">🏠</div>
        <p className="font-medium text-sm">No properties in portfolio</p>
        <p className="text-xs text-muted-foreground">Add properties this contact owns, has owned, or is considering.</p>
        <Link
          href={`/contacts/${contactId}/portfolio/new`}
          className="lf-btn-sm inline-block"
        >
          + Add Property
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary row */}
      {totalValue > 0 && (
        <div className="lf-card p-3 flex items-center gap-4 text-sm">
          <span className="text-muted-foreground">Portfolio value</span>
          <span className="font-bold text-indigo-700">${(totalValue / 1_000_000).toFixed(2)}M</span>
          <span className="text-muted-foreground ml-auto">{items.filter(i => i.status === "owned").length} owned · {items.filter(i => i.status === "sold").length} sold</span>
        </div>
      )}

      {/* Filter bar */}
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
        <Link
          href={`/contacts/${contactId}/portfolio/new`}
          className="lf-btn-sm ml-auto"
        >
          + Add Property
        </Link>
      </div>

      {/* Property grid */}
      {filtered.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No properties match this filter.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item) => {
            const cat = item.property_category ? CATEGORY_CONFIG[item.property_category] : null;
            const st = STATUS_CONFIG[item.status];

            return (
              <div key={item.id} className="lf-card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl shrink-0">{cat?.emoji ?? "🏠"}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {item.unit_number ? `${item.unit_number} – ` : ""}{item.address}
                      </p>
                      {item.city && (
                        <p className="text-xs text-muted-foreground">{item.city}, {item.province}</p>
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

                {/* Financial row */}
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {item.purchase_price && (
                    <span>🏷️ Paid: <strong>${item.purchase_price.toLocaleString()}</strong></span>
                  )}
                  {item.estimated_value && (
                    <span>📈 Est. value: <strong>${item.estimated_value.toLocaleString()}</strong></span>
                  )}
                  {item.mortgage_balance && (
                    <span>🏦 Mortgage: <strong>${item.mortgage_balance.toLocaleString()}</strong></span>
                  )}
                  {item.monthly_rental_income && (
                    <span>💰 Rental: <strong>${item.monthly_rental_income.toLocaleString()}/mo</strong></span>
                  )}
                  {item.ownership_pct < 100 && (
                    <span>👥 Ownership: <strong>{item.ownership_pct}%</strong></span>
                  )}
                </div>

                {/* Action links */}
                <div className="flex gap-3 pt-1">
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
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
