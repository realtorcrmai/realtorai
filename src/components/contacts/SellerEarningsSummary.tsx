import { DollarSign, TrendingUp } from "lucide-react";
import type { Listing } from "@/types";

export function SellerEarningsSummary({
  listings,
}: {
  listings: Listing[];
}) {
  const soldListings = listings.filter((l) => l.status === "sold");

  if (soldListings.length === 0) return null;

  const deals = soldListings.map((l) => {
    const soldPrice = Number(l.sold_price) || Number(l.list_price) || 0;
    const rate = Number(l.commission_rate) || 2.5;
    const commission = l.commission_amount
      ? Number(l.commission_amount)
      : soldPrice * (rate / 100);

    return {
      id: l.id,
      address: l.address,
      soldPrice,
      rate,
      commission,
      closingDate: l.closing_date,
    };
  });

  const totalEarnings = deals.reduce((sum, d) => sum + d.commission, 0);
  const totalVolume = deals.reduce((sum, d) => sum + d.soldPrice, 0);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-[#0F7694]" />
        Earnings Summary
      </h3>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-[#0F7694]/5 dark:bg-[#1a1535]/20 text-center">
          <p className="text-2xl font-bold text-[#0A6880] dark:text-[#67D4E8]">
            {totalEarnings.toLocaleString("en-CA", {
              style: "currency",
              currency: "CAD",
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="text-xs text-[#0F7694] dark:text-[#0F7694] uppercase font-medium mt-1">
            Total Commission
          </p>
        </div>
        <div className="p-4 rounded-lg bg-muted/30 text-center">
          <p className="text-2xl font-bold">
            {totalVolume.toLocaleString("en-CA", {
              style: "currency",
              currency: "CAD",
              maximumFractionDigits: 0,
            })}
          </p>
          <p className="text-xs text-muted-foreground uppercase font-medium mt-1">
            Total Volume
          </p>
        </div>
      </div>

      {/* Per-deal breakdown */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted-foreground">
          Commission Breakdown
        </p>
        {deals.map((deal) => (
          <div
            key={deal.id}
            className="flex items-center justify-between p-3 rounded-lg border border-border/50"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{deal.address}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  Sold:{" "}
                  {deal.soldPrice.toLocaleString("en-CA", {
                    style: "currency",
                    currency: "CAD",
                    maximumFractionDigits: 0,
                  })}
                </span>
                <span className="text-xs text-muted-foreground">
                  @ {deal.rate}%
                </span>
              </div>
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="text-sm font-bold text-[#0A6880] dark:text-[#67D4E8] flex items-center gap-1">
                <DollarSign className="h-3.5 w-3.5" />
                {deal.commission.toLocaleString("en-CA", {
                  maximumFractionDigits: 0,
                })}
              </p>
              {deal.closingDate && (
                <p className="text-[11px] text-muted-foreground">
                  {new Date(deal.closingDate + "T00:00:00").toLocaleDateString("en-CA", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
