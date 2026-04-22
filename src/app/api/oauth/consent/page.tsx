/**
 * OAuth2 Consent Screen — shown to users before authorizing external assistants.
 * Displays: platform name, requested permissions, PIPEDA notice, Allow/Deny buttons.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

interface ConsentPageProps {
  searchParams: Promise<{
    client_id?: string;
    redirect_uri?: string;
    state?: string;
    scope?: string;
    code_challenge?: string;
    code_challenge_method?: string;
    response_type?: string;
  }>;
}

const PLATFORM_INFO: Record<string, { name: string; icon: string; color: string }> = {
  siri: { name: "Apple Siri", icon: "🍎", color: "#007AFF" },
  google: { name: "Google Assistant", icon: "🔵", color: "#4285F4" },
  alexa: { name: "Amazon Alexa", icon: "🔷", color: "#00CAFF" },
  cortana: { name: "Microsoft Cortana", icon: "🟦", color: "#0078D4" },
  teams: { name: "Microsoft Teams", icon: "🟪", color: "#6264A7" },
  gemini: { name: "Google Gemini", icon: "✨", color: "#886FBF" },
  custom: { name: "External App", icon: "🔗", color: "#6B7280" },
};

const SCOPE_LABELS: Record<string, string> = {
  "voice:read": "View your voice sessions and call history",
  "voice:write": "Start voice sessions and log voice calls",
  "crm:read": "View your contacts, listings, showings, and deals",
  "crm:write": "Create and update CRM records via voice commands",
};

export default async function ConsentPage({ searchParams }: ConsentPageProps) {
  const params = await searchParams;
  const session = await auth();

  if (!session?.user?.email) {
    const returnUrl = encodeURIComponent(
      `/api/oauth/consent?${new URLSearchParams(params as Record<string, string>).toString()}`
    );
    redirect(`/login?return_to=${returnUrl}`);
  }

  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("oauth_clients")
    .select("*")
    .eq("client_id", params.client_id ?? "")
    .eq("is_active", true)
    .single();

  if (!client) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f4f2ff" }}>
        <div className="lf-card" style={{ maxWidth: 480, padding: 32, textAlign: "center" }}>
          <h2 style={{ color: "#dc2626" }}>❌ Invalid Application</h2>
          <p>The application requesting access is not recognized.</p>
        </div>
      </div>
    );
  }

  const platform = PLATFORM_INFO[client.platform] ?? PLATFORM_INFO.custom;
  const scopes = params.scope?.split(" ") ?? ["voice:read", "voice:write", "crm:read"];

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "linear-gradient(135deg, #f4f2ff 0%, #e8e4ff 100%)" }}>
      <div className="lf-card" style={{ maxWidth: 480, padding: 32, width: "100%" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>{platform.icon}</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#1a1535", margin: 0 }}>
            Authorize {platform.name}
          </h1>
          <p style={{ color: "#6B7280", fontSize: 14, marginTop: 4 }}>
            <strong>{client.client_name}</strong> wants to access your Magnate account
          </p>
        </div>

        {/* User info */}
        <div style={{ background: "#f9fafb", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #4f35d2, #ff5c3a)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 14 }}>
            {session.user.email[0].toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{session.user.name ?? session.user.email}</div>
            <div style={{ fontSize: 12, color: "#6B7280" }}>{session.user.email}</div>
          </div>
        </div>

        {/* Permissions */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "#1a1535", marginBottom: 8 }}>
            This will allow {platform.name} to:
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {scopes.map((scope) => (
              <li key={scope} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", fontSize: 14 }}>
                <span style={{ color: "#059669" }}>✓</span>
                <span>{SCOPE_LABELS[scope] ?? scope}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* PIPEDA Notice */}
        <div style={{ background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8, padding: 12, marginBottom: 24, fontSize: 12, color: "#92400e" }}>
          <strong>🔒 Privacy Notice (PIPEDA/PIPA):</strong> Your voice interactions will be processed
          by AI. Transcripts are stored for 90 days. You can revoke access at any time from
          Settings → Voice Assistants.
        </div>

        {/* Action Buttons */}
        <form method="GET" action="/api/oauth/authorize">
          <input type="hidden" name="response_type" value="code" />
          <input type="hidden" name="client_id" value={params.client_id} />
          <input type="hidden" name="redirect_uri" value={params.redirect_uri} />
          <input type="hidden" name="state" value={params.state} />
          <input type="hidden" name="scope" value={params.scope} />
          {params.code_challenge && <input type="hidden" name="code_challenge" value={params.code_challenge} />}
          {params.code_challenge_method && <input type="hidden" name="code_challenge_method" value={params.code_challenge_method} />}

          <div style={{ display: "flex", gap: 12 }}>
            <a
              href={`${params.redirect_uri}?error=access_denied&state=${params.state}`}
              className="lf-btn-ghost"
              style={{ flex: 1, textAlign: "center", padding: "10px 0", textDecoration: "none", borderRadius: 10 }}
            >
              Deny
            </a>
            <button
              type="submit"
              className="lf-btn"
              style={{ flex: 1, padding: "10px 0", borderRadius: 10 }}
            >
              Allow
            </button>
          </div>
        </form>

        {/* Footer */}
        <p style={{ textAlign: "center", fontSize: 11, color: "#9CA3AF", marginTop: 16 }}>
          By clicking Allow, you agree to share the selected data with {client.client_name}.
        </p>
      </div>
    </div>
  );
}
