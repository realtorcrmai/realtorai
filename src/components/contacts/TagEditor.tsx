"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ChevronDown } from "lucide-react";
import { updateContact } from "@/actions/contacts";
import { CONTACT_TAG_GROUPS } from "@/lib/constants/contacts";
import type { Json } from "@/types/database";

const TAG_COLORS: Record<string, string> = {
  // Priority
  vip: "bg-amber-100 text-amber-800",
  "hot lead": "bg-red-100 text-red-800",
  "warm lead": "bg-orange-100 text-orange-800",
  "cold lead": "bg-sky-100 text-sky-800",
  // Buyer
  "first-time buyer": "bg-blue-100 text-blue-800",
  "pre-approved": "bg-emerald-100 text-emerald-800",
  investor: "bg-violet-100 text-violet-800",
  downsizer: "bg-teal-100 text-teal-800",
  upsizer: "bg-cyan-100 text-cyan-800",
  relocating: "bg-indigo-100 text-indigo-800",
  // Seller
  "listing active": "bg-green-100 text-green-800",
  "listing expired": "bg-gray-100 text-gray-800",
  "listing sold": "bg-emerald-100 text-emerald-800",
  fsbo: "bg-pink-100 text-pink-800",
  // Relationship
  "past client": "bg-purple-100 text-purple-800",
  referral: "bg-teal-100 text-teal-800",
  "sphere of influence": "bg-indigo-100 text-indigo-800",
  "repeat client": "bg-violet-100 text-violet-800",
  // Status
  "under contract": "bg-orange-100 text-orange-800",
  "closing soon": "bg-amber-100 text-amber-800",
  "on hold": "bg-gray-100 text-gray-700",
  "do not contact": "bg-red-100 text-red-800",
  // Source
  "open house lead": "bg-lime-100 text-lime-800",
  "online lead": "bg-blue-100 text-blue-800",
  "sign call": "bg-cyan-100 text-cyan-800",
};

// Fallback colors for custom tags
const FALLBACK_COLORS = [
  "bg-blue-100 text-blue-800",
  "bg-green-100 text-green-800",
  "bg-amber-100 text-amber-800",
  "bg-pink-100 text-pink-800",
  "bg-violet-100 text-violet-800",
  "bg-teal-100 text-teal-800",
  "bg-red-100 text-red-800",
  "bg-indigo-100 text-indigo-800",
];

function getTagColor(tag: string): string {
  if (TAG_COLORS[tag]) return TAG_COLORS[tag];
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  }
  return FALLBACK_COLORS[Math.abs(hash) % FALLBACK_COLORS.length];
}

export function TagEditor({
  contactId,
  tags,
}: {
  contactId: string;
  tags: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function saveTags(newTags: string[]) {
    startTransition(async () => {
      await updateContact(contactId, {
        tags: newTags as unknown as Json,
      });
      router.refresh();
    });
  }

  function addTag(tag: string) {
    const normalized = tag.trim().toLowerCase();
    if (!normalized || tags.includes(normalized)) return;
    // Only one tag at a time — replace existing
    saveTags([normalized]);
    setSearch("");
    setIsOpen(false);
  }

  function removeTag(tag: string) {
    saveTags(tags.filter((t) => t !== tag));
  }

  // Filter available tags (not yet added) by search
  const availableTags: Record<string, string[]> = {};
  for (const [group, groupTags] of Object.entries(CONTACT_TAG_GROUPS)) {
    const filtered = groupTags.filter(
      (t) =>
        !tags.includes(t) &&
        t.toLowerCase().includes(search.toLowerCase())
    );
    if (filtered.length > 0) {
      availableTags[group] = filtered;
    }
  }

  const hasResults = Object.keys(availableTags).length > 0;
  const showCustomOption =
    search.trim() &&
    !Object.values(CONTACT_TAG_GROUPS)
      .flat()
      .includes(search.trim().toLowerCase()) &&
    !tags.includes(search.trim().toLowerCase());

  return (
    <div className="space-y-2">
      {/* Existing tags */}
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${getTagColor(tag)}`}
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeTag(tag); }}
              disabled={isPending}
              className="hover:opacity-70 transition-opacity p-0.5 -mr-0.5 rounded-full hover:bg-black/10"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {isPending && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Dropdown trigger */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-muted-foreground rounded-md border border-dashed border-border hover:border-primary hover:text-foreground transition-colors"
        >
          + Add tag
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-[200] mt-1 w-64 bg-white rounded-lg border border-border shadow-xl overflow-hidden">
            {/* Search input */}
            <div className="p-2 border-b border-border">
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && showCustomOption) {
                    e.preventDefault();
                    addTag(search);
                    setIsOpen(false);
                  }
                  if (e.key === "Escape") {
                    setIsOpen(false);
                    setSearch("");
                  }
                }}
                placeholder="Search or type custom tag..."
                className="w-full px-2 py-1.5 text-xs bg-gray-50 rounded-md border-0 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/60"
              />
            </div>

            {/* Grouped tag list */}
            <div className="max-h-60 overflow-y-auto py-1">
              {hasResults ? (
                Object.entries(availableTags).map(([group, groupTags]) => (
                  <div key={group}>
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {group}
                    </div>
                    {groupTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          addTag(tag);
                        }}
                        disabled={isPending}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 flex items-center gap-2 transition-colors"
                      >
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${getTagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      </button>
                    ))}
                  </div>
                ))
              ) : !showCustomOption ? (
                <div className="px-3 py-4 text-xs text-center text-muted-foreground">
                  All tags already added
                </div>
              ) : null}

              {/* Custom tag option */}
              {showCustomOption && (
                <button
                  type="button"
                  onClick={() => {
                    addTag(search);
                    setIsOpen(false);
                  }}
                  disabled={isPending}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50 border-t border-border flex items-center gap-2"
                >
                  <span className="text-muted-foreground">Create:</span>
                  <span className="font-medium text-foreground">
                    &quot;{search.trim().toLowerCase()}&quot;
                  </span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
