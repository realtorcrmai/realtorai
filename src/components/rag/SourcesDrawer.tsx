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

const DEEP_LINK_ROUTES: Record<string, string> = {
  contacts: '/contacts',
  listings: '/listings',
  newsletters: '/newsletters',
  knowledge_articles: '/assistant/knowledge',
};

function getDeepLink(sourceTable: string, sourceId: string): string | null {
  const route = DEEP_LINK_ROUTES[sourceTable];
  if (!route) return null;
  if (sourceTable === 'knowledge_articles') return route; // no per-article route
  return `${route}/${sourceId}`;
}

export default function SourcesDrawer({ sources }: SourcesDrawerProps) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <div className="mt-1">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs text-[#0F7694] hover:text-[#0A6880] flex items-center gap-1"
      >
        📎 {sources.length} source{sources.length > 1 ? 's' : ''} referenced
        <span className="text-[10px]">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2 pl-2 border-l-2 border-[#0F7694]/15">
          {sources.map((s, i) => {
            const deepLink = getDeepLink(s.source_table, s.source_id);
            return (
              <div key={i} className="text-xs bg-gray-50 rounded p-2 border">
                <div className="flex items-center gap-2 mb-1">
                  {deepLink ? (
                    <a href={deepLink} className="font-medium text-[#0F7694] hover:underline">
                      {TABLE_LABELS[s.source_table] ?? s.source_table} →
                    </a>
                  ) : (
                    <span className="font-medium text-[#0F7694]">
                      {TABLE_LABELS[s.source_table] ?? s.source_table}
                    </span>
                  )}
                  <span className="text-gray-400">
                    {(s.similarity * 100).toFixed(0)}% match
                  </span>
                </div>
                <p className="text-gray-600 leading-snug">{s.snippet}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
