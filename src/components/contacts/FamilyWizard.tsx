"use client";

import { useState, useTransition } from "react";
import {
  Heart, Baby, User, Users,
  Check, X, Loader2, Phone, Mail, FileText,
  Pencil, Trash2, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { ContactFamilyMember } from "@/types";

// ── Types ─────────────────────────────────────────────────

type Relationship = "spouse" | "child" | "parent" | "sibling" | "other";

interface MemberDraft {
  name: string;
  relationship: Relationship;
  phone: string;
  email: string;
  notes: string;
}

const RELATIONSHIPS: { value: Relationship; label: string; icon: React.ElementType; color: string; bg: string; desc: string }[] = [
  { value: "spouse",  label: "Spouse / Partner", icon: Heart,  color: "text-rose-600",   bg: "bg-rose-50 border-rose-200",   desc: "Life partner or spouse" },
  { value: "child",   label: "Child",             icon: Baby,   color: "text-sky-600",    bg: "bg-sky-50 border-sky-200",     desc: "Son, daughter, or child" },
  { value: "parent",  label: "Parent",            icon: User,   color: "text-amber-600",  bg: "bg-amber-50 border-amber-200", desc: "Mother or father" },
  { value: "sibling", label: "Sibling",           icon: Users,  color: "text-violet-600", bg: "bg-violet-50 border-violet-200", desc: "Brother or sister" },
  { value: "other",   label: "Other",             icon: User,   color: "text-slate-600",  bg: "bg-slate-50 border-slate-200", desc: "Any other relation" },
];

const REL_STYLE: Record<Relationship, { badge: string; icon: React.ElementType }> = {
  spouse:  { badge: "bg-rose-100 text-rose-700",     icon: Heart },
  child:   { badge: "bg-sky-100 text-sky-700",       icon: Baby },
  parent:  { badge: "bg-amber-100 text-amber-700",   icon: User },
  sibling: { badge: "bg-violet-100 text-violet-700", icon: Users },
  other:   { badge: "bg-slate-100 text-slate-600",   icon: User },
};

const EMPTY: MemberDraft = { name: "", relationship: "spouse", phone: "", email: "", notes: "" };

// ── Main Form (flat, single-screen — matches ContactCreator style) ─────────

interface FamilyWizardProps {
  contactId: string;
  members: ContactFamilyMember[];
  onClose: () => void;
  onSaved: (members: ContactFamilyMember[]) => void;
  editMember?: ContactFamilyMember | null;
}

export function FamilyWizard({ contactId, members, onClose, onSaved, editMember }: FamilyWizardProps) {
  const [draft, setDraft] = useState<MemberDraft>(
    editMember
      ? { name: editMember.name, relationship: editMember.relationship, phone: editMember.phone ?? "", email: editMember.email ?? "", notes: editMember.notes ?? "" }
      : { ...EMPTY }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof MemberDraft, string>>>({});
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  function validate() {
    const e: typeof errors = {};
    if (!draft.name.trim()) e.name = "Name is required";
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) e.email = "Invalid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function save() {
    if (!validate()) return;
    startTransition(async () => {
      try {
        const body = {
          name: draft.name.trim(),
          relationship: draft.relationship,
          phone: draft.phone.trim() || null,
          email: draft.email.trim() || null,
          notes: draft.notes.trim() || null,
        };
        let res: Response;
        if (editMember) {
          res = await fetch(`/api/contacts/${contactId}/family?member_id=${editMember.id}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          });
        } else {
          res = await fetch(`/api/contacts/${contactId}/family`, {
            method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
          });
        }
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setServerError(err.error ?? "Failed to save. Please try again.");
          return;
        }
        const saved: ContactFamilyMember = await res.json();
        onSaved(editMember ? members.map((m) => (m.id === editMember.id ? saved : m)) : [...members, saved]);
        onClose();
      } catch {
        setServerError("Network error. Please try again.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {editMember ? "Edit Family Member" : "Add Family Member"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {editMember ? "Update their details" : "Add to this contact's family network"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto">

          {/* Relationship chips */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Relationship <span className="text-destructive">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map((r) => {
                const active = draft.relationship === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setDraft((d) => ({ ...d, relationship: r.value }))}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                      active
                        ? `${r.bg} ${r.color} border-current shadow-sm`
                        : "border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/30"
                    )}
                  >
                    <r.icon className="h-3.5 w-3.5" />
                    {r.label}
                    {active && <Check className="h-3 w-3 ml-0.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name + Phone (2-col grid, matching ContactCreator) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Full name <span className="text-destructive">*</span>
              </label>
              <Input
                autoFocus
                value={draft.name}
                onChange={(e) => { setDraft((d) => ({ ...d, name: e.target.value })); setErrors((e2) => ({ ...e2, name: undefined })); }}
                placeholder={`${RELATIONSHIPS.find(r => r.value === draft.relationship)?.label ?? "Member"}'s name`}
                className={cn("h-11 text-sm", errors.name && "border-destructive")}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone number</label>
              <Input
                type="tel"
                value={draft.phone}
                onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                placeholder="604-555-1234"
                className="h-11 text-sm"
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email address</label>
            <Input
              type="email"
              value={draft.email}
              onChange={(e) => { setDraft((d) => ({ ...d, email: e.target.value })); setErrors((e2) => ({ ...e2, email: undefined })); }}
              placeholder="name@example.com"
              className={cn("h-11 text-sm", errors.email && "border-destructive")}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">
              Notes <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              placeholder="Allergies, preferences, anything useful..."
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Server error */}
          {serverError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
              <X className="h-4 w-4 shrink-0" />
              {serverError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/10">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={isPending || !draft.name.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Check className="h-4 w-4 mr-1.5" />}
            {editMember ? "Save Changes" : "Add Member"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Family Tab Panel (the list view) ──────────────────────

interface FamilyTabPanelProps {
  contactId: string;
  initialMembers: ContactFamilyMember[];
}

export function FamilyTabPanel({ contactId, initialMembers }: FamilyTabPanelProps) {
  const [members, setMembers] = useState<ContactFamilyMember[]>(initialMembers);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editMember, setEditMember] = useState<ContactFamilyMember | null>(null);
  const [isPending, startTransition] = useTransition();

  function openAdd() { setEditMember(null); setWizardOpen(true); }
  function openEdit(m: ContactFamilyMember) { setEditMember(m); setWizardOpen(true); }

  function removeMember(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/contacts/${contactId}/family?member_id=${id}`, { method: "DELETE" });
      if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== id));
    });
  }

  // Group by relationship
  const grouped = RELATIONSHIPS.map((r) => ({
    ...r,
    items: members.filter((m) => m.relationship === r.value),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Family Members</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{members.length} member{members.length !== 1 ? "s" : ""} on file</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Member
        </button>
      </div>

      {/* Empty state */}
      {members.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="h-14 w-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
            <Users className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-semibold text-foreground/70">No family members yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[220px] leading-relaxed">
            Add spouse, children, or other family members to personalize your outreach.
          </p>
          <button
            onClick={openAdd}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border border-dashed border-border hover:border-primary hover:text-primary text-muted-foreground transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add first member
          </button>
        </div>
      )}

      {/* Grouped member list */}
      {grouped.map((group) => (
        <div key={group.value}>
          <div className="flex items-center gap-2 mb-2">
            <div className={cn("h-5 w-5 rounded-md flex items-center justify-center", group.bg)}>
              <group.icon className={cn("h-3 w-3", group.color)} />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{group.label}</span>
          </div>
          <div className="space-y-2">
            {group.items.map((member) => {
              const rel = REL_STYLE[member.relationship] ?? REL_STYLE.other;
              return (
                <div
                  key={member.id}
                  className="flex items-start justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={cn("h-9 w-9 rounded-xl flex items-center justify-center shrink-0", RELATIONSHIPS.find(r=>r.value===member.relationship)?.bg ?? "bg-muted")}>
                      <rel.icon className={cn("h-4 w-4", RELATIONSHIPS.find(r=>r.value===member.relationship)?.color ?? "text-muted-foreground")} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{member.name}</p>
                      {(member.phone || member.email) && (
                        <div className="flex flex-wrap gap-3 mt-1">
                          {member.phone && (
                            <a href={`tel:${member.phone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                              <Phone className="h-3 w-3" />{member.phone}
                            </a>
                          )}
                          {member.email && (
                            <a href={`mailto:${member.email}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                              <Mail className="h-3 w-3" />{member.email}
                            </a>
                          )}
                        </div>
                      )}
                      {member.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">{member.notes}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-2">
                    <button
                      onClick={() => openEdit(member)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeMember(member.id)}
                      disabled={isPending}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                      title="Remove"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Wizard */}
      {wizardOpen && (
        <FamilyWizard
          contactId={contactId}
          members={members}
          editMember={editMember}
          onClose={() => { setWizardOpen(false); setEditMember(null); }}
          onSaved={setMembers}
        />
      )}
    </div>
  );
}
