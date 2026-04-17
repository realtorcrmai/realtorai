"use client";

import { useState, useEffect, useCallback } from "react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ApiKey {
  id: string;
  key_prefix: string;
  name: string;
  last_used_at: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function AssistantSetup() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /* Fetch keys */
  const fetchKeys = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/voice-agent/keys");
      if (!res.ok) throw new Error("Failed to fetch keys");
      const data = await res.json();
      setKeys(data.keys ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load keys");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  /* Create key */
  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    setError(null);
    setCreatedKey(null);
    try {
      const res = await fetch("/api/voice-agent/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to create key");
      }
      const data = await res.json();
      setCreatedKey(data.raw_key ?? null);
      setNewKeyName("");
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  };

  /* Revoke key */
  const handleRevoke = async (id: string) => {
    if (!confirm("Are you sure you want to revoke this API key? This cannot be undone.")) return;
    setRevoking(id);
    setError(null);
    try {
      const res = await fetch(`/api/voice-agent/keys?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error ?? "Failed to revoke key");
      }
      await fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke key");
    } finally {
      setRevoking(null);
    }
  };

  /* Copy to clipboard */
  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* fallback: select text */
    }
  };

  /* --- Render ------------------------------------------------------ */

  return (
    <div className="space-y-8">
      {/* ---- Assistant Platform Cards ---- */}

      <AssistantCard
        emoji="🍎"
        name="Apple Siri"
        description="Use Siri Shortcuts to interact with your CRM via voice on iPhone, iPad, Apple Watch, and HomePod."
        steps={[
          "Open the Shortcuts app on your iOS device",
          "Tap + to create a new shortcut",
          'Add a "Get Contents of URL" action pointing to your Magnate voice endpoint',
          "Set the method to POST and add your API key as a header",
          'Add to Siri with a phrase like "Hey Siri, check my listings"',
        ]}
        statusLabel="Requires iOS Shortcut"
        statusVariant="pending"
        actionLabel="Download Shortcut Template"
        actionDisabled
      />

      <AssistantCard
        emoji="🟢"
        name="Google Assistant"
        description="Link your Magnate account to Google Assistant for voice access on Android, Google Home, and Nest devices."
        steps={[
          'Open the Google Home app and go to Settings > Works with Google',
          'Search for "Magnate" and tap Link Account',
          "Sign in with your CRM credentials",
          "Grant voice access permissions",
          'Say "Hey Google, ask Magnate about my showings"',
        ]}
        statusLabel="Not Linked"
        statusVariant="pending"
        actionLabel="Link Google Account"
        actionDisabled
      />

      <AssistantCard
        emoji="🔵"
        name="Amazon Alexa"
        description="Enable the Magnate Alexa skill for voice access on Echo devices and the Alexa app."
        steps={[
          'Open the Alexa app and search Skills for "Magnate"',
          "Tap Enable Skill and link your CRM account",
          "Complete the account linking flow",
          'Say "Alexa, open Magnate" to start a session',
        ]}
        statusLabel="Not Linked"
        statusVariant="pending"
        actionLabel="Enable Alexa Skill"
        actionDisabled
      />

      <AssistantCard
        emoji="🟣"
        name="Microsoft Cortana"
        description="Connect Magnate to Cortana for voice commands on Windows devices and Microsoft 365."
        steps={[
          "Open Windows Settings > Cortana",
          "Enable third-party skill connections",
          'Search for "Magnate" in Connected Services',
          "Authorize the connection with your API key",
        ]}
        statusLabel="Not Linked"
        statusVariant="pending"
        actionLabel="Connect Cortana"
        actionDisabled
      />

      {/* ---- API Keys Section ---- */}

      <div className="lf-card p-5">
        <h2 className="text-base font-semibold mb-1">🔑 API Keys</h2>
        <p className="text-xs text-[var(--lf-muted)] mb-4">
          Manage API keys for programmatic access to the voice agent. Keys are shown only once at creation.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-xs">
            {error}
          </div>
        )}

        {/* Created key banner */}
        {createdKey && (
          <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-xs font-semibold text-amber-800 mb-2">
              ⚠️ Copy this key now — it will not be shown again!
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-white p-2 rounded border border-amber-100 break-all font-mono">
                {createdKey}
              </code>
              <button
                onClick={() => handleCopy(createdKey)}
                className="lf-btn-sm lf-btn-ghost shrink-0"
              >
                {copied ? "✅ Copied" : "📋 Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Create new key */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            className="lf-input flex-1"
            placeholder="Key name (e.g. Production, Staging)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            aria-label="New API key name"
          />
          <button
            onClick={handleCreate}
            className="lf-btn"
            disabled={creating || !newKeyName.trim()}
          >
            {creating ? "Creating..." : "Create Key"}
          </button>
        </div>

        {/* Keys list */}
        {loading ? (
          <p className="text-xs text-[var(--lf-muted)]">Loading keys...</p>
        ) : keys.length === 0 ? (
          <p className="text-xs text-[var(--lf-muted)]">No API keys created yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-[var(--lf-muted)] border-b border-gray-100">
                  <th className="text-left py-2 font-medium">Prefix</th>
                  <th className="text-left py-2 font-medium">Name</th>
                  <th className="text-left py-2 font-medium">Created</th>
                  <th className="text-left py-2 font-medium">Last Used</th>
                  <th className="text-right py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                    <td className="py-2 font-mono">{key.key_prefix}...</td>
                    <td className="py-2">{key.name}</td>
                    <td className="py-2 text-[var(--lf-muted)]">
                      {new Date(key.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 text-[var(--lf-muted)]">
                      {key.last_used_at
                        ? new Date(key.last_used_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => handleRevoke(key.id)}
                        className="lf-btn-sm lf-btn-danger"
                        disabled={revoking === key.id}
                      >
                        {revoking === key.id ? "Revoking..." : "Revoke"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  AssistantCard                                                       */
/* ------------------------------------------------------------------ */

function AssistantCard({
  emoji,
  name,
  description,
  steps,
  statusLabel,
  statusVariant,
  actionLabel,
  actionDisabled,
}: {
  emoji: string;
  name: string;
  description: string;
  steps: string[];
  statusLabel: string;
  statusVariant: "done" | "active" | "pending" | "blocked";
  actionLabel: string;
  actionDisabled?: boolean;
}) {
  return (
    <div className="lf-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <h2 className="text-base font-semibold">{name}</h2>
            <p className="text-xs text-[var(--lf-muted)] mt-0.5">{description}</p>
          </div>
        </div>
        <span className={`lf-badge lf-badge-${statusVariant} shrink-0`}>
          {statusLabel}
        </span>
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-semibold text-[var(--lf-muted)] uppercase tracking-wider mb-2">
          Setup Steps
        </h3>
        <ol className="list-decimal list-inside space-y-1.5 text-xs text-[var(--lf-text)]">
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="mt-4">
        <button className="lf-btn-sm lf-btn-ghost" disabled={actionDisabled}>
          {actionLabel}
        </button>
      </div>
    </div>
  );
}
