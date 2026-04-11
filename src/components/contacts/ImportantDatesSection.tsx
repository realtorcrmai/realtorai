"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarHeart, Plus, Trash2, Bell, Gift, Heart, Home, Star } from "lucide-react";
import type { ContactImportantDate, ContactFamilyMember } from "@/types";

const DATE_TYPE_CONFIG: Record<string, { label: string; icon: typeof Gift; color: string }> = {
  birthday: { label: "Birthday", icon: Gift, color: "bg-pink-50 text-pink-700" },
  anniversary: { label: "Anniversary", icon: Heart, color: "bg-rose-50 text-rose-700" },
  closing_anniversary: { label: "Closing Anniversary", icon: Home, color: "bg-brand-muted text-brand-dark" },
  move_in: { label: "Move-in Date", icon: Home, color: "bg-brand-muted text-brand-dark" },
  custom: { label: "Custom", icon: Star, color: "bg-slate-50 text-slate-700" },
};

type DateWithFamily = ContactImportantDate & {
  contact_family_members: { id: string; name: string } | null;
};

interface ImportantDatesSectionProps {
  contactId: string;
  dates: DateWithFamily[];
  familyMembers: ContactFamilyMember[];
}

function daysUntilNext(dateStr: string): number {
  const date = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  let next = new Date(now.getFullYear(), date.getMonth(), date.getDate());
  if (next < now) next = new Date(now.getFullYear() + 1, date.getMonth(), date.getDate());
  return Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function ImportantDatesSection({ contactId, dates: initial, familyMembers }: ImportantDatesSectionProps) {
  const [dates, setDates] = useState(initial);
  const [showForm, setShowForm] = useState(false);

  async function addDate(fd: FormData) {
    const body: Record<string, unknown> = {
      date_type: fd.get("date_type"),
      date_value: fd.get("date_value"),
      label: fd.get("label") || undefined,
      remind_days_before: Number(fd.get("remind_days_before")) || 7,
      recurring: fd.get("recurring") === "on",
      notes: fd.get("notes") || undefined,
    };
    const fmId = fd.get("family_member_id") as string;
    if (fmId) body.family_member_id = fmId;

    const res = await fetch(`/api/contacts/${contactId}/dates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      setDates((prev) => [...prev, d].sort((a, b) => a.date_value.localeCompare(b.date_value)));
      setShowForm(false);
    }
  }

  async function removeDate(id: string) {
    const res = await fetch(`/api/contacts/${contactId}/dates?date_id=${id}`, { method: "DELETE" });
    if (res.ok) setDates((prev) => prev.filter((d) => d.id !== id));
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CalendarHeart className="h-4 w-4" />
          Important Dates
          {dates.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{dates.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dates.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground text-center py-4">No important dates added yet.</p>
        ) : (
          <div className="space-y-2">
            {dates.map((d) => {
              const config = DATE_TYPE_CONFIG[d.date_type] || DATE_TYPE_CONFIG.custom;
              const Icon = config.icon;
              const countdown = daysUntilNext(d.date_value);
              const isUpcoming = countdown <= 30;

              return (
                <div key={d.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors group ${isUpcoming ? "border-amber-300 bg-amber-50/30" : "border-border/40"}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-md ${config.color}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          {d.label || config.label}
                          {d.contact_family_members && (
                            <span className="text-muted-foreground font-normal"> - {d.contact_family_members.name}</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{new Date(d.date_value + "T00:00:00").toLocaleDateString("en-CA", { month: "long", day: "numeric" })}</span>
                        {d.recurring && <span className="flex items-center gap-1"><Bell className="h-3 w-3" />{d.remind_days_before}d before</span>}
                        {isUpcoming && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 border-amber-300">
                            {countdown === 0 ? "Today!" : `${countdown}d away`}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeDate(d.id)} className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {showForm ? (
          <form className="mt-3 space-y-2 p-3 rounded-lg border border-border/40 bg-muted/30" onSubmit={(e) => { e.preventDefault(); addDate(new FormData(e.currentTarget)); }}>
            <div className="grid grid-cols-2 gap-2">
              <select name="date_type" required className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background">
                <option value="birthday">Birthday</option>
                <option value="anniversary">Anniversary</option>
                <option value="closing_anniversary">Closing Anniversary</option>
                <option value="move_in">Move-in Date</option>
                <option value="custom">Custom</option>
              </select>
              <input name="date_value" type="date" required className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input name="label" placeholder="Custom label (optional)" className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background" />
              {familyMembers.length > 0 && (
                <select name="family_member_id" className="rounded-lg border border-input px-2 py-1.5 text-sm bg-background">
                  <option value="">Contact (self)</option>
                  {familyMembers.map((fm) => (
                    <option key={fm.id} value={fm.id}>{fm.name} ({fm.relationship})</option>
                  ))}
                </select>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 items-center">
              <div>
                <label className="text-[10px] text-muted-foreground">Remind days before</label>
                <input name="remind_days_before" type="number" defaultValue={7} min={1} max={90} className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background" />
              </div>
              <label className="flex items-center gap-2 text-sm col-span-2">
                <input name="recurring" type="checkbox" defaultChecked className="rounded" /> Recurring yearly
              </label>
            </div>
            <input name="notes" placeholder="Notes (optional)" className="w-full rounded-lg border border-input px-2 py-1.5 text-sm bg-background" />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button type="submit" size="sm">Add Date</Button>
            </div>
          </form>
        ) : (
          <button onClick={() => setShowForm(true)} className="mt-3 flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors">
            <Plus className="h-4 w-4" /> Add Important Date
          </button>
        )}
      </CardContent>
    </Card>
  );
}
