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

type Contact = { id: string; name: string; type: string };
type Listing = { id: string; address: string };

type TaskData = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  category: string;
  due_date: string | null;
  contact_id: string | null;
  listing_id: string | null;
};

interface TaskFormProps {
  task?: TaskData;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TaskForm({ task, onSuccess, onCancel }: TaskFormProps) {
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title || "");
  const [description, setDescription] = useState(task?.description || "");
  const [priority, setPriority] = useState(task?.priority || "medium");
  const [category, setCategory] = useState(task?.category || "general");
  const [dueDate, setDueDate] = useState(task?.due_date?.slice(0, 10) || "");
  const [contactId, setContactId] = useState(task?.contact_id || "");
  const [listingId, setListingId] = useState(task?.listing_id || "");
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
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || null,
        priority,
        category,
        due_date: dueDate || null,
        contact_id: contactId && contactId !== "none" ? contactId : null,
        listing_id: listingId && listingId !== "none" ? listingId : null,
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
      const msg = err instanceof Error ? err.message : "Unknown error";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Follow up with buyer about 123 Main St"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Additional details..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(val) => val && setPriority(val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(val) => val && setCategory(val)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="follow_up">Follow Up</SelectItem>
              <SelectItem value="showing">Showing</SelectItem>
              <SelectItem value="document">Document</SelectItem>
              <SelectItem value="listing">Listing</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="inspection">Inspection</SelectItem>
              <SelectItem value="closing">Closing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Related Contact</Label>
          <Select value={contactId || "none"} onValueChange={(val) => setContactId(val === "none" ? "" : (val ?? ""))}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {contacts.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Related Listing</Label>
          <Select value={listingId || "none"} onValueChange={(val) => setListingId(val === "none" ? "" : (val ?? ""))}>
            <SelectTrigger>
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {listings.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <LogoSpinner size={16} />}
          {isEdit ? "Save Changes" : "Create Task"}
        </Button>
      </div>
    </form>
  );
}
