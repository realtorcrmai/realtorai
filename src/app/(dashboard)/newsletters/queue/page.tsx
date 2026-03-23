export const dynamic = "force-dynamic";

import { getApprovalQueue } from "@/actions/newsletters";
import { ApprovalQueueClient } from "@/components/newsletters/ApprovalQueueClient";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

export default async function ApprovalQueuePage() {
  const queue = await getApprovalQueue();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="mb-1">
            <Link href="/newsletters">
              <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-foreground">Approval Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review and send AI-generated newsletters before they go out
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {queue.length} pending
        </Badge>
      </div>

      <ApprovalQueueClient initialQueue={queue} />
    </div>
  );
}
