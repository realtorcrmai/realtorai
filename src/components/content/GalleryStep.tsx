"use client";

import { cn } from "@/lib/utils";
import { MEDIA_STATUS_COLORS } from "@/lib/constants";
import {
  Video,
  ImageIcon,
  Download,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Film,
} from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";
import type { MediaAsset } from "@/types";

interface GalleryStepProps {
  assets: MediaAsset[];
  className?: string;
}

export function GalleryStep({ assets, className }: GalleryStepProps) {
  const completedAssets = assets.filter((a) => a.status === "completed");
  const processingAssets = assets.filter(
    (a) => a.status === "processing" || a.status === "pending"
  );
  const failedAssets = assets.filter((a) => a.status === "failed");

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed":
        return CheckCircle2;
      case "processing":
        return Loader2;
      case "failed":
        return AlertCircle;
      default:
        return Clock;
    }
  }

  if (assets.length === 0) {
    return (
      <div
        className={cn(
          "glass rounded-xl p-12 elevation-2 animate-float-in text-center",
          className
        )}
      >
        <Film className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">
          No Media Assets Yet
        </h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Go to Step 2 to generate video and image content for this listing.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Completed Assets */}
      {completedAssets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-brand" />
            Completed ({completedAssets.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 stagger-children">
            {completedAssets.map((asset) => (
              <div
                key={asset.id}
                className="glass rounded-xl overflow-hidden elevation-4 animate-float-in group"
              >
                {/* Preview */}
                <div className="relative aspect-video bg-muted">
                  {asset.asset_type === "video" && asset.output_url ? (
                    <video
                      src={asset.output_url}
                      className="w-full h-full object-cover"
                      controls
                      preload="metadata"
                    />
                  ) : asset.output_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={asset.output_url}
                      alt={`Generated ${asset.asset_type}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {asset.asset_type === "video" ? (
                        <Video className="h-12 w-12 text-muted-foreground/30" />
                      ) : (
                        <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                      )}
                    </div>
                  )}
                </div>

                {/* Info bar */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {asset.asset_type === "video" ? (
                        <Video className="h-4 w-4 text-brand" />
                      ) : (
                        <ImageIcon className="h-4 w-4 text-brand" />
                      )}
                      <span className="text-sm font-semibold text-foreground capitalize">
                        {asset.asset_type}
                      </span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                          MEDIA_STATUS_COLORS.completed
                        )}
                      >
                        <CheckCircle2 className="h-3 w-3" />
                        completed
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {asset.output_url && (
                        <>
                          <a
                            href={asset.output_url}
                            download
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                          <a
                            href={asset.output_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                            title="Open in new tab"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Created{" "}
                    {new Date(asset.created_at).toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing Assets */}
      {processingAssets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <LogoSpinner size={16} />
            Processing ({processingAssets.length})
          </h3>
          <div className="grid gap-3">
            {processingAssets.map((asset) => {
              const StatusIcon = getStatusIcon(asset.status);
              return (
                <div
                  key={asset.id}
                  className="glass rounded-xl p-4 elevation-2 animate-float-in"
                >
                  <div className="flex items-center gap-3">
                    {asset.asset_type === "video" ? (
                      <Video className="h-5 w-5 text-brand" />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-brand" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground capitalize">
                        {asset.asset_type} Generation
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Started{" "}
                        {new Date(asset.created_at).toLocaleTimeString("en-CA", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border",
                        MEDIA_STATUS_COLORS[
                          asset.status as keyof typeof MEDIA_STATUS_COLORS
                        ]
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "h-3 w-3",
                          asset.status === "processing" && "animate-spin"
                        )}
                      />
                      {asset.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Failed Assets */}
      {failedAssets.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-600" />
            Failed ({failedAssets.length})
          </h3>
          <div className="grid gap-3">
            {failedAssets.map((asset) => (
              <div
                key={asset.id}
                className="glass rounded-xl p-4 elevation-2 animate-float-in border border-red-200"
              >
                <div className="flex items-center gap-3">
                  {asset.asset_type === "video" ? (
                    <Video className="h-5 w-5 text-red-500" />
                  ) : (
                    <ImageIcon className="h-5 w-5 text-red-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground capitalize">
                      {asset.asset_type} Generation Failed
                    </p>
                    {asset.error_message && (
                      <p className="text-xs text-red-600 mt-0.5">
                        {asset.error_message}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                      MEDIA_STATUS_COLORS.failed
                    )}
                  >
                    <AlertCircle className="h-3 w-3" />
                    failed
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
