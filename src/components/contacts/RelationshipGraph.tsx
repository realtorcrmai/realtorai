"use client";

import { useRef, useEffect, useCallback } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type GraphNode = {
  id: string;
  name: string;
  initials: string;
  type: "buyer" | "seller" | "partner" | "other" | "child";
  isCentral: boolean;
  color: string;
};

export type GraphEdge = {
  source: string;
  target: string;
  label: string;
  color: string;
  dashed?: boolean;
};

type Props = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onNodeClick?: (nodeId: string) => void;
};

// ── Internal simulation node (mutable) ─────────────────────────────────────

type SimNode = {
  id: string;
  label: string;
  initials: string;
  color: string;
  radius: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  central: boolean;
};

// ── Component ──────────────────────────────────────────────────────────────

export default function RelationshipGraph({ nodes, edges, onNodeClick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable refs so the animation loop always sees latest props / state
  const simNodesRef = useRef<SimNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>(edges);
  const hoveredRef = useRef<SimNode | null>(null);
  const dragRef = useRef<SimNode | null>(null);
  const onNodeClickRef = useRef(onNodeClick);
  const animFrameRef = useRef<number>(0);

  // Keep callback ref in sync
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);

  // Rebuild simulation nodes when props change
  useEffect(() => {
    edgesRef.current = edges;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const centerX = cw / 2;
    const centerY = ch / 2;

    // Determine which nodes are direct connections of a central node
    const centralIds = new Set(nodes.filter((n) => n.isCentral).map((n) => n.id));
    const directIds = new Set<string>();
    edges.forEach((e) => {
      if (centralIds.has(e.source)) directIds.add(e.target);
      if (centralIds.has(e.target)) directIds.add(e.source);
    });

    simNodesRef.current = nodes.map((n, i) => {
      let radius = 18; // default
      if (n.isCentral) radius = 32;
      else if (directIds.has(n.id)) radius = 24;

      // Spread initial positions around center
      const angle = (i / nodes.length) * Math.PI * 2;
      const dist = n.isCentral ? 0 : 80 + Math.random() * 40;

      return {
        id: n.id,
        label: n.name,
        initials: n.initials,
        color: n.color,
        radius,
        x: centerX + Math.cos(angle) * dist,
        y: centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        central: n.isCentral,
      };
    });
  }, [nodes, edges]);

  // ── Canvas sizing helper ────────────────────────────────────────────────
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + "px";
    canvas.style.height = rect.height + "px";
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }, []);

  // ── Main animation loop setup ───────────────────────────────────────────
  useEffect(() => {
    const canvasEl = canvasRef.current;
    const container = containerRef.current;
    if (!canvasEl || !container) return;

    const ctxOrNull = canvasEl.getContext("2d");
    if (!ctxOrNull) return;
    const ctx = ctxOrNull;
    // Local const for closure — TS narrows these after the null checks above
    const canvas = canvasEl;

    // Initial size
    resizeCanvas();

    // Observe container resizing
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(container);

    // Helpers
    const dpr = () => window.devicePixelRatio || 1;
    const W = () => canvas.width / dpr();
    const H = () => canvas.height / dpr();

    // ── Physics ─────────────────────────────────────────────────────────
    function simulate() {
      const simNodes = simNodesRef.current;
      const simEdges = edgesRef.current;
      const centerX = W() / 2;
      const centerY = H() / 2;

      // Center gravity
      simNodes.forEach((n) => {
        n.vx += (centerX - n.x) * 0.001;
        n.vy += (centerY - n.y) * 0.001;
      });

      // Repulsion (Coulomb)
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const dx = simNodes[j].x - simNodes[i].x;
          const dy = simNodes[j].y - simNodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 2000 / (dist * dist);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          simNodes[i].vx -= fx;
          simNodes[i].vy -= fy;
          simNodes[j].vx += fx;
          simNodes[j].vy += fy;
        }
      }

      // Spring attraction (Hooke) along edges
      simEdges.forEach((e) => {
        const a = simNodes.find((n) => n.id === e.source);
        const b = simNodes.find((n) => n.id === e.target);
        if (!a || !b) return;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const target = 120;
        const force = (dist - target) * 0.005;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      });

      // Damping + integration + bounds
      simNodes.forEach((n) => {
        if (n === dragRef.current) return;
        n.vx *= 0.85;
        n.vy *= 0.85;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(n.radius + 10, Math.min(W() - n.radius - 10, n.x));
        n.y = Math.max(n.radius + 10, Math.min(H() - n.radius - 10, n.y));
      });
    }

    // ── Rendering ───────────────────────────────────────────────────────
    function draw() {
      const simNodes = simNodesRef.current;
      const simEdges = edgesRef.current;
      const hovered = hoveredRef.current;

      ctx.clearRect(0, 0, W(), H());

      // Draw edges
      simEdges.forEach((e) => {
        const a = simNodes.find((n) => n.id === e.source);
        const b = simNodes.find((n) => n.id === e.target);
        if (!a || !b) return;

        const isHighlighted =
          hovered && (hovered.id === e.source || hovered.id === e.target);

        ctx.beginPath();
        if (e.dashed) ctx.setLineDash([4, 4]);
        else ctx.setLineDash([]);

        ctx.strokeStyle = isHighlighted ? e.color : e.color + "60";
        ctx.lineWidth = isHighlighted ? 3 : 2;

        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Edge label on hover
        if (isHighlighted) {
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;

          // Perpendicular offset so label doesn't sit on the line
          const edgeDx = b.x - a.x;
          const edgeDy = b.y - a.y;
          const edgeLen = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy) || 1;
          const offsetX = (-edgeDy / edgeLen) * 12;
          const offsetY = (edgeDx / edgeLen) * 12;
          const labelX = mx + offsetX;
          const labelY = my + offsetY;

          const label = e.label;
          ctx.font = "500 10px system-ui, sans-serif";
          ctx.textAlign = "center";

          // Background pill behind edge label
          const textWidth = ctx.measureText(label).width;
          const padding = 4;
          ctx.fillStyle = "rgba(255,255,255,0.9)";
          ctx.beginPath();
          ctx.roundRect(labelX - textWidth / 2 - padding, labelY - 12, textWidth + padding * 2, 16, 4);
          ctx.fill();

          ctx.fillStyle = e.color;
          ctx.fillText(label, labelX, labelY - 2);
        }
      });

      // Draw nodes
      simNodes.forEach((n) => {
        const isHovered = hovered === n;
        const isConnected =
          hovered &&
          simEdges.some(
            (e) =>
              (e.source === hovered.id && e.target === n.id) ||
              (e.target === hovered.id && e.source === n.id)
          );
        const dimmed = hovered && !isHovered && !isConnected;

        // Glow for hovered or central
        if (isHovered || n.central) {
          ctx.beginPath();
          const glowR = n.radius + (isHovered ? 16 : 10);
          const grad = ctx.createRadialGradient(
            n.x,
            n.y,
            n.radius,
            n.x,
            n.y,
            glowR
          );
          grad.addColorStop(0, n.color + "30");
          grad.addColorStop(1, n.color + "00");
          ctx.fillStyle = grad;
          ctx.arc(n.x, n.y, glowR, 0, Math.PI * 2);
          ctx.fill();
        }

        // Circle fill
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = dimmed ? n.color + "40" : n.color;
        ctx.fill();

        // Hover border
        if (isHovered) {
          ctx.strokeStyle = "white";
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Initials
        ctx.font = `700 ${n.radius * 0.6}px system-ui, sans-serif`;
        ctx.fillStyle = dimmed ? "rgba(255,255,255,0.5)" : "white";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(n.initials, n.x, n.y);

        // Name label below (truncated + background pill)
        const displayName = n.label.length > 14 ? n.label.substring(0, 13) + "\u2026" : n.label;
        ctx.font = "600 11px system-ui, sans-serif";
        ctx.textAlign = "center";
        const nameWidth = ctx.measureText(displayName).width;
        ctx.fillStyle = "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.roundRect(n.x - nameWidth / 2 - 4, n.y + n.radius + 6, nameWidth + 8, 16, 4);
        ctx.fill();
        ctx.fillStyle = dimmed ? "#1a153540" : "#1a1535";
        ctx.fillText(displayName, n.x, n.y + n.radius + 16);
      });
    }

    // ── Loop ────────────────────────────────────────────────────────────
    function loop() {
      simulate();
      draw();
      animFrameRef.current = requestAnimationFrame(loop);
    }
    animFrameRef.current = requestAnimationFrame(loop);

    // ── Hit-test helper ─────────────────────────────────────────────────
    function nodeAt(mx: number, my: number): SimNode | null {
      for (const n of simNodesRef.current) {
        const dx = mx - n.x;
        const dy = my - n.y;
        if (dx * dx + dy * dy < n.radius * n.radius) return n;
      }
      return null;
    }

    // ── Mouse handlers ──────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      if (dragRef.current) {
        dragRef.current.x = mx;
        dragRef.current.y = my;
        dragRef.current.vx = 0;
        dragRef.current.vy = 0;
        return;
      }

      const hit = nodeAt(mx, my);
      hoveredRef.current = hit;
      canvas.style.cursor = hit ? "pointer" : "default";
    }

    function onMouseDown(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      const hit = nodeAt(e.clientX - rect.left, e.clientY - rect.top);
      if (hit) {
        dragRef.current = hit;
        canvas.style.cursor = "grabbing";
      }
    }

    function onMouseUp() {
      if (dragRef.current && !dragMovedFar) {
        // Treat as click if didn't move much
        onNodeClickRef.current?.(dragRef.current.id);
      }
      dragRef.current = null;
      canvas.style.cursor = hoveredRef.current ? "pointer" : "default";
    }

    function onMouseLeave() {
      hoveredRef.current = null;
      dragRef.current = null;
    }

    // Track whether drag actually moved (to distinguish click vs drag)
    let dragMovedFar = false;
    let dragStartX = 0;
    let dragStartY = 0;

    function onMouseDownTracked(e: MouseEvent) {
      dragMovedFar = false;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      onMouseDown(e);
    }

    function onMouseMoveTracked(e: MouseEvent) {
      if (dragRef.current) {
        const dx = e.clientX - dragStartX;
        const dy = e.clientY - dragStartY;
        if (dx * dx + dy * dy > 25) dragMovedFar = true;
      }
      onMouseMove(e);
    }

    canvas.addEventListener("mousemove", onMouseMoveTracked);
    canvas.addEventListener("mousedown", onMouseDownTracked);
    canvas.addEventListener("mouseup", onMouseUp);
    canvas.addEventListener("mouseleave", onMouseLeave);

    // Cleanup
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMouseMoveTracked);
      canvas.removeEventListener("mousedown", onMouseDownTracked);
      canvas.removeEventListener("mouseup", onMouseUp);
      canvas.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [resizeCanvas]);

  // ── Empty state ─────────────────────────────────────────────────────────
  if (nodes.length === 0) {
    return (
      <div className="lf-card rounded-xl" style={{ aspectRatio: "16/10" }}>
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid rgba(79,53,210,0.06)",
            fontWeight: 700,
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            color: "#6b5ce7",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>🕸️ Relationship Network</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "calc(100% - 56px)",
            color: "#888",
            fontSize: 14,
          }}
        >
          No relationships yet
        </div>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="lf-card rounded-xl" style={{ aspectRatio: "16/10" }}>
      <div
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(79,53,210,0.06)",
          fontWeight: 700,
          fontSize: 13,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "#6b5ce7",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>🕸️ Relationship Network</span>
      </div>
      <div
        ref={containerRef}
        style={{ width: "100%", height: "calc(100% - 56px)" }}
      >
        <canvas ref={canvasRef} style={{ display: "block" }} />
      </div>
    </div>
  );
}
