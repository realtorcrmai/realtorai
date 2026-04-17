"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Draft = {
  id: string;
  subject: string;
  email_type: string;
  html_body: string;
  ai_context: any;
  contacts: any;
};

type Props = {
  drafts: Draft[];
  sendAction: (id: string) => Promise<any>;
  skipAction: (id: string) => Promise<any>;
  bulkApproveAction: (ids: string[]) => Promise<any>;
};

/**
 * AIAgentQueue — summary card showing pending draft count with a link
 * to the full queue page at /newsletters/queue.
 */
export function AIAgentQueue({ drafts }: Props) {
  const count = drafts.length;

  function getContactName(d: Draft) {
    return Array.isArray(d.contacts) ? d.contacts[0]?.name : d.contacts?.name || "Unknown";
  }

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🤖</span>
            <div>
              <h3 className="text-sm font-bold">AI Agent Queue</h3>
              <p className="text-xs text-muted-foreground">
                {count === 0
                  ? "All caught up — no drafts pending review"
                  : `${count} email${count !== 1 ? "s" : ""} drafted by AI — awaiting your review`}
              </p>
            </div>
          </div>
          <Badge
            variant={count > 0 ? "default" : "secondary"}
            className="text-xs"
          >
            {count} pending
          </Badge>
        </div>

        {/* Show first 3 drafts as a preview */}
        {count > 0 && (
          <div className="space-y-2 mb-3">
            {drafts.slice(0, 3).map((d) => {
              const name = getContactName(d);
              return (
                <div
                  key={d.id}
                  className="flex items-center justify-between py-1.5 px-2 bg-muted/30 rounded-md"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {d.subject}
                    </p>
                  </div>
                  <Badge variant="outline" className="text-[10px] capitalize shrink-0 ml-2">
                    {d.email_type?.replace(/_/g, " ")}
                  </Badge>
                </div>
              );
            })}
            {count > 3 && (
              <p className="text-[10px] text-muted-foreground text-center">
                +{count - 3} more
              </p>
            )}
          </div>
        )}

        <a
          href="/newsletters/queue"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          {count > 0 ? "Review Queue" : "View Queue"} &rarr;
        </a>
      </CardContent>
    </Card>
  );
}
