"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { DataScope } from "@/types/team";

interface TeamScopeToggleProps {
  userId: string;
  teamRole: string;
}

/**
 * Global scope toggle: "My View" vs "Team View"
 * Only renders for users who are on a team.
 * Persists selection in localStorage.
 *
 * Owner/Admin default to "Team View".
 * Agent/Assistant default to "My View".
 */
export function TeamScopeToggle({ userId, teamRole }: TeamScopeToggleProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentSearchParams = useSearchParams();

  const storageKey = `r360_scope_${userId}`;
  const defaultScope: DataScope =
    teamRole === "owner" || teamRole === "admin" ? "team" : "personal";

  const [scope, setScope] = useState<DataScope>(defaultScope);

  useEffect(() => {
    // Priority: URL param > localStorage > default
    const urlScope = currentSearchParams.get("scope");
    if (urlScope === "team" || urlScope === "personal") {
      setScope(urlScope);
      localStorage.setItem(storageKey, urlScope);
    } else {
      const stored = localStorage.getItem(storageKey);
      if (stored === "team" || stored === "personal") {
        setScope(stored);
      }
    }
  }, [storageKey, currentSearchParams]);

  const handleToggle = (newScope: DataScope) => {
    setScope(newScope);
    localStorage.setItem(storageKey, newScope);
    // Dispatch custom event for client components
    window.dispatchEvent(new CustomEvent("team-scope-change", { detail: { scope: newScope } }));
    // Update URL so server components can read scope
    const params = new URLSearchParams(currentSearchParams.toString());
    if (newScope === "personal") {
      params.delete("scope");
    } else {
      params.set("scope", newScope);
    }
    const qs = params.toString();
    router.push(`${pathname}${qs ? `?${qs}` : ""}`);
  };

  return (
    <div
      className="inline-flex items-center rounded-md border border-border bg-muted p-0.5 text-xs"
      role="radiogroup"
      aria-label="Data scope toggle"
    >
      <button
        role="radio"
        aria-checked={scope === "personal"}
        onClick={() => handleToggle("personal")}
        className={`px-2.5 py-1 rounded transition-colors ${
          scope === "personal"
            ? "bg-card text-foreground shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        My View
      </button>
      <button
        role="radio"
        aria-checked={scope === "team"}
        onClick={() => handleToggle("team")}
        className={`px-2.5 py-1 rounded transition-colors ${
          scope === "team"
            ? "bg-card text-foreground shadow-sm font-medium"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        Team View
      </button>
    </div>
  );
}

/**
 * Hook to read current scope from localStorage.
 * Use in client components that need the scope value.
 */
export function useTeamScope(userId: string, teamRole: string): DataScope {
  const defaultScope: DataScope =
    teamRole === "owner" || teamRole === "admin" ? "team" : "personal";

  const [scope, setScope] = useState<DataScope>(defaultScope);

  useEffect(() => {
    const storageKey = `r360_scope_${userId}`;
    const stored = localStorage.getItem(storageKey);
    if (stored === "team" || stored === "personal") {
      setScope(stored);
    }

    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.scope) setScope(detail.scope);
    };

    window.addEventListener("team-scope-change", handler);
    return () => window.removeEventListener("team-scope-change", handler);
  }, [userId]);

  return scope;
}
