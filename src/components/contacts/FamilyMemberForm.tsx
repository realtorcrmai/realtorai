"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Heart, Baby, User, Users } from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ContactFamilyMember } from "@/types";
import { formatPhone, normalizePhoneE164, titleCaseName } from "@/lib/format";

type Relationship = "spouse" | "child" | "parent" | "sibling" | "other";

const RELATIONSHIPS: {
  value: Relationship;
  label: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  bg: string;
}[] = [
  { value: "spouse",  label: "Spouse / Partner", icon: Heart,  color: "text-rose-600",   bg: "bg-rose-50 border-rose-200" },
  { value: "child",   label: "Child",             icon: Baby,   color: "text-sky-600",    bg: "bg-sky-50 border-sky-200" },
  { value: "parent",  label: "Parent",            icon: User,   color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  { value: "sibling", label: "Sibling",           icon: Users,  color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
  { value: "other",   label: "Other",             icon: User,   color: "text-slate-600",  bg: "bg-slate-50 border-slate-200" },
];

interface FamilyMemberFormProps {
  contactId: string;
  contactName?: string;
  editMember?: ContactFamilyMember | null;
}

export function FamilyMemberForm({ contactId, contactName, editMember }: FamilyMemberFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [name, setName] = useState(editMember?.name ?? "");
  const [relationship, setRelationship] = useState<Relationship>(
    (editMember?.relationship as Relationship) ?? "spouse"
  );
  const [phone, setPhone] = useState(editMember?.phone ?? "");
  const [email, setEmail] = useState(editMember?.email ?? "");
  const [notes, setNotes] = useState(editMember?.notes ?? "");

  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const backUrl = `/contacts/${contactId}`;

  function validate() {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Name is required";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Invalid email address";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    setServerError(null);
    startTransition(async () => {
      try {
        const body = {
          name: name.trim(),
          relationship,
          phone: normalizePhoneE164(phone) ?? (phone.trim() || null),
          email: email.trim().toLowerCase() || null,
          notes: notes.trim() || null,
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

        router.push(backUrl);
        router.refresh();
      } catch {
        setServerError("Network error. Please try again.");
      }
    });
  }

  return (
    <div className="px-6 py-6 max-w-2xl space-y-8">

      {/* Inline header — back arrow + title */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(backUrl)}
          className="p-2 -ml-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            {editMember ? "Edit Family Member" : "Add Family Member"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {contactName
              ? editMember
                ? `Update ${editMember.name}'s details for ${contactName}`
                : `Add to ${contactName}'s family network`
              : editMember
                ? "Update their details"
                : "Add to this contact's family network"}
          </p>
        </div>
      </div>

        {serverError && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            <X className="h-4 w-4 shrink-0" />
            {serverError}
            <button onClick={() => setServerError(null)} className="ml-auto">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Relationship */}
        <div className="space-y-3">
          <SectionLabel number={1} label="Relationship" required />
          <div className="flex flex-wrap gap-2">
            {RELATIONSHIPS.map((r) => {
              const active = relationship === r.value;
              return (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRelationship(r.value)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all",
                    active
                      ? `${r.bg} ${r.color} border-current shadow-sm`
                      : "border-border text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted/30"
                  )}
                >
                  <r.icon className="h-4 w-4" />
                  {r.label}
                  {active && <Check className="h-3.5 w-3.5 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Name + Phone */}
        <div className="space-y-3">
          <SectionLabel number={2} label="Contact details" required />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                Full name <span className="text-red-400">*</span>
              </label>
              <Input
                autoFocus
                value={name}
                onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })); }}
                onBlur={(e) => setName(titleCaseName(e.target.value))}
                placeholder={`${RELATIONSHIPS.find((r) => r.value === relationship)?.label ?? "Member"}'s name`}
                className={cn("h-11 text-sm", errors.name && "border-destructive")}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Phone number</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="+1 (604) 555-1234"
                className="h-11 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })); }}
              onBlur={(e) => setEmail(e.target.value.trim().toLowerCase())}
              placeholder="name@example.com"
              className={cn("h-11 text-sm", errors.email && "border-destructive")}
            />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-3">
          <SectionLabel number={3} label="Notes" optional />
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Allergies, preferences, birthday, anything useful..."
            rows={4}
            className="text-sm resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/30">
          <Button
            onClick={handleSave}
            disabled={isPending || !name.trim()}
            className="min-w-[120px]"
          >
            {isPending ? (
              <LogoSpinner size={16} />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {editMember ? "Save Changes" : "Add Member"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push(backUrl)}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
    </div>
  );
}

function SectionLabel({
  number,
  label,
  required,
  optional,
}: {
  number: number;
  label: string;
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-6 w-6 rounded-full bg-brand-muted text-brand text-xs font-bold flex items-center justify-center shrink-0">
        {number}
      </span>
      <span className="text-sm font-semibold text-foreground/80">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {optional && <span className="text-muted-foreground font-normal ml-1">(optional)</span>}
      </span>
    </div>
  );
}
