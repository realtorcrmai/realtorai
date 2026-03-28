"use client";

import { useState } from "react";
import { generateApiKey } from "@/actions/website-settings";

interface Props {
  config: any;
}

export function SettingsTab({ config }: Props) {
  const [apiKey, setApiKey] = useState(config.apiKey || "lf_demo_key_replace_me");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [domains, setDomains] = useState<string[]>(config.site?.allowed_domains || []);
  const [newDomain, setNewDomain] = useState("");

  async function handleGenerateKey() {
    setGenerating(true);
    const key = await generateApiKey();
    setApiKey(key);
    setGenerating(false);
  }

  async function copyKey() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function addDomain() {
    if (newDomain && !domains.includes(newDomain)) {
      setDomains([...domains, newDomain]);
      setNewDomain("");
    }
  }

  function removeDomain(d: string) {
    setDomains(domains.filter(x => x !== d));
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* API Key */}
      <div className="lf-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>API Key</h3>
        <p style={{ fontSize: 12, color: "#888", margin: "0 0 12px" }}>
          Use this key in your website&apos;s SDK script tag. Keep it secret — anyone with this key can send data to your CRM.
        </p>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            readOnly
            value={apiKey}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 8,
              border: "1px solid #ddd", fontFamily: "monospace", fontSize: 13,
              background: "#f8f8f8",
            }}
          />
          <button
            onClick={copyKey}
            style={{
              padding: "10px 16px", borderRadius: 8, border: "none",
              background: copied ? "#059669" : "#4f35d2", color: "#fff",
              fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
            }}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            onClick={handleGenerateKey}
            disabled={generating}
            style={{
              padding: "10px 16px", borderRadius: 8,
              border: "1px solid #ddd", background: "#fff",
              fontSize: 13, cursor: "pointer", whiteSpace: "nowrap",
              opacity: generating ? 0.5 : 1,
            }}
          >
            {generating ? "..." : "Regenerate"}
          </button>
        </div>
      </div>

      {/* Domain Whitelist */}
      <div className="lf-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 4px" }}>Allowed Domains</h3>
        <p style={{ fontSize: 12, color: "#888", margin: "0 0 12px" }}>
          Only these domains can use your API key. <code style={{ fontSize: 11 }}>localhost</code> is always allowed for development.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            value={newDomain}
            onChange={e => setNewDomain(e.target.value)}
            placeholder="e.g. www.mysite.com"
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 8,
              border: "1px solid #ddd", fontSize: 13,
            }}
            onKeyDown={e => e.key === "Enter" && addDomain()}
          />
          <button
            onClick={addDomain}
            style={{
              padding: "8px 16px", borderRadius: 8, border: "none",
              background: "#4f35d2", color: "#fff", fontSize: 13, cursor: "pointer",
            }}
          >
            Add
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <span style={{
            padding: "4px 10px", borderRadius: 12, fontSize: 12,
            background: "rgba(5,150,105,0.08)", color: "#059669",
          }}>
            localhost (always allowed)
          </span>
          {domains.map(d => (
            <span key={d} style={{
              padding: "4px 10px", borderRadius: 12, fontSize: 12,
              background: "rgba(79,53,210,0.08)", color: "#4f35d2",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              {d}
              <button
                onClick={() => removeDomain(d)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#999", fontSize: 14, lineHeight: 1 }}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="lf-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Feature Toggles</h3>
        {[
          { key: "analytics", label: "Analytics Tracking", desc: "Track page views, sessions, and interactions", default: true },
          { key: "chat", label: "AI Chatbot", desc: "Floating chat bubble with AI-powered property search", default: true },
          { key: "newsletter", label: "Newsletter Popup", desc: "Email capture popup after 30s or on exit intent", default: true },
          { key: "listings", label: "Listings Feed Widget", desc: "Embeddable property card grid", default: true },
          { key: "recording", label: "Session Recording", desc: "Record visitor sessions for replay in CRM", default: false },
        ].map(f => (
          <div key={f.key} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 0", borderBottom: "1px solid rgba(0,0,0,0.04)",
          }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{f.label}</div>
              <div style={{ fontSize: 12, color: "#888" }}>{f.desc}</div>
            </div>
            <label style={{ position: "relative", display: "inline-block", width: 44, height: 24 }}>
              <input
                type="checkbox"
                defaultChecked={f.default}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: "absolute", cursor: "pointer", inset: 0,
                background: f.default ? "#4f35d2" : "#ccc",
                borderRadius: 12, transition: "0.2s",
              }}>
                <span style={{
                  position: "absolute", height: 18, width: 18, left: f.default ? 22 : 3, bottom: 3,
                  background: "#fff", borderRadius: "50%", transition: "0.2s",
                }} />
              </span>
            </label>
          </div>
        ))}
      </div>

      {/* Chatbot Config */}
      <div className="lf-card" style={{ padding: 20 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, margin: "0 0 12px" }}>Chatbot Configuration</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#666", display: "block", marginBottom: 4 }}>Greeting Message</label>
            <input
              defaultValue="Hi! I'm here to help you find your perfect home. Ask me about properties, neighbourhoods, or schedule a viewing."
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, fontWeight: 500, color: "#666", display: "block", marginBottom: 4 }}>Personality</label>
            <select
              defaultValue="professional"
              style={{ width: "100%", padding: "10px 14px", borderRadius: 8, border: "1px solid #ddd", fontSize: 13 }}
            >
              <option value="professional">Professional</option>
              <option value="friendly">Friendly & Casual</option>
              <option value="luxury">Luxury & Sophisticated</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
