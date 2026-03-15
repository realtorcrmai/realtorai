"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, X } from "lucide-react";
import {
  BUYER_STAGES,
  SELLER_STAGES,
  STAGE_LABELS,
} from "@/lib/constants/pipeline";
import type { Contact, Listing } from "@/types";

interface DealFormDialogProps {
  contacts: Contact[];
  listings: Listing[];
  onCreated: () => void;
}

export function DealFormDialog({
  contacts,
  listings,
  onCreated,
}: DealFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dealType, setDealType] = useState<"buyer" | "seller">("buyer");

  const stages = dealType === "buyer" ? BUYER_STAGES : SELLER_STAGES;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const body = {
      title: fd.get("title") as string,
      type: dealType,
      stage: fd.get("stage") as string,
      contact_id: (fd.get("contact_id") as string) || null,
      listing_id: (fd.get("listing_id") as string) || null,
      value: fd.get("value") ? Number(fd.get("value")) : null,
      commission_pct: fd.get("commission_pct")
        ? Number(fd.get("commission_pct"))
        : null,
      close_date: (fd.get("close_date") as string) || null,
      notes: (fd.get("notes") as string) || null,
      create_checklist: true,
    };

    try {
      const res = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setOpen(false);
        onCreated();
      }
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="gap-2">
        <Plus className="h-4 w-4" />
        New Deal
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-8">
      <Card className="w-full max-w-lg mx-4 shadow-xl animate-float-in">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg">Create New Deal</CardTitle>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="text-sm font-medium">Deal Title *</label>
              <input
                name="title"
                required
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
                placeholder="e.g. 123 Main St - Smith Purchase"
              />
            </div>

            {/* Type Toggle */}
            <div>
              <label className="text-sm font-medium">Deal Type *</label>
              <div className="flex gap-2 mt-1">
                {(["buyer", "seller"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setDealType(t)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors capitalize ${
                      dealType === t
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-input hover:bg-accent"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Stage */}
            <div>
              <label className="text-sm font-medium">Stage</label>
              <select
                name="stage"
                defaultValue={stages[0]}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
              >
                {stages.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Contact */}
            <div>
              <label className="text-sm font-medium">Contact</label>
              <select
                name="contact_id"
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
              >
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Listing */}
            <div>
              <label className="text-sm font-medium">Listing</label>
              <select
                name="listing_id"
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
              >
                <option value="">None</option>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.address}
                  </option>
                ))}
              </select>
            </div>

            {/* Value + Commission */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Deal Value ($)</label>
                <input
                  name="value"
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
                  placeholder="500000"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Commission (%)</label>
                <input
                  name="commission_pct"
                  type="number"
                  step="0.01"
                  className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
                  placeholder="2.5"
                />
              </div>
            </div>

            {/* Close Date */}
            <div>
              <label className="text-sm font-medium">Expected Close Date</label>
              <input
                name="close_date"
                type="date"
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium">Notes</label>
              <textarea
                name="notes"
                rows={2}
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background resize-none"
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Deal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
