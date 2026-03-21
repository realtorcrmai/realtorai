/**
 * Flow Converter: React Flow JSON ↔ workflow_steps rows
 * Handles bidirectional conversion for the visual workflow editor.
 */

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
}

interface WorkflowStep {
  step_order: number;
  name: string;
  action_type: string;
  delay_minutes: number;
  delay_value: number;
  delay_unit: string;
  template_id: string | null;
  action_config: Record<string, unknown>;
  task_config: Record<string, unknown>;
  condition_config: Record<string, unknown>;
}

const NODE_TYPE_TO_ACTION: Record<string, string> = {
  trigger: "trigger",
  email: "auto_email",
  aiEmail: "ai_email",
  sms: "auto_sms",
  whatsapp: "auto_whatsapp",
  wait: "wait",
  condition: "condition",
  task: "manual_task",
  action: "system_action",
  alert: "auto_alert",
};

const ACTION_TO_NODE_TYPE: Record<string, string> = {};
for (const [nodeType, actionType] of Object.entries(NODE_TYPE_TO_ACTION)) {
  ACTION_TO_NODE_TYPE[actionType] = nodeType;
}

/**
 * Convert React Flow nodes + edges → sequential workflow_steps
 */
export function flowToSteps(
  nodes: FlowNode[],
  edges: FlowEdge[]
): WorkflowStep[] {
  // Topological sort following edges from trigger node
  const triggerNode = nodes.find(n => n.type === "trigger");
  if (!triggerNode) return [];

  const adjMap = new Map<string, string[]>();
  for (const edge of edges) {
    const targets = adjMap.get(edge.source) || [];
    targets.push(edge.target);
    adjMap.set(edge.source, targets);
  }

  const visited = new Set<string>();
  const ordered: FlowNode[] = [];

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = nodes.find(n => n.id === nodeId);
    if (node) ordered.push(node);
    const targets = adjMap.get(nodeId) || [];
    for (const t of targets) {
      dfs(t);
    }
  }

  dfs(triggerNode.id);

  // Convert nodes to steps (skip trigger node)
  const steps: WorkflowStep[] = [];
  let stepOrder = 1;

  for (const node of ordered) {
    if (node.type === "trigger") continue;

    const actionType = NODE_TYPE_TO_ACTION[node.type] || node.type;
    const data = node.data || {};

    const delayValue = (data.delay_value as number) || 0;
    const delayUnit = (data.delay_unit as string) || "minutes";
    const delayMinutes = toDelayMinutes(delayValue, delayUnit);

    steps.push({
      step_order: stepOrder++,
      name: (data.label as string) || `Step ${stepOrder}`,
      action_type: actionType,
      delay_minutes: delayMinutes,
      delay_value: delayValue,
      delay_unit: delayUnit,
      template_id: (data.template_id as string) || null,
      action_config: {
        email_type: data.email_type,
        send_mode: data.send_mode,
        ai_template_intent: data.ai_template_intent,
        ...(data.action_config as Record<string, unknown> || {}),
      },
      task_config: {
        title: data.task_title,
        priority: data.task_priority,
        category: data.task_category,
        ...(data.task_config as Record<string, unknown> || {}),
      },
      condition_config: {
        field: data.condition_field,
        operator: data.condition_operator,
        value: data.condition_value,
        ...(data.condition_config as Record<string, unknown> || {}),
      },
    });
  }

  return steps;
}

/**
 * Convert workflow_steps → React Flow nodes + edges
 */
export function stepsToFlow(
  steps: Array<{ id: string; step_order: number; name: string; action_type: string; delay_value: number; delay_unit: string; template_id: string | null; action_config: Record<string, unknown>; task_config: Record<string, unknown>; condition_config: Record<string, unknown> }>,
  triggerConfig?: Record<string, unknown>
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const nodes: FlowNode[] = [];
  const edges: FlowEdge[] = [];

  // Add trigger node
  const triggerId = "trigger-1";
  nodes.push({
    id: triggerId,
    type: "trigger",
    position: { x: 250, y: 0 },
    data: {
      label: "Trigger",
      trigger_type: triggerConfig?.trigger_type || "manual",
      contact_type: triggerConfig?.contact_type || "any",
    },
  });

  const sorted = [...steps].sort((a, b) => a.step_order - b.step_order);
  let prevId = triggerId;

  for (const step of sorted) {
    const nodeType = ACTION_TO_NODE_TYPE[step.action_type] || "action";
    const nodeId = `step-${step.id}`;
    const yPos = step.step_order * 140;

    nodes.push({
      id: nodeId,
      type: nodeType,
      position: { x: 250, y: yPos },
      data: {
        label: step.name,
        delay_value: step.delay_value,
        delay_unit: step.delay_unit,
        template_id: step.template_id,
        ...(step.action_config || {}),
        ...(step.task_config || {}),
        ...(step.condition_config || {}),
      },
    });

    edges.push({
      id: `edge-${prevId}-${nodeId}`,
      source: prevId,
      target: nodeId,
    });

    prevId = nodeId;
  }

  return { nodes, edges };
}

function toDelayMinutes(value: number, unit: string): number {
  switch (unit) {
    case "minutes": return value;
    case "hours": return value * 60;
    case "days": return value * 1440;
    default: return value;
  }
}
