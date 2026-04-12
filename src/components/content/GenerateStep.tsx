"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { startMediaGeneration, generateAll } from "@/actions/content";
import { useKlingTask } from "@/hooks/useKlingTask";
import { MEDIA_STATUS_COLORS } from "@/lib/constants";
import {
  Video,
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Sparkles,
} from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";
import type { Prompt, MediaAsset } from "@/types";

interface GenerateStepProps {
  listingId: string;
  prompt: Prompt | null;
  assets: MediaAsset[];
  onGenerated: () => void;
  className?: string;
}

export function GenerateStep({
  listingId,
  prompt,
  assets,
  onGenerated,
  className,
}: GenerateStepProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [generatingType, setGeneratingType] = useState<
    "video" | "image" | "all" | null
  >(null);
  const [generateAllResult, setGenerateAllResult] = useState<string | null>(
    null
  );
  const taskState = useKlingTask(activeTaskId);

  const videoAsset = assets.find((a) => a.asset_type === "video");
  const imageAsset = assets.find((a) => a.asset_type === "image");

  function handleGenerate(assetType: "video" | "image") {
    if (!prompt?.id) return;
    setError(null);
    setGeneratingType(assetType);

    startTransition(async () => {
      const result = await startMediaGeneration({
        listingId,
        promptId: prompt.id,
        assetType,
      });
      if (result.error) {
        setError(result.error);
        setGeneratingType(null);
      } else if (result.klingTaskId) {
        setActiveTaskId(result.klingTaskId);
      }
    });
  }

  function handleGenerateAll() {
    if (!prompt?.id) return;
    setError(null);
    setGeneratingType("all");
    setGenerateAllResult(null);

    startTransition(async () => {
      const result = await generateAll({ listingId });
      if (result.error) {
        setError(result.error);
        setGeneratingType(null);
      } else {
        const parts: string[] = [];
        if (result.media?.video) parts.push("Video");
        if (result.media?.image) parts.push("Image");
        if (result.heroImageMissing) parts.push("(video skipped — no hero image)");
        setGenerateAllResult(
          parts.length > 0
            ? `Started: ${parts.join(" + ")}. Server is polling — you can close this tab.`
            : "Prompts generated. No media started."
        );
        setGeneratingType(null);
        onGenerated();
      }
    });
  }

  // When task completes, refresh data
  if (
    taskState.status === "completed" ||
    taskState.status === "failed"
  ) {
    if (activeTaskId) {
      setActiveTaskId(null);
      setGeneratingType(null);
      onGenerated();
    }
  }

  function getStatusInfo(asset: MediaAsset | undefined) {
    if (!asset) return null;
    const statusColors =
      MEDIA_STATUS_COLORS[asset.status as keyof typeof MEDIA_STATUS_COLORS] ??
      MEDIA_STATUS_COLORS.pending;
    const icons = {
      pending: Clock,
      processing: Loader2,
      completed: CheckCircle2,
      failed: AlertCircle,
    };
    const StatusIcon = icons[asset.status as keyof typeof icons] ?? Clock;
    return { statusColors, StatusIcon };
  }

  if (!prompt) {
    return (
      <div
        className={cn(
          "glass rounded-xl p-12 elevation-2 animate-float-in text-center",
          className
        )}
      >
        <Zap className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Generate Prompts First
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Go back to Step 1 and generate AI prompts before creating media
          assets.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20 animate-float-in">
          {error}
        </div>
      )}

      {/* Generate All */}
      <div className="glass rounded-xl p-5 elevation-2 animate-float-in border border-brand/15">
        <div className="flex items-center justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Generate All Content
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Start video + image generation in parallel. Server polls
                Kling AI in the background — you can close this tab.
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerateAll}
            disabled={isPending || generatingType !== null}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              "bg-brand text-white hover:from-[#a37b35] hover:to-[#1a1535] elevation-2",
              (isPending || generatingType !== null) &&
                "opacity-70 cursor-not-allowed"
            )}
          >
            {generatingType === "all" ? (
              <LogoSpinner size={16} />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {generatingType === "all" ? "Generating..." : "Generate All"}
          </button>
        </div>
        {generateAllResult && (
          <div className="mt-3 p-3 bg-brand-muted border border-brand/20 rounded-lg">
            <p className="text-sm text-brand-dark font-medium">
              {generateAllResult}
            </p>
          </div>
        )}
      </div>

      {/* Video Generation */}
      <div className="glass rounded-xl p-6 elevation-2 animate-float-in">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted text-brand">
              <Video className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Video Generation
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create a 4K vertical video (9:16) from the hero image using
                Kling AI.
              </p>
              {videoAsset && (
                <div className="mt-3">
                  {(() => {
                    const info = getStatusInfo(videoAsset);
                    if (!info) return null;
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                          info.statusColors
                        )}
                      >
                        <info.StatusIcon
                          className={cn(
                            "h-3 w-3",
                            videoAsset.status === "processing" && "animate-spin"
                          )}
                        />
                        {videoAsset.status}
                      </span>
                    );
                  })()}
                  {videoAsset.error_message && (
                    <p className="text-xs text-destructive mt-1">
                      {videoAsset.error_message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => handleGenerate("video")}
            disabled={
              isPending ||
              generatingType === "video" ||
              taskState.status === "processing"
            }
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              "bg-brand text-white hover:bg-brand-dark elevation-2",
              (isPending || generatingType === "video") &&
                "opacity-70 cursor-not-allowed"
            )}
          >
            {generatingType === "video" ? (
              <LogoSpinner size={16} />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {videoAsset ? "Regenerate" : "Generate Video"}
          </button>
        </div>

        {/* Active task progress */}
        {generatingType === "video" && activeTaskId && (
          <div className="mt-4 p-3 bg-brand-muted border border-brand/20 rounded-lg">
            <div className="flex items-center gap-2">
              <LogoSpinner size={16} />
              <span className="text-sm text-brand-dark font-medium">
                Processing video... This may take a few minutes.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Image Generation */}
      <div
        className="glass rounded-xl p-6 elevation-2 animate-float-in"
        style={{ animationDelay: "80ms" }}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-muted text-brand">
              <ImageIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Image Generation
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create an 8K square image (1:1) from text prompt using Kling AI.
              </p>
              {imageAsset && (
                <div className="mt-3">
                  {(() => {
                    const info = getStatusInfo(imageAsset);
                    if (!info) return null;
                    return (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                          info.statusColors
                        )}
                      >
                        <info.StatusIcon
                          className={cn(
                            "h-3 w-3",
                            imageAsset.status === "processing" && "animate-spin"
                          )}
                        />
                        {imageAsset.status}
                      </span>
                    );
                  })()}
                  {imageAsset.error_message && (
                    <p className="text-xs text-destructive mt-1">
                      {imageAsset.error_message}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={() => handleGenerate("image")}
            disabled={
              isPending ||
              generatingType === "image" ||
              taskState.status === "processing"
            }
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200",
              "bg-brand text-white hover:bg-brand-dark elevation-2",
              (isPending || generatingType === "image") &&
                "opacity-70 cursor-not-allowed"
            )}
          >
            {generatingType === "image" ? (
              <LogoSpinner size={16} />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {imageAsset ? "Regenerate" : "Generate Image"}
          </button>
        </div>

        {/* Active task progress */}
        {generatingType === "image" && activeTaskId && (
          <div className="mt-4 p-3 bg-brand-muted border border-brand/20 rounded-lg">
            <div className="flex items-center gap-2">
              <LogoSpinner size={16} />
              <span className="text-sm text-brand-dark font-medium">
                Processing image... This may take a few minutes.
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
