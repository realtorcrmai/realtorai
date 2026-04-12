
import { getTemplate } from "@/actions/templates";
import { EmailEditorClient } from "@/components/email-builder/EmailEditorClient";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const template = await getTemplate(id);
  if (!template) notFound();

  return (
    <div className="h-full overflow-y-auto">
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/automations/templates" className="text-sm text-primary hover:text-primary/80">
            {"\u2190"} Templates
          </Link>
          <span className="text-sm text-muted-foreground">/</span>
          <span className="text-sm font-semibold">{template.name}</span>
        </div>
      </div>
      <EmailEditorClient template={template} />
    </div>
  );
}
