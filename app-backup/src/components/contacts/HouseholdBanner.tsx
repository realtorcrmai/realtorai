"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  createHousehold,
  addContactToHousehold,
  removeContactFromHousehold,
} from "@/actions/households";
import type { Household } from "@/types";

interface HouseholdBannerProps {
  contactId: string;
  household: Household | null;
  householdMembers: { id: string; name: string; type: string }[];
  allHouseholds: { id: string; name: string }[];
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const AVATAR_GRADIENTS = [
  "from-[#4f35d2] to-[#ff5c3a]",
  "from-[#4f35d2] to-[#9b59b6]",
  "from-[#00bfa5] to-[#4f35d2]",
  "from-[#ff5c3a] to-[#f39c12]",
  "from-[#6c5ce7] to-[#00bfa5]",
];

export function HouseholdBanner({
  contactId,
  household,
  householdMembers,
  allHouseholds,
}: HouseholdBannerProps) {
  const [mode, setMode] = useState<"idle" | "create" | "join">("idle");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedHouseholdId, setSelectedHouseholdId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleCreate() {
    if (!name.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await createHousehold({
        name: name.trim(),
        address: address.trim() || undefined,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data?.id) {
        const addResult = await addContactToHousehold(contactId, result.data.id);
        if (addResult.error) {
          setError(addResult.error);
          return;
        }
      }
      setMode("idle");
      setName("");
      setAddress("");
      router.refresh();
    });
  }

  function handleJoin() {
    if (!selectedHouseholdId) return;
    setError(null);
    startTransition(async () => {
      const result = await addContactToHousehold(contactId, selectedHouseholdId);
      if (result.error) {
        setError(result.error);
        return;
      }
      setMode("idle");
      setSelectedHouseholdId("");
      router.refresh();
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await removeContactFromHousehold(contactId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  // Assigned state — gradient banner
  if (household) {
    return (
      <div className="rounded-xl overflow-hidden bg-gradient-to-r from-[#4f35d2] to-[#6c5ce7] p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏡</span>
            <div>
              <h4 className="text-white font-semibold text-sm leading-tight">
                {household.name}
              </h4>
              {household.address && (
                <p className="text-white/70 text-xs mt-0.5">{household.address}</p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            className="px-2.5 py-1 text-[11px] font-medium text-white/80 border border-white/30 rounded-md hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Remove"
            )}
          </button>
        </div>

        {householdMembers.length > 0 && (
          <div className="flex items-center gap-2 mt-3">
            <div className="flex -space-x-2">
              {householdMembers.map((member, i) => (
                <Link
                  key={member.id}
                  href={`/contacts/${member.id}`}
                  title={member.name}
                  className={`relative inline-flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br ${
                    AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
                  } text-white text-[11px] font-bold ring-2 ring-[#4f35d2] hover:ring-white/60 transition-all hover:scale-110 hover:z-10`}
                >
                  {getInitials(member.name)}
                </Link>
              ))}
            </div>
            <span className="text-white/60 text-xs ml-1">
              {householdMembers.length} member{householdMembers.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {error && (
          <p className="text-red-200 text-xs mt-2">{error}</p>
        )}
      </div>
    );
  }

  // Unassigned state — outlined card
  return (
    <div className="rounded-xl border border-border/60 border-dashed p-4">
      {mode === "idle" && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            No household assigned
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setMode("create")}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#4f35d2] rounded-md hover:bg-[#4f35d2]/90 transition-colors"
            >
              Create New
            </button>
            {allHouseholds.length > 0 && (
              <button
                type="button"
                onClick={() => setMode("join")}
                className="px-3 py-1.5 text-xs font-medium text-muted-foreground border border-border rounded-md hover:border-[#4f35d2]/50 hover:text-[#4f35d2] transition-colors"
              >
                Join Existing
              </button>
            )}
          </div>
        </div>
      )}

      {mode === "create" && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Create Household
          </p>
          <div>
            <input
              type="text"
              placeholder="Household name (e.g. The Smiths)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-[#4f35d2]"
              disabled={isPending}
              autoFocus
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Address (optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCreate();
                }
              }}
              className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-[#4f35d2]"
              disabled={isPending}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCreate}
              disabled={isPending || !name.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#4f35d2] rounded-md hover:bg-[#4f35d2]/90 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Create & Assign
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("idle");
                setName("");
                setAddress("");
                setError(null);
              }}
              disabled={isPending}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "join" && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Join Existing Household
          </p>
          <select
            value={selectedHouseholdId}
            onChange={(e) => setSelectedHouseholdId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-[#4f35d2]"
            disabled={isPending}
            autoFocus
          >
            <option value="">Select a household...</option>
            {allHouseholds.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleJoin}
              disabled={isPending || !selectedHouseholdId}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#4f35d2] rounded-md hover:bg-[#4f35d2]/90 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              Join Household
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("idle");
                setSelectedHouseholdId("");
                setError(null);
              }}
              disabled={isPending}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
