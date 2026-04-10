"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const VOICE_AGENT_API =
  process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "http://127.0.0.1:8768";

export function VoiceStatusIndicator() {
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState("");

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    async function check() {
      try {
        const resp = await fetch(`${VOICE_AGENT_API}/api/health`, {
          signal: AbortSignal.timeout(3000),
        });
        const data = await resp.json();
        setConnected(data.ok === true);
        setProvider(data.llm_provider || "");
      } catch {
        setConnected(false);
      }
    }

    check();
    interval = setInterval(check, 30000);
    return () => {
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/voice-agent"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:bg-accent/60 transition-colors"
      title={connected ? `Voice Agent online (${provider})` : "Voice Agent offline"}
    >
      <span className="text-sm">🎙️</span>
      <span
        className={`h-2 w-2 rounded-full ${
          connected ? "bg-brand/50" : "bg-red-400"
        }`}
      />
    </Link>
  );
}
