import { z } from "zod";

export const generatePromptsSchema = z.object({
  listingId: z.string().uuid(),
});

export const updatePromptSchema = z.object({
  promptId: z.string().uuid(),
  videoPrompt: z.string().max(2000).optional(),
  imagePrompt: z.string().max(2000).optional(),
  mlsPublic: z.string().max(500).optional(),
  mlsRealtor: z.string().max(500).optional(),
  igCaption: z.string().max(2200).optional(),
});

export const generateMediaSchema = z.object({
  listingId: z.string().uuid(),
  promptId: z.string().uuid(),
  assetType: z.enum(["video", "image"]),
});

export const generateAllSchema = z.object({
  listingId: z.string().uuid(),
});

export type GeneratePromptsData = z.infer<typeof generatePromptsSchema>;
export type UpdatePromptData = z.infer<typeof updatePromptSchema>;
export type GenerateMediaData = z.infer<typeof generateMediaSchema>;
export type GenerateAllData = z.infer<typeof generateAllSchema>;
