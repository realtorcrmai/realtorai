"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Heart, Baby, User, Users, Phone, Mail, Pencil, Trash2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContactFamilyMember } from "@/types";

type Relationship = "spouse" | "child" | "parent" | "sibling" | "other";

const RELATIONSHIPS: {
  value: Relationship;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
}[] = [
  { value: "spouse",  label: "Spouse / Partner", icon: Heart,  color: "text-rose-600",   bg: "bg-rose-50 border-rose-200" },
  { value: "child",   label: "Child",             icon: Baby,   color: "text-sky-600",    bg: "bg-sky-50 border-sky-200" },
  { value: "parent",  label: "Parent",            icon: User,   color: "text-amber-600",  bg: "bg-amber-50 border-amber-200" },
  { value: "sibling", label: "Sibling",           icon: Users,  color: "text-violet-600", bg: "bg-violet-50 border-violet-200" },
  { value: "other",   label: "Other",             icon: User,   color: "text-slate-600",  bg: "bg-slate-50 border-slate-200" },
];

const REL_STYLE: Record<Relationship, { icon: React.ElementType }> = {
  spouse:  { icon: Heart },
  child:   { icon: Baby },
  parent:  { icon: User },
  sibling: { icon: Users },
  other:   { icon: User },
};

interface FamilyTabPanelProps {
  contactId: string;
  initialMembers: ContactFamilyMember[];
}

export function FamilyTabPanel({ contactId, initialMembers }: FamilyTabPanelProps) {
  const router = useRouter();
  const [members, setMembers] = useState<ContactFamilyMember[]>(initialMembers);
  const [isPending, startTransition] = useTransition();

  function removeMember(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/contacts/${contactId}/family?member_id=${id}`, { method: "DELETE" });
      if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== id));
    });
  }

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
          <p className="text-xs text-muted-foreground mt-0.5">
            {members.length} member{members.length !== 1 ? "s" : ""} on file
          </p>
        </div>
        <button
          onClick={() => router.push(`/contacts/${contactId}/family/new`)}
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
            onClick={() => router.push(`/contacts/${contactId}/family/new`)}
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
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </span>
          </div>
          <div className="space-y-2">
            {group.items.map((member) => {
              const rel = REL_STYLE[member.relationship as Relationship] ?? REL_STYLE.other;
              const relStyle = RELATIONSHIPS.find((r) => r.value === member.relationship);
              return (
                <div
                  key={member.id}
                  className="flex items-start justify-between p-3.5 rounded-xl border border-border/60 bg-card hover:bg-muted/20 transition-colors group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div
                      className={cn(
                        "h-9 w-9 rounded-xl flex items-center justify-center shrink-0",
                        relStyle?.bg ?? "bg-muted"
                      )}
                    >
                      <rel.icon className={cn("h-4 w-4", relStyle?.color ?? "text-muted-foreground")} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{member.name}</p>
                      {(member.phone || member.email) && (
                        <div className="flex flex-wrap gap-3 mt-1">
                          {member.phone && (
                            <a
                              href={`tel:${member.phone}`}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
                              <Phone className="h-3 w-3" />{member.phone}
                            </a>
                          )}
                          {member.email && (
                            <a
                              href={`mailto:${member.email}`}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                            >
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
                      onClick={() => router.push(`/contacts/${contactId}/family/${member.id}/edit`)}
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
    </div>
  );
}
