export const dynamic = "force-dynamic";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import Link from "next/link";
import { WorkflowEditorClient } from "@/components/workflow-builder/WorkflowEditorClient";

export default async function EditWorkflowPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getAuthenticatedTenantClient();

  const { data: workflow } = await supabase
    .from("workflows")
    .select("*")
    .eq("id", id)
    .single();

  if (!workflow) notFound();

  // Fetch existing steps for conversion to flow
  const { data: steps } = await supabase
    .from("workflow_steps")
    .select("*")
    .eq("workflow_id", id)
    .order("step_order");

  return (
    <div className="h-screen flex flex-col">
      <div className="shrink-0 bg-background/80 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <Link href="/automations" className="text-sm text-primary hover:text-primary/80">
            {"\u2190"} Workflows
          </Link>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="text-sm font-semibold">{workflow.name}</span>
          {workflow.is_default && (
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-brand-muted text-brand-dark dark:bg-foreground/20 dark:text-brand-light">
              Default
            </span>
          )}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <WorkflowEditorClient
          workflowId={id}
          workflowName={workflow.name}
          flowJson={workflow.flow_json as any}
          steps={(steps || []) as any}
          triggerConfig={{ trigger_type: workflow.trigger_type, contact_type: workflow.contact_type }}
        />
      </div>
    </div>
  );
}
