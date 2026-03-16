"use client";

import { ExternalLink, RefreshCw, Globe } from "lucide-react";

interface LiveSiteCardProps {
  liveUrl: string;
  agentName: string;
  onRegenerate: () => void;
}

export function LiveSiteCard({ liveUrl, agentName, onRegenerate }: LiveSiteCardProps) {
  return (
    <div className="text-center py-12 animate-float-in">
      <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-green-400 to-teal-500 flex items-center justify-center mx-auto mb-6 shadow-lg">
        <Globe className="h-10 w-10 text-white" />
      </div>

      <h2 className="text-2xl font-bold text-gray-900 mb-2">
        Your Website is Live!
      </h2>
      <p className="text-gray-500 mb-2">
        {agentName}&apos;s website is published and accepting leads.
      </p>

      <a
        href={liveUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-teal-600 font-semibold hover:underline mb-8"
      >
        {liveUrl}
        <ExternalLink className="h-4 w-4" />
      </a>

      <div className="flex items-center justify-center gap-4">
        <a
          href={liveUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary"
        >
          <ExternalLink className="h-4 w-4" />
          Visit Website
        </a>
        <button onClick={onRegenerate} className="btn btn-outline">
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </button>
      </div>
    </div>
  );
}
