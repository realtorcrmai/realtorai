import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import TemplateList from "@/components/automations/TemplateList";
import type { MessageTemplate } from "@/types";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const supabase = await getAuthenticatedTenantClient();

  const { data: templates } = await supabase
    .from("message_templates")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="lf-glass sticky top-[100px] z-10 px-5 py-4 -mx-[18px] -mt-[18px] mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-[var(--lf-indigo)] to-[var(--lf-coral)] bg-clip-text text-transparent">
            Message Templates
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage reusable message templates for workflows and quick sends
          </p>
        </div>
      </div>

      <TemplateList templates={(templates as MessageTemplate[]) || []} />
    </div>
  );
}
