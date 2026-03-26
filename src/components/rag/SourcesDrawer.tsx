'use client';

import { useState } from 'react';
import type { SourceReference } from '@/lib/rag/types';

interface SourcesDrawerProps {
  sources: SourceReference[];
}

const TABLE_LABELS: Record<string, string> = {
  communications: '💬 Message',
  activities: '📋 Activity',
  newsletters: '📧 Newsletter',
  contacts: '👤 Contact',
  listings: '🏠 Listing',
  agent_recommendations: '🤖 AI Recommendation',
  message_templates: '📝 Template',
  offers: '💰 Offer',
  offer_conditions: '📄 Condition',
  knowledge_articles: '📚 Knowledge Base',
  competitive_emails: '🔍 Competitor',
};

export default function SourcesDrawer({ sources }: SourcesDrawerProps) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1"
      >
        📎 {sources.length} source{sources.length > 1 ? 's' : ''} referenced
        <span className="text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-indigo-100">
          {sources.map((s, i) => (
            <div key={i} className="text-xs bg-gray-50 rounded p-2 border">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-indigo-600">
                  {TABLE_LABELS[s.source_table] ?? s.source_table}
                </span>
                <span className="text-gray-400">
                  {(s.similarity * 100).toFixed(0)}% match
                </span>
              </div>
              <p className="text-gray-600 leading-snug">{s.snippet}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
