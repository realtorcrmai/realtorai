"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export interface KlingTaskState {
  status: "idle" | "pending" | "processing" | "completed" | "failed";
  outputUrl?: string;
  errorMessage?: string;
}

const POLL_INTERVAL = 5000;

export function useKlingTask(taskId: string | null) {
  const [state, setState] = useState<KlingTaskState>({ status: "idle" });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const checkStatus = useCallback(async () => {
    if (!taskId) return;

    try {
      const res = await fetch(`/api/kling/status?taskId=${taskId}`);
      if (!res.ok) {
        setState({
          status: "failed",
          errorMessage: "Failed to check task status",
        });
        stopPolling();
        return;
      }

      const data = await res.json();
      setState({
        status: data.status,
        outputUrl: data.outputUrl,
        errorMessage: data.errorMessage,
      });

      // Stop polling on terminal states
      if (data.status === "completed" || data.status === "failed") {
        stopPolling();
      }
    } catch {
      setState({
        status: "failed",
        errorMessage: "Network error checking task status",
      });
      stopPolling();
    }
  }, [taskId, stopPolling]);

  useEffect(() => {
    if (!taskId) {
      setState({ status: "idle" });
      stopPolling();
      return;
    }

    setState({ status: "processing" });
    checkStatus();
    intervalRef.current = setInterval(checkStatus, POLL_INTERVAL);

    return () => stopPolling();
  }, [taskId, checkStatus, stopPolling]);

  return { ...state, stopPolling };
}
