'use client';

import type { UIContext } from '@/lib/rag/types';

interface ContextBannerProps {
  context: UIContext;
}

export default function ContextBanner({ context }: ContextBannerProps) {
  if (!context.contact_name && !context.listing_address && !context.campaign_type && !context.segment) {
    return (
      <div className="px-4 py-2 text-xs text-gray-500 bg-gray-50 rounded-t-lg border-b">
        🤖 No context loaded — ask me anything!
      </div>
    );
  }

  const parts: string[] = [];
  if (context.contact_name) {
    parts.push(`📋 ${context.contact_name}${context.contact_type ? ` — ${context.contact_type}` : ''}${context.contact_stage ? ` — ${context.contact_stage}` : ''}`);
  }
  if (context.listing_address) {
    parts.push(`🏠 ${context.listing_address}`);
  }
  if (context.campaign_type) {
    parts.push(`📧 ${context.campaign_type}`);
  }
  if (context.segment) {
    parts.push(`👥 ${context.segment}`);
  }

  return (
    <div className="px-4 py-2 text-xs bg-[#0F7694]/5 text-[#0A6880] rounded-t-lg border-b border-[#0F7694]/15 flex items-center gap-2 flex-wrap">
      <span className="font-medium">Context:</span>
      {parts.map((p, i) => (
        <span key={i} className="bg-white px-2 py-0.5 rounded text-[#0F7694] border border-[#0F7694]/15">{p}</span>
      ))}
    </div>
  );
}
