"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart3, Eye, Users, FileText, Home, Calendar,
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
}

const STAT_ITEMS: {
  key: keyof ListingStats;
  label: string;
  icon: typeof Eye;
  format?: (v: number) => string;
}[] = [
  { key: "days_on_market", label: "Days on Market", icon: Calendar },
  { key: "total_views", label: "Views", icon: Eye },
  { key: "total_showings", label: "Showings", icon: Users, format: (v) => String(v) },
  { key: "total_offers", label: "Offers", icon: FileText },
  { key: "total_open_houses", label: "Open Houses", icon: Home },
  { key: "total_visitors", label: "OH Visitors", icon: Users },
];

export function ListingStatsCard({ stats }: ListingStatsCardProps) {
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
