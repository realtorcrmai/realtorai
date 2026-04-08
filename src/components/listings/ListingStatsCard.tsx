"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3, Eye, Users, FileText, Home, Calendar, TrendingUp,
} from "lucide-react";

interface ListingStats {
  days_on_market: number;
  total_views: number;
  total_inquiries: number;
  total_showings: number;
  confirmed_showings: number;
  total_offers: number;
  total_open_houses: number;
  completed_open_houses: number;
  total_visitors: number;
}

interface ListingStatsCardProps {
  stats: ListingStats;
  featured?: boolean;
  salePrice?: number | null;
  listPrice?: number | null;
}

const STAT_ITEMS: {
  key: keyof ListingStats;
  label: string;
  icon: typeof Eye;
}[] = [
  { key: "days_on_market", label: "Days on Market", icon: Calendar },
  { key: "total_views", label: "Views", icon: Eye },
  { key: "total_showings", label: "Showings", icon: Users },
  { key: "total_offers", label: "Offers", icon: FileText },
  { key: "total_open_houses", label: "Open Houses", icon: Home },
  { key: "total_visitors", label: "OH Visitors", icon: Users },
];

function formatPrice(price: number): string {
  return Number(price).toLocaleString("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  });
}

export function ListingStatsCard({ stats, featured, salePrice, listPrice }: ListingStatsCardProps) {
  if (featured) {
    const priceDiff =
      salePrice && listPrice ? ((salePrice - listPrice) / listPrice) * 100 : null;

    return (
      <Card className="border-[#0F7694]/20 dark:border-blue-800 bg-[#0F7694]/5 dark:bg-blue-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-[#0F7694] dark:text-[#67D4E8]" />
            Listing Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(salePrice || listPrice) && (
            <div className="flex gap-4">
              {listPrice && (
                <div className="flex-1 rounded-lg border border-border/40 bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">List Price</p>
                  <p className="text-lg font-bold tabular-nums">{formatPrice(listPrice)}</p>
                </div>
              )}
              {salePrice && (
                <div className="flex-1 rounded-lg border border-[#0F7694]/20 dark:border-blue-800 bg-[#0F7694]/5 dark:bg-blue-950/30 p-4 text-center">
                  <p className="text-xs text-[#0F7694] dark:text-[#67D4E8] mb-1">Sale Price</p>
                  <p className="text-lg font-bold tabular-nums text-[#0A6880] dark:text-blue-300">
                    {formatPrice(salePrice)}
                  </p>
                  {priceDiff !== null && (
                    <p className={`text-xs mt-1 ${priceDiff >= 0 ? "text-[#0F7694]" : "text-red-600"}`}>
                      {priceDiff >= 0 ? "+" : ""}{priceDiff.toFixed(1)}% vs list
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {STAT_ITEMS.map(({ key, label, icon: Icon }) => (
              <div
                key={key}
                className="rounded-lg border border-border/40 bg-card p-4 text-center"
              >
                <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1.5" />
                <p className="text-2xl font-bold tabular-nums">{stats[key]}</p>
                <p className="text-[11px] text-muted-foreground leading-tight mt-1">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Listing Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {STAT_ITEMS.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="rounded-lg border border-border/40 p-3 text-center"
            >
              <Icon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
              <p className="text-xl font-bold tabular-nums">{stats[key]}</p>
              <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
