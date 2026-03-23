"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Plus,
  X,
  Loader2,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { updateContact } from "@/actions/contacts";
import type { BuyerPreferences, PropertyOfInterest, Listing } from "@/types";
import type { Json } from "@/types/database";

export function PropertiesOfInterestPanel({
  contactId,
  preferences,
  listings,
}: {
  contactId: string;
  preferences: BuyerPreferences | null;
  listings: { id: string; address: string; list_price: number | null }[];
}) {
  const properties = preferences?.properties_of_interest ?? [];
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState<"listing" | "manual">("listing");
  const [selectedListingId, setSelectedListingId] = useState("");
  const [address, setAddress] = useState("");
  const [price, setPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function saveProperties(newProperties: PropertyOfInterest[]) {
    const updatedPrefs = {
      ...(preferences ?? {}),
      properties_of_interest: newProperties,
    };
    startTransition(async () => {
      await updateContact(contactId, {
        buyer_preferences: updatedPrefs as any,
      });
      router.refresh();
    });
  }

  function handleAdd() {
    let newProp: PropertyOfInterest;
    if (mode === "listing" && selectedListingId) {
      const listing = listings.find((l) => l.id === selectedListingId);
      if (!listing) return;
      newProp = {
        id: crypto.randomUUID(),
        listing_id: listing.id,
        address: listing.address,
        price: listing.list_price ?? undefined,
        notes: notes || undefined,
        added_at: new Date().toISOString(),
      };
    } else if (mode === "manual" && address.trim()) {
      newProp = {
        id: crypto.randomUUID(),
        address: address.trim(),
        price: price ? Number(price) : undefined,
        notes: notes || undefined,
        added_at: new Date().toISOString(),
      };
    } else {
      return;
    }

    saveProperties([...properties, newProp]);
    setSelectedListingId("");
    setAddress("");
    setPrice("");
    setNotes("");
    setShowAdd(false);
  }

  function handleRemove(propId: string) {
    saveProperties(properties.filter((p) => p.id !== propId));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MapPin className="h-5 w-5 text-muted-foreground" />
          Properties of Interest
          {properties.length > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
              {properties.length}
            </span>
          )}
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAdd(!showAdd)}
          className="text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Property
        </Button>
      </div>

      {/* Add form */}
      {showAdd && (
        <div className="p-4 rounded-lg border border-border bg-background space-y-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("listing")}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                mode === "listing"
                  ? "bg-primary text-white border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              From Listings
            </button>
            <button
              type="button"
              onClick={() => setMode("manual")}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                mode === "manual"
                  ? "bg-primary text-white border-primary"
                  : "bg-background text-muted-foreground border-border hover:border-primary/50"
              }`}
            >
              Manual Entry
            </button>
          </div>

          {mode === "listing" ? (
            <select
              value={selectedListingId}
              onChange={(e) => setSelectedListingId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              disabled={isPending}
            >
              <option value="">Select a listing...</option>
              {listings
                .filter(
                  (l) => !properties.some((p) => p.listing_id === l.id)
                )
                .map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.address}
                    {l.list_price
                      ? ` — ${Number(l.list_price).toLocaleString("en-CA", {
                          style: "currency",
                          currency: "CAD",
                          maximumFractionDigits: 0,
                        })}`
                      : ""}
                  </option>
                ))}
            </select>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Property address..."
                  className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  disabled={isPending}
                />
              </div>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="Price (optional)"
                className="px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={isPending}
              />
            </div>
          )}

          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notes (optional)..."
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={
                isPending ||
                (mode === "listing" ? !selectedListingId : !address.trim())
              }
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Plus className="h-4 w-4 mr-1.5" />
              )}
              Add
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAdd(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Property cards */}
      {properties.length > 0 && (
        <div className="space-y-2">
          {properties.map((prop) => (
            <div
              key={prop.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{prop.address}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {prop.price && (
                    <span className="text-xs font-medium text-primary">
                      {Number(prop.price).toLocaleString("en-CA", {
                        style: "currency",
                        currency: "CAD",
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  )}
                  {prop.notes && (
                    <span className="text-xs text-muted-foreground">
                      {prop.notes}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                {prop.listing_id && (
                  <a
                    href={`/listings/${prop.listing_id}`}
                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(prop.id)}
                  disabled={isPending}
                  className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {properties.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground text-center py-6">
          No properties tracked yet.
        </p>
      )}
    </div>
  );
}
