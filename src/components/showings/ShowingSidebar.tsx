"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Clock, Filter, X } from "lucide-react";
import { ShowingStatusBadge } from "@/components/showings/ShowingStatusBadge";
import type { Appointment } from "@/types";

type StatusFilter = "all" | "requested" | "confirmed" | "denied" | "cancelled";

// 5-step showing workflow: Request → Notified → Response → Completed → Feedback
type StepStatus = "completed" | "in-progress" | "pending" | "blocked";

const SHOWING_STEPS = ["Request", "Notified", "Response", "Showing", "Feedback"];

function deriveShowingWorkflow(status: string): StepStatus[] {
  switch (status) {
    case "requested":
      return ["completed", "in-progress", "pending", "pending", "pending"];
    case "confirmed":
      return ["completed", "completed", "completed", "in-progress", "pending"];
    case "completed":
      return ["completed", "completed", "completed", "completed", "in-progress"];
    case "denied":
      return ["completed", "completed", "blocked", "blocked", "blocked"];
    case "cancelled":
      return ["completed", "blocked", "blocked", "blocked", "blocked"];
    default:
      return ["in-progress", "pending", "pending", "pending", "pending"];
  }
}

const STEP_DOT_STYLES: Record<StepStatus, string> = {
  completed: "bg-success",
  "in-progress": "bg-orange-400",
  pending: "bg-gray-300 dark:bg-gray-600",
  blocked: "bg-red-400",
};

const STATUS_FILTERS: { value: StatusFilter; label: string; dot: string }[] = [
  { value: "all", label: "All", dot: "bg-gray-400" },
  { value: "requested", label: "Requested", dot: "bg-amber-500" },
  { value: "confirmed", label: "Confirmed", dot: "bg-brand" },
  { value: "denied", label: "Denied", dot: "bg-red-500" },
  { value: "cancelled", label: "Cancelled", dot: "bg-gray-500" },
];

export function ShowingSidebar({
  showings,
}: {
  showings: (Appointment & {
    listings: { address: string; lockbox_code: string } | null;
  })[];
}) {
  const pathname = usePathname();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilter = statusFilter !== "all";

  const filtered = showings.filter((s) => {
    const matchesSearch =
      !search ||
      (s.listings?.address ?? "").toLowerCase().includes(search.toLowerCase()) ||
      s.buyer_agent_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <aside className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b space-y-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">
            Showings{" "}
            <span className="text-muted-foreground font-normal">
              ({filtered.length})
            </span>
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-md transition-colors relative ${
              showFilters || hasActiveFilter ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
            }`}
            title="Filter showings"
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilter && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-brand" />
            )}
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search address or agent..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {showFilters && (
          <div className="space-y-2 pt-1 animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                    statusFilter === f.value
                      ? "bg-white ring-1 ring-gray-300 shadow-sm text-foreground"
                      : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${f.dot}`} />
                  {f.label}
                </button>
              ))}
            </div>
            {hasActiveFilter && (
              <button
                onClick={() => setStatusFilter("all")}
                className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" /> Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Showing items */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-sm text-muted-foreground">
              {search || hasActiveFilter ? "No matching showings" : "No showings yet"}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {filtered.map((showing) => {
              const isActive = pathname === `/showings/${showing.id}`;
              return (
                <Link key={showing.id} href={`/showings/${showing.id}`}>
                  <div
                    className={`px-4 py-3 border-b border-border/40 cursor-pointer transition-colors ${
                      isActive
                        ? "bg-primary/10 border-l-2 border-l-primary shadow-sm"
                        : "hover:bg-muted/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                          <p
                            className={`text-sm font-medium truncate ${
                              isActive ? "text-primary" : ""
                            }`}
                          >
                            {showing.listings?.address ?? "Unknown Listing"}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 ml-[18px]">
                          {showing.buyer_agent_name}
                        </p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5 ml-[18px]">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(showing.start_time).toLocaleString(
                              "en-CA",
                              {
                                timeZone: "America/Vancouver",
                                dateStyle: "medium",
                                timeStyle: "short",
                              }
                            )}
                          </span>
                        </div>
                        {/* Workflow progress dots */}
                        <div className="flex items-center gap-1 mt-1.5 ml-[18px]">
                          {deriveShowingWorkflow(showing.status).map((stepStatus, idx) => (
                            <span
                              key={idx}
                              title={SHOWING_STEPS[idx]}
                              className={`h-2 w-2 rounded-full ${STEP_DOT_STYLES[stepStatus]}`}
                            />
                          ))}
                        </div>
                      </div>
                      <ShowingStatusBadge
                        status={
                          showing.status as
                            | "requested"
                            | "confirmed"
                            | "denied"
                            | "cancelled"
                        }
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
