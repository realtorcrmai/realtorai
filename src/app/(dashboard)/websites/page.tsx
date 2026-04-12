import { getWebsiteConfig, getWebsiteAnalytics, getWebsiteLeads } from "@/actions/website-settings";
import { getWebsiteSessions } from "@/actions/website-sessions";
import { WebsiteDashboardClient } from "@/components/websites/WebsiteDashboardClient";


export default async function WebsitesPage() {
  const [config, analytics, leads, sessions] = await Promise.all([
    getWebsiteConfig(),
    getWebsiteAnalytics(30),
    getWebsiteLeads(50),
    getWebsiteSessions(50),
  ]);

  return (
    <WebsiteDashboardClient
      config={config}
      analytics={analytics}
      leads={leads}
      sessions={sessions}
    />
  );
}
