"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  DollarSign,
  User,
  Building2,
  Calendar,
  Phone,
  Mail,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import {
  STAGE_LABELS,
  STAGE_COLORS,
  DEAL_STATUS_COLORS,
  BUYER_STAGES,
  SELLER_STAGES,
  PARTY_ROLE_LABELS,
  PARTY_ROLES,
} from "@/lib/constants/pipeline";
import type { DealWithRelations, DealParty, DealChecklist, Mortgage, Contact, Listing } from "@/types";
import { MortgageSection } from "./MortgageSection";

interface DealDetailProps {
  deal: DealWithRelations;
  parties: DealParty[];
  checklist: DealChecklist[];
  mortgages: Mortgage[];
  contacts: Contact[];
  listings: Listing[];
}

export function DealDetail({
  deal: initialDeal,
  parties: initialParties,
  checklist: initialChecklist,
  mortgages: initialMortgages,
  contacts,
  listings,
}: DealDetailProps) {
  const router = useRouter();
  const [deal, setDeal] = useState(initialDeal);
  const [parties, setParties] = useState(initialParties);
  const [checklist, setChecklist] = useState(initialChecklist);
  const [saving, setSaving] = useState(false);

  const stages = deal.type === "buyer" ? BUYER_STAGES : SELLER_STAGES;
  const currentStageIndex = stages.indexOf(deal.stage as any);

  async function updateDeal(updates: Record<string, unknown>) {
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setDeal(updated);
      }
    } finally {
      setSaving(false);
    }
  }

  async function toggleChecklistItem(item: DealChecklist) {
    const res = await fetch(`/api/deals/${deal.id}/checklist`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        checklist_id: item.id,
        completed: !item.completed,
      }),
    });
    if (res.ok) {
      const updated = await res.json();
      setChecklist((prev) =>
        prev.map((c) => (c.id === updated.id ? updated : c))
      );
    }
  }

  async function addChecklistItem(itemText: string) {
    const res = await fetch(`/api/deals/${deal.id}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item: itemText, sort_order: checklist.length }),
    });
    if (res.ok) {
      const newItem = await res.json();
      setChecklist((prev) => [...prev, newItem]);
    }
  }

  async function addParty(partyData: { role: string; name: string; phone?: string; email?: string; company?: string }) {
    const res = await fetch(`/api/deals/${deal.id}/parties`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(partyData),
    });
    if (res.ok) {
      const newParty = await res.json();
      setParties((prev) => [...prev, newParty]);
    }
  }

  async function removeParty(partyId: string) {
    const res = await fetch(`/api/deals/${deal.id}/parties?party_id=${partyId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setParties((prev) => prev.filter((p) => p.id !== partyId));
    }
  }

  const completedCount = checklist.filter((c) => c.completed).length;
  const commissionAmount =
    deal.value && deal.commission_pct
      ? Math.round(Number(deal.value) * (Number(deal.commission_pct) / 100) * 100) / 100
      : Number(deal.commission_amount) || 0;

  return (
    <div className="flex h-full">
      {/* Center Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="space-y-6 max-w-4xl">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Link href="/pipeline" className="hover:text-foreground transition-colors flex items-center gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Pipeline
            </Link>
            {deal.contacts && (
              <>
                <span className="text-muted-foreground/40">/</span>
                <Link href={`/contacts/${deal.contacts.id}`} className="hover:text-foreground transition-colors">
                  {deal.contacts.name}
                </Link>
              </>
            )}
            <span className="text-muted-foreground/40">/</span>
            <span className="text-foreground font-medium">{deal.title}</span>
          </nav>

          {/* Header Card */}
          <Card className="animate-float-in">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2 min-w-0">
                  <h1 className="text-2xl font-bold tracking-tight">
                    {deal.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {deal.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`${STAGE_COLORS[deal.stage] ?? ""} border-0`}
                    >
                      {STAGE_LABELS[deal.stage] ?? deal.stage}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`${DEAL_STATUS_COLORS[deal.status] ?? ""} border-0 capitalize`}
                    >
                      {deal.status}
                    </Badge>
                  </div>
                  {deal.contacts && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <Link href={`/contacts/${deal.contacts.id}`} className="hover:text-primary hover:underline transition-colors">
                        {deal.contacts.name}
                      </Link>
                      {deal.contacts.phone && (
                        <>
                          <Phone className="h-3.5 w-3.5 ml-2" />
                          <span>{deal.contacts.phone}</span>
                        </>
                      )}
                    </div>
                  )}
                  {deal.listings && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      <Link href={`/listings/${deal.listings.id}`} className="hover:text-primary hover:underline transition-colors">
                        {deal.listings.address}
                      </Link>
                    </div>
                  )}
                </div>

                {/* Value + Commission */}
                <div className="text-right shrink-0">
                  {deal.value && (
                    <div className="text-2xl font-bold flex items-center gap-1 justify-end">
                      <DollarSign className="h-5 w-5 text-muted-foreground" />
                      {Number(deal.value).toLocaleString("en-CA")}
                    </div>
                  )}
                  {commissionAmount > 0 && (
                    <p className="text-sm text-emerald-600 font-medium mt-1">
                      GCI: ${commissionAmount.toLocaleString("en-CA")}
                      {deal.commission_pct && (
                        <span className="text-muted-foreground ml-1">
                          ({deal.commission_pct}%)
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stage Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Stage Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {stages.map((stage, i) => {
                  const isPast = i < currentStageIndex;
                  const isCurrent = i === currentStageIndex;
                  // A past stage is only fully "done" (blue) if all checklist items are
                  // completed. If any checklist item remains open, past stages show amber
                  // to signal the deal has unresolved work — even if we've moved forward.
                  const hasIncompleteChecklist = checklist.length > 0 && completedCount < checklist.length;
                  const isPastIncomplete = isPast && hasIncompleteChecklist;
                  return (
                    <button
                      key={stage}
                      onClick={() => updateDeal({ stage })}
                      disabled={saving}
                      title={isPastIncomplete ? "Incomplete checklist items remain" : undefined}
                      className={`flex-1 min-w-[80px] px-2 py-2 rounded-lg text-xs font-medium text-center transition-all border ${
                        isCurrent
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : isPastIncomplete
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : isPast
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-muted/50 text-muted-foreground border-border/30 hover:bg-accent"
                      }`}
                    >
                      {STAGE_LABELS[stage]}
                      {isPastIncomplete && <span className="ml-1 opacity-70">⚠</span>}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  Checklist ({completedCount}/{checklist.length})
                </CardTitle>
                <div className="h-2 w-24 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{
                      width: `${checklist.length > 0 ? (completedCount / checklist.length) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {checklist.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggleChecklistItem(item)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-accent/50 transition-colors text-left group"
                  >
                    {item.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground/50 shrink-0 group-hover:text-primary/50" />
                    )}
                    <span
                      className={`text-sm ${
                        item.completed
                          ? "line-through text-muted-foreground"
                          : "text-foreground"
                      }`}
                    >
                      {item.item}
                    </span>
                    {item.due_date && (
                      <span className="ml-auto text-[10px] text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(item.due_date).toLocaleDateString("en-CA")}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Add checklist item */}
              <form
                className="mt-3 flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.elements.namedItem(
                    "newItem"
                  ) as HTMLInputElement;
                  if (input.value.trim()) {
                    addChecklistItem(input.value.trim());
                    input.value = "";
                  }
                }}
              >
                <input
                  name="newItem"
                  placeholder="Add checklist item..."
                  className="flex-1 rounded-lg border border-input px-3 py-2 text-sm bg-background"
                />
                <Button type="submit" size="sm" variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Deal Parties */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Deal Parties</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {parties.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No parties added yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {parties.map((party) => (
                    <div
                      key={party.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/40 group"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{party.name}</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 capitalize">
                            {PARTY_ROLE_LABELS[party.role] ?? party.role}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          {party.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {party.phone}
                            </span>
                          )}
                          {party.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {party.email}
                            </span>
                          )}
                          {party.company && (
                            <span>{party.company}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => removeParty(party.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add party form */}
              <AddPartyForm onAdd={addParty} />
            </CardContent>
          </Card>

          {/* Mortgage Details (buyer deals only) */}
          {deal.type === "buyer" && (
            <MortgageSection
              dealId={deal.id}
              contactId={deal.contact_id}
              mortgages={initialMortgages}
            />
          )}

          {/* Notes */}
          {deal.notes && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{deal.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* What's Next — for closed deals */}
          {(deal.status === "won" || deal.status === "lost") && (
            <Card className="border-blue-100 bg-blue-50/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-blue-700">What&apos;s Next?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2">
                  {deal.contacts && (
                    <Link
                      href={`/contacts/${deal.contacts.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <User className="h-3 w-3" /> View Contact
                    </Link>
                  )}
                  {deal.listings && (
                    <Link
                      href={`/listings/${deal.listings.id}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Building2 className="h-3 w-3" /> View Listing
                    </Link>
                  )}
                  <Link
                    href="/pipeline"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Back to Pipeline
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <aside className="hidden lg:block w-[320px] shrink-0 border-l overflow-y-auto p-6 backdrop-blur-2xl bg-white/80">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
          Deal Actions
        </h3>

        <div className="space-y-3">
          {/* Stage selector */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Stage</label>
            <select
              value={deal.stage}
              onChange={(e) => updateDeal({ stage: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
            >
              {stages.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Status</label>
            <select
              value={deal.status}
              onChange={(e) => updateDeal({ status: e.target.value })}
              className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
            >
              <option value="active">Active</option>
              <option value="won">Won</option>
              <option value="lost">Lost</option>
            </select>
          </div>

          {/* Value */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Deal Value ($)</label>
            <input
              type="number"
              defaultValue={deal.value ?? ""}
              onBlur={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                if (val !== deal.value) updateDeal({ value: val });
              }}
              className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
            />
          </div>

          {/* Commission */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Commission (%)</label>
            <input
              type="number"
              step="0.01"
              defaultValue={deal.commission_pct ?? ""}
              onBlur={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                if (val !== deal.commission_pct)
                  updateDeal({
                    commission_pct: val,
                    value: deal.value,
                  });
              }}
              className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
            />
          </div>

          {/* Close Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Close Date</label>
            <input
              type="date"
              defaultValue={deal.close_date ?? ""}
              onChange={(e) => updateDeal({ close_date: e.target.value || null })}
              className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
            />
          </div>

          {/* Possession Date */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Possession Date</label>
            <input
              type="date"
              defaultValue={deal.possession_date ?? ""}
              onChange={(e) => updateDeal({ possession_date: e.target.value || null })}
              className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
            />
          </div>

          {/* Subject Removal */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Subject Removal Date</label>
            <input
              type="date"
              defaultValue={deal.subject_removal_date ?? ""}
              onChange={(e) => updateDeal({ subject_removal_date: e.target.value || null })}
              className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
            />
          </div>

          {/* Contact */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Contact</label>
            <select
              value={deal.contact_id ?? ""}
              onChange={(e) => updateDeal({ contact_id: e.target.value || null })}
              className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
            >
              <option value="">None</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Listing */}
          <div>
            <label className="text-xs font-medium text-muted-foreground">Listing</label>
            <select
              value={deal.listing_id ?? ""}
              onChange={(e) => updateDeal({ listing_id: e.target.value || null })}
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

          {/* Danger Zone */}
          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full text-destructive hover:bg-destructive/10"
              onClick={async () => {
                if (confirm("Delete this deal? This cannot be undone.")) {
                  await fetch(`/api/deals/${deal.id}`, { method: "DELETE" });
                  router.push("/pipeline");
                }
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Deal
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function AddPartyForm({
  onAdd,
}: {
  onAdd: (data: { role: string; name: string; phone?: string; email?: string; company?: string }) => void;
}) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
      >
        <UserPlus className="h-4 w-4" />
        Add Party
      </button>
    );
  }

  return (
    <form
      className="mt-3 space-y-2 p-3 rounded-lg border border-border/40 bg-muted/30"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        onAdd({
          role: fd.get("role") as string,
          name: fd.get("name") as string,
          phone: (fd.get("phone") as string) || undefined,
          email: (fd.get("email") as string) || undefined,
          company: (fd.get("company") as string) || undefined,
        });
        setOpen(false);
      }}
    >
      <div className="grid grid-cols-2 gap-2">
        <div>
          <select
            name="role"
            required
            className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
          >
            {PARTY_ROLES.map((r) => (
              <option key={r} value={r}>
                {PARTY_ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <input
          name="name"
          required
          placeholder="Name *"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          name="phone"
          placeholder="Phone"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        />
        <input
          name="email"
          placeholder="Email"
          className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
        />
      </div>
      <input
        name="company"
        placeholder="Company"
        className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button type="submit" size="sm">
          Add
        </Button>
      </div>
    </form>
  );
}
