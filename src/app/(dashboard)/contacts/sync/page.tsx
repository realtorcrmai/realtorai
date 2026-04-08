"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface SyncSource {
  id: string;
  provider: string;
  provider_account_name: string;
  is_active: boolean;
  auto_sync: boolean;
  last_synced_at: string | null;
  total_synced: number;
  total_duplicates_merged: number;
  sync_error: string | null;
}

interface SyncResult {
  ok: boolean;
  imported: number;
  skipped: number;
  duplicates: number;
  total: number;
  message: string;
  errors?: string[];
}

const PROVIDERS = [
  {
    id: "google",
    name: "Google Contacts",
    icon: "📱",
    desc: "Import contacts from your Google account. Auto-syncs every 6 hours.",
    type: "oauth" as const,
    autoSync: true,
  },
  {
    id: "outlook",
    name: "Outlook / Microsoft",
    icon: "📧",
    desc: "Export as vCard from Outlook, then upload via Apple Contacts / vCard below.",
    type: "oauth" as const,
    autoSync: true,
    comingSoon: false,
    redirectToImport: true,
  },
  {
    id: "fub",
    name: "Follow Up Boss",
    icon: "🏠",
    desc: "Import contacts using your FUB API key. One-time import.",
    type: "apikey" as const,
    autoSync: false,
    placeholder: "Paste your Follow Up Boss API key",
    helpUrl: "https://docs.followupboss.com/reference/getting-started",
  },
  {
    id: "vcf",
    name: "Apple Contacts / vCard",
    icon: "🍎",
    desc: "Export from Apple Contacts, iPhone, Outlook, or any app as .vcf file.",
    type: "file" as const,
    autoSync: false,
  },
  {
    id: "csv",
    name: "CSV File Upload",
    icon: "📄",
    desc: "Upload a CSV file from any CRM or spreadsheet.",
    type: "file" as const,
    autoSync: false,
  },
];

