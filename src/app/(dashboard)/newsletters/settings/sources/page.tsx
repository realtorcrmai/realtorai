export const dynamic = 'force-dynamic';

import { PageHeader } from '@/components/layout/PageHeader';
import { getEditorialSettings, getDataSourceHealth } from '@/actions/editorial';
import { SourcesSettingsClient } from '@/components/editorial/SourcesSettingsClient';

export default async function SourcesSettingsPage() {
  const [settingsResult, sourcesResult] = await Promise.all([
    getEditorialSettings(),
    getDataSourceHealth(),
  ]);

  const settings = settingsResult.data ?? {
    editorial_auto_draft: false,
    default_city: 'Vancouver, BC',
  };

  const sources = sourcesResult.data ?? [];

  return (
    <div className="flex flex-col gap-6 px-6 py-6 max-w-3xl">
      <PageHeader
        title="Editorial Settings"
        subtitle="Configure data sources and your weekly newsletter schedule"
        breadcrumbs={[
          { label: 'Newsletters', href: '/newsletters' },
          { label: 'Editorial', href: '/newsletters/editorial' },
          { label: 'Settings' },
        ]}
      />

      <SourcesSettingsClient
        initialSettings={settings}
        initialSources={sources}
      />
    </div>
  );
}
