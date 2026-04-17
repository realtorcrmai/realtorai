"use client";

import { useRouter } from "next/navigation";
import { GenerationProgress } from "@/components/editorial/GenerationProgress";

interface GenerationProgressWrapperProps {
  editionId: string;
}

/**
 * Thin wrapper that provides the `onComplete` callback required by
 * GenerationProgress. When the generation poll signals completion, we
 * call `router.refresh()` so the server component re-fetches the edition
 * and replaces this overlay with the finished editor UI.
 */
export function GenerationProgressWrapper({
  editionId,
}: GenerationProgressWrapperProps) {
  const router = useRouter();

  function handleComplete() {
    router.refresh();
  }

  return (
    <GenerationProgress editionId={editionId} onComplete={handleComplete} />
  );
}
