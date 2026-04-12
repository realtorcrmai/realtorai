"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface FeedItem {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  timestamp: string;
  href: string;
}

interface ActivityFeedProps {
  items: FeedItem[];
}

export default function ActivityFeed({ items }: ActivityFeedProps) {
  const visible = items.slice(0, 15);

  if (visible.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No recent activity to show.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {visible.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted/50"
          >
            <span className="text-lg shrink-0">{item.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
