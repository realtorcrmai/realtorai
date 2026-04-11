"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";

interface Deal {
  id: string;
  name: string;
  stage: string;
  value: number;
  contacts: { name: string } | null;
}

interface DashboardPipelineWidgetProps {
  deals: Deal[];
}

const COLUMNS = [
  { key: "new", label: "New" },
  { key: "active", label: "Active" },
  { key: "contract", label: "Contract" },
] as const;

const currencyFmt = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

export default function DashboardPipelineWidget({ deals }: DashboardPipelineWidgetProps) {
  if (deals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Deal Pipeline</CardTitle>
          <CardAction>
            <Link href="/pipeline" className="text-xs text-brand hover:underline">
              View All &rarr;
            </Link>
          </CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active deals.</p>
        </CardContent>
      </Card>
    );
  }

  const grouped: Record<string, Deal[]> = { new: [], active: [], contract: [] };
  for (const deal of deals) {
    const stage = deal.stage?.toLowerCase() ?? "new";
    if (stage.includes("contract")) {
      grouped.contract.push(deal);
    } else if (stage === "active" || stage === "qualified") {
      grouped.active.push(deal);
    } else {
      grouped.new.push(deal);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Pipeline</CardTitle>
        <CardAction>
          <Link href="/pipeline" className="text-xs text-brand hover:underline">
            View All &rarr;
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {COLUMNS.map((col) => {
            const colDeals = grouped[col.key].slice(0, 3);
            return (
              <div key={col.key}>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {col.label} ({grouped[col.key].length})
                </p>
                {colDeals.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">--</p>
                ) : (
                  <div className="space-y-2">
                    {colDeals.map((deal) => (
                      <Link
                        key={deal.id}
                        href={`/pipeline/${deal.id}`}
                        className="block rounded-md border border-border bg-muted/30 p-2 transition-colors hover:bg-muted/60"
                      >
                        <p className="text-xs font-medium text-foreground truncate">
                          {deal.contacts?.name ?? deal.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {currencyFmt.format(deal.value)}
                        </p>
                      </Link>
                    ))}
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
