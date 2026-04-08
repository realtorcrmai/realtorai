import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { notFound } from "next/navigation";
import { PortfolioForm } from "@/components/contacts/PortfolioForm";
import Link from "next/link";

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
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Link
            href={`/contacts/${id}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {contact.name}
          </Link>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-sm font-medium">Add Property</span>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">🏠 Add Property to Portfolio</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track a property {contact.name} owns, co-owns, or has an interest in.
          </p>
        </div>

        <div className="lf-card p-6">
          <PortfolioForm contactId={id} contactName={contact.name} />
        </div>
      </div>
    </div>
  );
}
