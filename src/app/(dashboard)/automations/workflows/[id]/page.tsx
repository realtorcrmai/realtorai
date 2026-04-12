import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import WorkflowDetail from "@/components/automations/WorkflowDetail";
import type { MessageTemplate, WorkflowStep, WorkflowEnrollment } from "@/types";


export default async function WorkflowDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getAuthenticatedTenantClient();

  // Fetch workflow with its steps
  const { data: workflow, error: workflowError } = await supabase
    .from("workflows")
    .select("*, workflow_steps(*)")
    .eq("id", id)
    .single();

  if (workflowError || !workflow) {
    notFound();
  }

  // Sort steps by step_order
  const sortedSteps = (workflow.workflow_steps as WorkflowStep[]).sort(
    (a, b) => a.step_order - b.step_order
  );

  // Fetch active enrollments for this workflow with contact info
  const { data: enrollments } = await supabase
    .from("workflow_enrollments")
    .select("*, contacts(id, name)")
    .eq("workflow_id", id)
    .order("created_at", { ascending: false });

  // Fetch available message templates
  const { data: templates } = await supabase
    .from("message_templates")
    .select("*")
    .eq("is_active", true)
    .order("name", { ascending: true });

  // Fetch all contacts for enrollment dropdown
  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, type")
    .order("name", { ascending: true });

  return (
    <WorkflowDetail
      workflow={{ ...workflow, workflow_steps: sortedSteps }}
      enrollments={(enrollments as (WorkflowEnrollment & { contacts: { id: string; name: string } })[]) || []}
      templates={(templates as MessageTemplate[]) || []}
      contacts={contacts || []}
    />
  );
}
