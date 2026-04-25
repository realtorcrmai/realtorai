"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogoSpinner } from "@/components/brand/Logo";
import { toast } from "sonner";
import { RECURRENCE_PRESETS } from "@/lib/constants/tasks";
import type { TeamMember } from "@/hooks/useTasks";

type Contact = { id: string; name: string; type: string };
type Listing = { id: string; address: string };

type TaskData = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  category: string;
  due_date: string | null;
  start_date: string | null;
  contact_id: string | null;
  listing_id: string | null;
  assigned_to: string | null;
  labels?: string[];
  visibility?: string;
  recurrence_rule?: string | null;
  estimated_hours?: number | null;
};

interface TaskFormProps {
  task?: TaskData;
  teamMembers?: TeamMember[];
  onSuccess: () => void;
  onCancel: () => void;
}

const PRIORITIES = [
  { value: "low", label: "Low", emoji: "🟢", desc: "When you get to it" },
  { value: "medium", label: "Medium", emoji: "🔵", desc: "This week" },
  { value: "high", label: "High", emoji: "🟠", desc: "Soon" },
  { value: "urgent", label: "Urgent", emoji: "🔴", desc: "Right now" },
];

const CATEGORIES = [
  { value: "general", label: "General", emoji: "📋" },
  { value: "follow_up", label: "Follow Up", emoji: "📞" },
  { value: "showing", label: "Showing", emoji: "🏠" },
  { value: "document", label: "Document", emoji: "📄" },
  { value: "listing", label: "Listing", emoji: "🏢" },
  { value: "marketing", label: "Marketing", emoji: "📣" },
  { value: "inspection", label: "Inspection", emoji: "🔍" },
  { value: "closing", label: "Closing", emoji: "✅" },
];

export function TaskForm({ task, teamMembers = [], onSuccess, onCancel }: TaskFormProps) {
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [category, setCategory] = useState(task?.category || "general");
  const [dueDate, setDueDate] = useState(task?.due_date?.slice(0, 10) || "");
  const [startDate, setStartDate] = useState(task?.start_date?.slice(0, 10) || "");
  const [contactId, setContactId] = useState(task?.contact_id || "");
  const [listingId, setListingId] = useState(task?.listing_id || "");
  const [assignedTo, setAssignedTo] = useState(task?.assigned_to || "");
  const [visibility, setVisibility] = useState(task?.visibility || "private");
  const [recurrenceRule, setRecurrenceRule] = useState(task?.recurrence_rule || "");
  const [estimatedHours, setEstimatedHours] = useState(task?.estimated_hours?.toString() || "");
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    !!(task?.recurrence_rule || task?.estimated_hours || task?.contact_id || task?.listing_id)
  );

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);

  useEffect(() => {
    fetch("/api/contacts")
      .then((r) => r.json())
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => {});
    fetch("/api/listings")
      .then((r) => r.json())
      .then((json) => { const data = json.data ?? json; setListings(Array.isArray(data) ? data : []); })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category,
        due_date: dueDate || null,
        start_date: startDate || null,
        contact_id: contactId && contactId !== "none" ? contactId : null,
        listing_id: listingId && listingId !== "none" ? listingId : null,
        assigned_to: assignedTo && assignedTo !== "none" ? assignedTo : null,
        visibility,
        recurrence_rule: recurrenceRule && recurrenceRule !== "none" ? recurrenceRule : null,
        estimated_hours: estimatedHours ? parseFloat(estimatedHours) : null,
      };

      const resp = isEdit
        ? await fetch("/api/tasks", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: task.id, ...payload }),
          })
        : await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err.error || `Failed to ${isEdit ? "update" : "create"} task`);
      }

      toast.success(isEdit ? "Task updated" : "Task created");
      onSuccess();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title — prominent input */}
      <div>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          required
          autoFocus
          maxLength={200}
          className="h-12 text-base font-medium border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-brand placeholder:text-muted-foreground/40"
        />
      </div>

      {/* Description */}
      <div>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details..."
          rows={2}
          className="resize-none text-sm border-border/50"
        />
      </div>

      {/* Priority — visual buttons */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Priority</Label>
        <div className="grid grid-cols-4 gap-2">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPriority(p.value)}
              aria-pressed={priority === p.value}
              aria-label={`Priority: ${p.label}`}
              className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center cursor-pointer ${
                priority === p.value
                  ? "border-brand bg-brand/5 shadow-sm scale-[1.02]"
                  : "border-border/40 hover:border-border hover:bg-muted/30"
              }`}
            >
              <span className="text-lg">{p.emoji}</span>
              <span className="text-xs font-medium">{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Category — compact pills */}
      <div>
        <Label className="text-xs text-muted-foreground uppercase tracking-wider mb-2 block">Category</Label>
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              aria-pressed={category === c.value}
              aria-label={`Category: ${c.label}`}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                category === c.value
                  ? "bg-brand/10 text-brand border border-brand/30"
                  : "bg-muted/40 text-muted-foreground border border-transparent hover:bg-muted"
              }`}
            >
              <span>{c.emoji}</span> {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Dates + Assignment — compact row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 text-sm" />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-9 text-sm" />
        </div>
      </div>

      {/* Team assignment */}
      {teamMembers.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Assign To</Label>
            <Select value={assignedTo || "none"} onValueChange={(val) => setAssignedTo(val === "none" ? "" : (val ?? ""))}>
              <SelectTrigger className="h-9 text-sm">
                <span className="truncate">
                  {assignedTo ? (teamMembers.find((m) => m.id === assignedTo)?.name ?? "Unassigned") + (teamMembers.find((m) => m.id === assignedTo)?.is_current ? " (me)" : "") : "Unassigned"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Unassigned</SelectItem>
                {teamMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}{m.is_current ? " (me)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Visibility</Label>
            <Select value={visibility} onValueChange={(val) => val && setVisibility(val)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">🔒 Private</SelectItem>
                <SelectItem value="team">👥 Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Advanced options — collapsible */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <span className={`transition-transform ${showAdvanced ? "rotate-90" : ""}`}>▶</span>
          {showAdvanced ? "Hide" : "Show"} advanced options
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3 p-3 rounded-lg border border-border/40 bg-muted/20">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Related Contact</Label>
                <Select value={contactId || "none"} onValueChange={(val) => setContactId(val === "none" ? "" : (val ?? ""))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {contacts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Related Listing</Label>
                <Select value={listingId || "none"} onValueChange={(val) => setListingId(val === "none" ? "" : (val ?? ""))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {listings.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.address}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Repeat</Label>
                <Select value={recurrenceRule || "none"} onValueChange={(val) => setRecurrenceRule(val === "none" ? "" : (val ?? ""))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="No Repeat" /></SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_PRESETS.map((p) => (
                      <SelectItem key={p.value || "none"} value={p.value || "none"}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Estimated Hours</Label>
                <Input type="number" step="0.5" min="0" value={estimatedHours}
                  onChange={(e) => setEstimatedHours(e.target.value)} placeholder="e.g., 2.5" className="h-9 text-sm" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1 border-t border-border/30">
        <Button type="button" variant="outline" onClick={onCancel} className="h-10">Cancel</Button>
        <Button type="submit" disabled={saving || !title.trim()} className="h-10 bg-brand text-white hover:bg-brand/90 px-6">
          {saving && <LogoSpinner size={16} />}
          {isEdit ? "Save Changes" : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
