export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { VoiceProfileSetupClient } from "@/components/editorial/VoiceProfileSetupClient";

export default function VoiceProfileSetupPage() {
  return (
    <div className="flex flex-col min-h-0">
      <PageHeader
        title="Set Up Your Voice Profile"
        subtitle="Teach the AI how you write — takes about 3 minutes"
        breadcrumbs={[
          { label: "Newsletters", href: "/newsletters" },
          { label: "Editorial", href: "/newsletters/editorial" },
          { label: "Voice Profile Setup" },
        ]}
      />
      <div className="p-6 max-w-2xl mx-auto w-full">
        <VoiceProfileSetupClient />
      </div>
    </div>
  );
}
