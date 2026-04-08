"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";

interface GmailContact {
  resourceName: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  already_exists: boolean;
}

interface ImportResult {
  imported: number;
  skipped: number;
  total: number;
}

type Step = "loading" | "error" | "picker" | "importing" | "done";

export default function ImportGmailPage() {
  const [step, setStep] = useState<Step>("loading");
  const [contacts, setContacts] = useState<GmailContact[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  // Fetch Gmail contacts on mount
  useEffect(() => {
    fetch("/api/contacts/import-gmail")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setFetchError(data.error || "Failed to load contacts");
          setStep("error");
          return;
        }
        setContacts(data.contacts || []);
        // Auto-select all new (non-duplicate) contacts
        const newIds = new Set<string>(
          (data.contacts || [])
            .filter((c: GmailContact) => !c.already_exists && c.phone)
            .map((c: GmailContact) => c.resourceName)
        );
        setSelected(newIds);
        setStep("picker");
      })
      .catch(() => {
        setFetchError("Failed to load contacts. Please try again.");
        setStep("error");
      });
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return contacts;
    const q = search.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.company?.toLowerCase().includes(q)
    );
  }, [contacts, search]);

  const newContacts = useMemo(
    () => contacts.filter((c) => !c.already_exists && c.phone),
    [contacts]
  );

  const toggleAll = useCallback(() => {
    const newIds = filtered
      .filter((c) => !c.already_exists && c.phone)
      .map((c) => c.resourceName);
    const allSelected = newIds.every((id) => selected.has(id));
    if (allSelected) {
      setSelected((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }, [filtered, selected]);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleImport = async () => {
    if (selected.size === 0) return;
    setStep("importing");

    const toImport = contacts.filter((c) => selected.has(c.resourceName));

    try {
      const res = await fetch("/api/contacts/import-gmail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: toImport }),
      });
      const data = await res.json();
      setResult(data);
      setStep("done");
    } catch {
      setFetchError("Import failed. Please try again.");
      setStep("picker");
    }
  };

  // ── Loading ──────────────────────────────────────────────────
  if (step === "loading") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader />
        <div className="lf-card p-12 text-center">
          <div className="text-4xl mb-4 animate-pulse">📱</div>
          <p className="text-sm text-[var(--lf-text)]/60">Loading your Google Contacts...</p>
        </div>
      </div>
    );
  }

  // ── Error / Not connected ────────────────────────────────────
  if (step === "error") {
    const needsAuth = fetchError.includes("Google not connected") || fetchError.includes("sign in");
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader />
        <div className="lf-card p-10 text-center">
          <div className="text-4xl mb-4">{needsAuth ? "🔗" : "⚠️"}</div>
          <h2 className="text-lg font-semibold mb-2">
            {needsAuth ? "Google not connected" : "Could not load contacts"}
          </h2>
          <p className="text-sm text-[var(--lf-text)]/60 mb-6 max-w-sm mx-auto">{fetchError}</p>
          {needsAuth ? (
            <Link href="/api/auth/signin?callbackUrl=/contacts/import-gmail" className="lf-btn text-sm px-5 py-2">
              Connect Google Account →
            </Link>
          ) : (
            <button onClick={() => window.location.reload()} className="lf-btn text-sm px-5 py-2">
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Importing ────────────────────────────────────────────────
  if (step === "importing") {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader />
        <div className="lf-card p-12 text-center">
          <div className="text-4xl mb-4 animate-bounce">⏳</div>
          <h2 className="text-lg font-semibold mb-2">Importing {selected.size} contacts...</h2>
          <p className="text-sm text-gray-500">This may take a moment.</p>
        </div>
      </div>
    );
  }

  // ── Done ─────────────────────────────────────────────────────
  if (step === "done" && result) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PageHeader />
        <div className="lf-card p-10 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold mb-2">Import Complete</h2>
          <div className="grid grid-cols-3 gap-4 max-w-sm mx-auto my-6">
            <div className="p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-700">{result.imported}</div>
              <div className="text-xs text-green-600 mt-0.5">Imported</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-xl">
              <div className="text-2xl font-bold text-yellow-700">{result.skipped}</div>
              <div className="text-xs text-yellow-600 mt-0.5">Skipped</div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <div className="text-2xl font-bold text-gray-700">{result.total}</div>
              <div className="text-xs text-gray-500 mt-0.5">Total</div>
            </div>
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setStep("picker");
                setSelected(new Set());
              }}
              className="lf-btn-ghost text-sm px-4 py-2"
            >
              Import More
            </button>
            <Link href="/contacts" className="lf-btn text-sm px-4 py-2">
              View Contacts →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Picker ───────────────────────────────────────────────────
  const filteredNew = filtered.filter((c) => !c.already_exists && c.phone);
  const allFilteredNewSelected = filteredNew.length > 0 && filteredNew.every((c) => selected.has(c.resourceName));

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <PageHeader />

      {fetchError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {fetchError}
        </div>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        <span className="text-[var(--lf-text)]/60">{contacts.length} contacts in Google</span>
        <span className="text-green-700 font-medium">· {newContacts.length} new</span>
        <span className="text-gray-400">· {contacts.length - newContacts.length} already imported</span>
      </div>

      {/* Toolbar */}
      <div className="lf-card p-4 mb-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="🔍 Search contacts..."
            className="lf-input flex-1 text-sm"
          />
          <button onClick={toggleAll} className="lf-btn-ghost text-xs px-3 py-1.5 whitespace-nowrap">
            {allFilteredNewSelected ? "Deselect All" : "Select All New"}
          </button>
          <button
            onClick={handleImport}
            disabled={selected.size === 0}
            className="lf-btn text-sm px-4 py-1.5 whitespace-nowrap disabled:opacity-50"
          >
            Import {selected.size > 0 ? `${selected.size} ` : ""}Contacts
          </button>
        </div>
        {selected.size > 0 && (
          <p className="text-xs text-[var(--lf-indigo)] mt-2">
            ✅ {selected.size} contacts selected
          </p>
        )}
      </div>

      {/* Contact list */}
      <div className="lf-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--lf-text)]/50">
            No contacts match "{search}"
          </div>
        ) : (
          <div className="divide-y divide-border/40 max-h-[60vh] overflow-y-auto">
            {filtered.map((contact) => {
              const isSelected = selected.has(contact.resourceName);
              const isExisting = contact.already_exists;
              const hasPhone = !!contact.phone;
              const disabled = isExisting || !hasPhone;

              return (
                <div
                  key={contact.resourceName}
                  onClick={() => !disabled && toggle(contact.resourceName)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    disabled
                      ? "opacity-40 cursor-default"
                      : "cursor-pointer hover:bg-[var(--lf-indigo)]/5"
                  } ${isSelected ? "bg-[var(--lf-indigo)]/5" : ""}`}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      disabled
                        ? "border-gray-200 bg-gray-50"
                        : isSelected
                        ? "border-[var(--lf-indigo)] bg-[var(--lf-indigo)]"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && !disabled && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {isExisting && (
                      <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--lf-indigo)] to-[var(--lf-coral)] flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                    {contact.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{contact.name}</span>
                      {isExisting && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 flex-shrink-0">
                          In CRM
                        </span>
                      )}
                      {!hasPhone && !isExisting && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 flex-shrink-0">
                          No phone
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-[var(--lf-text)]/50 truncate">
                      {contact.phone
                        ? contact.phone
                        : contact.email
                        ? contact.email
                        : contact.company || "No contact info"}
                      {contact.phone && contact.email && (
                        <span className="ml-2 text-[var(--lf-text)]/30">{contact.email}</span>
                      )}
                    </div>
                  </div>

                  {contact.company && (
                    <span className="text-xs text-[var(--lf-text)]/40 hidden sm:block flex-shrink-0 max-w-[120px] truncate">
                      {contact.company}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-[var(--lf-text)]/40 text-center">
        Contacts without a phone number cannot be imported · Existing CRM contacts are greyed out
      </p>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-1">
        <Link href="/contacts/sync" className="text-sm text-[var(--lf-text)]/50 hover:text-[var(--lf-text)]">
          ← Sync Contacts
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-xl">
          📱
        </div>
        <div>
          <h1 className="text-xl font-bold text-[var(--lf-text)]">Import from Google Contacts</h1>
          <p className="text-sm text-[var(--lf-text)]/60">
            Select contacts to import into your CRM
          </p>
        </div>
      </div>
    </div>
  );
}
