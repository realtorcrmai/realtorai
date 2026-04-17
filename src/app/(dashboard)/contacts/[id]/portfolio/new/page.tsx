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
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-4">
      {/* Back + title */}
      <div className="flex items-center gap-3">
        <Link
          href={`/contacts/${id}?tab=portfolio`}
          className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Add Property — {contact.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            Track a property they own, co-own, or have interest in
          </p>
        </div>
      </div>

      {/* Form in card */}
      <div className="rounded-xl border bg-card p-4 md:p-6 shadow-sm">
        <PortfolioForm contactId={id} contactName={contact.name} />
      </div>
    </div>
  );
}
