"use client";

import { useState, useRef, useEffect } from "react";
import { useChat, Chat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePageContext } from "@/hooks/usePageContext";

// Local type for page context (matches usePageContext return)
type PageContext = {
  page_type?: string;
  contact_id?: string;
  listing_id?: string;
  showing_id?: string;
  deal_id?: string;
};

/**
 * Unified Agent Widget — Single button for text + voice AI assistant.
 * Replaces separate ChatWidget + VoiceAgentWidget.
 * Uses Vercel AI SDK v6 useChat() for streaming responses with tool calling.
 */
export function UnifiedAgentWidget() {
  const [open, setOpen] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pageContext = usePageContext() as PageContext;

  // Create chat instance with v6 API
  const [chat] = useState(
    () =>
      new Chat({
        transport: new DefaultChatTransport({
          api: "/api/agent/chat",
          body: { uiContext: pageContext },
        }),
      })
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({ chat });

  const isLoading = status === "streaming" || status === "submitted";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Listen for "Ask AI" from CommandPalette
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setOpen(true);
      setInputValue(e.detail.query);
    };
    window.addEventListener("open-agent", handler as EventListener);
    return () => window.removeEventListener("open-agent", handler as EventListener);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    const text = inputValue;
    setInputValue("");
    await sendMessage({ text });
  };

  // Floating button (collapsed)
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all hover:scale-110 bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl"
        aria-label="Open AI Assistant"
        title="AI Assistant"
      >
        ✨
      </button>
    );
  }

  // Expanded chat panel
  return (
    <div className="fixed z-50 inset-x-0 bottom-0 h-[80vh] md:inset-auto md:bottom-6 md:right-6 md:w-[400px] md:h-[600px] bg-white dark:bg-card rounded-t-2xl md:rounded-2xl shadow-2xl border border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">✨</span>
          <div>
            <h3 className="font-semibold text-sm">AI Assistant</h3>
            <p className="text-[10px] text-indigo-100">
              {voiceMode ? "Voice mode — speak or type" : "Powered by Realtors360 CRM data"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setVoiceMode(!voiceMode)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              voiceMode ? "bg-white/30 text-white" : "bg-white/10 text-white/60 hover:bg-white/20"
            }`}
            aria-label={voiceMode ? "Switch to text mode" : "Switch to voice mode"}
          >
            {voiceMode ? "🎤" : "⌨️"}
          </button>
          <button
            onClick={() => setOpen(false)}
            className="text-white/80 hover:text-white text-lg"
            aria-label="Close AI Assistant"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Context banner */}
      {pageContext.page_type && pageContext.page_type !== "dashboard" && (
        <div className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-xs text-indigo-700 dark:text-indigo-300 border-b">
          📍 Context: {pageContext.page_type.replace(/_/g, " ")}
          {pageContext.contact_id && " (contact)"}
          {pageContext.listing_id && " (listing)"}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50 dark:bg-background" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="text-center text-sm text-muted-foreground mt-8">
            <p className="text-2xl mb-2">✨</p>
            <p className="font-medium">How can I help?</p>
            <p className="text-xs mt-1">I can search contacts, check listings, create tasks, and more.</p>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {getSuggestedPrompts(pageContext.page_type).map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setInputValue(prompt)}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-card border rounded-full hover:bg-indigo-50 hover:border-indigo-200 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-indigo-500 text-white rounded-br-md"
                  : "bg-white dark:bg-card border shadow-sm rounded-bl-md"
              }`}
            >
              {msg.parts?.map((part, i) => {
                if (part.type === "text") {
                  return <div key={i} className="whitespace-pre-wrap">{part.text}</div>;
                }
                if (part.type?.startsWith("tool-")) {
                  const toolPart = part as { type: string; toolName?: string; state?: string; toolCallId?: string };
                  return (
                    <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                      <span>🔧</span>
                      <span>{toolPart.toolName || toolPart.toolCallId || "tool"}</span>
                      {toolPart.state === "result" && <span className="text-emerald-500">✓</span>}
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-card border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center text-xs text-red-500 bg-red-50 dark:bg-red-950/20 rounded-lg p-2">
            Something went wrong. Please try again.
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t bg-white dark:bg-card shrink-0">
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={voiceMode ? "Speak or type..." : "Ask anything..."}
          className="flex-1 px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-indigo-400"
          disabled={isLoading}
          aria-label="Type your message"
          autoFocus
        />
        <button
          type="submit"
          disabled={isLoading || !inputValue.trim()}
          className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="Send message"
        >
          {isLoading ? "..." : "→"}
        </button>
      </form>
    </div>
  );
}

function getSuggestedPrompts(pageType?: string): string[] {
  switch (pageType) {
    case "contact_detail":
      return ["Summarize this contact", "Draft a follow-up email", "Show recent activity"];
    case "listing_detail":
      return ["What's the listing status?", "Generate MLS remarks", "Show showing history"];
    case "newsletters":
      return ["Show pending drafts", "What's the open rate?"];
    case "showing_detail":
      return ["Today's showings", "Any pending confirmations?"];
    case "calendar":
      return ["What's on today?", "Any conflicts this week?"];
    case "tasks":
      return ["Show overdue tasks", "Create a task"];
    default:
      return ["What needs attention today?", "Show hot leads", "Any new showings?"];
  }
}
