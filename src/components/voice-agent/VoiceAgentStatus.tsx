"use client";

import type { VoiceSessionStatus } from "@/types/voice-agent";

const statusConfig: Record<VoiceSessionStatus | "disconnected", { color: string; label: string }> = {
  active: { color: "bg-brand/50", label: "Voice Active" },
  idle: { color: "bg-amber-500", label: "Voice Idle" },
  offline: { color: "bg-gray-400", label: "Voice Offline" },
  expired: { color: "bg-gray-400", label: "Session Expired" },
  disconnected: { color: "bg-gray-400", label: "Voice Off" },
};

export function VoiceAgentStatus({
  status,
  onClick,
}: {
  status: VoiceSessionStatus | "disconnected";
  onClick?: () => void;
}) {
  const config = statusConfig[status] ?? statusConfig.disconnected;

  return (
    <button
      onClick={onClick}
      className="lf-btn-ghost flex items-center gap-2 text-xs px-3 py-1.5"
      aria-label={`Voice agent status: ${config.label}`}
    >
      <span className={`inline-block w-2 h-2 rounded-full ${config.color} ${status === "active" ? "animate-pulse" : ""}`} />
      <span>{config.label}</span>
    </button>
  );
}
