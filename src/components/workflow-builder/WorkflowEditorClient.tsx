"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { stepsToFlow } from "@/lib/flow-converter";
import { saveWorkflowCanvas } from "@/actions/workflow";
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

  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = (nodes: Node[], edges: Edge[]) => {
    setSaveError(null);
    startTransition(async () => {
      const result = await saveWorkflowCanvas(workflowId, nodes, edges);
      if (result.error) {
        setSaveError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="flex flex-col h-full">
      {saveError && (
        <div className="px-4 py-2 text-sm text-destructive bg-destructive/10 border-b border-destructive/20">
          Save failed: {saveError}
        </div>
      )}
      <WorkflowCanvas
        initialNodes={initialFlow.nodes as Node[]}
        initialEdges={initialFlow.edges as Edge[]}
        onSave={handleSave}
        saving={pending}
      />
    </div>
  );
}
