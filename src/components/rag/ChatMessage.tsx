'use client';

import type { RagMessage } from '@/lib/rag/types';
import SourcesDrawer from './SourcesDrawer';
import FeedbackButtons from './FeedbackButtons';

interface ChatMessageProps {
  message: RagMessage;
  sessionId: string;
  messageIndex: number;
}

export default function ChatMessage({ message, sessionId, messageIndex }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isUser
              ? 'bg-indigo-500 text-white rounded-br-md'
              : 'bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm'
          }`}
        >
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>

        {!isUser && (
          <div className="ml-1 mt-0.5">
            {message.sources && message.sources.length > 0 && (
              <SourcesDrawer sources={message.sources} />
            )}
            <FeedbackButtons sessionId={sessionId} messageIndex={messageIndex} />
          </div>
        )}

        <div className={`text-[10px] text-gray-400 mt-0.5 ${isUser ? 'text-right mr-1' : 'ml-1'}`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}
