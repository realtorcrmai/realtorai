"use client";

import { useCallback, useState } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  type Connection,
  type Node,
  type Edge,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

const NODE_TYPES_CONFIG = [
  { type: "email", label: "Email", color: "#8b5cf6", emoji: "\uD83D\uDCE7" },
  { type: "aiEmail", label: "AI Email", color: "#a855f7", emoji: "\uD83E\uDD16" },
  { type: "sms", label: "SMS", color: "#22c55e", emoji: "\uD83D\uDCF1" },
  { type: "wait", label: "Wait", color: "#6b7280", emoji: "\u23F3" },
  { type: "condition", label: "Condition", color: "#f59e0b", emoji: "\uD83D\uDD00" },
  { type: "task", label: "Task", color: "#eab308", emoji: "\u2705" },
  { type: "action", label: "Action", color: "#ef4444", emoji: "\u26A1" },
];

interface WorkflowCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onSave: (nodes: Node[], edges: Edge[]) => void;
  saving: boolean;
}

export default function WorkflowCanvas({ initialNodes, initialEdges, onSave, saving }: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, animated: true, style: { stroke: "#8b5cf6" } }, eds)),
    [setEdges]
  );

  const addNode = useCallback((type: string) => {
    const id = `node-${Date.now()}`;
    const config = NODE_TYPES_CONFIG.find(n => n.type === type);
    const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);

    const newNode: Node = {
      id,
      type: "default",
      position: { x: 250, y: maxY + 140 },
      data: {
        label: `${config?.emoji || ""} ${config?.label || type}`,
        nodeType: type,
      },
      style: {
        background: `${config?.color}15`,
        border: `2px solid ${config?.color}`,
        borderRadius: "12px",
        padding: "12px 16px",
        fontSize: "13px",
        fontWeight: "600",
        minWidth: "180px",
      },
    };

    setNodes(nds => [...nds, newNode]);

    // Auto-connect to last node
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      setEdges(eds => [...eds, {
        id: `edge-${lastNode.id}-${id}`,
        source: lastNode.id,
        target: id,
        animated: true,
        style: { stroke: "#8b5cf6" },
      }]);
    }
  }, [nodes, setNodes, setEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="flex h-full">
      {/* Node Palette */}
      <div className="w-56 border-r bg-muted/20 p-4 space-y-2 overflow-y-auto">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Add Step</h3>
        {NODE_TYPES_CONFIG.map(nt => (
          <button
            key={nt.type}
            onClick={() => addNode(nt.type)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left text-sm font-medium hover:bg-muted transition-colors border border-transparent hover:border-border"
          >
            <span className="text-base">{nt.emoji}</span>
            <span>{nt.label}</span>
          </button>
        ))}
      </div>

      {/* Canvas */}
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          fitView
          defaultEdgeOptions={{ animated: true, style: { stroke: "#8b5cf6" } }}
        >
          <Background color="#e8e5f5" gap={20} />
          <Controls />
          <Panel position="top-right">
            <button
              onClick={() => onSave(nodes, edges)}
              disabled={saving}
              className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-md"
            >
              {saving ? "Saving..." : "Save & Publish"}
            </button>
          </Panel>
        </ReactFlow>
      </div>

      {/* Config Panel */}
      {selectedNode && (
        <div className="w-72 border-l bg-muted/20 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Node Config</h3>
            <button onClick={() => setSelectedNode(null)} className="text-xs text-muted-foreground">{"\u2715"}</button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Label</label>
              <input
                type="text"
                value={(selectedNode.data as any).label || ""}
                onChange={e => {
                  setNodes(nds => nds.map(n => n.id === selectedNode.id ? { ...n, data: { ...n.data, label: e.target.value } } : n));
                  setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, label: e.target.value } });
                }}
                className="mt-1 w-full px-2.5 py-1.5 rounded-md border border-border bg-background text-sm"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              Type: {(selectedNode.data as any).nodeType || selectedNode.type}
            </div>
            <div className="text-xs text-muted-foreground">
              ID: {selectedNode.id}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
