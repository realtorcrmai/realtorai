"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import { useVoiceNotifications } from "@/hooks/useVoiceNotifications";
import { VoiceAgentStatus } from "./VoiceAgentStatus";
import { AudioVisualizer } from "./AudioVisualizer";

export function VoiceAgentDashboard() {
  const { data: authSession } = useSession();
  const agentEmail = authSession?.user?.email ?? "";
  const {
    session,
    status,
    messages,
    isListening,
    isSpeaking,
    networkQuality,
    startSession,
    endSession,
    sendTextMessage,
    toggleMute,
    isMuted,
  } = useVoiceAgent();

  const { notifications, unreadCount, dismiss, connected: sseConnected } = useVoiceNotifications(agentEmail || null);
  const [textInput, setTextInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!textInput.trim()) return;
    const msg = textInput;
    setTextInput("");
    await sendTextMessage(msg);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="lf-glass p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold" style={{ background: "linear-gradient(135deg, var(--lf-indigo), var(--lf-coral))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              🎙️ Voice Agent
            </h1>
            <p className="text-sm text-[var(--lf-muted)] mt-1">
              Hands-free CRM navigation and voice commands
            </p>
          </div>
          <div className="flex items-center gap-3">
            <VoiceAgentStatus status={status} />
            {status === "disconnected" ? (
              <button
                onClick={() => startSession(agentEmail)}
                className="lf-btn"
                disabled={!agentEmail}
              >
                Start Voice Session
              </button>
            ) : (
              <button onClick={endSession} className="lf-btn-danger">
                End Session
              </button>
            )}
          </div>
        </div>

        {/* Session info */}
        {session && (
          <div className="mt-3 flex items-center gap-4 text-xs text-[var(--lf-muted)]">
            <span>Mode: {session.mode}</span>
            <span>LLM: {session.llm_provider}</span>
            <span>Network: {networkQuality}/5</span>
            {session.focus_type && (
              <span>Focus: {session.focus_type} ({session.focus_id?.slice(0, 8)}...)</span>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Conversation Panel */}
        <div className="lg:col-span-2 lf-card p-4" style={{ minHeight: "500px" }}>
          <h2 className="text-sm font-semibold mb-3">💬 Conversation</h2>

          {/* Audio Visualizer */}
          {status === "active" && (
            <div className="mb-3">
              <AudioVisualizer isActive={isListening || isSpeaking} height={30} />
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-[var(--lf-muted)]">
                  {isSpeaking ? "🔊 Speaking..." : isListening ? "🎤 Listening..." : "Standby"}
                </span>
                <button onClick={toggleMute} className="lf-btn-sm lf-btn-ghost text-xs">
                  {isMuted ? "🔇 Unmute" : "🎤 Mute"}
                </button>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "380px" }}>
            {messages.length === 0 && (
              <div className="text-center text-sm text-[var(--lf-muted)] py-8">
                {status === "disconnected"
                  ? "Click \"Start Voice Session\" to begin"
                  : "Say something or type a message..."}
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                    msg.role === "user"
                      ? "bg-[var(--lf-indigo)] text-white"
                      : msg.role === "system"
                        ? "bg-gray-100 text-[var(--lf-muted)] italic"
                        : msg.role === "tool"
                          ? "bg-amber-50 text-amber-800 text-xs font-mono"
                          : "bg-white border border-[var(--lf-border)]"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Text Input */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              className="lf-input flex-1"
              placeholder="Type a message or use voice..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              disabled={status === "disconnected"}
            />
            <button
              onClick={handleSend}
              className="lf-btn"
              disabled={status === "disconnected" || !textInput.trim()}
            >
              Send
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Notifications */}
          <div className="lf-card p-4">
            <h2 className="text-sm font-semibold mb-3">
              🔔 Notifications {unreadCount > 0 && <span className="lf-badge lf-badge-active">{unreadCount}</span>}
            </h2>
            <div className="flex items-center gap-2 text-xs text-[var(--lf-muted)] mb-2">
              <span className={`w-2 h-2 rounded-full ${sseConnected ? "bg-[#0F7694]/50" : "bg-gray-400"}`} />
              <span>{sseConnected ? "Connected" : "Reconnecting..."}</span>
            </div>
            {notifications.length === 0 ? (
              <p className="text-xs text-[var(--lf-muted)]">No new notifications</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {notifications.slice(0, 5).map((notif) => (
                  <div key={notif.id} className="p-2 bg-gray-50 rounded-lg text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{notif.title}</span>
                      <button onClick={() => dismiss(notif.id)} className="text-[var(--lf-muted)] hover:text-[var(--lf-text)]">
                        ✕
                      </button>
                    </div>
                    <p className="text-[var(--lf-muted)] mt-0.5">{notif.body}</p>
                    <span className={`lf-badge text-xs mt-1 ${notif.priority === "urgent" ? "lf-badge-blocked" : "lf-badge-info"}`}>
                      {notif.notification_type.replace(/_/g, " ")}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Provider Status */}
          <div className="lf-card p-4">
            <h2 className="text-sm font-semibold mb-3">⚡ Providers</h2>
            <div className="space-y-1.5 text-xs">
              {[
                { name: "LLM", value: session?.llm_provider ?? "—" },
                { name: "STT", value: session?.stt_provider ?? "—" },
                { name: "TTS", value: session?.tts_provider ?? "—" },
              ].map((p) => (
                <div key={p.name} className="flex items-center justify-between">
                  <span className="text-[var(--lf-muted)]">{p.name}</span>
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.value !== "—" ? "bg-[#0F7694]/50" : "bg-gray-300"}`} />
                    {p.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="lf-card p-4">
            <h2 className="text-sm font-semibold mb-3">🚀 Quick Voice Commands</h2>
            <div className="space-y-1">
              {[
                "Show me active listings",
                "What's my schedule today?",
                "Any new leads this week?",
                "Check pending showings",
              ].map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => {
                    setTextInput(cmd);
                  }}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-gray-50 text-[var(--lf-muted)] hover:text-[var(--lf-text)]"
                  disabled={status === "disconnected"}
                >
                  &quot;{cmd}&quot;
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
