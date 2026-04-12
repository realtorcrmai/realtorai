import { IntegrationSettings } from "@/components/settings/IntegrationSettings";
import { FeatureFlagsPanel } from "@/components/settings/FeatureFlagsPanel";
import { ThemeSwitcher } from "@/components/settings/ThemeSwitcher";


export default function SettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage integrations, feature flags, and application preferences.
        </p>
      </div>

      <ThemeSwitcher />
      <FeatureFlagsPanel />
      <IntegrationSettings />
    </div>
  );
}
