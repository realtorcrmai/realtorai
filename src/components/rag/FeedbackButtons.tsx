'use client';

import { useState } from 'react';

interface FeedbackButtonsProps {
  sessionId: string;
  messageIndex: number;
}

export default function FeedbackButtons({ sessionId, messageIndex }: FeedbackButtonsProps) {
  const [submitted, setSubmitted] = useState<'positive' | 'negative' | null>(null);
  const [showText, setShowText] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  const submit = async (rating: 'positive' | 'negative') => {
    setSubmitted(rating);
    if (rating === 'negative') {
      setShowText(true);
      return;
    }
    await fetch('/api/rag/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, message_index: messageIndex, rating }),
    });
  };

  const submitWithText = async () => {
    await fetch('/api/rag/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        session_id: sessionId,
        message_index: messageIndex,
        rating: 'negative',
        feedback_text: feedbackText,
      }),
    });
    setShowText(false);
  };

  if (submitted === 'positive') {
    return <span className="text-xs text-green-600">Thanks for the feedback!</span>;
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      {!submitted && (
        <>
          <button onClick={() => submit('positive')} className="text-xs px-1.5 py-0.5 rounded hover:bg-green-50 text-gray-400 hover:text-green-600 transition" title="Helpful">👍</button>
          <button onClick={() => submit('negative')} className="text-xs px-1.5 py-0.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition" title="Not helpful">👎</button>
        </>
      )}
      {showText && (
        <div className="flex items-center gap-1 ml-1">
          <input
            type="text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="What went wrong?"
            className="text-xs border rounded px-2 py-0.5 w-48"
            autoFocus
          />
          <button onClick={submitWithText} className="text-xs px-2 py-0.5 bg-indigo-500 text-white rounded hover:bg-indigo-600">Send</button>
        </div>
      )}
    </div>
  );
}
