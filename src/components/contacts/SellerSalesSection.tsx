"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  DollarSign,
  Percent,
  Calendar,
  MapPin,
  ChevronDown,
  ChevronUp,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

interface DealWithListing {
  id: string;
  title: string;
  stage: string;
  status: string;
  value: number | null;
  commission_pct: number | null;
  commission_amount: number | null;
  close_date: string | null;
  possession_date: string | null;
  subject_removal_date: string | null;
  notes: string | null;
  created_at: string;
  listings: {
    id: string;
    address: string;
    mls_number: string | null;
    list_price: number | null;
    status: string;
    notes: string | null;
  } | null;
}

interface SellerSalesSectionProps {
  deals: DealWithListing[];
}

const STAGE_LABELS: Record<string, string> = {
  pre_listing: "Pre-Listing",
  listed: "Listed",
  showing: "Showing",
  offer_received: "Offer Received",
  conditional: "Conditional",
  subject_removal: "Subject Removal",
  closing: "Closing",
  closed: "Closed",
};

export function SellerSalesSection({ deals }: SellerSalesSectionProps) {
  const [expandedDealId, setExpandedDealId] = useState<string | null>(
    deals.length === 1 ? deals[0].id : null
  );

  if (deals.length === 0) return null;

  const wonDeals = deals.filter((d) => d.status === "won");
  const activeDeals = deals.filter((d) => d.status === "active");

  function formatCurrency(amount: number | null) {
    if (!amount) return "—";
    return `$${Number(amount).toLocaleString("en-CA")}`;
  }

  return (
    <Card className="animate-float-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-4 w-4" />
          Sales & Transactions
          {wonDeals.length > 0 && (
            <Badge className="bg-[#0F7694]/10 text-[#0A6880] border-[#0F7694]/30 text-[10px] px-1.5 py-0">
              {wonDeals.length} Sold
            </Badge>
          )}
          {activeDeals.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {activeDeals.length} Active
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {deals.map((deal) => {
            const isExpanded = expandedDealId === deal.id;
            const isWon = deal.status === "won";
            const isLost = deal.status === "lost";

            return (
              <div
                key={deal.id}
                className={`rounded-lg border transition-colors ${
                  isWon
                    ? "border-[#0F7694]/20 bg-[#0F7694]/5/30"
                    : isLost
                    ? "border-muted bg-muted/20 opacity-60"
                    : "border-[#0F7694]/20 bg-[#0F7694]/5"
                }`}
              >
                {/* Summary row */}
                <button
                  onClick={() =>
                    setExpandedDealId(isExpanded ? null : deal.id)
                  }
                  className="flex items-center justify-between w-full p-4 text-left group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{deal.title}</p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${
                          isWon
                            ? "bg-[#0F7694]/10 text-[#0A6880] border-[#0F7694]/30"
                            : isLost
                            ? "bg-red-100 text-red-800 border-red-300"
                            : "bg-[#0F7694]/10 text-[#0A6880] border-[#0F7694]/30"
                        }`}
                      >
                        {isWon ? "Sold" : isLost ? "Lost" : STAGE_LABELS[deal.stage] ?? deal.stage}
                      </Badge>
                    </div>

                    {/* Property address */}
                    {deal.listings && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{deal.listings.address}</span>
                        {deal.listings.mls_number && (
                          <span className="text-muted-foreground/60">
                            · MLS {deal.listings.mls_number}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Quick stats row */}
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      {deal.value && (
                        <span className="flex items-center gap-1 font-medium text-foreground">
                          <DollarSign className="h-3 w-3" />
                          {formatCurrency(deal.value)}
                        </span>
                      )}
                      {deal.close_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {isWon ? "Sold" : "Est. close"}{" "}
                          {new Date(deal.close_date).toLocaleDateString("en-CA")}
                        </span>
                      )}
                      {deal.commission_amount && (
                        <span className="flex items-center gap-1 text-[#0A6880]">
                          <Percent className="h-3 w-3" />
                          GCI {formatCurrency(deal.commission_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                  )}
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border/30 pt-3 space-y-4">
                    {/* Deal details grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
                      {deal.value && (
                        <div>
                          <span className="text-muted-foreground text-xs">Sale Price</span>
                          <p className="font-medium">{formatCurrency(deal.value)}</p>
                        </div>
                      )}
                      {deal.listings?.list_price && (
                        <div>
                          <span className="text-muted-foreground text-xs">List Price</span>
                          <p>{formatCurrency(deal.listings.list_price)}</p>
                        </div>
                      )}
                      {deal.commission_pct && (
                        <div>
                          <span className="text-muted-foreground text-xs">Commission</span>
                          <p>
                            {deal.commission_pct}% ({formatCurrency(deal.commission_amount)})
                          </p>
                        </div>
                      )}
                      {deal.close_date && (
                        <div>
                          <span className="text-muted-foreground text-xs">Close Date</span>
                          <p>{new Date(deal.close_date).toLocaleDateString("en-CA")}</p>
                        </div>
                      )}
                      {deal.possession_date && (
                        <div>
                          <span className="text-muted-foreground text-xs">Possession Date</span>
                          <p>{new Date(deal.possession_date).toLocaleDateString("en-CA")}</p>
                        </div>
                      )}
                      {deal.subject_removal_date && (
                        <div>
                          <span className="text-muted-foreground text-xs">Subject Removal</span>
                          <p>
                            {new Date(deal.subject_removal_date).toLocaleDateString("en-CA")}
                          </p>
                        </div>
                      )}
                    </div>

                    {deal.notes && (
                      <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
                        {deal.notes}
                      </p>
                    )}

                    {/* Link to deal page */}
                    <Link
                      href={`/pipeline/${deal.id}`}
                      className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                    >
                      View full deal details
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
