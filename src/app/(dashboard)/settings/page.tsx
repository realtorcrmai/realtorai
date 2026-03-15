import { IntegrationSettings } from "@/components/settings/IntegrationSettings";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Connect your external services to unlock e-signatures, MLS data, email
          campaigns, and SMS automation.
        </p>
      </div>

      <IntegrationSettings />
    </div>
  );
}
