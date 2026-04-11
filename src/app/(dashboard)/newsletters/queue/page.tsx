export const dynamic = "force-dynamic";

import { getApprovalQueue } from "@/actions/newsletters";
import { ApprovalQueueClient } from "@/components/newsletters/ApprovalQueueClient";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";

export default async function ApprovalQueuePage() {
  const queue = await getApprovalQueue();

  return (
    <>
      <PageHeader
        title="Approval Queue"
        subtitle="Review and send AI-generated newsletters before they go out"
        breadcrumbs={[
          { label: "Email Marketing", href: "/newsletters" },
          { label: "Queue" },
        ]}
        actions={
          <Badge variant="secondary" className="text-sm px-3 py-1">
            {queue.length} pending
          </Badge>
        }
      />
      <div className="p-6">
        <ApprovalQueueClient initialQueue={queue} />
      </div>
    </>
  );
}
