'use client';

import { useState, useRef, useEffect } from 'react';
import type { UIContext, RagMessage, ChatResponse } from '@/lib/rag/types';
import ContextBanner from './ContextBanner';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';

export default function ChatFullPage() {
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<RagMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const uiContext: UIContext = { page: '/assistant' };

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

  return (
    <div className="max-w-3xl mx-auto" style={{ marginTop: 100, paddingBottom: 24 }}>
      <div className="lf-glass" style={{ padding: '14px 24px', marginBottom: 18, borderRadius: 13 }}>
        <h1 className="text-xl font-bold" style={{ background: 'linear-gradient(135deg, var(--lf-indigo), var(--lf-coral))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          🤖 AI Assistant
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          RAG-powered — answers grounded in your CRM data, marketing content, and knowledge base
        </p>
      </div>

      <div className="lf-card" style={{ borderRadius: 13, overflow: 'hidden', minHeight: 500, display: 'flex', flexDirection: 'column' }}>
        <ContextBanner context={uiContext} />

        <div className="flex-1 overflow-y-auto p-6 space-y-1 bg-gray-50" style={{ maxHeight: 'calc(100vh - 340px)' }}>
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-16">
              <p className="text-4xl mb-3">🤖</p>
              <p className="text-lg font-medium text-gray-600">How can I help you today?</p>
              <div className="mt-4 grid grid-cols-2 gap-2 max-w-md mx-auto">
                {[
                  'Write a follow-up email for a contact',
                  'Draft a newsletter intro for first-time buyers',
                  'Create Instagram captions for my listing',
                  'What is subject removal in BC?',
                  'Summarize interactions with a contact',
                  'What are the listing onboarding steps?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => sendMessage(suggestion)}
                    className="text-xs text-left px-3 py-2 bg-white border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
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
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <ChatInput
          onSend={sendMessage}
          disabled={loading}
          placeholder="Ask about contacts, listings, processes, or request content generation..."
        />
      </div>
    </div>
  );
}
