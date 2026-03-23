"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, X, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  createRelationship,
  deleteRelationship,
} from "@/actions/relationships";
import {
  RELATIONSHIP_TYPES,
  RELATIONSHIP_TYPE_LABELS,
  RELATIONSHIP_TYPE_EMOJI,
  RELATIONSHIP_INVERSE,
  type RelationshipType,
} from "@/lib/constants/contacts";

type RelationshipContact = { id: string; name: string; type: string };

type RelationshipRow = {
  id: string;
  contact_a_id: string;
  contact_b_id: string;
  relationship_type: string;
  relationship_label: string | null;
  notes: string | null;
  contact_a: RelationshipContact;
  contact_b: RelationshipContact;
};

export function RelationshipManager({
  contactId,
  relationships,
  allContacts,
}: {
  contactId: string;
  relationships: RelationshipRow[];
  allContacts: { id: string; name: string }[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form state
  const [selectedContactId, setSelectedContactId] = useState("");
  const [selectedType, setSelectedType] = useState<RelationshipType>("friend");
  const [notes, setNotes] = useState("");

  // Contacts already in a relationship with this contact
  const relatedContactIds = new Set(
    relationships.map((r) =>
      r.contact_a_id === contactId ? r.contact_b_id : r.contact_a_id
    )
  );

  const availableContacts = allContacts.filter(
    (c) => c.id !== contactId && !relatedContactIds.has(c.id)
  );

  function resetForm() {
    setSelectedContactId("");
    setSelectedType("friend");
    setNotes("");
    setShowForm(false);
  }

  function handleCreate() {
    if (!selectedContactId) return;
    startTransition(async () => {
      await createRelationship({
        contact_a_id: contactId,
        contact_b_id: selectedContactId,
        relationship_type: selectedType,
        notes: notes || undefined,
      });
      resetForm();
    });
  }

  function handleDelete(relationshipId: string) {
    startTransition(async () => {
      await deleteRelationship(relationshipId, contactId);
    });
  }

  /** Resolve the "other" contact and the display label for this contact's perspective */
  function resolveRelationship(r: RelationshipRow) {
    const isA = r.contact_a_id === contactId;
    const other = isA ? r.contact_b : r.contact_a;
    const rawType = r.relationship_type as RelationshipType;

    // If this contact is contact_b, we need the inverse label
    // e.g., if A is "parent" of B, then on B's page we show "child"
    const displayType = isA
      ? rawType
      : (RELATIONSHIP_INVERSE[rawType] ?? rawType);

    return { other, displayType };
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <span>👥</span>
          Relationships
        </h3>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        )}
      </div>

      {/* Relationship List */}
      {relationships.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground text-center py-3">
          No relationships added yet.
        </p>
      )}

      {relationships.map((r) => {
        const { other, displayType } = resolveRelationship(r);
        const emoji =
          RELATIONSHIP_TYPE_EMOJI[displayType as RelationshipType] ?? "👤";
        const label =
          RELATIONSHIP_TYPE_LABELS[displayType as RelationshipType] ??
          displayType;

        return (
          <div
            key={r.id}
            className="flex items-start justify-between p-2.5 rounded-lg bg-muted/30 group"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Link
                  href={`/contacts/${other.id}`}
                  className="text-sm font-medium hover:text-primary transition-colors truncate"
                >
                  {other.name}
                </Link>
                <Badge
                  variant="secondary"
                  className="text-[10px] capitalize shrink-0"
                >
                  {emoji} {label}
                </Badge>
              </div>
              {r.relationship_label && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {r.relationship_label}
                </p>
              )}
              {r.notes && (
                <p className="text-xs text-muted-foreground italic mt-0.5">
                  {r.notes}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => handleDelete(r.id)}
              className="p-1 text-muted-foreground hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
              disabled={isPending}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        );
      })}

      {/* Add Form */}
      {showForm && (
        <div className="p-3 rounded-lg border border-border bg-background space-y-2.5">
          <select
            value={selectedContactId}
            onChange={(e) => setSelectedContactId(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          >
            <option value="">Select contact...</option>
            {availableContacts.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={selectedType}
            onChange={(e) =>
              setSelectedType(e.target.value as RelationshipType)
            }
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          >
            {RELATIONSHIP_TYPES.map((type) => (
              <option key={type} value={type}>
                {RELATIONSHIP_TYPE_EMOJI[type]} {RELATIONSHIP_TYPE_LABELS[type]}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-2.5 py-1.5 text-sm border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            disabled={isPending}
          />
          <div className="flex items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={handleCreate}
              disabled={!selectedContactId || isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
              Add Relationship
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
