"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type TaskData = {
  id: string;
  realtor_id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  due_date: string | null;
  start_date: string | null;
  contact_id: string | null;
  listing_id: string | null;
  assigned_to: string | null;
  parent_id: string | null;
  estimated_hours: number | null;
  labels: string[];
  position: number;
  visibility: "private" | "team";
  recurrence_rule: string | null;
  archived_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  contacts: { name: string } | null;
  listings: { address: string } | null;
  comment_count: number;
  assignee_name: string | null;
  assignee_email: string | null;
  is_overdue: boolean;
};

export type TaskPagination = {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
};

export type TaskFilters = {
  status?: string;
  priority?: string;
  category?: string;
  assigned_to?: string;
  scope?: string;
  search?: string;
  labels?: string;
  due_date_from?: string;
  due_date_to?: string;
  archived?: string;
  parent_id?: string;
  sort_by?: string;
  sort_dir?: string;
  page?: number;
  per_page?: number;
};

export type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_current: boolean;
};

export function useTasks(initialFilters?: TaskFilters) {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [pagination, setPagination] = useState<TaskPagination>({ page: 1, per_page: 50, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<TaskFilters>(initialFilters || {});
  const abortRef = useRef<AbortController | null>(null);

  const fetchTasks = useCallback(async (overrideFilters?: TaskFilters) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      const f = overrideFilters || filters;
      for (const [key, val] of Object.entries(f)) {
        if (val !== undefined && val !== null && val !== "") {
          params.set(key, String(val));
        }
      }

      const resp = await fetch(`/api/tasks?${params}`, { signal: controller.signal });
      const json = await resp.json();

      if (json.data) {
        setTasks(json.data);
        setPagination(json.pagination);
      } else if (Array.isArray(json)) {
        // Backwards compat
        setTasks(json);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateFilters = useCallback((newFilters: Partial<TaskFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters, page: newFilters.page ?? 1 }));
  }, []);

  const refresh = useCallback(() => fetchTasks(), [fetchTasks]);

  return { tasks, pagination, loading, filters, updateFilters, refresh, setFilters };
}

export function useTeamMembers() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/team-members")
      .then((r) => r.json())
      .then((data) => setMembers(Array.isArray(data) ? data : []))
      .catch(() => setMembers([]))
      .finally(() => setLoading(false));
  }, []);

  return { members, loading };
}
