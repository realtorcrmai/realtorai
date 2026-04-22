"use client";

import { useState } from "react";

/**
 * Siri Shortcut download component.
 * Generates Apple Shortcuts configuration for voice commands.
 * Each shortcut: Dictate Text → POST to /api/voice-agent/quick → Speak Response.
 */

interface Shortcut {
  name: string;
  phrase: string;
  description: string;
  icon: string;
}

const SHORTCUTS: Shortcut[] = [
  {
    name: "Check My Leads",
    phrase: "check my Magnate leads",
    description: "Ask about new leads and inquiries",
    icon: "👥",
  },
  {
    name: "Schedule a Showing",
    phrase: "schedule a Magnate showing",
    description: "Book a property showing by voice",
    icon: "🏠",
  },
  {
    name: "Pipeline Summary",
    phrase: "Magnate pipeline",
    description: "Get your deal pipeline overview",
    icon: "📊",
  },
  {
    name: "Log a Note",
    phrase: "Magnate note",
    description: "Dictate a quick note to your CRM",
    icon: "📝",
  },
  {
    name: "Today's Schedule",
    phrase: "my Magnate schedule",
    description: "Check your showings and appointments",
    icon: "📅",
  },
];

export default function ShortcutDownloader() {
  const [apiKey, setApiKey] = useState("");
  const [serverUrl, setServerUrl] = useState(
    typeof window !== "undefined"
      ? window.location.origin
      : "https://app.realtorai.com"
  );
  const [copied, setCopied] = useState<string | null>(null);

  const generateShortcutUrl = (shortcut: Shortcut): string => {
    // Generate an Apple Shortcuts URL scheme that creates the shortcut
    // This creates a simple HTTP shortcut via the Shortcuts app
    const actions = [
      {
        WFWorkflowActionIdentifier: "is.workflow.actions.dictatetext",
        WFWorkflowActionParameters: {},
      },
      {
        WFWorkflowActionIdentifier: "is.workflow.actions.getcontentsofurl",
        WFWorkflowActionParameters: {
          WFHTTPMethod: "POST",
          WFURL: `${serverUrl}/api/voice-agent/quick`,
          WFHTTPHeaders: {
            Value: {
              WFDictionaryFieldValueItems: [
                {
                  WFKey: { Value: { string: "Authorization" } },
                  WFValue: { Value: { string: `Bearer ${apiKey}` } },
                },
                {
                  WFKey: { Value: { string: "Content-Type" } },
                  WFValue: { Value: { string: "application/json" } },
                },
              ],
            },
          },
          WFHTTPBody: `{"message": "Dictated Text", "source": "siri"}`,
        },
      },
      {
        WFWorkflowActionIdentifier: "is.workflow.actions.speaktext",
        WFWorkflowActionParameters: {},
      },
    ];

    // Encode as base64 for sharing
    return `shortcuts://import-workflow?name=${encodeURIComponent(shortcut.name)}&url=${encodeURIComponent(`${serverUrl}/api/shortcuts/${encodeURIComponent(shortcut.name)}`)}`;
  };

  const copySetupInstructions = (shortcut: Shortcut) => {
    const instructions = `
SIRI SHORTCUT SETUP: ${shortcut.name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Open the Shortcuts app on your iPhone/iPad
2. Tap "+" to create a new shortcut
3. Add action: "Dictate Text"
4. Add action: "Get Contents of URL"
   - URL: ${serverUrl}/api/voice-agent/quick
   - Method: POST
   - Headers:
     Authorization: Bearer ${apiKey || "<your-api-key>"}
     Content-Type: application/json
   - Request Body (JSON):
     {"message": "Dictated Text", "source": "siri"}
5. Add action: "Speak Text" (use the response)
6. Tap the name at the top → rename to "${shortcut.name}"
7. Tap "Add to Siri" → record phrase: "Hey Siri, ${shortcut.phrase}"

Done! Say "Hey Siri, ${shortcut.phrase}" to use it.
    `.trim();

    navigator.clipboard.writeText(instructions);
    setCopied(shortcut.name);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      {/* API Key Input */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1a1535" }}>
          Your API Key (from API Keys section below)
        </label>
        <input
          className="lf-input"
          type="password"
          placeholder="ra_voice_..."
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          style={{ width: "100%" }}
        />
        <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
          Paste your API key to generate shortcuts with authentication pre-configured
        </p>
      </div>

      {/* Server URL */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6, color: "#1a1535" }}>
          Server URL
        </label>
        <input
          className="lf-input"
          type="url"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          style={{ width: "100%" }}
        />
      </div>

      {/* Shortcut Cards */}
      <div style={{ display: "grid", gap: 12 }}>
        {SHORTCUTS.map((shortcut) => (
          <div
            key={shortcut.name}
            className="lf-card"
            style={{ padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 28 }}>{shortcut.icon}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{shortcut.name}</div>
                <div style={{ fontSize: 12, color: "#6B7280" }}>
                  &ldquo;Hey Siri, {shortcut.phrase}&rdquo;
                </div>
              </div>
            </div>
            <button
              className="lf-btn-sm"
              onClick={() => copySetupInstructions(shortcut)}
              style={{ whiteSpace: "nowrap" }}
            >
              {copied === shortcut.name ? "✓ Copied" : "📋 Copy Setup"}
            </button>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 16, textAlign: "center" }}>
        Each shortcut takes ~2 minutes to set up. Copy the instructions and follow them in the Shortcuts app.
      </p>
    </div>
  );
}
