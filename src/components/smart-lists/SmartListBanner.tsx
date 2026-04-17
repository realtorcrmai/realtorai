"use client";

import { useState } from "react";
import { SmartListBuilder } from "@/components/smart-lists/SmartListBuilder";
import type { SmartList } from "@/types/smart-lists";
import Link from "next/link";

export function SmartListBanner({ smartList, count }: { smartList: SmartList; count: number }) {
  const [editing, setEditing] = useState(false);

  return (
    <>
      <div className="mx-6 mb-4 flex items-center gap-3 px-4 py-2.5 rounded-lg bg-brand/5 border border-brand/20">
        <span className="text-lg">{smartList.icon}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-foreground">{smartList.name}</span>
          <span className="ml-2 text-xs text-muted-foreground">{count} results</span>
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-brand hover:text-brand-dark font-medium transition-colors"
        >
          Edit
        </button>
        <Link
          href={`/${smartList.entity_type === "showings" ? "showings" : smartList.entity_type}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Clear
        </Link>
      </div>
      <SmartListBuilder
        open={editing}
        onOpenChange={setEditing}
        editingList={smartList}
      />
    </>
  );
}
