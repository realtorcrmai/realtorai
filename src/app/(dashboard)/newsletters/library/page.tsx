export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { getContentLibraryTips } from "@/actions/editorial";
import { ContentLibraryManager } from "@/components/editorial/ContentLibraryManager";
import type { ContentLibraryTip } from "@/actions/editorial";

export default async function ContentLibraryPage() {
  const { data: tips, error } = await getContentLibraryTips();

  const allTips: ContentLibraryTip[] = tips ?? [];
  const platformTips = allTips.filter((t) => t.realtor_id === null);
  const myTips = allTips.filter((t) => t.realtor_id !== null);

  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Content Library"
        subtitle="Platform tips and your custom content for quick_tip blocks"
        breadcrumbs={[
          { label: "Newsletters", href: "/newsletters" },
          { label: "Content Library" },
        ]}
      />
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 rounded-md bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            Failed to load tips: {error}
          </div>
        )}
        <ContentLibraryManager
          initialPlatformTips={platformTips}
          initialMyTips={myTips}
        />
      </div>
    </div>
  );
}
