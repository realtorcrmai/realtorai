"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  X,
  Send,
  Loader2,
  Bot,
  Sparkles,
  Volume2,
  VolumeX,
  Square,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ConsentModal } from "./ConsentModal";
import { checkConsent } from "@/actions/consent";
import { logVoiceCall } from "@/actions/voice-calls";

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const VOICE_AGENT_API =
  process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "http://127.0.0.1:8768";

const API_HEADERS: Record<string, string> = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${process.env.NEXT_PUBLIC_VOICE_AGENT_API_KEY || ""}`,
};

type Message = {
  role: "user" | "assistant" | "system" | "tool" | "nav";
  content: string;
  streaming?: boolean;
};

// ── Navigation ──────────────────────────────────────────────

const NAV_MAP: Record<string, { path: string; label: string }> = {
  dashboard: { path: "/", label: "Dashboard" },
  home: { path: "/", label: "Dashboard" },
  contacts: { path: "/contacts", label: "Contacts" },
  contact: { path: "/contacts", label: "Contacts" },
  tasks: { path: "/tasks", label: "Tasks" },
  task: { path: "/tasks", label: "Tasks" },
  listings: { path: "/listings", label: "Listings" },
  listing: { path: "/listings", label: "Listings" },
  showings: { path: "/showings", label: "Showings" },
  calendar: { path: "/calendar", label: "Calendar" },
  newsletters: { path: "/newsletters", label: "Email Marketing" },
  email: { path: "/newsletters", label: "Email Marketing" },
  assistant: { path: "/assistant", label: "AI Assistant" },
  knowledge: { path: "/assistant/knowledge", label: "Knowledge Base" },
};

const NAV_TRIGGERS = ["go to", "open", "show me", "navigate to", "take me to", "switch to", "show"];

function parseNavigation(text: string): { path: string; label: string } | null {
  const lower = text.toLowerCase().trim();
  if (!NAV_TRIGGERS.some((t) => lower.includes(t))) return null;
  for (const [keyword, dest] of Object.entries(NAV_MAP)) {
    if (lower.includes(keyword)) return dest;
  }
  return null;
}

// ── Context-aware greetings ─────────────────────────────────

const PAGE_LABELS: Record<string, string> = {
  "/": "Dashboard",
  "/contacts": "Contacts",
  "/tasks": "Tasks",
  "/listings": "Listings",
  "/showings": "Showings",
  "/calendar": "Calendar",
  "/newsletters": "Email Marketing",
  "/assistant": "AI Assistant",
  "/assistant/knowledge": "Knowledge Base",
};

function getGreeting(pathname: string): string {
  const hour = new Date().getHours();
  const timeGreeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const contextHints: Record<string, string> = {
    "/": `${timeGreeting}! I see your dashboard. Want me to check for hot leads or summarize today's activity?`,
    "/contacts": `${timeGreeting}! You're on Contacts. I can search for anyone, score leads, or draft a message. Who do you need?`,
    "/listings": `${timeGreeting}! You're viewing Listings. I can search properties, check active listings, or help prep one for MLS. What do you need?`,
    "/showings": `${timeGreeting}! I can help manage your showings — check availability, send confirmations, or review feedback.`,
    "/calendar": `${timeGreeting}! Let me help with your schedule. Want to see today's appointments or find a free slot?`,
    "/newsletters": `${timeGreeting}! Email Marketing dashboard. I can check pending drafts, review hot leads, or generate a new campaign.`,
    "/tasks": `${timeGreeting}! Let's tackle your tasks. Want me to prioritize them or check what's overdue?`,
  };

  if (contextHints[pathname]) return contextHints[pathname];

  return `${timeGreeting}! I'm your AI realtor assistant. Ask me anything — search properties, manage contacts, draft emails, or navigate the CRM.`;
}

// ── Edge TTS helper ─────────────────────────────────────────

