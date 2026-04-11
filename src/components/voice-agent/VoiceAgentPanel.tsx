"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Send,
  Loader2,
  Bot,
  Volume2,
  VolumeX,
  Square,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const VOICE_AGENT_API =
  process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "http://127.0.0.1:8768";

type Message = {
  role: "user" | "assistant" | "system" | "tool" | "nav";
  content: string;
  streaming?: boolean;
};

// Navigation map for voice commands
const NAV_MAP: Record<string, { path: string; label: string }> = {
  dashboard: { path: "/", label: "Dashboard" },
  home: { path: "/", label: "Dashboard" },
  contact: { path: "/contacts", label: "Contacts" },
  contacts: { path: "/contacts", label: "Contacts" },
  task: { path: "/tasks", label: "Tasks" },
  tasks: { path: "/tasks", label: "Tasks" },
  listing: { path: "/listings", label: "Listings" },
  listings: { path: "/listings", label: "Listings" },
  showing: { path: "/showings", label: "Showings" },
  showings: { path: "/showings", label: "Showings" },
  calendar: { path: "/calendar", label: "Calendar" },
  schedule: { path: "/calendar", label: "Calendar" },
  search: { path: "/search", label: "Property Search" },
  "property search": { path: "/search", label: "Property Search" },
  workflow: { path: "/workflow", label: "MLS Workflow" },
  mls: { path: "/workflow", label: "MLS Workflow" },
  import: { path: "/import", label: "Excel Import" },
  form: { path: "/forms", label: "BC Forms" },
  forms: { path: "/forms", label: "BC Forms" },
};

const NAV_TRIGGERS = [
  "go to",
  "open",
  "show me",
  "navigate to",
  "take me to",
  "switch to",
  "show",
];

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/contacts": "Contacts",
  "/tasks": "Tasks",
  "/listings": "Listings",
  "/showings": "Showings",
  "/calendar": "Calendar",
  "/search": "Property Search",
  "/workflow": "MLS Workflow",
  "/import": "Excel Import",
  "/forms": "BC Forms",
};

function parseNavigation(text: string): { path: string; label: string } | null {
  const lower = text.toLowerCase().trim();
  const hasNavTrigger = NAV_TRIGGERS.some((t) => lower.includes(t));
  if (!hasNavTrigger) return null;
  for (const [keyword, dest] of Object.entries(NAV_MAP)) {
    if (lower.includes(keyword)) return dest;
  }
  return null;
}

