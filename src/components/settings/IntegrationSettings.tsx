"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  PenTool,
  Database,
  Mail,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Zap,
  Save,
  ExternalLink,
} from "lucide-react";
import {
  PROVIDER_META,
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from "@/lib/constants/integrations";

const PROVIDER_ICONS: Record<string, React.ElementType> = {
  PenTool,
  Database,
  Mail,
  MessageCircle,
};

interface IntegrationData {
  id: string;
  provider: string;
  config: Record<string, string>;
  is_active: boolean;
  last_tested_at: string | null;
  test_status: string | null;
}

export function IntegrationSettings() {
  const [integrations, setIntegrations] = useState<IntegrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] =
    useState<IntegrationProvider | null>(null);

  useEffect(() => {
    fetchIntegrations();
  }, []);

  async function fetchIntegrations() {
    try {
      const res = await fetch("/api/settings/integrations");
      if (res.ok) {
        setIntegrations(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }

  function getIntegration(provider: string) {
    return integrations.find((i) => i.provider === provider);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {INTEGRATION_PROVIDERS.map((provider) => {
        const meta = PROVIDER_META[provider];
        const integration = getIntegration(provider);
        const isExpanded = expandedProvider === provider;
        const Icon = PROVIDER_ICONS[meta.icon] ?? Database;

        return (
          <Card
            key={provider}
            className={`transition-all duration-200 ${
              isExpanded ? "ring-2 ring-primary/20" : ""
            }`}
          >
            <CardHeader
              className="cursor-pointer"
              onClick={() =>
                setExpandedProvider(isExpanded ? null : provider)
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                      integration?.is_active
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{meta.label}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      {meta.description}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {integration?.is_active && (
                    <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      Connected
                    </span>
                  )}
                  {integration && !integration.is_active && (
                    <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                      <XCircle className="h-3 w-3" />
                      Not verified
                    </span>
                  )}
                  {!integration && (
                    <span className="text-xs text-muted-foreground">
                      Not configured
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 border-t">
                <IntegrationForm
                  provider={provider}
                  existing={integration}
                  onSaved={() => fetchIntegrations()}
                  onDeleted={() => fetchIntegrations()}
                />
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function IntegrationForm({
  provider,
  existing,
  onSaved,
  onDeleted,
}: {
  provider: IntegrationProvider;
  existing?: IntegrationData;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const meta = PROVIDER_META[provider];
  const [config, setConfig] = useState<Record<string, string>>(
    existing?.config ?? {}
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});

  const helpLinks: Record<string, string> = {
    docusign: "https://developers.docusign.com/docs/esign-rest-api/",
    mls: "https://www.reso.org/reso-web-api/",
    email: "https://resend.com/docs",
    twilio: "https://www.twilio.com/docs/sms",
  };

  async function handleSave() {
    setSaving(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, config }),
      });
      if (res.ok) {
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch(
        `/api/settings/integrations/${provider}/test`,
        { method: "POST" }
      );
      const result = await res.json();
      setTestResult(result);
      onSaved(); // refresh status
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/settings/integrations/${provider}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onDeleted();
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-4 pt-4">
      {/* Form fields */}
      <div className="grid gap-3">
        {meta.fields.map((field) => (
          <div key={field.key}>
            <label className="text-sm font-medium flex items-center gap-1">
              {field.label}
              {field.required && (
                <span className="text-destructive">*</span>
              )}
            </label>

            {field.type === "select" ? (
              <select
                value={config[field.key] ?? ""}
                onChange={(e) =>
                  setConfig({ ...config, [field.key]: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-input px-3 py-2 text-sm bg-background"
              >
                <option value="">Select...</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <div className="relative mt-1">
                <input
                  type={
                    field.type === "password" && !showSecrets[field.key]
                      ? "password"
                      : "text"
                  }
                  value={config[field.key] ?? ""}
                  onChange={(e) =>
                    setConfig({ ...config, [field.key]: e.target.value })
                  }
                  placeholder={field.placeholder}
                  className="w-full rounded-lg border border-input px-3 py-2 text-sm bg-background pr-10"
                />
                {field.type === "password" && (
                  <button
                    type="button"
                    onClick={() =>
                      setShowSecrets({
                        ...showSecrets,
                        [field.key]: !showSecrets[field.key],
                      })
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                  >
                    {showSecrets[field.key] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Test result */}
      {testResult && (
        <div
          className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
            testResult.success
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          {testResult.message}
        </div>
      )}

      {/* Last tested */}
      {existing?.last_tested_at && (
        <p className="text-xs text-muted-foreground">
          Last tested:{" "}
          {new Date(existing.last_tested_at).toLocaleString("en-CA")} —{" "}
          <span
            className={
              existing.test_status === "success"
                ? "text-emerald-600"
                : "text-red-600"
            }
          >
            {existing.test_status}
          </span>
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Credentials"}
        </Button>

        {existing && (
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing}
            className="gap-2"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Zap className="h-4 w-4" />
            )}
            {testing ? "Testing..." : "Test Connection"}
          </Button>
        )}

        {existing && (
          <Button
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Remove
          </Button>
        )}

        <a
          href={helpLinks[provider]}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground ml-auto"
        >
          <ExternalLink className="h-3 w-3" />
          API Docs
        </a>
      </div>
    </div>
  );
}
