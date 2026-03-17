"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2 } from "lucide-react";
import { updateContact } from "@/actions/contacts";
import type { Json } from "@/types/database";

const TAG_COLORS = [
  "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  "bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-400",
  "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400",
  "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export function TagEditor({
  contactId,
  tags,
}: {
  contactId: string;
  tags: string[];
}) {
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function saveTags(newTags: string[]) {
    startTransition(async () => {
      await updateContact(contactId, {
        tags: newTags as unknown as Json,
      });
      router.refresh();
    });
  }

  function addTag() {
    const tag = input.trim().toLowerCase();
    if (!tag || tags.includes(tag)) {
      setInput("");
      return;
    }
    saveTags([...tags, tag]);
    setInput("");
  }

  function removeTag(tag: string) {
    saveTags(tags.filter((t) => t !== tag));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${getTagColor(tag)}`}
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            disabled={isPending}
            className="hover:opacity-70 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <div className="inline-flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder="Add tag..."
          disabled={isPending}
          className="w-20 px-1.5 py-0.5 text-xs border-0 border-b border-border bg-transparent focus:outline-none focus:border-primary placeholder:text-muted-foreground/50"
        />
        {isPending && <Loader2 className="h-3 w-3 animate-spin ml-1 text-muted-foreground" />}
      </div>
    </div>
  );
}
