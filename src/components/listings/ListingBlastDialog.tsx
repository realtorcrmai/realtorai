"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Users, Plus, X, Check, Loader2 } from "lucide-react";

type Listing = {
  id: string;
  address: string;
  list_price: number | null;
  status: string;
};

type Props = {
  listing: Listing;
  onClose?: () => void;
  onSent?: (result: { sent: number; failed: number }) => void;
};

export function ListingBlastDialog({ listing, onClose, onSent }: Props) {
  const [mode, setMode] = useState<"all" | "custom">("all");
  const [customEmails, setCustomEmails] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const price = listing.list_price
    ? `$${Number(listing.list_price).toLocaleString()}`
    : "Price TBD";

  async function handleSend() {
    setSending(true);
    setError(null);

    try {
      const body: Record<string, unknown> = {
        listingId: listing.id,
        customMessage: customMessage || undefined,
      };

      if (mode === "all") {
        body.sendToAllAgents = true;
      }

      if (mode === "custom" || customEmails.trim()) {
        const emails = customEmails
          .split(/[,\n;]+/)
          .map((e) => e.trim())
          .filter((e) => e.includes("@"));
        body.recipientEmails = emails;
      }

      const res = await fetch("/api/listings/blast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ sent: data.sent, failed: data.failed });
        onSent?.(data);
      } else {
        setError(data.error || "Failed to send blast");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send");
    }

    setSending(false);
  }

  // Success state
  if (result) {
    return (
      <Card className="border-[#0F7694]/20">
        <CardContent className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-[#0F7694]/10 flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-[#0F7694]" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Blast Sent!</h3>
          <p className="text-sm text-muted-foreground mb-3">
            {result.sent} email{result.sent !== 1 ? "s" : ""} delivered
            {result.failed > 0 && ` · ${result.failed} failed`}
          </p>
          <p className="text-xs text-muted-foreground">{listing.address} — {price}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onClose}>
            Done
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold">Blast to Agents</h3>
            <p className="text-xs text-muted-foreground">{listing.address} — {price}</p>
          </div>
          {onClose && (
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Recipients */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Recipients</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => setMode("all")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
                mode === "all"
                  ? "bg-primary text-white border-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              All agents in CRM
            </button>
            <button
              onClick={() => setMode("custom")}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border transition-all ${
                mode === "custom"
                  ? "bg-primary text-white border-primary"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Custom list
            </button>
          </div>

          {mode === "custom" && (
            <textarea
              value={customEmails}
              onChange={(e) => setCustomEmails(e.target.value)}
              placeholder="agent1@remax.com, agent2@kw.com&#10;agent3@royallepage.com"
              className="w-full text-sm border border-border rounded-lg p-3 bg-background min-h-[80px] resize-y"
            />
          )}

          {mode === "all" && (
            <div className="bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                Will send to all contacts with type &quot;agent&quot; or &quot;partner&quot; who have an email address.
              </p>
              <textarea
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
                placeholder="+ Add extra emails (optional, one per line)"
                className="w-full text-xs border border-border rounded p-2 bg-background mt-2 min-h-[40px] resize-y"
              />
            </div>
          )}
        </div>

        {/* Custom message */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-1 block">Personal note (optional)</label>
          <textarea
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            placeholder="I'm pleased to present my new listing..."
            className="w-full text-sm border border-border rounded-lg p-3 bg-background min-h-[60px] resize-y"
          />
        </div>

        {/* Preview badge */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="outline" className="text-xs">
            Subject: NEW LISTING: {listing.address} — {price}
          </Badge>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {/* Send */}
        <Button
          onClick={handleSend}
          disabled={sending}
          className="w-full gap-2"
        >
          {sending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
          ) : (
            <><Send className="w-4 h-4" /> Send Listing Blast</>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
