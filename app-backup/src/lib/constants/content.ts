export const MEDIA_ASSET_TYPES = ["video", "image"] as const;
export type MediaAssetType = (typeof MEDIA_ASSET_TYPES)[number];

export const MEDIA_ASSET_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
] as const;
export type MediaAssetStatus = (typeof MEDIA_ASSET_STATUSES)[number];

export const MEDIA_STATUS_COLORS: Record<MediaAssetStatus, string> = {
  pending: "bg-slate-50 text-slate-700 border-slate-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
};

export const CONTENT_STEPS = [
  { step: 1, label: "Prompts", description: "Generate AI prompts & remarks" },
  { step: 2, label: "Generate", description: "Create videos & images" },
  { step: 3, label: "Gallery", description: "View & manage media" },
] as const;