export function VoiceAgentPanel() {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm your RealtorAI assistant. I can help you navigate the portal, search properties, manage tasks, and more. Try saying \"show me contacts\" or ask anything!",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Health check — stop polling if agent is offline
  useEffect(() => {
    let stopped = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function check() {
      try {
        const resp = await fetch(`${VOICE_AGENT_API}/api/health`, {
          signal: AbortSignal.timeout(3000),
        });
        const data = await resp.json();
        if (data.ok) {
          setConnected(true);
          if (!stopped && !interval) {
            interval = setInterval(check, 30000);
          }
        }
      } catch {
        setConnected(false);
        if (interval) { clearInterval(interval); interval = null; }
      }
    }
    check();
    return () => {
      stopped = true;
      if (interval) clearInterval(interval);
    };
  }, []);

  // Speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>)
            .webkitSpeechRecognition
        : null;
    if (SpeechRecognitionAPI) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recognition = new (SpeechRecognitionAPI as any)();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += t;
          else interimTranscript += t;
        }
        setInput(finalTranscript || interimTranscript);
      };
      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognitionRef.current = recognition;
    }
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef(false);

  const speak = useCallback(
    async (text: string) => {
      if (!ttsEnabled || !text.trim()) return;

      ttsAbortRef.current = false;

      // Try Edge TTS first (high quality server-side)
      try {
        const sentences = text.match(/[^.!?]+[.!?]+[\s]?|[^.!?]+$/g) || [text];
        setSpeaking(true);

        for (const sentence of sentences) {
          if (ttsAbortRef.current) break;
          const trimmed = sentence.trim();
          if (!trimmed) continue;

          try {
            const resp = await fetch(`${VOICE_AGENT_API}/api/tts`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer va-bridge-secret-key-2026" },
              body: JSON.stringify({ text: trimmed, voice: "en-US-AvaMultilingualNeural" }),
              signal: AbortSignal.timeout(15000),
            });
            if (!resp.ok || ttsAbortRef.current) continue;
            const audioData = await resp.arrayBuffer();
            if (ttsAbortRef.current) break;

            await new Promise<void>((resolve) => {
              const blob = new Blob([audioData], { type: "audio/mpeg" });
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audioRef.current = audio;
              audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
              audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
              audio.play().catch(() => resolve());
            });
          } catch {
            continue; // skip this sentence if TTS fails
          }
        }

        setSpeaking(false);
        audioRef.current = null;
        return;
      } catch {
        // Fall through to browser TTS
      }

      // Browser TTS fallback
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setSpeaking(false);
        return;
      }
      window.speechSynthesis.cancel();
      const clean = text
        .replace(/```[\s\S]*?```/g, "code block")
        .replace(/`[^`]+`/g, (m) => m.replace(/`/g, ""))
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#{1,6}\s/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[_~]/g, "");
      const u = new SpeechSynthesisUtterance(clean);
      u.rate = 1.0;
      u.pitch = 1.0;
      u.lang = "en-US";
      const voices = window.speechSynthesis.getVoices();
      const pref = voices.find(
        (v) =>
          v.name.includes("Samantha") ||
          v.name.includes("Google") ||
          v.name.includes("Natural") ||
          (v.lang.startsWith("en") && v.localService)
      );
      if (pref) u.voice = pref;
      u.onstart = () => setSpeaking(true);
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      window.speechSynthesis.speak(u);
    },
    [ttsEnabled]
  );

  const stopSpeaking = useCallback(() => {
    ttsAbortRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setListening(true);
      } catch {
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
            setListening(true);
          } catch {
            setListening(false);
          }
        }, 200);
      }
    }
  }, [listening]);

  const API_HEADERS: Record<string, string> = {
    "Content-Type": "application/json",
    "Authorization": "Bearer va-bridge-secret-key-2026",
  };

  async function startSession() {
    try {
      const resp = await fetch(`${VOICE_AGENT_API}/api/session/create`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ mode: "realtor" }),
      });
      const data = await resp.json();
      if (data.ok) {
        setSessionId(data.session_id);
        return data.session_id;
      }
    } catch {
      /* offline */
    }
    return null;
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText || input).trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    stopSpeaking();

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: text }]);

    // Check for navigation commands FIRST
    const navTarget = parseNavigation(text);
    if (navTarget) {
      router.push(navTarget.path);
      const navMsg = `Navigating to ${navTarget.label}...`;
      setMessages((prev) => [...prev, { role: "nav", content: navMsg }]);
      speak(`Taking you to ${navTarget.label}`);
      setSending(false);
      return;
    }

    // Send to voice agent backend
    let sid = sessionId;
    if (!sid) {
      sid = await startSession();
    }

    if (!sid) {
      // Offline — handle common questions locally
      const reply =
        "I'm currently in offline mode. I can still help you navigate! Try saying \"go to contacts\" or \"show me listings\". For AI-powered features, the voice agent server needs to be running.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      speak(reply);
      setSending(false);
      return;
    }

    try {
      const resp = await fetch(`${VOICE_AGENT_API}/api/chat/stream`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ session_id: sid, message: text }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        setMessages((prev) => [
          ...prev,
          {
            role: "system",
            content: `Error: ${errData.error || resp.statusText}`,
          },
        ]);
        setSending(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) {
        setSending(false);
        return;
      }
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let streamStarted = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;
          try {
            const chunk = JSON.parse(jsonStr);
            if (chunk.tool) {
              setMessages((prev) => [
                ...prev,
                { role: "tool", content: `Working on it...` },
              ]);
              continue;
            }
            if (chunk.error) {
              setMessages((prev) => [
                ...prev,
                { role: "system", content: `Error: ${chunk.error}` },
              ]);
              continue;
            }
            const token = chunk.token || "";
            if (token || !chunk.done) {
              fullContent += token;
              if (!streamStarted) {
                streamStarted = true;
                setMessages((prev) => [
                  ...prev,
                  { role: "assistant", content: fullContent, streaming: true },
                ]);
              } else {
                setMessages((prev) => {
                  const u = [...prev];
                  u[u.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                    streaming: true,
                  };
                  return u;
                });
              }
            }
            if (chunk.done) {
              setMessages((prev) => {
                const u = [...prev];
                if (u.length > 0)
                  u[u.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                    streaming: false,
                  };
                return u;
              });
              if (fullContent) speak(fullContent);
              fullContent = "";
              streamStarted = false;
            }
          } catch {
            /* skip parse errors */
          }
        }
      }

      if (streamStarted) {
        setMessages((prev) => {
          const u = [...prev];
          if (u.length > 0)
            u[u.length - 1] = {
              role: "assistant",
              content: fullContent,
              streaming: false,
            };
          return u;
        });
        if (fullContent) speak(fullContent);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "system", content: `Network error: ${msg}` },
      ]);
    }

    setSending(false);
  }

  // Auto-send after speech recognition ends
  const lastSpokenRef = useRef<string>("");
  useEffect(() => {
    if (!listening && input.trim() && recognitionRef.current) {
      // Capture the text immediately before any state changes clear it
      const captured = input.trim();
      lastSpokenRef.current = captured;
      const timeout = setTimeout(() => {
        if (captured) {
          sendMessage(captured);
        }
      }, 1500);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  const currentPage =
    PAGE_LABELS[pathname] ||
    PAGE_LABELS[
      Object.keys(PAGE_LABELS).find(
        (k) => k !== "/" && pathname.startsWith(k)
      ) ?? ""
    ] ||
    "Page";

  return (
    <div className="flex flex-col h-full">
      {/* Panel Header */}
      <div className="flex items-center gap-2.5 px-4 py-3 bg-primary text-primary-foreground shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-foreground/15">
          <Bot className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">Voice Assistant</span>
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connected ? "bg-brand-light" : "bg-red-400"
              )}
            />
          </div>
        </div>
        {/* TTS toggle */}
        <button
          onClick={() => {
            if (ttsEnabled) stopSpeaking();
            setTtsEnabled(!ttsEnabled);
          }}
          className="p-1.5 rounded-md hover:bg-primary-foreground/15 transition-colors"
          title={ttsEnabled ? "Mute" : "Unmute"}
        >
          {ttsEnabled ? (
            <Volume2 className="h-4 w-4" />
          ) : (
            <VolumeX className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Context bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/50 text-xs text-muted-foreground shrink-0">
        <MapPin className="h-3 w-3" />
        <span>{currentPage}</span>
      </div>

      {/* Speaking indicator */}
      {speaking && (
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-primary/5 border-b shrink-0">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <span
                key={i}
                className="w-0.5 bg-brand rounded-full animate-pulse"
                style={{
                  height: `${8 + Math.random() * 8}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          <span className="text-xs text-primary font-medium">Speaking...</span>
          <button
            onClick={stopSpeaking}
            className="p-0.5 rounded hover:bg-primary/10"
          >
            <Square className="h-3 w-3 text-primary" />
          </button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn("flex", {
              "justify-end": msg.role === "user",
              "justify-start":
                msg.role === "assistant" || msg.role === "nav",
              "justify-center": msg.role === "system",
            })}
          >
            <div
              className={cn(
                "max-w-[90%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                {
                  "bg-primary text-primary-foreground rounded-br-none":
                    msg.role === "user",
                  "bg-muted text-foreground rounded-bl-none":
                    msg.role === "assistant",
                  "bg-primary/10 text-primary text-xs font-medium rounded-bl-none flex items-center gap-1.5":
                    msg.role === "nav",
                  "bg-transparent text-muted-foreground text-xs italic":
                    msg.role === "system",
                  "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-mono border border-amber-200 dark:border-amber-800":
                    msg.role === "tool",
                }
              )}
            >
              {msg.role === "nav" && (
                <ArrowRight className="h-3 w-3 shrink-0" />
              )}
              {msg.content}
              {msg.streaming && (
                <span className="inline-block w-0.5 h-4 bg-brand ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Listening indicator */}
      {listening && (
        <div className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-950 border-t shrink-0">
          <div className="relative">
            <Mic className="h-4 w-4 text-red-500 animate-pulse" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full animate-ping" />
          </div>
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">
            Listening...
          </span>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3 shrink-0 bg-card">
        <div className="flex gap-2">
          <button
            onClick={toggleListening}
            disabled={sending || !recognitionRef.current}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg transition-all shrink-0",
              listening
                ? "bg-red-500 text-white shadow-md shadow-red-500/25"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              (sending || !recognitionRef.current) &&
                "opacity-40 cursor-not-allowed"
            )}
            title={listening ? "Stop" : "Speak"}
          >
            {listening ? (
              <MicOff className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={
              listening ? "Listening..." : "Tell me about the seller..."
            }
            disabled={sending}
            className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:opacity-50 placeholder:text-muted-foreground transition-colors"
          />
          <button
            onClick={() => sendMessage()}
            disabled={sending || !input.trim()}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 shadow-sm"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
