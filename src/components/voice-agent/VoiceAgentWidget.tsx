"use client";

import { useState, useRef, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
// Web Speech API types (not in default TS lib)
type SpeechRecognitionType = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

const VOICE_AGENT_API =
  process.env.NEXT_PUBLIC_VOICE_AGENT_URL || "http://127.0.0.1:8768";

type Message = {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  streaming?: boolean;
};

export function VoiceAgentWidget() {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const [provider, setProvider] = useState("\u2014");
  const [listening, setListening] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionType | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Health check on mount
  useEffect(() => {
    async function check() {
      try {
        const resp = await fetch(`${VOICE_AGENT_API}/api/health`);
        const data = await resp.json();
        if (data.ok) {
          setConnected(true);
          setProvider(data.llm_provider);
        }
      } catch {
        setConnected(false);
      }
    }
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? (window as unknown as Record<string, unknown>).SpeechRecognition ||
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition
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
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setInput(finalTranscript);
        } else if (interimTranscript) {
          setInput(interimTranscript);
        }
      };

      recognition.onend = () => {
        setListening(false);
      };

      recognition.onerror = () => {
        setListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Speak text using TTS
  const speak = useCallback(
    (text: string) => {
      if (!ttsEnabled || typeof window === "undefined" || !window.speechSynthesis) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Clean text for speech (remove markdown, code blocks, etc.)
      const cleanText = text
        .replace(/```[\s\S]*?```/g, "code block")
        .replace(/`[^`]+`/g, (match) => match.replace(/`/g, ""))
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#{1,6}\s/g, "")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .replace(/[_~]/g, "");

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-US";

      // Try to use a natural-sounding voice
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.name.includes("Samantha") ||
          v.name.includes("Google") ||
          v.name.includes("Natural") ||
          (v.lang.startsWith("en") && v.localService)
      );
      if (preferred) utterance.voice = preferred;

      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);

      synthRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    },
    [ttsEnabled]
  );

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
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
        // If already started, stop and restart
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

  async function startSession() {
    try {
      const resp = await fetch(`${VOICE_AGENT_API}/api/session/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "realtor" }),
      });
      const data = await resp.json();
      if (data.ok) {
        setSessionId(data.session_id);
        const greeting =
          "Hi! I'm your AI realtor assistant. I can help you search properties for buyers, create listings from seller info, manage your daily tasks, and much more. How can I help you today?";
        setMessages([{ role: "assistant", content: greeting }]);
        speak(greeting);
        return data.session_id;
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setMessages([{ role: "system", content: `Connection failed: ${msg}` }]);
    }
    return null;
  }

  // Offline fallback: handle basic commands locally when server is unavailable
  function handleOfflineMessage(text: string): string {
    const lower = text.toLowerCase();

    // Navigation commands
    const NAV_MAP: Record<string, { path: string; label: string }> = {
      dashboard: { path: "/", label: "Dashboard" },
      home: { path: "/", label: "Dashboard" },
      contacts: { path: "/contacts", label: "Contacts" },
      contact: { path: "/contacts", label: "Contacts" },
      listings: { path: "/listings", label: "Listings" },
      listing: { path: "/listings", label: "Listings" },
      tasks: { path: "/tasks", label: "Tasks" },
      task: { path: "/tasks", label: "Tasks" },
      pipeline: { path: "/pipeline", label: "Pipeline" },
      deals: { path: "/pipeline", label: "Pipeline" },
      showings: { path: "/showings", label: "Showings" },
      showing: { path: "/showings", label: "Showings" },
      reports: { path: "/reports", label: "Reports" },
      settings: { path: "/settings", label: "Settings" },
    };

    const navTriggers = ["go to", "open", "show me", "navigate to", "take me to", "show"];
    for (const trigger of navTriggers) {
      if (lower.includes(trigger)) {
        for (const [keyword, { path, label }] of Object.entries(NAV_MAP)) {
          if (lower.includes(keyword)) {
            window.location.href = path;
            return `Navigating to ${label}...`;
          }
        }
      }
    }

    // Help responses
    if (lower.includes("help") || lower === "?") {
      return "I'm currently running in offline mode. Here's what I can do:\n\n" +
        "**Navigation:** Say \"go to contacts\", \"open listings\", \"show pipeline\", etc.\n\n" +
        "**Available pages:** Dashboard, Contacts, Listings, Tasks, Pipeline, Showings, Reports, Settings\n\n" +
        "For full AI capabilities (property search, CMA, task management), the voice agent server needs to be running.";
    }

    if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
      return "Hi! I'm your Realtor AI assistant. I'm currently in offline mode, but I can help you navigate the app. Try saying \"go to contacts\" or \"show listings\". Type \"help\" for more options.";
    }

    return "I'm currently in offline mode and can only help with navigation. Try:\n\n" +
      "\u2022 \"Go to contacts\" \u2014 open the contacts page\n" +
      "\u2022 \"Show listings\" \u2014 open the listings page\n" +
      "\u2022 \"Open pipeline\" \u2014 open the deals pipeline\n" +
      "\u2022 \"Help\" \u2014 see all available commands\n\n" +
      "For full AI capabilities, the voice agent server needs to be started.";
  }

  async function sendMessage(overrideText?: string) {
    const text = (overrideText || input).trim();
    if (!text || sending) return;

    setInput("");
    setSending(true);
    stopSpeaking();

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    // Offline fallback mode
    if (!connected) {
      const response = handleOfflineMessage(text);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response },
      ]);
      speak(response);
      setSending(false);
      return;
    }

    let sid = sessionId;
    if (!sid) {
      sid = await startSession();
      if (!sid) {
        setSending(false);
        return;
      }
    }

    try {
      const resp = await fetch(`${VOICE_AGENT_API}/api/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
                { role: "tool", content: `Using: ${chunk.tool}` },
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
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                    streaming: true,
                  };
                  return updated;
                });
              }
            }

            if (chunk.done) {
              setMessages((prev) => {
                const updated = [...prev];
                if (updated.length > 0) {
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: fullContent,
                    streaming: false,
                  };
                }
                return updated;
              });
              // Speak the complete response
              if (fullContent) {
                speak(fullContent);
              }
              fullContent = "";
              streamStarted = false;
            }
          } catch {
            // skip parse errors
          }
        }
      }

      // Finalize if stream ended without done
      if (streamStarted) {
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            updated[updated.length - 1] = {
              role: "assistant",
              content: fullContent,
              streaming: false,
            };
          }
          return updated;
        });
        if (fullContent) {
          speak(fullContent);
        }
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

  function handleToggle() {
    if (open) {
      stopSpeaking();
      if (listening) {
        recognitionRef.current?.stop();
        setListening(false);
      }
    }
    setOpen((prev) => !prev);
  }

  // Auto-send after speech recognition finishes
  useEffect(() => {
    if (!listening && input.trim() && recognitionRef.current) {
      // Small delay to ensure final transcript is captured
      const timeout = setTimeout(() => {
        if (input.trim()) {
          sendMessage(input.trim());
        }
      }, 500);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening]);

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleToggle}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-300 hover:scale-105 md:bottom-8 md:right-8",
          open
            ? "bg-muted text-muted-foreground"
            : "bg-primary text-primary-foreground",
          !connected && !open && "opacity-60"
        )}
        title={connected ? "Open Voice Assistant" : "Voice Agent offline"}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <div className="relative">
            <Bot className="h-6 w-6" />
            <span
              className={cn(
                "absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white",
                connected ? "bg-green-500" : "bg-red-500"
              )}
            />
            {speaking && (
              <span className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-blue-500 border-2 border-white animate-pulse" />
            )}
          </div>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[400px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl md:bottom-28 md:right-8">
          {/* Header */}
          <div className="flex items-center gap-3 border-b bg-primary px-4 py-3 text-primary-foreground">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-foreground/20">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Realtor Assistant</p>
              <p className="text-[11px] opacity-70">
                {connected
                  ? `${provider} \u00b7 voice ${ttsEnabled ? "on" : "off"}`
                  : "offline"}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {/* TTS toggle */}
              <button
                onClick={() => {
                  if (ttsEnabled) stopSpeaking();
                  setTtsEnabled(!ttsEnabled);
                }}
                className="rounded-md p-1.5 hover:bg-primary-foreground/20 transition-colors"
                title={ttsEnabled ? "Mute voice" : "Enable voice"}
              >
                {ttsEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
              {/* Close */}
              <button
                onClick={handleToggle}
                className="rounded-md p-1.5 hover:bg-primary-foreground/20 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground px-4">
                <div className="relative mb-4">
                  <Bot className="h-12 w-12 opacity-30" />
                  <Mic className="h-5 w-5 absolute -bottom-1 -right-1 text-primary opacity-60" />
                </div>
                <p className="text-sm font-medium">
                  Hi! I&apos;m your AI Realtor Assistant.
                </p>
                {connected ? (
                  <>
                    <p className="text-xs mt-2 opacity-70 leading-relaxed">
                      Ask me anything &mdash; search properties for buyers, create listings
                      from seller info, manage your daily tasks, check calendar, or get
                      market insights.
                    </p>
                    <p className="text-xs mt-3 opacity-50">
                      Tap the mic button to speak, or type your message
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs mt-2 opacity-70 leading-relaxed">
                      I&apos;m in offline mode. I can help you navigate the app &mdash; try
                      &quot;go to contacts&quot;, &quot;show listings&quot;, or &quot;open pipeline&quot;.
                    </p>
                    <p className="text-xs mt-3 opacity-50">
                      Type &quot;help&quot; to see all available commands
                    </p>
                  </>
                )}
              </div>
            )}
            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn("flex", {
                  "justify-end": msg.role === "user",
                  "justify-start": msg.role === "assistant",
                  "justify-center": msg.role === "system",
                })}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                    {
                      "bg-primary text-primary-foreground rounded-br-sm":
                        msg.role === "user",
                      "bg-muted text-foreground rounded-bl-sm":
                        msg.role === "assistant",
                      "bg-transparent text-muted-foreground text-xs italic text-center":
                        msg.role === "system",
                      "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-mono border border-amber-200 dark:border-amber-800":
                        msg.role === "tool",
                    }
                  )}
                >
                  {msg.content}
                  {msg.streaming && (
                    <span className="inline-block w-[2px] h-4 bg-primary ml-0.5 animate-pulse align-middle" />
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Speaking indicator */}
          {speaking && (
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950 border-t border-blue-100 dark:border-blue-900">
              <div className="flex items-center gap-1">
                <span className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" />
                <span
                  className="w-1 h-4 bg-blue-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.1s" }}
                />
                <span
                  className="w-1 h-2 bg-blue-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                />
                <span
                  className="w-1 h-5 bg-blue-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.3s" }}
                />
                <span
                  className="w-1 h-3 bg-blue-500 rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                />
              </div>
              <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Speaking...
              </span>
              <button
                onClick={stopSpeaking}
                className="ml-1 p-1 rounded hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
                title="Stop speaking"
              >
                <Square className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              </button>
            </div>
          )}

          {/* Listening indicator */}
          {listening && (
            <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-950 border-t border-red-100 dark:border-red-900">
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
          <div className="border-t p-3">
            <div className="flex gap-2">
              {/* Mic button */}
              <button
                onClick={toggleListening}
                disabled={!connected || sending || !recognitionRef.current}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg transition-colors shrink-0",
                  listening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                  (!connected || sending || !recognitionRef.current) &&
                    "opacity-50 cursor-not-allowed"
                )}
                title={
                  !recognitionRef.current
                    ? "Speech recognition not available in this browser"
                    : listening
                      ? "Stop listening"
                      : "Start speaking"
                }
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
                  listening
                    ? "Listening..."
                    : connected
                      ? "Ask anything or tap mic..."
                      : "Offline mode \u2014 try \"help\" or \"go to contacts\""
                }
                disabled={sending}
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:border-primary disabled:opacity-50 placeholder:text-muted-foreground"
              />
              <button
                onClick={() => sendMessage()}
                disabled={sending || !input.trim()}
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
      )}
    </>
  );
}
