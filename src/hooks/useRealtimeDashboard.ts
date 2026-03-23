"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ── Types ───────────────────────────────────────────────────
export type DashboardStats = {
  activeListings: number;
  openTasks: number;
  pendingShowings: number;
  missingDocs: number;
  totalContacts: number;
  newLeadsToday: number;
};

export type RealtimeEvent = {
  id: string;
  type: "new_lead" | "showing_request" | "task_completed" | "listing_sold" | "listing_active" | "message_received";
  title: string;
  body: string;
  timestamp: Date;
  contactId?: string;
  listingId?: string;
};

const POLL_INTERVAL = 30_000; // 30 seconds
const REALTIME_TIMEOUT = 5_000; // 5 seconds to connect before falling back

// ── Hook ────────────────────────────────────────────────────
export function useRealtimeDashboard(initialStats: DashboardStats) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [events, setEvents] = useState<RealtimeEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [mode, setMode] = useState<"connecting" | "realtime" | "polling">("connecting");
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addEvent = useCallback((event: Omit<RealtimeEvent, "id" | "timestamp">) => {
    const newEvent: RealtimeEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
    setEvents((prev) => [newEvent, ...prev].slice(0, 20));
    return newEvent;
  }, []);

  // ── Polling fallback: fetch stats from API ──
  const pollStats = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard/stats");
      if (res.ok) {
        const data: DashboardStats = await res.json();
        setStats((prev) => {
          // Detect changes and create events
          if (data.totalContacts > prev.totalContacts) {
            addEvent({
              type: "new_lead",
              title: "New Lead",
              body: `${data.totalContacts - prev.totalContacts} new contact(s) added`,
            });
          }
          if (data.pendingShowings > prev.pendingShowings) {
            addEvent({
              type: "showing_request",
              title: "Showing Request",
              body: `${data.pendingShowings - prev.pendingShowings} new showing request(s)`,
            });
          }
          if (data.openTasks < prev.openTasks) {
            addEvent({
              type: "task_completed",
              title: "Task Completed",
              body: `${prev.openTasks - data.openTasks} task(s) completed`,
            });
          }
          return data;
        });
      }
    } catch {
      // Silently fail — will retry on next poll
    }
  }, [addEvent]);

  const startPolling = useCallback(() => {
    if (pollTimerRef.current) return;
    setMode("polling");
    // Immediate first poll
    pollStats();
    pollTimerRef.current = setInterval(pollStats, POLL_INTERVAL);
  }, [pollStats]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let realtimeConnected = false;

    // Set a timeout — if realtime doesn't connect in 5s, fall back to polling
    const fallbackTimer = setTimeout(() => {
      if (!realtimeConnected) {
        startPolling();
      }
    }, REALTIME_TIMEOUT);

    const channel = supabase
      .channel("dashboard-realtime")
      // ── Contacts: track new leads ──
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "contacts" },
        (payload: { new: Record<string, unknown> }) => {
          const contact = payload.new;
          setStats((prev) => ({
            ...prev,
            totalContacts: prev.totalContacts + 1,
            newLeadsToday: prev.newLeadsToday + 1,
          }));
          addEvent({
            type: "new_lead",
            title: "New Lead",
            body: `${contact.name} (${contact.type}) just added`,
            contactId: contact.id as string,
          });
        }
      )
      // ── Appointments: track new showing requests ──
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "appointments" },
        (payload: { new: Record<string, unknown> }) => {
          const appt = payload.new;
          if (appt.status === "requested") {
            setStats((prev) => ({
              ...prev,
              pendingShowings: prev.pendingShowings + 1,
            }));
          }
          addEvent({
            type: "showing_request",
            title: "Showing Request",
            body: `${appt.buyer_agent_name} requested a showing`,
            listingId: appt.listing_id as string,
          });
        }
      )
      // ── Appointments: track status changes ──
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointments" },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const oldStatus = payload.old.status;
          const newStatus = payload.new.status;
          if (oldStatus === "requested" && newStatus !== "requested") {
            setStats((prev) => ({
              ...prev,
              pendingShowings: Math.max(0, prev.pendingShowings - 1),
            }));
          }
        }
      )
      // ── Tasks: track completions and new tasks ──
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "tasks" },
        () => {
          setStats((prev) => ({
            ...prev,
            openTasks: prev.openTasks + 1,
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "tasks" },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const wasOpen = payload.old.status !== "completed";
          const isNowCompleted = payload.new.status === "completed";
          if (wasOpen && isNowCompleted) {
            setStats((prev) => ({
              ...prev,
              openTasks: Math.max(0, prev.openTasks - 1),
            }));
            addEvent({
              type: "task_completed",
              title: "Task Completed",
              body: `"${payload.new.title}" marked as done`,
            });
          }
        }
      )
      // ── Listings: track status changes ──
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "listings" },
        () => {
          setStats((prev) => ({
            ...prev,
            activeListings: prev.activeListings + 1,
          }));
          addEvent({
            type: "listing_active",
            title: "New Listing",
            body: "A new listing has been created",
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "listings" },
        (payload: { new: Record<string, unknown>; old: Record<string, unknown> }) => {
          const oldStatus = payload.old.status as string;
          const newStatus = payload.new.status as string;
          if (oldStatus === "active" && newStatus === "sold") {
            setStats((prev) => ({
              ...prev,
              activeListings: Math.max(0, prev.activeListings - 1),
            }));
            addEvent({
              type: "listing_sold",
              title: "Listing Sold!",
              body: `${payload.new.address} has been sold`,
              listingId: payload.new.id as string,
            });
          }
        }
      )
      // ── Communications: track new messages ──
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "communications" },
        (payload: { new: Record<string, unknown> }) => {
          const comm = payload.new;
          if (comm.direction === "inbound") {
            addEvent({
              type: "message_received",
              title: "Message Received",
              body: `New ${comm.channel} message received`,
              contactId: comm.contact_id as string,
            });
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          realtimeConnected = true;
          setIsConnected(true);
          setMode("realtime");
          stopPolling(); // Stop polling if realtime connects
          clearTimeout(fallbackTimer);
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setIsConnected(false);
          startPolling(); // Fall back to polling on error
        }
      });

    channelRef.current = channel;

    return () => {
      clearTimeout(fallbackTimer);
      stopPolling();
      supabase.removeChannel(channel);
    };
  }, [addEvent, startPolling, stopPolling]);

  const clearEvents = useCallback(() => setEvents([]), []);

  return { stats, events, isConnected, mode, clearEvents };
}
