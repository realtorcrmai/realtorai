import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { PortfolioForm } from "@/components/contacts/PortfolioForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PortfolioNewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await getAuthenticatedTenantClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!contact) notFound();

  return (
    <div className="min-h-full bg-muted/50 dark:bg-background p-3 md:p-4 space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link
          href={`/contacts/${id}?tab=portfolio`}
          className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-base font-semibold flex items-center gap-2">
            🏘️ Add Property to Portfolio
          </h1>
          <p className="text-xs text-muted-foreground">
            Track a property {contact.name} owns, co-owns, or has interest in
          </p>
        </div>
      </div>

      {/* Form */}
      <PortfolioForm contactId={id} contactName={contact.name} />
    </div>
  );
}
