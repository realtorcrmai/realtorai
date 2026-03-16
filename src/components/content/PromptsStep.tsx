"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { generatePrompts, updatePrompt } from "@/actions/content";
import {
  Sparkles,
  Save,
  Loader2,
  Video,
  ImageIcon,
  MessageSquare,
  FileText,
  Instagram,
} from "lucide-react";
import type { Prompt } from "@/types";

interface PromptsStepProps {
  listingId: string;
  prompt: Prompt | null;
  onGenerated: () => void;
  className?: string;
}

interface PromptField {
  key: "videoPrompt" | "imagePrompt" | "mlsPublic" | "mlsRealtor" | "igCaption";
  dbKey: keyof Prompt;
  label: string;
  icon: typeof Video;
  maxLength?: number;
  rows: number;
}

const fields: PromptField[] = [
  {
    key: "videoPrompt",
    dbKey: "video_prompt",
    label: "Video Prompt",
    icon: Video,
    rows: 3,
  },
  {
    key: "imagePrompt",
    dbKey: "image_prompt",
    label: "Image Prompt",
    icon: ImageIcon,
    rows: 3,
  },
  {
    key: "igCaption",
    dbKey: "ig_caption",
    label: "Instagram Caption",
    icon: Instagram,
    rows: 4,
  },
  {
    key: "mlsPublic",
    dbKey: "mls_public",
    label: "MLS Public Remarks",
    icon: FileText,
    maxLength: 500,
    rows: 4,
  },
  {
    key: "mlsRealtor",
    dbKey: "mls_realtor",
    label: "MLS REALTOR Remarks",
    icon: MessageSquare,
    maxLength: 500,
    rows: 4,
  },
];

export function PromptsStep({
  listingId,
  prompt,
  onGenerated,
  className,
}: PromptsStepProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [savingField, setSavingField] = useState<string | null>(null);

  function handleGenerate() {
    setError(null);
    startTransition(async () => {
      const result = await generatePrompts({ listingId });
      if (result.error) {
        setError(result.error);
      } else {
        onGenerated();
      }
    });
  }

  function startEditing(field: PromptField) {
    const value = prompt?.[field.dbKey] as string | null;
    setEditValues((prev) => ({
      ...prev,
      [field.key]: value ?? "",
    }));
    setEditingField(field.key);
  }

  async function saveField(field: PromptField) {
    if (!prompt?.id) return;
    setSavingField(field.key);
    const result = await updatePrompt({
      promptId: prompt.id,
      [field.key]: editValues[field.key],
    });
    setSavingField(null);
    if (result.error) {
      setError(result.error);
    } else {
      setEditingField(null);
      onGenerated();
    }
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Generate Button */}
      <div className="glass rounded-xl p-6 elevation-2 animate-float-in">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              AI Content Generation
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Generate MLS remarks, video/image prompts, and social media
              captions using Claude AI.
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={isPending}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200",
              "bg-primary text-primary-foreground hover:opacity-90 elevation-4",
              isPending && "opacity-70 cursor-not-allowed"
            )}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isPending
              ? "Generating..."
              : prompt
                ? "Regenerate All"
                : "Generate Prompts"}
          </button>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
            {error}
          </div>
        )}
      </div>

      {/* Prompt Fields */}
      {prompt && (
        <div className="grid gap-4 stagger-children">
          {fields.map((field) => {
            const value = prompt[field.dbKey] as string | null;
            const isEditing = editingField === field.key;
            const isSaving = savingField === field.key;

            return (
              <div
                key={field.key}
                className="glass rounded-xl p-5 elevation-2 animate-float-in"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <field.icon className="h-4 w-4 text-primary" />
                    <h4 className="text-sm font-semibold text-foreground">
                      {field.label}
                    </h4>
                    {field.maxLength && (
                      <span className="text-xs text-muted-foreground">
                        (max {field.maxLength} chars)
                      </span>
                    )}
                  </div>
                  {!isEditing ? (
                    <button
                      onClick={() => startEditing(field)}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      Edit
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditingField(null)}
                        className="text-xs text-muted-foreground hover:underline"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => saveField(field)}
                        disabled={isSaving}
                        className="flex items-center gap-1 text-xs bg-primary text-primary-foreground px-3 py-1 rounded-lg font-medium hover:opacity-90 transition-opacity"
                      >
                        {isSaving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Save className="h-3 w-3" />
                        )}
                        Save
                      </button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <textarea
                    value={editValues[field.key] ?? ""}
                    onChange={(e) =>
                      setEditValues((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                    rows={field.rows}
                    maxLength={field.maxLength}
                    className="w-full p-3 rounded-lg border border-input bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                ) : (
                  <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">
                    {value || (
                      <span className="text-muted-foreground italic">
                        Not generated yet
                      </span>
                    )}
                  </p>
                )}

                {isEditing && field.maxLength && (
                  <p className="text-xs text-muted-foreground mt-1 text-right">
                    {(editValues[field.key] ?? "").length} / {field.maxLength}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!prompt && !isPending && (
        <div className="glass rounded-xl p-12 elevation-2 animate-float-in text-center">
          <Sparkles className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Prompts Generated Yet
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Click &ldquo;Generate Prompts&rdquo; to use Claude AI to create MLS remarks,
            video/image prompts, and an Instagram caption for this listing.
          </p>
        </div>
      )}
    </div>
  );
}
