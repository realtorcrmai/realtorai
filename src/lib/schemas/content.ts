import { z } from "zod";

// DB uses non-standard UUIDs (e.g. c0000000-0000-0000-0000-00000000001b) where the
// version/variant nibbles don't conform to RFC 4122. Zod v4's z.string().uuid() enforces
// strict RFC 4122 compliance and rejects these, causing "Invalid listing ID" errors.
// We use a permissive hex UUID-shaped regex instead.
const uuidLike = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "Invalid ID format"
  );

export const generatePromptsSchema = z.object({
  listingId: uuidLike,
});

export const updatePromptSchema = z.object({
  promptId: uuidLike,
  videoPrompt: z.string().max(2000).optional(),
  imagePrompt: z.string().max(2000).optional(),
  mlsPublic: z.string().max(500).optional(),
  mlsRealtor: z.string().max(500).optional(),
  igCaption: z.string().max(2200).optional(),
});

export const generateMediaSchema = z.object({
  listingId: uuidLike,
  promptId: uuidLike,
  assetType: z.enum(["video", "image"]),
});

export const generateAllSchema = z.object({
  listingId: uuidLike,
});

export type GeneratePromptsData = z.infer<typeof generatePromptsSchema>;
export type UpdatePromptData = z.infer<typeof updatePromptSchema>;
export type GenerateMediaData = z.infer<typeof generateMediaSchema>;
export type GenerateAllData = z.infer<typeof generateAllSchema>;
