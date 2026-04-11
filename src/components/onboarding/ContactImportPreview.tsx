"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, Building2, Loader2 } from "lucide-react";

interface ImportContact {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  resourceName?: string;
  already_exists?: boolean;
}

interface Props {
  contacts: ImportContact[];
  source: "gmail" | "apple";
  onImport: (selected: ImportContact[]) => Promise<void>;
  onBack: () => void;
  onSkip?: () => void;
}

export function ContactImportPreview({ contacts, source, onImport, onBack, onSkip }: Props) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "has_email" | "has_phone" | "has_both">("has_email");
  const [selected, setSelected] = useState<Set<number>>(() => {
    // Default: select all non-duplicate contacts with email
    const set = new Set<number>();
    contacts.forEach((c, i) => {
      if (!c.already_exists && c.email) set.add(i);
    });
    return set;
  });
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const filtered = useMemo(() => {
    return contacts
      .map((c, i) => ({ ...c, _index: i }))
      .filter((c) => {
        // Search filter
        if (search) {
          const q = search.toLowerCase();
          if (
            !c.name.toLowerCase().includes(q) &&
            !c.email?.toLowerCase().includes(q) &&
            !c.phone?.includes(q)
          )
            return false;
        }
        // Type filter
        if (filter === "has_email" && !c.email) return false;
        if (filter === "has_phone" && !c.phone) return false;
        if (filter === "has_both" && (!c.email || !c.phone)) return false;
        return true;
      });
  }, [contacts, search, filter]);

  const selectedCount = selected.size;
  const allFilteredSelected = filtered.every(
    (c) => selected.has(c._index) || c.already_exists
  );

  const toggleAll = () => {
    if (allFilteredSelected) {
      const newSet = new Set(selected);
      filtered.forEach((c) => newSet.delete(c._index));
      setSelected(newSet);
    } else {
      const newSet = new Set(selected);
      filtered.forEach((c) => {
        if (!c.already_exists) newSet.add(c._index);
      });
      setSelected(newSet);
    }
  };

  const toggleOne = (index: number) => {
    const newSet = new Set(selected);
    if (newSet.has(index)) newSet.delete(index);
    else newSet.add(index);
    setSelected(newSet);
  };

  const handleImport = async () => {
    const selectedContacts = contacts.filter((_, i) => selected.has(i));
    if (selectedContacts.length === 0) return;

    setImporting(true);
    setProgress(0);

    // Simulate progress updates
    const interval = setInterval(() => {
      setProgress((p) => Math.min(p + 10, 90));
    }, 200);

    try {
      await onImport(selectedContacts);
      setProgress(100);
    } finally {
      clearInterval(interval);
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {contacts.length} contacts found
          </h3>
          <p className="text-sm text-muted-foreground">
            {contacts.filter((c) => c.already_exists).length} already in your CRM
          </p>
        </div>
        <p className="text-sm font-medium text-primary">
          {selectedCount} selected
        </p>
      </div>

      {/* Search + filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1">
          {(["all", "has_email", "has_phone", "has_both"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="text-xs h-9"
            >
              {f === "all" ? "All" : f === "has_email" ? "Has email" : f === "has_phone" ? "Has phone" : "Both"}
            </Button>
          ))}
        </div>
      </div>

      {/* Select all */}
      <div className="flex items-center gap-2 py-2 border-b">
        <input
          type="checkbox"
          checked={allFilteredSelected}
          onChange={toggleAll}
          aria-label="Select all"
          className="h-4 w-4 rounded border-gray-300"
        />
        <span className="text-xs text-muted-foreground">
          Select all ({filtered.filter((c) => !c.already_exists).length} importable)
        </span>
      </div>

      {/* Contact list */}
      <div className="max-h-[350px] overflow-y-auto space-y-1 pr-1">
        {filtered.map((contact) => (
          <div
            key={contact._index}
            className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
              contact.already_exists
                ? "opacity-50 bg-amber-50"
                : selected.has(contact._index)
                  ? "bg-primary/5"
                  : "hover:bg-muted/50"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.has(contact._index)}
              disabled={contact.already_exists}
              onChange={() => toggleOne(contact._index)}
              aria-label={`Select ${contact.name}`}
              className="h-4 w-4 rounded border-gray-300"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{contact.name}</span>
                {contact.already_exists && (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium shrink-0">
                    Already exists
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                {contact.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {contact.email}
                  </span>
                )}
                {contact.phone && (
                  <span className="flex items-center gap-1 shrink-0">
                    <Phone className="h-3 w-3" />
                    {contact.phone}
                  </span>
                )}
                {contact.company && (
                  <span className="flex items-center gap-1 truncate">
                    <Building2 className="h-3 w-3 shrink-0" />
                    {contact.company}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No contacts match your search
          </p>
        )}
      </div>

      {/* Import progress */}
      {importing && (
        <div className="space-y-2">
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#67D4E8] to-[#0F7694] rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Importing... {Math.round((progress / 100) * selectedCount)}/{selectedCount}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={onBack} disabled={importing}>
          Back
        </Button>
        <Button
          className="flex-1"
          disabled={selectedCount === 0 || importing}
          onClick={handleImport}
        >
          {importing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Import {selectedCount} contact{selectedCount !== 1 ? "s" : ""}
        </Button>
      </div>
      {onSkip && (
        <button
          onClick={onSkip}
          className="w-full text-xs text-muted-foreground hover:underline text-center mt-2"
        >
          Continue without importing
        </button>
      )}
    </div>
  );
}