export default function ContactSyncPage() {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState("");
  const [fubApiKey, setFubApiKey] = useState("");
  const [showFubInput, setShowFubInput] = useState(false);
  const [sources, setSources] = useState<SyncSource[]>([]);

  // Load connected sources
  useEffect(() => {
    fetch("/api/contacts/sync/sources")
      .then((r) => r.ok ? r.json() : { sources: [] })
      .then((d) => setSources(d.sources || []))
      .catch(() => {});
  }, [result]);

  const handleGoogleSync = async () => {
    setSyncing("google");
    setResult(null);
    setError("");
    try {
      const res = await fetch("/api/contacts/sync/google", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Google sync failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Google sync failed. Please try again.");
    }
    setSyncing(null);
  };

  const handleFubSync = async () => {
    if (!fubApiKey.trim()) {
      setError("Please enter your Follow Up Boss API key");
      return;
    }
    setSyncing("fub");
    setResult(null);
    setError("");
    try {
      const res = await fetch("/api/contacts/sync/fub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: fubApiKey.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "FUB import failed");
      } else {
        setResult(data);
        setShowFubInput(false);
        setFubApiKey("");
      }
    } catch {
      setError("Follow Up Boss import failed. Please check your API key.");
    }
    setSyncing(null);
  };

  const getSourceStatus = (providerId: string) => {
    return sources.find((s) => s.provider === providerId);
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Link href="/contacts" className="text-sm text-[var(--lf-text)]/50 hover:text-[var(--lf-text)]">
            ← Contacts
          </Link>
        </div>
        <h1 className="text-xl font-bold text-[var(--lf-text)]">🔄 Sync Contacts</h1>
        <p className="text-sm text-[var(--lf-text)]/60">
          Connect your existing tools — we'll import everything automatically
        </p>
      </div>

      {/* Result banner */}
      {result && (
        <div className="mb-4 p-4 bg-[#0F7694]/5 border border-[#0F7694]/20 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">🎉</span>
            <span className="font-semibold text-[#0A6880]">{result.message}</span>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="text-[#0A6880]">✅ {result.imported} imported</span>
            <span className="text-yellow-700">⏭️ {result.skipped} skipped</span>
            <span className="text-[#0A6880]">🔄 {result.duplicates} duplicates</span>
            <span className="text-gray-600">📊 {result.total} total</span>
          </div>
          {result.errors && result.errors.length > 0 && (
            <div className="mt-2 text-xs text-red-600">
              {result.errors.slice(0, 3).map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Auto-Sync Sources */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--lf-text)]/70 uppercase tracking-wider mb-3">
          Automatic Sync
        </h2>
        <p className="text-xs text-[var(--lf-text)]/50 mb-3">Connect once, stays updated automatically</p>

        <div className="space-y-3">
          {PROVIDERS.filter((p) => p.autoSync).map((provider) => {
            const status = getSourceStatus(provider.id);
            const isConnected = !!status && status.is_active;

            return (
              <div key={provider.id} className="lf-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{provider.name}</div>
                      <div className="text-xs text-[var(--lf-text)]/50">{provider.desc}</div>
                      {isConnected && status && (
                        <div className="text-xs text-[#0F7694] mt-0.5">
                          ✅ {status.total_synced} contacts synced
                          {status.last_synced_at && ` · Last: ${new Date(status.last_synced_at).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {"redirectToImport" in provider && provider.redirectToImport ? (
                      <Link href="/contacts/import" className="lf-btn text-xs px-4 py-1.5">
                        Upload vCard
                      </Link>
                    ) : "comingSoon" in provider && provider.comingSoon ? (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">Coming Soon</span>
                    ) : isConnected ? (
                      <button
                        onClick={provider.id === "google" ? handleGoogleSync : undefined}
                        disabled={syncing === provider.id}
                        className="lf-btn-ghost text-xs px-3 py-1.5"
                      >
                        {syncing === provider.id ? "Syncing..." : "🔄 Re-sync"}
                      </button>
                    ) : (
                      <button
                        onClick={provider.id === "google" ? handleGoogleSync : undefined}
                        disabled={syncing === provider.id}
                        className="lf-btn text-xs px-4 py-1.5"
                      >
                        {syncing === provider.id ? "Connecting..." : "Connect"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* One-Time Import Sources */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-[var(--lf-text)]/70 uppercase tracking-wider mb-3">
          One-Time Import
        </h2>
        <p className="text-xs text-[var(--lf-text)]/50 mb-3">Pull contacts once from these sources</p>

        <div className="space-y-3">
          {PROVIDERS.filter((p) => !p.autoSync).map((provider) => {
            const status = getSourceStatus(provider.id);

            return (
              <div key={provider.id} className="lf-card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <div className="font-semibold text-sm">{provider.name}</div>
                      <div className="text-xs text-[var(--lf-text)]/50">{provider.desc}</div>
                      {status && (
                        <div className="text-xs text-[#0F7694] mt-0.5">
                          ✅ {status.total_synced} contacts imported
                          {status.last_synced_at && ` · ${new Date(status.last_synced_at).toLocaleDateString()}`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    {provider.id === "vcf" ? (
                      <Link href="/contacts/import" className="lf-btn text-xs px-4 py-1.5">
                        Upload vCard
                      </Link>
                    ) : provider.id === "csv" ? (
                      <Link href="/contacts/import" className="lf-btn text-xs px-4 py-1.5">
                        Upload CSV
                      </Link>
                    ) : provider.id === "fub" ? (
                      <button
                        onClick={() => setShowFubInput(!showFubInput)}
                        disabled={syncing === "fub"}
                        className="lf-btn text-xs px-4 py-1.5"
                      >
                        {syncing === "fub" ? "Importing..." : showFubInput ? "Cancel" : "Enter API Key"}
                      </button>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-500 rounded-full">Coming Soon</span>
                    )}
                  </div>
                </div>

                {/* FUB API key input */}
                {provider.id === "fub" && showFubInput && (
                  <div className="mt-3 pt-3 border-t flex gap-2">
                    <input
                      type="password"
                      value={fubApiKey}
                      onChange={(e) => setFubApiKey(e.target.value)}
                      placeholder={provider.placeholder}
                      className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm focus:border-[var(--lf-indigo)] focus:ring-1 focus:ring-[var(--lf-indigo)] outline-none"
                    />
                    <button
                      onClick={handleFubSync}
                      disabled={syncing === "fub" || !fubApiKey.trim()}
                      className="lf-btn text-xs px-4 py-2"
                    >
                      {syncing === "fub" ? "Importing..." : "Import"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Help text */}
      <div className="p-4 bg-gray-50 rounded-xl text-xs text-gray-600">
        <p className="font-medium mb-1">💡 How it works</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Duplicate contacts (same phone number) are automatically skipped</li>
          <li>Google Contacts auto-syncs every 6 hours when connected</li>
          <li>You can re-sync anytime to pull new contacts</li>
          <li>Imported contacts appear in your Contacts list immediately</li>
          <li>Original source is tracked — you can filter by source later</li>
        </ul>
      </div>
    </div>
  );
}
