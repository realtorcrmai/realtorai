"use client";

import { useState, useTransition } from "react";
import { UserPlus, ArrowRight, Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { createReferral, updateReferral, deleteReferral } from "@/actions/referrals";

// Referral row shape from the server (with joined contact/listing)
export type ReferralRow = {
  id: string;
  referred_by_contact_id: string;
  referred_client_contact_id: string;
  referral_type: "buyer" | "seller" | "rental" | "other";
  referral_date: string;
  referral_fee_percent: number | null;
  status: "open" | "accepted" | "closed" | "lost";
  closed_deal_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (one or the other depending on query direction)
  referred_client?: { id: string; name: string; type: string } | null;
  referrer?: { id: string; name: string; type: string } | null;
  closed_deal?: { id: string; address: string } | null;
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  accepted: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  lost: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const TYPE_STYLES: Record<string, string> = {
  buyer: "bg-blue-100 text-blue-800",
  seller: "bg-purple-100 text-purple-800",
  rental: "bg-amber-100 text-amber-800",
  other: "bg-gray-100 text-gray-800",
};

export function ReferralsPanel({
  contact,
  referredByName,
  referralsAsReferrer,
  referralsAsReferred,
  allContacts,
}: {
  contact: { id: string; name: string; referred_by_id?: string | null };
  referredByName?: string | null;
  referralsAsReferrer: ReferralRow[];
  referralsAsReferred: ReferralRow[];
  allContacts: { id: string; name: string }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<string>("");
  const [editFee, setEditFee] = useState<string>("");
  const [editNotes, setEditNotes] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  // New referral form state
  const [newClientId, setNewClientId] = useState("");
  const [newType, setNewType] = useState<"buyer" | "seller" | "rental" | "other">("buyer");
  const [newFee, setNewFee] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const handleCreate = () => {
    if (!newClientId) return;
    startTransition(async () => {
      await createReferral({
        referred_by_contact_id: contact.id,
        referred_client_contact_id: newClientId,
        referral_type: newType,
        referral_fee_percent: newFee ? parseFloat(newFee) : null,
        notes: newNotes || undefined,
      });
      setShowForm(false);
      setNewClientId("");
      setNewType("buyer");
      setNewFee("");
      setNewNotes("");
    });
  };

  const handleStartEdit = (r: ReferralRow) => {
    setEditingId(r.id);
    setEditStatus(r.status);
    setEditFee(r.referral_fee_percent?.toString() ?? "");
    setEditNotes(r.notes ?? "");
  };

  const handleSaveEdit = (referralId: string) => {
    startTransition(async () => {
      await updateReferral(referralId, contact.id, {
        status: editStatus as "open" | "accepted" | "closed" | "lost",
        referral_fee_percent: editFee ? parseFloat(editFee) : null,
        notes: editNotes || null,
      });
      setEditingId(null);
    });
  };

  const handleDelete = (referralId: string) => {
    startTransition(async () => {
      await deleteReferral(referralId, contact.id);
    });
  };

  const renderReferralCard = (r: ReferralRow, direction: "outgoing" | "incoming") => {
    const linkedContact =
      direction === "outgoing" ? r.referred_client : r.referrer;
    const isEditing = editingId === r.id;

    return (
      <div
        key={r.id}
        className="p-3 rounded-lg border border-border/50 space-y-2"
      >
        {isEditing ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Link
                href={`/contacts/${linkedContact?.id}`}
                className="text-sm font-medium text-primary hover:underline"
              >
                {linkedContact?.name ?? "Unknown"}
              </Link>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => handleSaveEdit(r.id)}
                  disabled={isPending}
                >
                  <Check className="h-3.5 w-3.5 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setEditingId(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
              >
                <option value="open">Open</option>
                <option value="accepted">Accepted</option>
                <option value="closed">Closed</option>
                <option value="lost">Lost</option>
              </select>
              <input
                type="number"
                step="0.5"
                placeholder="Fee %"
                value={editFee}
                onChange={(e) => setEditFee(e.target.value)}
                className="text-xs border rounded px-2 py-1 bg-background"
              />
            </div>
            <textarea
              placeholder="Notes..."
              value={editNotes}
              onChange={(e) => setEditNotes(e.target.value)}
              className="w-full text-xs border rounded px-2 py-1 bg-background resize-none"
              rows={2}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <Link
                href={`/contacts/${linkedContact?.id}`}
                className="text-sm font-medium hover:text-primary transition-colors"
              >
                {linkedContact?.name ?? "Unknown"}
              </Link>
              <div className="flex items-center gap-1">
                <Badge
                  variant="secondary"
                  className={`text-[10px] capitalize ${STATUS_STYLES[r.status] ?? ""}`}
                >
                  {r.status}
                </Badge>
                <Badge
                  variant="secondary"
                  className={`text-[10px] capitalize ${TYPE_STYLES[r.referral_type] ?? ""}`}
                >
                  {r.referral_type}
                </Badge>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {r.referral_date
                  ? new Date(r.referral_date + "T00:00:00").toLocaleDateString("en-CA", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : ""}
                {r.referral_fee_percent != null && (
                  <span className="ml-2 font-medium text-foreground">
                    {r.referral_fee_percent}% fee
                  </span>
                )}
              </span>
              <div className="flex gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => handleStartEdit(r)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  onClick={() => handleDelete(r.id)}
                  disabled={isPending}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            {r.notes && (
              <p className="text-xs text-muted-foreground italic">{r.notes}</p>
            )}
            {r.closed_deal && (
              <p className="text-xs text-muted-foreground">
                Deal: {r.closed_deal.address}
              </p>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <UserPlus className="h-4 w-4" />
          Referrals
        </h3>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? (
            <>
              <X className="h-3.5 w-3.5 mr-1.5" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Referral
            </>
          )}
        </Button>
      </div>

      {/* New Referral Form */}
      {showForm && (
        <div className="p-3 rounded-lg border border-primary/20 bg-primary/5 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            New referral from {contact.name}:
          </p>
          <select
            value={newClientId}
            onChange={(e) => setNewClientId(e.target.value)}
            className="w-full text-sm border rounded px-2 py-1.5 bg-background"
          >
            <option value="">Select referred client...</option>
            {allContacts
              .filter((c) => c.id !== contact.id)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <select
              value={newType}
              onChange={(e) =>
                setNewType(e.target.value as "buyer" | "seller" | "rental" | "other")
              }
              className="text-xs border rounded px-2 py-1.5 bg-background"
            >
              <option value="buyer">Buyer</option>
              <option value="seller">Seller</option>
              <option value="rental">Rental</option>
              <option value="other">Other</option>
            </select>
            <input
              type="number"
              step="0.5"
              placeholder="Fee % (optional)"
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              className="text-xs border rounded px-2 py-1.5 bg-background"
            />
          </div>
          <textarea
            placeholder="Notes (optional)..."
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            className="w-full text-xs border rounded px-2 py-1.5 bg-background resize-none"
            rows={2}
          />
          <Button
            size="sm"
            className="w-full text-xs"
            onClick={handleCreate}
            disabled={!newClientId || isPending}
          >
            Create Referral
          </Button>
        </div>
      )}

      {/* Referred-by info */}
      {contact.referred_by_id && referredByName && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
          <span className="text-sm text-muted-foreground">Referred by:</span>
          <Link
            href={`/contacts/${contact.referred_by_id}`}
            className="text-sm text-primary hover:underline font-medium"
          >
            {referredByName}
          </Link>
        </div>
      )}

      {/* Incoming referrals (this contact was referred by someone) */}
      {referralsAsReferred.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            Referred by:
          </p>
          {referralsAsReferred.map((r) => renderReferralCard(r, "incoming"))}
        </div>
      )}

      {/* Outgoing referrals (this contact referred others) */}
      {referralsAsReferrer.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            Clients referred by {contact.name}:
          </p>
          {referralsAsReferrer.map((r) => renderReferralCard(r, "outgoing"))}
        </div>
      )}

      {/* Empty state */}
      {referralsAsReferrer.length === 0 &&
        referralsAsReferred.length === 0 &&
        !contact.referred_by_id && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No referral connections yet.
          </p>
        )}
    </div>
  );
}