async function fetchTTSAudio(text: string): Promise<ArrayBuffer | null> {
  try {
    const resp = await fetch(`${VOICE_AGENT_API}/api/tts`, {
      method: "POST",
      headers: API_HEADERS,
      body: JSON.stringify({ text, voice: "en-US-AvaMultilingualNeural" }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) return null;
    return await resp.arrayBuffer();
  } catch {
    return null;
  }
}

// ── Sentence splitter for progressive TTS ────────────────────

function splitIntoSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space or end
  const sentences = text.match(/[^.!?]+[.!?]+[\s]?|[^.!?]+$/g);
  if (!sentences) return text.trim() ? [text.trim()] : [];
  return sentences.map((s) => s.trim()).filter(Boolean);
}

// ── Component ───────────────────────────────────────────────

export function VoiceAgentWidget() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  // Track if user manually stopped the voice agent this session.
  // Once stopped, don't auto-open until a new session starts.
  const [userStopped, setUserStopped] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem("voice-agent-stopped") === "true";
  });
  const [provider, setProvider] = useState("—");
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [continuousMode, setContinuousMode] = useState(true);
  const [useEdgeTTS, setUseEdgeTTS] = useState(true); // prefer server TTS
  const [useWhisperSTT, setUseWhisperSTT] = useState(false); // browser SpeechRecognition by default (Whisper needs server-side setup)
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentGranted, setConsentGranted] = useState(false);
  const sessionStartTimeRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const hasGreetedRef = useRef(false);
  const spokenTextRef = useRef("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const ttsAbortRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  // ── Request mic permission early (so browser doesn't block later) ──

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.mediaDevices) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          // Got permission — release the stream immediately
          stream.getTracks().forEach((t) => t.stop());
        })
        .catch(() => {
          // User denied — voice will fall back to text input
        });
    }
  }, []);

  // ── Health check + auto-open ──────────────────────────────

  useEffect(() => {
    let stopped = false;
    let interval: ReturnType<typeof setInterval> | null = null;
    async function check() {
      try {
        const resp = await fetch(`${VOICE_AGENT_API}/api/health`, { signal: AbortSignal.timeout(3000) });
        const data = await resp.json();
        if (data.ok) {
          setConnected(true);
          setProvider(data.llm_provider);
          // Auto-open only on first connection AND if user hasn't manually stopped
          setOpen((prev) => {
            if (!prev && !hasGreetedRef.current && sessionStorage.getItem("voice-agent-stopped") !== "true") return true;
            return prev;
          });
          if (!stopped && !interval) interval = setInterval(check, 30000);
        }
      } catch {
        setConnected(false);
        if (interval) { clearInterval(interval); interval = null; }
      }
    }
    check();
    return () => { stopped = true; if (interval) clearInterval(interval); };
  }, []);

  // ── Speech recognition ────────────────────────────────────

  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
        : null;

    if (SpeechRecognitionAPI) {
      const recognition = new (SpeechRecognitionAPI as any)();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const t = event.results[i][0].transcript;
          if (event.results[i].isFinal) finalTranscript += t;
          else interimTranscript += t;
        }
        const text = finalTranscript || interimTranscript;
        setInput(text);
        if (finalTranscript) spokenTextRef.current = finalTranscript;
      };

      recognition.onend = () => setListening(false);
      recognition.onerror = () => setListening(false);
      recognitionRef.current = recognition;
    }
    return () => { try { recognitionRef.current?.abort(); } catch { /* */ } };
  }, []);

  // ── TTS — speak text (Edge TTS with browser fallback) ─────

  const speak = useCallback(
    async (text: string, onDone?: () => void) => {
      if (!ttsEnabled || !text.trim()) {
        onDone?.();
        return;
      }

      ttsAbortRef.current = false;

      // Try Edge TTS first (high quality server-side)
      if (useEdgeTTS) {
        try {
          // Split into sentences for progressive playback
          const sentences = splitIntoSentences(text);
          setSpeaking(true);

          for (const sentence of sentences) {
            if (ttsAbortRef.current) break;

            const audioData = await fetchTTSAudio(sentence);
            if (!audioData || ttsAbortRef.current) continue;

            // Play the audio chunk
            await new Promise<void>((resolve) => {
              const blob = new Blob([audioData], { type: "audio/mpeg" });
              const url = URL.createObjectURL(blob);
              const audio = new Audio(url);
              audioRef.current = audio;
              audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
              audio.onerror = () => { URL.revokeObjectURL(url); resolve(); };
              audio.play().catch(() => resolve());
            });
          }

          setSpeaking(false);
          audioRef.current = null;
          onDone?.();
          return;
        } catch {
          // Fall through to browser TTS
        }
      }

      // Browser TTS fallback
      if (typeof window === "undefined" || !window.speechSynthesis) {
        setSpeaking(false);
        onDone?.();
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
      u.rate = 1.05;
      u.pitch = 1.0;
      u.lang = "en-US";

      const voices = window.speechSynthesis.getVoices();
      const pref = voices.find(
        (v) => v.name.includes("Samantha") || v.name.includes("Google") ||
          v.name.includes("Natural") || (v.lang.startsWith("en") && v.localService)
      );
      if (pref) u.voice = pref;

      u.onstart = () => setSpeaking(true);
      u.onend = () => { setSpeaking(false); onDone?.(); };
      u.onerror = () => { setSpeaking(false); onDone?.(); };
      window.speechSynthesis.speak(u);
    },
    [ttsEnabled, useEdgeTTS]
  );

  const stopSpeaking = useCallback(() => {
    ttsAbortRef.current = true;
    // Stop Edge TTS audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    // Stop browser TTS
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setSpeaking(false);
  }, []);

  // ── Whisper STT — record audio and send to server ────────

  const startWhisperRecording = useCallback(() => {
    if (listening || sending) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (blob.size < 100) { setListening(false); return; }
        // Send to Whisper
        setInput("Transcribing...");
        try {
          const form = new FormData();
          form.append("audio", blob, "recording.webm");
          const resp = await fetch(`${VOICE_AGENT_API}/api/stt`, {
            method: "POST",
            headers: { Authorization: API_HEADERS.Authorization },
            body: form,
          });
          const data = await resp.json();
          if (data.ok && data.text) {
            setInput(data.text);
            spokenTextRef.current = data.text;
          } else {
            setInput("");
          }
        } catch {
          setInput("");
        }
        setListening(false);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setListening(true);
      // Auto-stop after 15 seconds of silence detection isn't easy,
      // so use a max recording time
    }).catch(() => { setListening(false); });
  }, [listening, sending]);

  const stopWhisperRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // ── Start listening (routes to Whisper or browser STT) ──

  const startListening = useCallback(() => {
    if (useWhisperSTT) {
      startWhisperRecording();
      return;
    }
    // Browser STT fallback
    if (!recognitionRef.current || listening || sending) return;
    try {
      recognitionRef.current.start();
      setListening(true);
    } catch {
      recognitionRef.current.stop();
      setTimeout(() => {
        try { recognitionRef.current?.start(); setListening(true); } catch { setListening(false); }
      }, 200);
    }
  }, [listening, sending, useWhisperSTT, startWhisperRecording]);

  const stopListening = useCallback(() => {
    if (useWhisperSTT) {
      stopWhisperRecording();
      return;
    }
    if (!recognitionRef.current) return;
    recognitionRef.current.stop();
    setListening(false);
  }, [useWhisperSTT, stopWhisperRecording]);

  const toggleListening = useCallback(() => {
    if (listening) stopListening();
    else startListening();
  }, [listening, startListening, stopListening]);

  // ── Session creation (with consent check) ─────────────────

  async function createSession(): Promise<string | null> {
    try {
      const resp = await fetch(`${VOICE_AGENT_API}/api/session/create`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ mode: "realtor" }),
      });
      const data = await resp.json();
      if (data.ok) {
        setSessionId(data.session_id);
        sessionStartTimeRef.current = Date.now();
        return data.session_id;
      }
    } catch { /* offline */ }
    return null;
  }

  // ── Log call when session ends ───────────────────────────

  async function logSessionCall() {
    if (!sessionId || !sessionStartTimeRef.current) return;
    const durationSeconds = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);
    // Build transcript from user + assistant messages
    const transcript = messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n");

    const toolsUsed = messages
      .filter((m) => m.role === "tool")
      .map((m) => m.content);

    await logVoiceCall({
      tenant_id: "00000000-0000-0000-0000-000000000001",
      session_id: sessionId,
      direction: "outbound",
      duration_seconds: durationSeconds,
      transcript: transcript || null,
      tool_calls_used: toolsUsed,
      llm_provider: provider,
      cost_usd: 0,
    });
  }

  // ── Send message ──────────────────────────────────────────

  async function sendMessage(overrideText?: string) {
    const text = (overrideText || input).trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    stopSpeaking();

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    // Navigation check
    const navTarget = parseNavigation(text);
    if (navTarget) {
      router.push(navTarget.path);
      const navMsg = `Navigating to ${navTarget.label}...`;
      setMessages((prev) => [...prev, { role: "nav", content: navMsg }]);
      speak(`Taking you to ${navTarget.label}`, () => {
        if (continuousMode) setTimeout(startListening, 600);
      });
      setSending(false);
      return;
    }

    // Ensure session
    let sid = sessionId;
    if (!sid) {
      sid = await createSession();
      if (!sid) {
        setMessages((prev) => [...prev, { role: "system", content: "Voice agent offline. Try navigation: \"go to contacts\"" }]);
        setSending(false);
        return;
      }
    }

    try {
      const resp = await fetch(`${VOICE_AGENT_API}/api/chat/stream`, {
        method: "POST",
        headers: API_HEADERS,
        body: JSON.stringify({ session_id: sid, message: text }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        setMessages((prev) => [...prev, { role: "system", content: `Error: ${errData.error || resp.statusText}` }]);
        setSending(false);
        return;
      }

      const reader = resp.body?.getReader();
      if (!reader) { setSending(false); return; }
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
              // Check if tool result contains a navigation action
              const toolResult = chunk.tool_result || chunk.result;
              if (toolResult) {
                try {
                  const parsed = typeof toolResult === "string" ? JSON.parse(toolResult) : toolResult;
                  if (parsed?.action === "navigate" && parsed?.path) {
                    router.push(parsed.path);
                    setMessages((prev) => [...prev, { role: "nav", content: `Navigating to ${parsed.page_name || parsed.path}...` }]);
                  }
                } catch { /* not JSON nav result */ }
              }
              setMessages((prev) => [...prev, { role: "tool", content: `Working on it...` }]);
              continue;
            }
            if (chunk.error) {
              setMessages((prev) => [...prev, { role: "system", content: `Error: ${chunk.error}` }]);
              continue;
            }
            const token = chunk.token || "";
            if (token || !chunk.done) {
              fullContent += token;
              if (!streamStarted) {
                streamStarted = true;
                setMessages((prev) => [...prev, { role: "assistant", content: fullContent, streaming: true }]);
              } else {
                setMessages((prev) => {
                  const u = [...prev];
                  u[u.length - 1] = { role: "assistant", content: fullContent, streaming: true };
                  return u;
                });
              }
            }
            if (chunk.done) {
              setMessages((prev) => {
                const u = [...prev];
                if (u.length > 0) u[u.length - 1] = { role: "assistant", content: fullContent, streaming: false };
                return u;
              });
              if (fullContent) {
                // Start listening immediately (allows interruption)
                if (continuousMode) setTimeout(startListening, 300);
                speak(fullContent, () => {
                  // TTS finished — if not already listening, start now
                  if (continuousMode && !listening) setTimeout(startListening, 300);
                });
              }
              fullContent = "";
              streamStarted = false;
            }
          } catch { /* skip */ }
        }
      }

      // Finalize if stream ended without done
      if (streamStarted) {
        setMessages((prev) => {
          const u = [...prev];
          if (u.length > 0) u[u.length - 1] = { role: "assistant", content: fullContent, streaming: false };
          return u;
        });
        if (fullContent) {
          if (continuousMode) setTimeout(startListening, 300);
          speak(fullContent, () => {
            if (continuousMode && !listening) setTimeout(startListening, 300);
          });
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages((prev) => [...prev, { role: "system", content: `Network error: ${msg}` }]);
    }

    setSending(false);
  }

  // ── Auto-send after speech recognition ──────────────────

  useEffect(() => {
    if (!listening && spokenTextRef.current) {
      const captured = spokenTextRef.current;
      spokenTextRef.current = "";
      // Whisper: send immediately (already waited during transcription)
      // Browser STT: 1.5s delay for user to collect thoughts
      const delay = useWhisperSTT ? 100 : 1500;
      const timeout = setTimeout(() => {
        if (captured) sendMessage(captured);
      }, delay);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  // ── Auto-greet when panel opens (with consent check) ──────

  useEffect(() => {
    if (open && connected && !hasGreetedRef.current) {
      // Check consent before proceeding
      if (!consentGranted) {
        checkConsent("00000000-0000-0000-0000-000000000000", "voice").then((result) => {
          if (result.consent?.status === "granted") {
            setConsentGranted(true);
          } else {
            setShowConsentModal(true);
          }
        });
        return;
      }

      hasGreetedRef.current = true;
      const greeting = getGreeting(pathname);
      setMessages([{ role: "assistant", content: greeting }]);

      // Create session in background
      createSession();

      // Speak greeting, then auto-listen
      speak(greeting, () => {
        if (continuousMode) setTimeout(startListening, 600);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, connected, consentGranted]);

  // ── Toggle panel ──────────────────────────────────────────

  function handleToggle() {
    if (open) {
      stopSpeaking();
      stopListening();
      // Log the call before closing
      logSessionCall();
      // Mark that user manually stopped — don't auto-open again this session
      setUserStopped(true);
      sessionStorage.setItem("voice-agent-stopped", "true");
      // Reset greeting so re-opening will greet again
      hasGreetedRef.current = false;
    } else {
      // User is manually re-opening — that's intentional, allow it
    }
    setOpen((prev) => !prev);
  }

  /** Call this to start a fresh session (clears the stopped state) */
  function startNewSession() {
    setUserStopped(false);
    sessionStorage.removeItem("voice-agent-stopped");
    hasGreetedRef.current = false;
    setOpen(true);
  }

  const currentPage =
    PAGE_LABELS[pathname] ||
    PAGE_LABELS[Object.keys(PAGE_LABELS).find((k) => k !== "/" && pathname.startsWith(k)) ?? ""] ||
    "CRM";

  return (
    <>
      {/* Consent modal */}
      {showConsentModal && (
        <ConsentModal
          contactId="00000000-0000-0000-0000-000000000000"
          consentType="voice"
          onConsented={() => {
            setConsentGranted(true);
            setShowConsentModal(false);
          }}
          onDenied={() => {
            setShowConsentModal(false);
            setOpen(false);
          }}
        />
      )}

      {/* Floating button */}
      <button
        onClick={userStopped && !open ? startNewSession : handleToggle}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 md:bottom-8 md:right-8",
          open ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
          !connected && !open && "opacity-60"
        )}
        title={userStopped ? "Start New Voice Session" : connected ? "Open Voice Assistant" : "Voice Agent offline"}
        suppressHydrationWarning
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <Bot className="h-6 w-6" />
            <span className={cn("absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white", connected ? "bg-[#0F7694]/50" : "bg-red-500")} />
            {speaking && <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-[#0F7694] border-2 border-white animate-pulse" />}
          </div>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[560px] w-[420px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl md:bottom-28 md:right-8">
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Realtor Assistant</p>
              <p className="text-[11px] opacity-70">
                {connected ? `${provider} · ${currentPage}` : "offline"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {/* Continuous mode toggle */}
              <button
                onClick={() => setContinuousMode(!continuousMode)}
                className={cn("rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
                  continuousMode ? "bg-primary-foreground/25 text-primary-foreground" : "bg-primary-foreground/10 text-primary-foreground/50"
                )}
                title={continuousMode ? "Continuous conversation ON" : "Continuous conversation OFF"}
              >
                {continuousMode ? "AUTO" : "MANUAL"}
              </button>
              {/* TTS toggle */}
              <button
                onClick={() => { if (ttsEnabled) stopSpeaking(); setTtsEnabled(!ttsEnabled); }}
                className="rounded-md p-1.5 hover:bg-primary-foreground/20 transition-colors"
              >
                {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              {/* Edge TTS toggle — long press or double-click to switch to browser TTS */}
              <button
                onClick={() => setUseEdgeTTS(!useEdgeTTS)}
                className={cn("rounded-md px-1.5 py-1 text-[9px] font-medium transition-colors",
                  useEdgeTTS ? "bg-primary-foreground/25 text-primary-foreground" : "bg-primary-foreground/10 text-primary-foreground/50"
                )}
                title={useEdgeTTS ? "Using HD voice (Edge TTS)" : "Using browser voice"}
              >
                {useEdgeTTS ? "HD" : "STD"}
              </button>
              <button onClick={handleToggle} className="rounded-md p-1.5 hover:bg-primary-foreground/20 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Speaking indicator */}
          {speaking && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-[#0F7694]/5 to-[#0F7694]/10 border-b shrink-0">
              <div className="flex items-center gap-0.5">
                {[...Array(7)].map((_, i) => (
                  <span key={i} className="w-1 bg-[#0F7694] rounded-full animate-pulse"
                    style={{ height: `${6 + Math.random() * 12}px`, animationDelay: `${i * 0.08}s` }} />
                ))}
              </div>
              <span className="text-xs text-[#0A6880] font-medium">Speaking...</span>
              <button onClick={stopSpeaking} className="p-0.5 rounded hover:bg-[#0F7694]/10">
                <Square className="h-3 w-3 text-[#0F7694]" />
              </button>
            </div>
          )}

          {/* Listening indicator */}
          {listening && !speaking && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-red-50 to-orange-50 border-b shrink-0">
              <div className="relative">
                <Mic className="h-4 w-4 text-red-500" />
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 bg-red-500 rounded-full animate-ping" />
              </div>
              <span className="text-xs text-red-600 font-medium">Listening — speak now...</span>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Quick actions — show when only greeting message */}
            {messages.length <= 1 && (
              <div className="space-y-2 mb-3">
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider px-1">Quick Actions</p>
                {[
                  { label: "Contacts", actions: [
                    { text: "Show my contacts", icon: "👤" },
                    { text: "Find hot leads", icon: "🔥" },
                    { text: "Who needs follow-up?", icon: "📞" },
                  ]},
                  { label: "Listings", actions: [
                    { text: "Show active listings", icon: "🏠" },
                    { text: "Any new showings?", icon: "📅" },
                    { text: "What offers are pending?", icon: "📝" },
                  ]},
                  { label: "Tasks & Deals", actions: [
                    { text: "What tasks are due today?", icon: "✅" },
                    { text: "Show my deals pipeline", icon: "💰" },
                    { text: "Create a follow-up task", icon: "➕" },
                  ]},
                  { label: "Navigate", actions: [
                    { text: "Go to calendar", icon: "📆" },
                    { text: "Open newsletters", icon: "✉️" },
                    { text: "Show automations", icon: "⚡" },
                  ]},
                ].map((section) => (
                  <div key={section.label} className="space-y-1">
                    <p className="text-[10px] font-semibold text-muted-foreground/70 px-1">{section.label}</p>
                    <div className="flex flex-wrap gap-1">
                      {section.actions.map((a) => (
                        <button
                          key={a.text}
                          onClick={() => { setInput(a.text); sendMessage(a.text); }}
                          disabled={sending}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] bg-muted hover:bg-accent rounded-lg transition-colors disabled:opacity-50"
                        >
                          <span>{a.icon}</span>
                          <span>{a.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", {
                "justify-end": msg.role === "user",
                "justify-start": msg.role === "assistant" || msg.role === "nav",
                "justify-center": msg.role === "system" || msg.role === "tool",
              })}>
                <div className={cn("max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap", {
                  "bg-primary text-primary-foreground rounded-br-sm": msg.role === "user",
                  "bg-muted text-foreground rounded-bl-sm": msg.role === "assistant",
                  "bg-primary/10 text-primary text-xs font-medium rounded-bl-sm flex items-center gap-1.5": msg.role === "nav",
                  "bg-transparent text-muted-foreground text-xs italic": msg.role === "system",
                  "bg-amber-50 text-amber-700 text-xs font-mono border border-amber-200 rounded-lg": msg.role === "tool",
                })}>
                  {msg.role === "nav" && <ArrowRight className="h-3 w-3 shrink-0" />}
                  {msg.content}
                  {msg.streaming && <span className="inline-block w-0.5 h-4 bg-[#0F7694] ml-0.5 animate-pulse align-middle" />}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t p-3 bg-card shrink-0">
            <div className="flex gap-2">
              <button
                onClick={toggleListening}
                disabled={!connected || sending || (!recognitionRef.current && !useWhisperSTT)}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all shrink-0",
                  listening
                    ? "bg-red-500 text-white shadow-md shadow-red-500/30 scale-110"
                    : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  (!connected || sending || (!recognitionRef.current && !useWhisperSTT)) && "opacity-40 cursor-not-allowed"
                )}
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder={listening ? "Listening..." : "Ask anything or tap mic..."}
                disabled={sending}
                className="flex-1 rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 disabled:opacity-50 placeholder:text-muted-foreground transition-colors"
              />
              <button
                onClick={() => sendMessage()}
                disabled={sending || !input.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 shadow-sm"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
