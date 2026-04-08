'use client';

import { useState, useRef, useEffect } from 'react';
import type { UIContext, RagMessage, ChatResponse } from '@/lib/rag/types';
import ContextBanner from './ContextBanner';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

interface ChatWidgetProps {
  uiContext?: UIContext;
}

export default function ChatWidget({ uiContext = {} }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<RagMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    const userMsg: RagMessage = {
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch('/api/rag/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          message: text,
          ui_context: uiContext,
        }),
      });

      if (!res.ok) throw new Error('Chat request failed');

      const data: ChatResponse = await res.json();
      setSessionId(data.session_id);

      const assistantMsg: RagMessage = {
        role: 'assistant',
        content: data.response.text,
        sources: data.response.sources,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: RagMessage = {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#0F7694] text-white rounded-full shadow-lg hover:bg-[#0F7694] transition flex items-center justify-center text-2xl"
        title="AI Assistant"
      >
        🤖
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-[420px] h-[600px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#0F7694] text-white">
        <div>
          <h3 className="font-semibold text-sm">🤖 AI Assistant</h3>
          <p className="text-[10px] text-[#C8F5F0]">RAG-powered — grounded in your CRM data</p>
        </div>
        <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white text-lg">✕</button>
      </div>

      {/* Context banner */}
      <ContextBanner context={uiContext} />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-sm text-gray-400 mt-8">
            <p className="text-2xl mb-2">👋</p>
            <p>How can I help you today?</p>
            <p className="text-xs mt-1">Try: "Write a follow-up email" or "What is subject removal?"</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <ChatMessage
            key={i}
            message={msg}
            sessionId={sessionId ?? ''}
            messageIndex={i}
          />
        ))}
        {loading && (
          <div className="flex justify-start mb-3">
            <div className="bg-white border rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-[#67D4E8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-[#67D4E8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-[#67D4E8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={loading} />
    </div>
  );
}
