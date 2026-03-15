"use client";

import { useState, useEffect, useCallback } from "react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { DealCard } from "./DealCard";
import { DealFormDialog } from "./DealFormDialog";
import { Badge } from "@/components/ui/badge";
import {
  BUYER_STAGES,
  SELLER_STAGES,
  STAGE_LABELS,
  STAGE_COLORS,
} from "@/lib/constants/pipeline";
import type { DealWithRelations, Contact, Listing } from "@/types";
import { DollarSign, Filter } from "lucide-react";

interface PipelineBoardProps {
  contacts: Contact[];
  listings: Listing[];
}

type ViewType = "all" | "buyer" | "seller";

export function PipelineBoard({ contacts, listings }: PipelineBoardProps) {
  const [deals, setDeals] = useState<DealWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>("all");
  const [mounted, setMounted] = useState(false);

  // DnD libraries need to wait for client-side hydration to complete
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchDeals = useCallback(async () => {
    try {
      const res = await fetch("/api/deals?status=active");
      if (res.ok) {
        const data = await res.json();
        setDeals(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Determine which stages to show
  const stages =
    viewType === "buyer"
      ? [...BUYER_STAGES]
      : viewType === "seller"
        ? [...SELLER_STAGES]
        : [
            "new_lead",
            "qualified",
            "pre_listing",
            "listed",
            "showing",
            "offer",
            "offer_received",
            "conditional",
            "subject_removal",
            "closing",
            "closed",
          ];

  // Group deals by stage
  const columns: Record<string, DealWithRelations[]> = {};
  for (const stage of stages) {
    columns[stage] = deals.filter((d) => {
      if (viewType !== "all" && d.type !== viewType) return false;
      return d.stage === stage;
    });
  }

  async function handleDragEnd(result: DropResult) {
    if (!result.destination) return;

    const dealId = result.draggableId;
    const newStage = result.destination.droppableId;
    const deal = deals.find((d) => d.id === dealId);
    if (!deal || deal.stage === newStage) return;

    // Optimistic update
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d))
    );

    // Auto-set status to "won" if moved to "closed"
    const updates: Record<string, unknown> = { stage: newStage };
    if (newStage === "closed") updates.status = "won";

    await fetch(`/api/deals/${dealId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  // Calculate totals
  const activeDeals = deals.filter((d) =>
    viewType === "all" ? true : d.type === viewType
  );
  const totalValue = activeDeals.reduce(
    (sum, d) => sum + (Number(d.value) || 0),
    0
  );
  const totalCommission = activeDeals.reduce(
    (sum, d) => sum + (Number(d.commission_amount) || 0),
    0
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 md:p-6 border-b backdrop-blur-2xl bg-white/78">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">Pipeline</h1>
          <div className="hidden md:flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50">
              <span className="text-muted-foreground">Deals:</span>
              <span className="font-semibold">{activeDeals.length}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50">
              <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold">
                ${totalValue.toLocaleString("en-CA")}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <span className="text-xs">GCI:</span>
              <span className="font-semibold text-xs">
                ${totalCommission.toLocaleString("en-CA")}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            <Filter className="h-3.5 w-3.5 text-muted-foreground ml-2" />
            {(["all", "buyer", "seller"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setViewType(t)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors capitalize ${
                  viewType === t
                    ? "bg-white shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <DealFormDialog
            contacts={contacts}
            listings={listings}
            onCreated={fetchDeals}
          />
        </div>
      </div>

      {/* Kanban Board */}
      {loading || !mounted ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-muted-foreground mt-3">
              Loading pipeline...
            </p>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex-1 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 p-4 md:p-6 h-full min-w-max">
              {stages.map((stage) => {
                const stageDeals = columns[stage] ?? [];
                const stageValue = stageDeals.reduce(
                  (s, d) => s + (Number(d.value) || 0),
                  0
                );

                return (
                  <div
                    key={stage}
                    className="flex flex-col w-[280px] shrink-0 rounded-xl bg-muted/30 border border-border/30"
                  >
                    {/* Column Header */}
                    <div className="p-3 border-b border-border/30">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`${STAGE_COLORS[stage] ?? ""} text-[10px] px-1.5 py-0 border-0`}
                          >
                            {STAGE_LABELS[stage]}
                          </Badge>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {stageDeals.length}
                          </span>
                        </div>
                      </div>
                      {stageValue > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-1">
                          ${stageValue.toLocaleString("en-CA")}
                        </p>
                      )}
                    </div>

                    {/* Droppable Column */}
                    <Droppable droppableId={stage}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`flex-1 overflow-y-auto p-2 space-y-2 min-h-[100px] transition-colors ${
                            snapshot.isDraggingOver
                              ? "bg-primary/5 ring-2 ring-primary/20 ring-inset rounded-b-xl"
                              : ""
                          }`}
                        >
                          {stageDeals.map((deal, index) => (
                            <Draggable
                              key={deal.id}
                              draggableId={deal.id}
                              index={index}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  className={
                                    dragSnapshot.isDragging
                                      ? "rotate-2 scale-105 opacity-90"
                                      : ""
                                  }
                                >
                                  <DealCard deal={deal} />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </div>
        </DragDropContext>
      )}
    </div>
  );
}
