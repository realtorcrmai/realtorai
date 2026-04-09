"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Eye, MessageSquare, Users, FileText, DollarSign, Home,
} from "lucide-react";
import type { ListingActivity } from "@/types";
import { formatDistanceToNow } from "date-fns";

const TYPE_CONFIG: Record<string, { icon: typeof Eye; label: string; color: string }> = {
  view: { icon: Eye, label: "View", color: "bg-[#0F7694]/8 text-[#0A6880]" },
  inquiry: { icon: MessageSquare, label: "Inquiry", color: "bg-[#0F7694]/10 text-[#0A6880]" },
  showing: { icon: Users, label: "Showing", color: "bg-[#0F7694]/5 text-[#0A6880]" },
  offer: { icon: FileText, label: "Offer", color: "bg-amber-50 text-amber-700" },
  price_change: { icon: DollarSign, label: "Price Change", color: "bg-rose-50 text-rose-700" },
  open_house: { icon: Home, label: "Open House", color: "bg-[#0F7694]/5 text-[#0A6880]" },
};

interface ListingActivityFeedProps {
  activities: ListingActivity[];
}

export function ListingActivityFeed({ activities }: ListingActivityFeedProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Activity Feed
          {activities.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {activities.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No activity recorded yet.
          </p>
        ) : (
          <div className="space-y-2">
            {activities.map((a) => {
              const config = TYPE_CONFIG[a.activity_type] ?? {
                icon: Eye,
                label: a.activity_type,
                color: "bg-gray-50 text-gray-700",
              };
              const Icon = config.icon;
              return (
                <div
                  key={a.id}
                  className="flex items-start gap-3 p-2.5 rounded-lg border border-border/30"
                >
                  <div className={`p-1.5 rounded-md ${config.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 border-0 ${config.color}`}
                      >
                        {config.label}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    {a.description && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {a.description}
                      </p>
                    )}
                    {a.source && (
                      <span className="text-[10px] text-muted-foreground">
                        via {a.source}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
