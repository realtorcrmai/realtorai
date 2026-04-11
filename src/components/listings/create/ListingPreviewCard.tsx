"use client";

import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Home, Key, Clock, Hash, User, FileText } from "lucide-react";

const PROPERTY_ICONS: Record<string, string> = {
  Residential: "🏠",
  "Condo/Apartment": "🏢",
  Townhouse: "🏘️",
  Land: "🌳",
  Commercial: "🏪",
  "Multi-Family": "🏗️",
};

const PROPERTY_GRADIENTS: Record<string, string> = {
  Residential: "from-blue-500 to-[#0F7694]",
  "Condo/Apartment": "from-[#0F7694] to-[#1a1535]",
  Townhouse: "from-[#0F7694] to-[#0F7694]",
  Land: "from-[#67D4E8] to-[#0F7694]",
  Commercial: "from-[#67D4E8] to-[#0F7694]",
  "Multi-Family": "from-rose-500 to-pink-600",
};

function PreviewRow({ icon: Icon, label, value, empty }: { icon: typeof MapPin; label: string; value?: string; empty?: string }) {
  const hasValue = !!value;
  return (
    <div className="flex items-center gap-2.5 text-sm">
      <Icon className={`h-4 w-4 shrink-0 ${hasValue ? "text-foreground" : "text-muted-foreground/25"}`} />
      <span className="text-muted-foreground text-sm min-w-[70px] shrink-0">{label}</span>
      <span className={hasValue ? "text-foreground font-medium" : "text-muted-foreground/30 italic"}>
        {value || empty || "—"}
      </span>
    </div>
  );
}

export interface ListingPreviewCardProps {
  address: string;
  propertyType: string;
  sellerName: string;
  listPrice: string;
  mlsNumber: string;
  lockboxCode: string;
  showingStart: string;
  showingEnd: string;
  notes: string;
}

export function ListingPreviewCard({
  address, propertyType, sellerName, listPrice, mlsNumber,
  lockboxCode, showingStart, showingEnd, notes,
}: ListingPreviewCardProps) {
  const icon = PROPERTY_ICONS[propertyType] || "🏠";
  const gradient = PROPERTY_GRADIENTS[propertyType] || "from-[#0F7694] to-[#1a1535]";

  const showingWindow = showingStart && showingEnd
    ? `${showingStart} — ${showingEnd}`
    : showingStart || showingEnd || "";

  const priceDisplay = listPrice ? `$${parseInt(listPrice).toLocaleString()}` : "";

  // Completion tracking
  const totalFields = 7;
  const filledFields = [address, propertyType, sellerName, listPrice, lockboxCode, mlsNumber, showingStart].filter(Boolean).length;
  const completionPct = Math.min(100, Math.round((filledFields / totalFields) * 100));

  return (
    <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-white via-white to-[#FAF8F4] dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-800/50 shadow-lg overflow-hidden transition-all duration-300">
      {/* Colored top bar */}
      <div className={`h-1.5 bg-gradient-to-r ${propertyType ? gradient : "from-gray-300 to-gray-400"}`} />

      <div className="p-5 space-y-4">
        {/* Property icon + address */}
        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${propertyType ? gradient : "from-gray-400 to-gray-500"} flex items-center justify-center text-2xl shadow-lg transition-all duration-300`}>
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold tracking-tight truncate transition-all">
              {address || <span className="text-muted-foreground/30 italic font-normal">Property address</span>}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {propertyType && (
                <Badge variant="secondary" className="text-sm">{propertyType}</Badge>
              )}
              <Badge variant="outline" className="text-sm bg-brand-muted text-brand-dark border-brand/20">Active</Badge>
            </div>
          </div>
        </div>

        {/* Completion bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-muted/30 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${completionPct >= 70 ? "bg-brand/50" : completionPct >= 40 ? "bg-amber-500" : "bg-red-400"}`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground tabular-nums">{completionPct}%</span>
        </div>

        {/* Listing details */}
        <div className="space-y-1.5 border-t border-border/20 pt-3">
          <PreviewRow icon={User} label="Seller" value={sellerName} empty="Select seller" />
          <PreviewRow icon={DollarSign} label="List price" value={priceDisplay} empty="Set price" />
          <PreviewRow icon={Hash} label="MLS #" value={mlsNumber} empty="MLS number" />
          <PreviewRow icon={Key} label="Lockbox" value={lockboxCode} empty="Lockbox code" />
          <PreviewRow icon={Clock} label="Showings" value={showingWindow} empty="Showing window" />
        </div>

        {/* Workflow preview */}
        <div className="border-t border-border/20 pt-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-2">Listing Workflow</p>
          <div className="flex items-center gap-1">
            {["Intake", "Enrich", "CMA", "Price", "Forms", "Sign", "MLS", "Submit"].map((phase, i) => (
              <div key={phase} className="flex items-center gap-1">
                <div className={`w-2.5 h-2.5 rounded-full ${i === 0 ? `bg-gradient-to-br ${gradient} ring-2 ring-offset-1 ring-current shadow-sm` : "bg-muted/20"}`} />
                {i < 7 && <div className="h-0.5 w-3 bg-muted/20 rounded-full" />}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Phase 1 — Seller Intake</p>
        </div>

        {/* Notes */}
        {notes && (
          <div className="border-t border-border/20 pt-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-1">Notes</p>
            <p className="text-sm text-muted-foreground italic">&ldquo;{notes}&rdquo;</p>
          </div>
        )}
      </div>
    </div>
  );
}
