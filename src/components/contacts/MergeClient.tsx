"use client";

import { useState } from "react";
import { mergeContacts } from "@/actions/contact-merge";
import { Badge } from "@/components/ui/badge";

interface DuplicateGroup {
  matchType: string;
  matchValue: string;
  contacts: {
    id: string;
    name: string;
    email: string | null;
    phone: string;
    type: string;
    created_at: string;
    stage_bar: string | null;
    lead_status: string | null;
  }[];
}

export function MergeClient({ duplicates }: { duplicates: DuplicateGroup[] }) {
  const [merging, setMerging] = useState<string | null>(null);
  const [merged, setMerged] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  async function handleMerge(primaryId: string, secondaryId: string, groupKey: string) {
    setMerging(groupKey);
    setError(null);
    try {
      const result = await mergeContacts(primaryId, secondaryId);
      if ("error" in result) {
        setError(result.error ?? "Merge failed");
      } else {
        setMerged((prev) => new Set(prev).add(groupKey));
      }
    } catch {
      setError("Merge failed");
    }
    setMerging(null);
  }

  const remaining = duplicates.filter(
    (d) => !merged.has(`${d.matchType}:${d.matchValue}`)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {remaining.length} duplicate group{remaining.length !== 1 ? "s" : ""} found
        </p>
        <a
          href="/contacts"
          className="text-sm text-primary hover:underline"
        >
          &larr; Back to contacts
        </a>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {remaining.map((group) => {
        const groupKey = `${group.matchType}:${group.matchValue}`;
        const isMerging = merging === groupKey;

        return (
          <div
            key={groupKey}
            className="border rounded-xl p-4 bg-card space-y-3"
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs capitalize">
                {group.matchType}
              </Badge>
              <span className="text-sm font-mono text-muted-foreground">
                {group.matchValue}
              </span>
            </div>

            <div className="space-y-2">
              {group.contacts.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-background"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.phone}
                      {c.email ? ` · ${c.email}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      <Badge variant="secondary" className="text-[10px] px-1 py-0 capitalize mr-1">
                        {c.type}
                      </Badge>
                      {c.stage_bar && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 mr-1">
                          {c.stage_bar}
                        </Badge>
                      )}
                      Created {new Date(c.created_at).toLocaleDateString()}
                    </p>
                  </div>

                  {group.contacts.length === 2 && (
                    <button
                      onClick={() => {
                        const other = group.contacts[1 - i];
                        handleMerge(c.id, other.id, groupKey);
                      }}
                      disabled={isMerging}
                      className="shrink-0 text-xs px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                    >
                      {isMerging ? "Merging..." : "Keep this one"}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {group.contacts.length > 2 && (
              <p className="text-xs text-muted-foreground">
                {group.contacts.length} contacts share this {group.matchType}.
                Manual review recommended — open each contact to decide.
              </p>
            )}
          </div>
        );
      })}

      {remaining.length === 0 && merged.size > 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg font-medium">All duplicates merged!</p>
          <a href="/contacts" className="text-sm text-primary hover:underline mt-2 inline-block">
            &larr; Back to contacts
          </a>
        </div>
      )}
    </div>
  );
}
