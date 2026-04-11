"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Search, LogOut } from "lucide-react";
import { QuickAddButton } from "@/components/layout/QuickAddButton";

export function MondayHeader() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const initials = userName.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="flex items-center h-12 px-4 gap-3 shrink-0 bg-white border-b border-[#d0d4e4]">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 shrink-0">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </div>
        <span className="text-sm font-semibold text-[#323338]">Realtors360</span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Quick add */}
      <QuickAddButton />

      {/* Search — opens command palette */}
      <button
        onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
        className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[rgba(103,104,121,0.1)] text-[#676879] transition-colors"
        aria-label="Search (⌘K)"
      >
        <Search className="h-4 w-4" />
        <span className="hidden md:inline text-xs text-muted-foreground font-mono border border-border rounded px-1 py-0.5">⌘K</span>
      </button>

      {/* Notifications and Help removed — no functionality attached */}

      {/* User avatar */}
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="p-1.5 rounded hover:bg-[rgba(103,104,121,0.1)] text-[#676879] transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
