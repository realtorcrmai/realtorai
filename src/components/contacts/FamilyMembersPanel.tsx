"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, X, Check, Users } from "lucide-react";
import { LogoSpinner } from "@/components/brand/Logo";
import { updateContact } from "@/actions/contacts";
import type { FamilyMember } from "@/types";

const RELATIONSHIPS = ["Spouse", "Child", "Parent", "Sibling", "Other"];

export function FamilyMembersPanel({
  contactId,
  familyMembers,
}: {
  contactId: string;
  familyMembers: FamilyMember[];
}) {
  const [members, setMembers] = useState<FamilyMember[]>(familyMembers);
  const [showForm, setShowForm] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [form, setForm] = useState<FamilyMember>({
    name: "",
    relationship: "Spouse",
    phone: "",
    email: "",
  });
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function resetForm() {
    setForm({ name: "", relationship: "Spouse", phone: "", email: "" });
    setShowForm(false);
    setEditIndex(null);
    setError(null);
  }

  function startEdit(index: number) {
    setForm({ ...members[index] });
    setEditIndex(index);
    setShowForm(true);
  }

  function saveMember() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);

    const updated = [...members];
    const clean: FamilyMember = {
      name: form.name.trim(),
      relationship: form.relationship,
      ...(form.phone ? { phone: form.phone.trim() } : {}),
      ...(form.email ? { email: form.email.trim() } : {}),
    };

    if (editIndex !== null) {
      updated[editIndex] = clean;
    } else {
      updated.push(clean);
    }

    persistMembers(updated);
  }

  function removeMember(index: number) {
    const updated = members.filter((_, i) => i !== index);
    persistMembers(updated);
  }

  function persistMembers(updated: FamilyMember[]) {
    startTransition(async () => {
      const result = await updateContact(contactId, {
        family_members: updated as unknown as import("@/types/database").Json,
      });
      if (result.error) {
        setError(result.error);
      } else {
        setMembers(updated);
        resetForm();
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Users className="h-3.5 w-3.5" />
          Family Members
        </h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>

      {/* Member List */}
      {members.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground text-center py-3">
          No family members added yet.
        </p>
      )}

      {members.map((member, i) => (
        <div
          key={`${member.name}-${i}`}
          className="flex items-start justify-between p-2.5 rounded-lg bg-muted/30 group"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium">{member.name}</p>
            <p className="text-xs text-muted-foreground">{member.relationship}</p>
            {member.phone && (
              <p className="text-xs text-muted-foreground">{member.phone}</p>
            )}
            {member.email && (
              <p className="text-xs text-muted-foreground truncate">{member.email}</p>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button
              type="button"
              onClick={() => startEdit(i)}
              className="p-1 text-muted-foreground hover:text-primary transition-colors"
              disabled={isPending}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={() => removeMember(i)}
              className="p-1 text-muted-foreground hover:text-red-500 transition-colors"
              disabled={isPending}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}

      {/* Add/Edit Form */}
      {showForm && (
        <div className="p-3 rounded-lg border border-border bg-background space-y-2.5">
          <input
            type="text"
            placeholder="Name *"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />
          <select
            value={form.relationship}
            onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <input
            type="tel"
            placeholder="Phone (optional)"
            value={form.phone ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={form.email ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={saveMember}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <LogoSpinner size={12} />
              ) : (
                <Check className="h-3 w-3" />
              )}
              {editIndex !== null ? "Update" : "Add"}
            </button>
            <button
              type="button"
              onClick={resetForm}
              disabled={isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
