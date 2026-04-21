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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Follow up with buyer about 123 Main St" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details..." rows={2} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(val) => val && setPriority(val)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">🟢 Low</SelectItem>
              <SelectItem value="medium">🔵 Medium</SelectItem>
              <SelectItem value="high">🟠 High</SelectItem>
              <SelectItem value="urgent">🔴 Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(val) => val && setCategory(val)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="general">📋 General</SelectItem>
              <SelectItem value="follow_up">📞 Follow Up</SelectItem>
              <SelectItem value="showing">🏠 Showing</SelectItem>
              <SelectItem value="document">📄 Document</SelectItem>
              <SelectItem value="listing">🏢 Listing</SelectItem>
              <SelectItem value="marketing">📣 Marketing</SelectItem>
              <SelectItem value="inspection">🔍 Inspection</SelectItem>
              <SelectItem value="closing">✅ Closing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Start Date</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Due Date</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      {/* Team assignment */}
      {teamMembers.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Assign To</Label>
            <Select value={assignedTo || "none"} onValueChange={(val) => setAssignedTo(val === "none" ? "" : (val ?? ""))}>
              <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
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
          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(val) => val && setVisibility(val)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Private</SelectItem>
                <SelectItem value="team">Team</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Related Contact</Label>
          <Select value={contactId || "none"} onValueChange={(val) => setContactId(val === "none" ? "" : (val ?? ""))}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} ({c.type})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Related Listing</Label>
          <Select value={listingId || "none"} onValueChange={(val) => setListingId(val === "none" ? "" : (val ?? ""))}>
            <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
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
        <div className="space-y-2">
          <Label>Repeat</Label>
          <Select value={recurrenceRule || "none"} onValueChange={(val) => setRecurrenceRule(val === "none" ? "" : (val ?? ""))}>
            <SelectTrigger><SelectValue placeholder="No Repeat" /></SelectTrigger>
            <SelectContent>
              {RECURRENCE_PRESETS.map((p) => (
                <SelectItem key={p.value || "none"} value={p.value || "none"}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Estimated Hours</Label>
          <Input type="number" step="0.5" min="0" value={estimatedHours}
            onChange={(e) => setEstimatedHours(e.target.value)} placeholder="e.g., 2.5" />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving} className="bg-brand text-white hover:bg-brand/90">
          {saving && <LogoSpinner size={16} />}
          {isEdit ? "Save Changes" : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
