"use client";

import { useState, useCallback, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { GenerateButton } from "@/components/wizard/GenerateButton";
import { GenerationProgress } from "@/components/wizard/GenerationProgress";
import { VariantPicker } from "@/components/wizard/VariantPicker";
import { LiveSiteCard } from "@/components/wizard/LiveSiteCard";

type View = "generate" | "progress" | "pick" | "live";

export default function SetupPage() {
  const [view, setView] = useState<View>("generate");
  const [generationId, setGenerationId] = useState("");
  const [liveUrl, setLiveUrl] = useState("");
  const [siteId, setSiteId] = useState("");
  const [agentName, setAgentName] = useState("Your");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSite() {
      try {
        const res = await fetch("/api/site");
        if (res.ok) {
          const data = await res.json();
          const site = data.site || data;
          setSiteId(site.id);
          setAgentName(site.agent_name || "Your");
          // If site already has a live URL, show the live view
          if (site.live_url) {
            setLiveUrl(site.live_url);
            setView("live");
          }
        }
      } catch (e) {
        console.error("Failed to fetch site:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchSite();
  }, []);

  const handleGenerate = useCallback((id: string) => {
    setGenerationId(id);
    setView("progress");
  }, []);

  const handleProgressComplete = useCallback(() => {
    setView("pick");
  }, []);

  const handleProgressFailed = useCallback((error: string) => {
    console.error("Generation failed:", error);
    setView("generate");
  }, []);

  const handleApproved = useCallback((url: string) => {
    setLiveUrl(url);
    setView("live");
  }, []);

  const handleRegenerate = useCallback(() => {
    setGenerationId("");
    setLiveUrl("");
    setView("generate");
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {view === "generate" && (
          <GenerateButton siteId={siteId} onGenerate={handleGenerate} />
        )}

        {view === "progress" && (
          <GenerationProgress
            generationId={generationId}
            onComplete={handleProgressComplete}
            onFailed={handleProgressFailed}
          />
        )}

        {view === "pick" && (
          <VariantPicker
            generationId={generationId}
            onApproved={handleApproved}
            onRegenerate={handleRegenerate}
          />
        )}

        {view === "live" && (
          <LiveSiteCard
            liveUrl={liveUrl}
            agentName={agentName}
            onRegenerate={handleRegenerate}
          />
        )}
      </div>
    </div>
  );
}
