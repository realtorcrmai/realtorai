"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface KlingTaskState {
  status: "idle" | "pending" | "processing" | "completed" | "failed";
  outputUrl?: string;
  errorMessage?: string;
}

const POLL_INTERVAL = 5000;

async function fetchTaskStatus(taskId: string): Promise<KlingTaskState> {
  try {
    const res = await fetch(`/api/kling/status?taskId=${taskId}`);
    if (!res.ok) {
      return { status: "failed", errorMessage: "Failed to check task status" };
    }
    const data = await res.json();
    return {
      status: data.status,
      outputUrl: data.outputUrl,
      errorMessage: data.errorMessage,
    };
  } catch {
    return { status: "failed", errorMessage: "Network error checking task status" };
  }
}

export function useKlingTask(taskId: string | null) {
  const [state, setState] = useState<KlingTaskState>({ status: "idle" });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!taskId) {
      const raf = requestAnimationFrame(() => setState({ status: "idle" }));
      stopPolling();
      return () => cancelAnimationFrame(raf);
    }

    let cancelled = false;
    requestAnimationFrame(() => {
      if (!cancelled) setState({ status: "processing" });
    });

    // Initial check + start polling
    fetchTaskStatus(taskId).then((result) => {
      if (cancelled) return;
      setState(result);
      if (result.status === "completed" || result.status === "failed") {
        stopPolling();
        return;
      }
      // Start interval polling
      intervalRef.current = setInterval(() => {
        fetchTaskStatus(taskId).then((r) => {
          if (cancelled) return;
          setState(r);
          if (r.status === "completed" || r.status === "failed") {
            stopPolling();
          }
        });
      }, POLL_INTERVAL);
    });

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [taskId, stopPolling]);

  return { ...state, stopPolling };
}
