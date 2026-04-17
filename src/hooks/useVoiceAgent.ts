"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useWebRTC } from "./useWebRTC";
import type { VoiceSession, VoiceSessionStatus } from "@/types/voice-agent";

interface VoiceMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  timestamp: Date;
}

interface UseVoiceAgentReturn {
  session: VoiceSession | null;
  status: VoiceSessionStatus | "disconnected";
  messages: VoiceMessage[];
  isListening: boolean;
  isSpeaking: boolean;
  networkQuality: number;
  startSession: (agentEmail: string, focusType?: string | null, focusId?: string | null) => Promise<void>;
  endSession: () => Promise<void>;
  sendTextMessage: (text: string) => Promise<void>;
  toggleMute: () => void;
  isMuted: boolean;
}

// All external voice agent calls are proxied through /api/voice-agent/proxy (server-side key).
// No client-side API key needed.

export function useVoiceAgent(): UseVoiceAgentReturn {
  const [session, setSession] = useState<VoiceSession | null>(null);
  const [messages, setMessages] = useState<VoiceMessage[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const webrtc = useWebRTC();
  const sessionIdRef = useRef<string | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const addMessage = useCallback((role: VoiceMessage["role"], content: string) => {
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role, content, timestamp: new Date() },
    ]);
  }, []);

  const startSession = useCallback(async (agentEmail: string, focusType?: string | null, focusId?: string | null) => {
    try {
      // Create session via CRM API — authenticated via session cookie, no NEXT_PUBLIC key needed
      const res = await fetch("/api/voice-agent/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_email: agentEmail,
          mode: "realtor",
          focus_type: focusType ?? null,
          focus_id: focusId ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");

      const newSession = data.session as VoiceSession;
      setSession(newSession);
      sessionIdRef.current = newSession.id;

      // Store session ID for page navigation persistence
      sessionStorage.setItem("voice_session_id", newSession.id);

      // Connect to Daily.co if room available
      if (newSession.daily_room_url && newSession.daily_session_token) {
        await webrtc.join(newSession.daily_room_url, newSession.daily_session_token);
        setIsListening(true);
        addMessage("system", "Voice session started. Speak naturally — I'm listening.");
      } else {
        addMessage("system", "Voice session started in text mode. Daily.co unavailable — type your messages.");
      }

      // Start heartbeat — POST to CRM route, authenticated via session cookie
      heartbeatRef.current = setInterval(() => {
        if (!sessionIdRef.current) return;
        fetch(`/api/voice-agent/sessions?session_id=${sessionIdRef.current}&action=heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session_id: sessionIdRef.current, action: "heartbeat" }),
        }).catch((err) => {
          console.warn("[useVoiceAgent] Heartbeat failed:", err instanceof Error ? err.message : err);
        });
      }, 30_000);
    } catch (err) {
      addMessage("system", `Failed to start session: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }, [webrtc, addMessage]);

  const endSession = useCallback(async () => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }

    if (sessionIdRef.current) {
      await fetch(`/api/voice-agent/sessions?session_id=${sessionIdRef.current}`, {
        method: "DELETE",
      }).catch(() => {});
    }

    await webrtc.leave();
    setSession(null);
    setIsListening(false);
    setIsSpeaking(false);
    sessionIdRef.current = null;
    sessionStorage.removeItem("voice_session_id");
    addMessage("system", "Voice session ended.");
  }, [webrtc, addMessage]);

  const sendTextMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    addMessage("user", text);

    try {
      // Route through server-side proxy — no client API key needed
      const res = await fetch("/api/voice-agent/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: "/api/chat/stream",
          body: {
            session_id: sessionIdRef.current,
            message: text,
            mode: session?.mode ?? "realtor",
          },
        }),
      });

      if (!res.ok) throw new Error("Chat request failed");

      const reader = res.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.text) fullResponse += data.text;
              if (data.tool_call) {
                addMessage("tool", `Called: ${data.tool_call.name}`);
              }
            } catch {
              // Partial JSON — skip
            }
          }
        }
      }

      if (fullResponse) {
        addMessage("assistant", fullResponse);

        // TTS playback if connected via WebRTC
        if (webrtc.state === "connected") {
          setIsSpeaking(true);
          try {
            const ttsRes = await fetch("/api/voice-agent/proxy", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ path: "/api/tts", body: { text: fullResponse } }),
            });
            if (ttsRes.ok) {
              const audioBlob = await ttsRes.blob();
              const audioUrl = URL.createObjectURL(audioBlob);
              const audio = new Audio(audioUrl);
              audio.onended = () => {
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
              };
              await audio.play();
            }
          } catch {
            setIsSpeaking(false);
          }
        }
      }
    } catch (err) {
      addMessage("system", `Error: ${err instanceof Error ? err.message : "Failed to send message"}`);
    }
  }, [session, webrtc.state, addMessage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  const status: VoiceSessionStatus | "disconnected" = session
    ? webrtc.state === "connected"
      ? "active"
      : webrtc.state === "error"
        ? "offline"
        : session.status
    : "disconnected";

  return {
    session,
    status,
    messages,
    isListening,
    isSpeaking,
    networkQuality: webrtc.networkQuality,
    startSession,
    endSession,
    sendTextMessage,
    toggleMute: webrtc.toggleMute,
    isMuted: webrtc.isMuted,
  };
}
