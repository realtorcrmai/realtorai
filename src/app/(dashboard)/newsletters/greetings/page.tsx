export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { GreetingAutomations } from "@/components/newsletters/GreetingAutomations";
import { getGreetingRules } from "@/actions/config";

export default async function GreetingsPage() {
  const greetingRules = await getGreetingRules();

  return (
    <>
      <PageHeader
        title="Greetings"
        subtitle="Automated holiday and milestone greetings for your contacts"
        breadcrumbs={[
          { label: "Email Marketing", href: "/newsletters" },
        ]}
      />
      <div className="p-6">
        <GreetingAutomations initialRules={greetingRules as any} />
      </div>
    </>
  );
}
