"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ListingBlastDialog } from "@/components/listings/ListingBlastDialog";

type Listing = {
  id: string;
  address: string;
  list_price: number | null;
  status: string;
};

type Props = {
  listings: Listing[];
};

const TEMPLATES = [
  { emoji: "📧", name: "Welcome", rate: "67%" },
  { emoji: "🏠", name: "Listing Alert", rate: "83%" },
  { emoji: "📊", name: "Market Update", rate: "31%" },
  { emoji: "🎉", name: "Just Sold", rate: "72%" },
  { emoji: "🏡", name: "Open House", rate: "75%" },
  { emoji: "🗺️", name: "Area Guide", rate: "45%" },
  { emoji: "🎂", name: "Anniversary", rate: "68%" },
  { emoji: "✨", name: "Luxury Showcase", rate: "—" },
];

export function CampaignsTab({ listings }: Props) {
  const [blastingId, setBlastingId] = useState<string | null>(null);
  const [sentListings, setSentListings] = useState<Set<string>>(new Set());

  const blastingListing = listings.find((l) => l.id === blastingId);

  return (
    <div className="space-y-6">
      {/* Templates */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Email Templates</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {TEMPLATES.map((t) => (
            <Card key={t.name} className="cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-2">{t.emoji}</div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.rate} open rate</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Listing Blasts */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Listing Blasts</h3>
          <p className="text-xs text-muted-foreground">Send announcements to all agents</p>
        </div>

        {/* Blast dialog if active */}
        {blastingListing && (
          <div className="mb-4">
            <ListingBlastDialog
              listing={blastingListing}
              onClose={() => setBlastingId(null)}
              onSent={(result) => {
                setSentListings((prev) => new Set([...prev, blastingId!]));
                // Auto-close after 3 seconds
                setTimeout(() => setBlastingId(null), 3000);
              }}
            />
          </div>
        )}

        {listings.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground text-sm">
              No active listings. Create a listing to blast to agents.
            </CardContent>
          </Card>
        ) : (
          listings.map((l) => (
            <Card key={l.id} className="mb-2">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{l.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {l.list_price ? `$${Number(l.list_price).toLocaleString()}` : "Price TBD"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sentListings.has(l.id) && (
                      <span className="text-xs text-emerald-600 font-medium">✓ Sent</span>
                    )}
                    <button
                      onClick={() => setBlastingId(blastingId === l.id ? null : l.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        blastingId === l.id
                          ? "bg-muted text-muted-foreground"
                          : "bg-primary text-white hover:bg-primary/90"
                      }`}
                    >
                      {blastingId === l.id ? "Cancel" : "📧 Send Blast"}
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
