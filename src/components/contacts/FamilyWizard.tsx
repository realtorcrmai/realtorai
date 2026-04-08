"use client";

import { useState, useTransition } from "react";
import {
  Heart, Baby, User, Users, ChevronRight, ChevronLeft,
  Check, X, Loader2, Phone, Mail, Calendar, FileText,
  Pencil, Trash2, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
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

// ── Step indicators ────────────────────────────────────────

function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
        done  && "bg-primary border-primary text-primary-foreground",
        active && "bg-white border-primary text-primary shadow-sm shadow-primary/20",
        !done && !active && "bg-white border-border text-muted-foreground"
      )}>
        {done ? <Check className="h-3.5 w-3.5" /> : step}
      </div>
      <span className={cn("text-xs font-medium hidden sm:block", active ? "text-foreground" : "text-muted-foreground")}>
        {label}
      </span>
    </div>
  );
}

function StepConnector({ done }: { done: boolean }) {
  return <div className={cn("flex-1 h-[2px] mx-1 rounded transition-colors", done ? "bg-primary" : "bg-border")} />;
}

// ── Main Wizard ────────────────────────────────────────────

interface FamilyWizardProps {
  contactId: string;
  members: ContactFamilyMember[];
  onClose: () => void;
  onSaved: (members: ContactFamilyMember[]) => void;
  editMember?: ContactFamilyMember | null;
}

export function FamilyWizard({ contactId, members, onClose, onSaved, editMember }: FamilyWizardProps) {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<MemberDraft>(
    editMember
      ? { name: editMember.name, relationship: editMember.relationship, phone: editMember.phone ?? "", email: editMember.email ?? "", notes: editMember.notes ?? "" }
      : { ...EMPTY }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof MemberDraft, string>>>({});
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);

  function validateStep1() {
    const e: typeof errors = {};
    if (!draft.name.trim()) e.name = "Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateStep2() {
    const e: typeof errors = {};
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) e.email = "Invalid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function next() {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep((s) => Math.min(s + 1, 3));
  }

  function back() {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  }

  function save() {
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
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } else {
          res = await fetch(`/api/contacts/${contactId}/family`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setServerError(err.error ?? "Failed to save. Please try again.");
          return;
        }

        const saved: ContactFamilyMember = await res.json();
        let updated: ContactFamilyMember[];
        if (editMember) {
          updated = members.map((m) => (m.id === editMember.id ? saved : m));
        } else {
          updated = [...members, saved];
        }
        onSaved(updated);
        onClose();
      } catch {
        setServerError("Network error. Please try again.");
      }
    });
  }

  const selectedRel = RELATIONSHIPS.find((r) => r.value === draft.relationship)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-gradient-to-r from-primary/5 to-transparent">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {editMember ? "Edit Family Member" : "Add Family Member"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {step === 1 && "Choose the relationship type"}
              {step === 2 && "Add contact details"}
              {step === 3 && "Review and confirm"}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center px-6 py-3 border-b border-border/50 bg-muted/20">
          <StepDot step={1} current={step} label="Relationship" />
          <StepConnector done={step > 1} />
          <StepDot step={2} current={step} label="Details" />
          <StepConnector done={step > 2} />
          <StepDot step={3} current={step} label="Review" />
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 overflow-y-auto">

          {/* ── Step 1: Relationship + Name ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Relationship Type</label>
                <div className="grid grid-cols-1 gap-2">
                  {RELATIONSHIPS.map((r) => (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => setDraft((d) => ({ ...d, relationship: r.value }))}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                        draft.relationship === r.value
                          ? `${r.bg} border-current ${r.color} shadow-sm`
                          : "border-border hover:border-border/80 hover:bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                        draft.relationship === r.value ? `${r.bg}` : "bg-muted"
                      )}>
                        <r.icon className={cn("h-4 w-4", draft.relationship === r.value ? r.color : "text-muted-foreground")} />
                      </div>
                      <div>
                        <p className={cn("text-sm font-semibold", draft.relationship === r.value ? r.color : "text-foreground")}>{r.label}</p>
                        <p className="text-xs text-muted-foreground">{r.desc}</p>
                      </div>
                      {draft.relationship === r.value && (
                        <Check className={cn("h-4 w-4 ml-auto", r.color)} />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Full Name <span className="text-destructive">*</span>
                </label>
                <input
                  autoFocus
                  type="text"
                  value={draft.name}
                  onChange={(e) => { setDraft((d) => ({ ...d, name: e.target.value })); setErrors((e2) => ({ ...e2, name: undefined })); }}
                  placeholder={`Enter ${selectedRel.label.toLowerCase()}'s name`}
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                    errors.name ? "border-destructive" : "border-border"
                  )}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
            </div>
          )}

          {/* ── Step 2: Contact Details ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 border border-border/50">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", selectedRel.bg)}>
                  <selectedRel.icon className={cn("h-4 w-4", selectedRel.color)} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{draft.name}</p>
                  <p className={cn("text-xs font-medium", selectedRel.color)}>{selectedRel.label}</p>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
                  <Phone className="h-3 w-3" /> Phone Number
                </label>
                <input
                  type="tel"
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  placeholder="+1 (604) 555-0100"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
                  <Mail className="h-3 w-3" /> Email Address
                </label>
                <input
                  type="email"
                  value={draft.email}
                  onChange={(e) => { setDraft((d) => ({ ...d, email: e.target.value })); setErrors((e2) => ({ ...e2, email: undefined })); }}
                  placeholder="name@example.com"
                  className={cn(
                    "w-full px-3 py-2.5 rounded-xl border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all",
                    errors.email ? "border-destructive" : "border-border"
                  )}
                />
                {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5 block">
                  <FileText className="h-3 w-3" /> Notes <span className="text-muted-foreground font-normal normal-case">(optional)</span>
                </label>
                <textarea
                  value={draft.notes}
                  onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                  placeholder="Allergies, preferences, anything useful..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all resize-none"
                />
              </div>
            </div>
          )}

          {/* ── Step 3: Review ── */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Review the details before saving.</p>

              <div className="rounded-xl border border-border overflow-hidden">
                <div className={cn("flex items-center gap-3 px-4 py-3", selectedRel.bg)}>
                  <div className="h-10 w-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm">
                    <selectedRel.icon className={cn("h-5 w-5", selectedRel.color)} />
                  </div>
                  <div>
                    <p className="text-base font-bold text-foreground">{draft.name}</p>
                    <p className={cn("text-xs font-semibold", selectedRel.color)}>{selectedRel.label}</p>
                  </div>
                </div>

                <div className="divide-y divide-border/50">
                  {[
                    { icon: Phone, label: "Phone", value: draft.phone || "—" },
                    { icon: Mail,  label: "Email", value: draft.email || "—" },
                    { icon: FileText, label: "Notes", value: draft.notes || "—" },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-start gap-3 px-4 py-2.5">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</p>
                        <p className={cn("text-sm", value === "—" ? "text-muted-foreground/50" : "text-foreground font-medium")}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {serverError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                  <X className="h-4 w-4 shrink-0" />
                  {serverError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/10">
          <button
            type="button"
            onClick={step === 1 ? onClose : back}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={next}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-sm"
            >
              Continue
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editMember ? "Save Changes" : "Add Member"}
            </button>
          )}
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
