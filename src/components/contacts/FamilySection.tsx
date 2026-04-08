"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Plus, Trash2, Phone, Mail } from "lucide-react";
import type { ContactFamilyMember } from "@/types";

const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse: "Spouse",
  child: "Child",
  parent: "Parent",
  sibling: "Sibling",
  other: "Other",
};

const RELATIONSHIP_COLORS: Record<string, string> = {
  spouse: "bg-pink-50 text-pink-700",
  child: "bg-[#0F7694]/8 text-[#0A6880]",
  parent: "bg-amber-50 text-amber-700",
  sibling: "bg-[#0F7694]/10 text-[#0A6880]",
  other: "bg-slate-50 text-slate-700",
};

interface FamilySectionProps {
  contactId: string;
  members: ContactFamilyMember[];
}

export function FamilySection({ contactId, members: initial }: FamilySectionProps) {
  const [members, setMembers] = useState(initial);
  const [showForm, setShowForm] = useState(false);

  async function addMember(fd: FormData) {
    const body = {
      name: fd.get("name"),
      relationship: fd.get("relationship"),
      phone: fd.get("phone") || undefined,
      email: fd.get("email") || undefined,
      notes: fd.get("notes") || undefined,
    };
    const res = await fetch(`/api/contacts/${contactId}/family`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const m = await res.json();
      setMembers((prev) => [...prev, m]);
      setShowForm(false);
    }
  }

  async function removeMember(id: string) {
    const res = await fetch(`/api/contacts/${contactId}/family?member_id=${id}`, { method: "DELETE" });
    if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Family Members
          {members.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{members.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {members.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground text-center py-4">No family members added yet.</p>
        ) : (
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg border border-border/40 group">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{m.name}</p>
                    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-0 ${RELATIONSHIP_COLORS[m.relationship] || ""}`}>
                      {RELATIONSHIP_LABELS[m.relationship] || m.relationship}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    {m.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{m.phone}</span>}
                    {m.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{m.email}</span>}
                  </div>
                  {m.notes && <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>}
                </div>
                <button onClick={() => removeMember(m.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {showForm ? (
          <form className="mt-3 space-y-2 p-3 rounded-lg border border-border/40 bg-muted/30" onSubmit={(e) => { e.preventDefault(); addMember(new FormData(e.currentTarget)); }}>
            <div className="grid grid-cols-2 gap-2">
              <input name="name" required placeholder="Name *" className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background" />
              <select name="relationship" required className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background">
                <option value="spouse">Spouse</option>
                <option value="child">Child</option>
                <option value="parent">Parent</option>
                <option value="sibling">Sibling</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input name="phone" placeholder="Phone" className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background" />
              <input name="email" type="email" placeholder="Email" className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background" />
            </div>
            <input name="notes" placeholder="Notes (optional)" className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" size="sm">Add</Button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)} className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
            <Plus className="h-4 w-4" /> Add Family Member
          </button>
        )}
      </CardContent>
    </Card>
  );
}
