"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DollarSign, User, Calendar, Building2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DEAL_STATUS_COLORS } from "@/lib/constants/pipeline";
import type { DealWithRelations } from "@/types";

interface DealCardProps {
  deal: DealWithRelations;
}

export function DealCard({ deal }: DealCardProps) {
  const daysInStage = formatDistanceToNow(new Date(deal.updated_at), {
    addSuffix: false,
  });

  return (
    <Link href={`/pipeline/${deal.id}`}>
      <div className="rounded-xl border border-border/50 bg-white p-3.5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-grab active:cursor-grabbing group">
        {/* Title */}
        <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
          {deal.title}
        </p>

        {/* Contact */}
        {deal.contacts && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <User className="h-3 w-3 shrink-0" />
            <span className="truncate">{deal.contacts.name}</span>
          </div>
        )}

        {/* Listing */}
        {deal.listings && (
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{deal.listings.address}</span>
          </div>
        )}

        {/* Value + Status row */}
        <div className="flex items-center justify-between mt-3">
          {deal.value ? (
            <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
              <DollarSign className="h-3 w-3" />
              {Number(deal.value).toLocaleString("en-CA")}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">No value</span>
          )}
          <Badge
            variant="outline"
            className={`${DEAL_STATUS_COLORS[deal.status] ?? ""} text-[10px] px-1.5 py-0 border-0 capitalize`}
          >
            {deal.status}
          </Badge>
        </div>

        {/* Footer: type + days in stage */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
            {deal.type}
          </Badge>
          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
            <Calendar className="h-2.5 w-2.5" />
            {daysInStage}
          </span>
        </div>
      </div>
    </Link>
  );
}
