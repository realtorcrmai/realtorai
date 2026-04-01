"use client";

import { useVoiceAgent } from "@/hooks/useVoiceAgent";
import type { FocusType } from "@/types/voice-agent";

export function ClickToVoiceButton({
  agentEmail,
  focusType,
  focusId,
  label = "Voice",
  size = "default",
}: {
  agentEmail: string;
  focusType: FocusType;
  focusId: string;
  label?: string;
  size?: "default" | "sm";
}) {
  const { status, startSession, endSession } = useVoiceAgent();
  const isActive = status === "active";

  const handleClick = async () => {
    if (isActive) {
      await endSession();
    } else {
      await startSession(agentEmail, focusType, focusId);
    }
  };

  const sizeClass = size === "sm" ? "lf-btn-sm" : "";

  return (
    <button
      onClick={handleClick}
      className={`lf-btn-ghost ${sizeClass} flex items-center gap-1.5`}
      aria-label={isActive ? "End voice session" : `Start voice session for ${focusType}`}
    >
      <span>{isActive ? "🔴" : "🎙️"}</span>
      <span>{isActive ? "End Voice" : label}</span>
    </button>
  );
}
