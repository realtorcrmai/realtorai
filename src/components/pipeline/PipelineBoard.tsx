"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import { DollarSign, Filter, Trophy, XCircle, Calendar, User, Building2, ArrowRight, TrendingUp, BarChart3 } from "lucide-react";
import Link from "next/link";
import { DEAL_STATUS_COLORS } from "@/lib/constants/pipeline";

interface PipelineBoardProps {
  contacts: Contact[];
  listings: Listing[];
}

type ViewType = "all" | "buyer" | "seller";

// Extract accent border-top color from stage
const STAGE_TOP_BORDER: Record<string, string> = {
  new_lead: "border-t-[#C8F5F0]",
  qualified: "border-t-[#67D4E8]",
  pre_listing: "border-t-slate-400",
  listed: "border-t-[#0F7694]",
  showing: "border-t-[#67D4E8]",
  offer: "border-t-amber-400",
  offer_received: "border-t-amber-500",
  conditional: "border-t-[#0F7694]",
  subject_removal: "border-t-rose-400",
  closing: "border-t-emerald-400",
  closed: "border-t-green-500",
};

export function PipelineBoard({ contacts, listings }: PipelineBoardProps) {
  const [deals, setDeals] = useState<DealWithRelations[]>([]);
  const [closedDeals, setClosedDeals] = useState<DealWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewType, setViewType] = useState<ViewType>("all");
  const [viewMode, setViewMode] = useState<"board" | "closed">("board");
  const [closedLoading, setClosedLoading] = useState(false);
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

  const fetchClosedDeals = useCallback(async () => {
    setClosedLoading(true);
    try {
      const [wonRes, lostRes] = await Promise.all([
        fetch("/api/deals?status=won"),
        fetch("/api/deals?status=lost"),
      ]);
      const won = wonRes.ok ? await wonRes.json() : [];
      const lost = lostRes.ok ? await lostRes.json() : [];
      setClosedDeals([...won, ...lost]);
    } finally {
      setClosedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  useEffect(() => {
    if (viewMode === "closed" && closedDeals.length === 0) {
      fetchClosedDeals();
    }
  }, [viewMode, closedDeals.length, fetchClosedDeals]);

  // Determine which stages to show
  const stages = useMemo(() =>
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
          ],
    [viewType]
  );

  // Group deals by stage
  const columns = useMemo(() => {
    const cols: Record<string, DealWithRelations[]> = {};
    for (const stage of stages) {
      cols[stage] = deals.filter((d) => {
        if (viewType !== "all" && d.type !== viewType) return false;
        return d.stage === stage;
      });
    }
    return cols;
  }, [stages, deals, viewType]);

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

  // Calculate totals for active board
  const { filteredActiveDeals, totalValue, totalCommission } = useMemo(() => {
    const filtered = deals.filter((d) =>
      viewType === "all" ? true : d.type === viewType
    );
    return {
      filteredActiveDeals: filtered,
      totalValue: filtered.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
      totalCommission: filtered.reduce((sum, d) => sum + (Number(d.commission_amount) || 0), 0),
    };
  }, [deals, viewType]);

  // Calculate totals for closed deals
  const { filteredClosedDeals, wonDeals, lostDeals, wonTotalValue, wonTotalGCI } = useMemo(() => {
    const filtered = closedDeals.filter((d) =>
      viewType === "all" ? true : d.type === viewType
    );
    const won = filtered.filter((d) => d.status === "won");
    const lost = filtered.filter((d) => d.status === "lost");
    return {
      filteredClosedDeals: filtered,
      wonDeals: won,
      lostDeals: lost,
      wonTotalValue: won.reduce((sum, d) => sum + (Number(d.value) || 0), 0),
      wonTotalGCI: won.reduce((sum, d) => sum + (Number(d.commission_amount) || 0), 0),
    };
  }, [closedDeals, viewType]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 md:p-6 border-b backdrop-blur-2xl bg-white/78">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">Pipeline</h1>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50">
            <button
              onClick={() => setViewMode("board")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "board"
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Active Board
            </button>
            <button
              onClick={() => setViewMode("closed")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === "closed"
                  ? "bg-white shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Closed Deals
            </button>
          </div>

          <div className="hidden md:flex items-center gap-2 text-sm">
            {viewMode === "board" ? (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-muted/80 border border-brand/15 text-brand-dark">
                  <BarChart3 className="h-3.5 w-3.5" />
                  <span className="font-bold">{filteredActiveDeals.length}</span>
                  <span className="text-xs opacity-75">deals</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-muted border border-brand/15 text-brand-dark">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="font-bold text-xs">
                    ${totalValue.toLocaleString("en-CA")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-muted border border-brand/15 text-brand-dark">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">GCI</span>
                  <span className="font-bold text-xs">
                    ${totalCommission.toLocaleString("en-CA")}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-muted border border-brand/15 text-brand-dark">
                  <Trophy className="h-3.5 w-3.5" />
                  <span className="font-bold">{wonDeals.length}</span>
                  <span className="text-xs opacity-75">won</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-muted border border-brand/15 text-brand-dark">
                  <DollarSign className="h-3.5 w-3.5" />
                  <span className="font-bold text-xs">
                    ${wonTotalValue.toLocaleString("en-CA")}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-muted border border-brand/15 text-brand-dark">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">GCI</span>
                  <span className="font-bold text-xs">
                    ${wonTotalGCI.toLocaleString("en-CA")}
                  </span>
                </div>
                {lostDeals.length > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50/80 border border-red-100 text-red-700">
                    <XCircle className="h-3.5 w-3.5" />
                    <span className="font-bold">{lostDeals.length}</span>
                    <span className="text-xs opacity-75">lost</span>
                  </div>
                )}
              </>
            )}
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

      {/* Closed Deals List View */}
      {viewMode === "closed" ? (
        closedLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">Loading closed deals...</p>
            </div>
          </div>
        ) : filteredClosedDeals.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">No closed deals yet.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-xl border border-brand/15 bg-brand-muted p-4">
                  <p className="text-xs text-emerald-700 font-medium">Won Deals</p>
                  <p className="text-2xl font-bold text-emerald-700 mt-1">{wonDeals.length}</p>
                </div>
                <div className="rounded-xl border border-brand/15 bg-brand-muted p-4">
                  <p className="text-xs text-brand-dark font-medium">Total Volume</p>
                  <p className="text-2xl font-bold text-foreground mt-1">${wonTotalValue > 0 ? (wonTotalValue / 1000000).toFixed(1) + "M" : "0"}</p>
                </div>
                <div className="rounded-xl border border-brand/15 bg-brand-muted p-4">
                  <p className="text-xs text-brand-dark font-medium">Earned GCI</p>
                  <p className="text-2xl font-bold text-foreground mt-1">${wonTotalGCI.toLocaleString("en-CA")}</p>
                </div>
                <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                  <p className="text-xs text-amber-600 font-medium">Avg Deal Size</p>
                  <p className="text-2xl font-bold text-amber-700 mt-1">${wonDeals.length > 0 ? (wonTotalValue / wonDeals.length / 1000).toFixed(0) + "K" : "0"}</p>
                </div>
              </div>

              {/* Won Deals */}
              {wonDeals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Trophy className="h-4 w-4 text-brand" />
                    <h2 className="text-sm font-semibold text-brand-dark">Won Deals ({wonDeals.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {wonDeals.map((deal) => (
                      <ClosedDealCard key={deal.id} deal={deal} />
                    ))}
                  </div>
                </div>
              )}

              {/* Lost Deals */}
              {lostDeals.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <XCircle className="h-4 w-4 text-red-500" />
                    <h2 className="text-sm font-semibold text-red-700">Lost Deals ({lostDeals.length})</h2>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {lostDeals.map((deal) => (
                      <ClosedDealCard key={deal.id} deal={deal} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      ) : /* Kanban Board */
      loading || !mounted ? (
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
                    className={`flex flex-col w-[280px] shrink-0 rounded-xl bg-muted/20 border border-border/30 border-t-[3px] ${STAGE_TOP_BORDER[stage] ?? "border-t-gray-300"}`}
                  >
                    {/* Column Header */}
                    <div className="p-3 border-b border-border/30">
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-semibold`}>
                          {STAGE_LABELS[stage]}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="h-5 w-5 rounded-full bg-muted/80 flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {stageDeals.length}
                          </span>
                        </div>
                      </div>
                      {stageValue > 0 && (
                        <p className="text-[11px] text-muted-foreground mt-1 font-medium">
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
                          {stageDeals.length === 0 && !snapshot.isDraggingOver && (
                            <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-border/50 text-xs text-muted-foreground/60">
                              No deals
                            </div>
                          )}
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

function ClosedDealCard({ deal }: { deal: DealWithRelations }) {
  const isWon = deal.status === "won";

  return (
    <Link href={`/pipeline/${deal.id}`}>
      <div
        className={`group rounded-xl border overflow-hidden transition-all hover:shadow-lg cursor-pointer ${
          isWon
            ? "border-brand/30 hover:border-brand/50"
            : "border-red-200 hover:border-red-300"
        }`}
      >
        {/* Left accent bar + content */}
        <div className="flex">
          <div className={`w-1.5 shrink-0 ${isWon ? "bg-success" : "bg-red-400"}`} />
          <div className="flex-1 p-4">
            {/* Title row */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 flex-wrap min-w-0">
                <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{deal.title}</p>
                <Badge
                  variant="outline"
                  className={`${DEAL_STATUS_COLORS[deal.status] ?? ""} text-[10px] px-1.5 py-0 border-0 capitalize`}
                >
                  {deal.status}
                </Badge>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                  {deal.type}
                </Badge>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2" />
            </div>

            {/* Contact & Listing */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3 flex-wrap">
              {deal.contacts && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3 shrink-0" />
                  <span className="truncate">{deal.contacts.name}</span>
                </span>
              )}
              {deal.listings && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3 shrink-0" />
                  <span className="truncate">{deal.listings.address}</span>
                </span>
              )}
            </div>

            {/* Value row */}
            <div className={`flex items-center justify-between pt-2 border-t border-brand/15" : "border-red-100"}`}>
              <div className="flex items-center gap-3">
                {deal.value && (
                  <span className="text-sm font-bold">
                    ${Number(deal.value).toLocaleString("en-CA")}
                  </span>
                )}
                {deal.commission_amount && isWon && (
                  <span className="text-xs text-brand font-semibold bg-brand-muted px-1.5 py-0.5 rounded">
                    GCI ${Number(deal.commission_amount).toLocaleString("en-CA")}
                  </span>
                )}
              </div>
              {deal.close_date && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(deal.close_date).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
