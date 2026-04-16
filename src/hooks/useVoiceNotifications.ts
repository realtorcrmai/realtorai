"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { VoiceNotification } from "@/types/voice-agent";

interface UseVoiceNotificationsReturn {
  notifications: VoiceNotification[];
  unreadCount: number;
  dismiss: (id: string) => void;
  connected: boolean;
}

export function useVoiceNotifications(agentEmail: string | null): UseVoiceNotificationsReturn {
  const [notifications, setNotifications] = useState<VoiceNotification[]>([]);
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const retryDelayRef = useRef(1000);
  const lastEventIdRef = useRef<string | null>(null);

  const dismiss = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    // Mark as read server-side
    fetch(`/api/voice-agent/notifications?action=read&notification_id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!agentEmail) return;

    let aborted = false;
    const abortController = new AbortController();

    const email = agentEmail;

    function connect() {
      if (aborted || !email) return;

      // Session cookie is sent automatically — no API key needed
      let url = `/api/voice-agent/notifications/stream?agent_email=${encodeURIComponent(email)}`;

      if (lastEventIdRef.current) {
        url += `&last_event_id=${encodeURIComponent(lastEventIdRef.current)}`;
      }

      fetch(url, { signal: abortController.signal })
        .then(async (res) => {
          if (!res.ok || !res.body) {
            throw new Error("SSE connection failed");
          }

          setConnected(true);
          retryDelayRef.current = 1000; // Reset backoff on success

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!aborted) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const events = buffer.split("\n\n");
            buffer = events.pop() ?? "";

            for (const event of events) {
              const idMatch = event.match(/^id: (.+)$/m);
              if (idMatch) lastEventIdRef.current = idMatch[1];

              const dataMatch = event.match(/^data: (.+)$/m);
              const typeMatch = event.match(/^event: (.+)$/m);

              if (dataMatch && typeMatch?.[1] === "notification") {
                try {
                  const notif = JSON.parse(dataMatch[1]) as VoiceNotification;
                  setNotifications((prev) => {
                    if (prev.some((n) => n.id === notif.id)) return prev;
                    return [...prev, notif];
                  });
                } catch {
                  // Skip malformed events
                }
              }
            }
          }
        })
        .catch(() => {
          setConnected(false);
        })
        .finally(() => {
          if (!aborted) {
            // Exponential backoff reconnection: 1s, 2s, 4s, 8s, max 30s
            setTimeout(connect, retryDelayRef.current);
            retryDelayRef.current = Math.min(retryDelayRef.current * 2, 30_000);
          }
        });
    }

    connect();

    return () => {
      aborted = true;
      abortController.abort();
      setConnected(false);
    };
  }, [agentEmail]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return { notifications, unreadCount, dismiss, connected };
}
