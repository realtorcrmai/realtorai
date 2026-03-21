"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { stepsToFlow, flowToSteps } from "@/lib/flow-converter";
import type { Node, Edge } from "@xyflow/react";

const WorkflowCanvas = dynamic(
  () => import("@/components/workflow-builder/WorkflowCanvas"),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-muted-foreground">Loading editor...</div> }
);

interface WorkflowEditorClientProps {
  workflowId: string;
  workflowName: string;
  flowJson: { nodes: Node[]; edges: Edge[] } | null;
  steps: Array<{
    id: string;
    step_order: number;
    name: string;
    action_type: string;
    delay_value: number;
    delay_unit: string;
    template_id: string | null;
    action_config: Record<string, unknown>;
    task_config: Record<string, unknown>;
    condition_config: Record<string, unknown>;
  }>;
  triggerConfig: Record<string, unknown>;
}

export function WorkflowEditorClient({
  workflowId,
  workflowName,
  flowJson,
  steps,
  triggerConfig,
}: WorkflowEditorClientProps) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // If flow_json exists, use it. Otherwise convert steps to flow.
  const initialFlow = useMemo(() => {
    if (flowJson?.nodes?.length) {
      return flowJson;
    }
    if (steps.length > 0) {
      return stepsToFlow(steps, triggerConfig);
    }
    // Empty workflow — just a trigger
    return {
      nodes: [{
        id: "trigger-1",
        type: "default",
        position: { x: 250, y: 0 },
        data: { label: "\uD83D\uDD35 Trigger", nodeType: "trigger" },
        style: { background: "#3b82f615", border: "2px solid #3b82f6", borderRadius: "12px", padding: "12px 16px", fontSize: "13px", fontWeight: "600", minWidth: "180px" },
      }],
      edges: [],
    };
  }, [flowJson, steps, triggerConfig]);

  const handleSave = (nodes: Node[], edges: Edge[]) => {
    startTransition(async () => {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const supabase = createAdminClient();

        // Save flow JSON
        await supabase
          .from("workflows")
          .update({ flow_json: { nodes, edges }, is_published: true })
          .eq("id", workflowId);

        // Convert to steps and save
        const newSteps = flowToSteps(
          nodes as any,
          edges as any
        );

        // Delete old steps
        await supabase
          .from("workflow_steps")
          .delete()
          .eq("workflow_id", workflowId);

        // Insert new steps
        if (newSteps.length > 0) {
          await supabase
            .from("workflow_steps")
            .insert(newSteps.map(s => ({ ...s, workflow_id: workflowId })));
        }

        router.refresh();
      } catch (e) {
        console.error("Save failed:", e);
      }
    });
  };

  return (
    <WorkflowCanvas
      initialNodes={initialFlow.nodes as Node[]}
      initialEdges={initialFlow.edges as Edge[]}
      onSave={handleSave}
      saving={pending}
    />
  );
}
