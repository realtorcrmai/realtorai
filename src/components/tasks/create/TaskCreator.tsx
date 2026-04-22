"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ListTodo, ChevronDown, ChevronUp, X } from "lucide-react";
import Link from "next/link";
import { PrioritySelector } from "./PrioritySelector";
import { CategorySelector } from "./CategorySelector";
import { TaskPreviewCard } from "./TaskPreviewCard";
import { useTeamMembers } from "@/hooks/useTasks";
import type { Contact } from "@/types";

interface ListingOption {
  id: string;
  address: string;
}

export function TaskCreator() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLinks, setShowLinks] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("general");
  const [dueDate, setDueDate] = useState("");
  const [contactId, setContactId] = useState("");
  const [listingId, setListingId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const { members: teamMembers } = useTeamMembers();

  // Loaded from API
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [listings, setListings] = useState<ListingOption[]>([]);
  const [loadingRefs, setLoadingRefs] = useState(false);

  // Load contacts + listings when "Link to" is expanded
  useEffect(() => {
    if (!showLinks) return;
    setLoadingRefs(true);
    Promise.all([
      fetch("/api/contacts").then((r) => r.json()).catch(() => []),
      fetch("/api/listings").then((r) => r.json()).then((j) => j.data ?? j).catch(() => []),
    ]).then(([c, l]) => {
      setContacts(Array.isArray(c) ? c : []);
      setListings(Array.isArray(l) ? l : []);
      setLoadingRefs(false);
    });
  }, [showLinks]);

  const selectedContact = contacts.find((c) => c.id === contactId);
  const selectedListing = listings.find((l) => l.id === listingId);
  const canSubmit = title.trim().length >= 1;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        category,
        due_date: dueDate || undefined,
        contact_id: contactId || undefined,
        listing_id: listingId || undefined,
        assigned_to: assignedTo || undefined,
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) {
        setError(result.error || "Failed to create task");
        setSubmitting(false);
        return;
      }

      router.push("/tasks");
      router.refresh();
    } catch {
      setError("Failed to create task. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-full overflow-y-auto bg-gradient-to-br from-[#FAF8F4] via-white to-[#0F7694]/3 dark:from-zinc-950 dark:via-background dark:to-[#1a1535]/5">
      {/* Header */}
      <div className="border-b border-border/30 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/tasks"
              className="p-2 -ml-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
                <ListTodo className="h-5 w-5 text-brand" />
                Create a Task
              </h1>
              <p className="text-sm text-muted-foreground">Add something to your to-do list</p>
            </div>
          </div>
          <div />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* LEFT — Form */}
        <div className="flex-1 min-w-0">
          {error && (
            <div className="mb-6 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/30 text-sm text-red-700 dark:text-red-300 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
            </div>
          )}

          <div className="space-y-8">
            {/* Section 1: What needs to be done? */}
            <div className="space-y-4">
              <SectionLabel number={1} label="What needs to be done?" required />
              <div>
                <label className="text-sm font-medium mb-1.5 block">Title <span className="text-red-400">*</span></label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Call Sarah about the offer"
                  className="h-11 text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Description</label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Any additional details or context..."
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </div>

            {/* Section 2: Priority */}
            <div className="space-y-4">
              <SectionLabel number={2} label="How urgent is it?" />
              <PrioritySelector value={priority} onChange={setPriority} />
            </div>

            {/* Section 3: Category */}
            <div className="space-y-4">
              <SectionLabel number={3} label="What kind of task?" />
              <CategorySelector value={category} onChange={setCategory} />
            </div>

            {/* Section 4: Due Date */}
            <div className="space-y-4">
              <SectionLabel number={4} label="When is it due?" />
              <div className="p-4 rounded-xl bg-brand-muted dark:bg-foreground/10 border border-brand/15 dark:border-brand/10">
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="h-11 text-sm"
                />
                {!dueDate && <p className="text-xs text-muted-foreground/60 mt-1.5">Optional — leave blank for no deadline</p>}
              </div>
            </div>

            {/* Section 5: Assign To (team members) */}
            {teamMembers.length > 1 && (
              <div className="space-y-4">
                <SectionLabel number={5} label="Assign to" />
                <div className="p-4 rounded-xl bg-brand-muted dark:bg-foreground/10 border border-brand/15 dark:border-brand/10">
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full h-11 px-3 text-sm rounded-lg border border-border bg-background"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}{m.is_current ? " (me)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Section 6: Link to contact/listing (collapsible) */}
            <div className="space-y-4">
              <button
                type="button"
                onClick={() => setShowLinks(!showLinks)}
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {showLinks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Link to a contact or listing (optional)
              </button>

              {showLinks && (
                <div className="space-y-3 animate-float-in p-4 rounded-xl bg-[#FAF8F4] dark:bg-foreground/10 border border-border/30">
                  {loadingRefs ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Contact</label>
                        <select
                          value={contactId}
                          onChange={(e) => setContactId(e.target.value)}
                          className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                        >
                          <option value="">None</option>
                          {contacts.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground mb-1 block">Listing</label>
                        <select
                          value={listingId}
                          onChange={(e) => setListingId(e.target.value)}
                          className="w-full h-10 rounded-lg border border-border bg-background px-3 text-sm"
                        >
                          <option value="">None</option>
                          {listings.map((l) => (
                            <option key={l.id} value={l.id}>{l.address}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div className="hidden lg:block w-[340px] shrink-0">
          <div className="fixed" style={{ width: "340px", top: "140px", maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Live Preview</p>
            <TaskPreviewCard
              title={title}
              description={description}
              priority={priority}
              category={category}
              dueDate={dueDate}
              contactName={selectedContact?.name || ""}
              listingAddress={selectedListing?.address || ""}
            />
            <p className="text-xs text-muted-foreground text-center mt-3 italic">
              This is how the task will appear in your list
            </p>

            <Button
              disabled={!canSubmit || submitting}
              onClick={handleSubmit}
              className="w-full mt-4 h-12 text-base font-semibold bg-brand hover:from-[#67D4E8] hover:to-[#1a1535] shadow-lg rounded-xl"
              size="lg"
            >
              {submitting ? "Creating..." : canSubmit ? "Create Task →" : "Enter a title *"}
            </Button>

            {canSubmit && (
              <p className="text-xs text-brand text-center mt-1.5 font-medium">Ready to create</p>
            )}
          </div>
        </div>
      </div>

      <div className="h-8" />
    </div>
  );
}

// ── Section Label ──────────────────────────
function SectionLabel({ number, label, optional, required }: { number: number; label: string; optional?: boolean; required?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white text-xs font-bold shadow-sm">
        {number}
      </div>
      <h2 className="text-sm font-semibold">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </h2>
      {optional && <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">optional</span>}
    </div>
  );
}
