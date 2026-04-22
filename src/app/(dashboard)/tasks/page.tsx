"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,

} from "@/components/ui/dialog";
import {
  Plus, ListTodo, CheckCheck, LayoutGrid, CalendarDays,
  List, Download, Archive, UserPlus, Flag,
  Search, SlidersHorizontal, X,
} from "lucide-react";
import { toast } from "sonner";
import { TaskForm } from "@/components/tasks/TaskForm";
import { TaskCard } from "@/components/tasks/TaskCard";
import { TaskPipeline } from "@/components/tasks/TaskPipeline";
import { TaskKanbanBoard } from "@/components/tasks/TaskKanbanBoard";
import { TaskCalendarView } from "@/components/tasks/TaskCalendarView";
import { TaskFiltersBar } from "@/components/tasks/TaskFiltersBar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTasks, useTeamMembers } from "@/hooks/useTasks";
import { Input } from "@/components/ui/input";
import type { TaskViewMode } from "@/lib/constants/tasks";

export default function TasksPage() {
  const { tasks, pagination, loading, filters, updateFilters, refresh } = useTasks({ parent_id: "null" });
  const { members } = useTeamMembers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [viewMode, setViewMode] = useState<TaskViewMode>("list");
  const [showFilters, setShowFilters] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Debounced search
  useEffect(() => {
    const timeout = setTimeout(() => updateFilters({ search: searchValue || undefined }), 300);
    return () => clearTimeout(timeout);
  }, [searchValue, updateFilters]);

  // Clear selection on data change
  useEffect(() => { setSelectedIds(new Set()); }, [tasks]);

  const selectableTasks = tasks.filter((t) => t.status !== "completed");
  const allSelected = selectableTasks.length > 0 && selectedIds.size === selectableTasks.length;
  const someSelected = selectedIds.size > 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const handleBulkAction = useCallback(async (action: string, value?: string) => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const resp = await fetch("/api/tasks/bulk-complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), action, value }),
      });
      if (!resp.ok) throw new Error("Failed");
      const result = await resp.json();
      toast.success(`${result.updated ?? selectedIds.size} task(s) updated`);
      setSelectedIds(new Set());
      refresh();
    } catch {
      toast.error("Bulk action failed");
    } finally {
      setBulkLoading(false);
    }
  }, [selectedIds, refresh]);

  function exportCSV() {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    window.open(`/api/tasks/export?${params}`, "_blank");
  }

  const activeFilterCount = [
    filters.status, filters.priority, filters.category,
    filters.assigned_to, filters.scope, filters.labels,
    filters.due_date_from, filters.due_date_to,
  ].filter(Boolean).length;

  return (
    <>
      <PageHeader
        title="Tasks"
        subtitle={loading ? "Loading..." : `${pagination.total} tasks`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={exportCSV} title="Export CSV">
              <Download className="h-4 w-4" />
            </Button>

            {/* View toggle */}
            <div className="flex items-center border rounded-lg overflow-hidden">
              {(["list", "board", "calendar"] as TaskViewMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`p-2 transition-colors ${viewMode === mode ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                  title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} view`}
                >
                  {mode === "list" ? <List className="h-4 w-4" /> :
                   mode === "board" ? <LayoutGrid className="h-4 w-4" /> :
                   <CalendarDays className="h-4 w-4" />}
                </button>
              ))}
            </div>

            <Button className="bg-brand text-white hover:bg-brand/90" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Task
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="sm:max-w-[560px]">
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                </DialogHeader>
                <TaskForm
                  teamMembers={members}
                  onSuccess={() => { setDialogOpen(false); refresh(); }}
                  onCancel={() => setDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      <div className="p-6 space-y-4">
        {/* Search + Filter bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              className="pl-9 h-9"
              aria-label="Search tasks"
            />
            {searchValue && (
              <button onClick={() => setSearchValue("")}
                className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>

          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-1.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-brand text-white rounded-full">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {selectableTasks.length > 0 && viewMode === "list" && (
            <button
              onClick={() => setSelectedIds(allSelected ? new Set() : new Set(selectableTasks.map((t) => t.id)))}
              className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          )}
        </div>

        {showFilters && (
          <TaskFiltersBar filters={filters} onUpdate={updateFilters} teamMembers={members} />
        )}

        <TaskPipeline tasks={tasks} />

        {/* View content */}
        {viewMode === "list" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                All Tasks
                <span className="text-muted-foreground font-normal text-sm">({pagination.total})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading && (
                <div className="text-center py-8">
                  <div className="h-8 w-8 mx-auto mb-2 rounded-full border-2 border-muted-foreground/30 border-t-brand animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading tasks...</p>
                </div>
              )}
              {!loading && tasks.length === 0 && (
                <div className="text-center py-8">
                  <ListTodo className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No tasks found</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {activeFilterCount > 0 ? "Try adjusting your filters" : "Create a task to get started"}
                  </p>
                </div>
              )}
              {tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onUpdate={refresh}
                  isSelected={selectedIds.has(task.id)}
                  onToggleSelect={task.status !== "completed" ? toggleSelect : undefined}
                  teamMembers={members}
                />
              ))}
            </CardContent>
          </Card>
        )}

        {viewMode === "board" && <TaskKanbanBoard tasks={tasks} onUpdate={refresh} teamMembers={members} />}
        {viewMode === "calendar" && <TaskCalendarView tasks={tasks} onUpdate={refresh} />}

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-2">
            <Button variant="outline" size="sm" disabled={pagination.page <= 1}
              onClick={() => updateFilters({ page: pagination.page - 1 })}>
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.total_pages}
            </span>
            <Button variant="outline" size="sm" disabled={pagination.page >= pagination.total_pages}
              onClick={() => updateFilters({ page: pagination.page + 1 })}>
              Next
            </Button>
          </div>
        )}

        {/* Bulk action bar */}
        {someSelected && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-xl bg-card border border-border">
            <span className="text-sm font-medium text-muted-foreground">{selectedIds.size} selected</span>
            <Button size="sm" variant="outline" onClick={() => setSelectedIds(new Set())} disabled={bulkLoading}>Clear</Button>
            <Button size="sm" onClick={() => handleBulkAction("complete")} disabled={bulkLoading} className="bg-brand hover:bg-brand/90 text-white">
              <CheckCheck className="h-4 w-4 mr-1.5" />Complete
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("archive")} disabled={bulkLoading}>
              <Archive className="h-4 w-4 mr-1.5" />Archive
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction("delete")} disabled={bulkLoading} className="text-destructive hover:text-destructive">
              Delete
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
