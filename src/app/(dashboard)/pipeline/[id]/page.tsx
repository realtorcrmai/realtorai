import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { DealDetail } from "@/components/pipeline/DealDetail";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [{ data: deal }, { data: parties }, { data: checklist }] =
    await Promise.all([
      supabase
        .from("deals")
        .select(
          "*, contacts(id, name, phone, email, type), listings(id, address, list_price, status, mls_number)"
        )
        .eq("id", id)
        .single(),
      supabase
        .from("deal_parties")
        .select("*")
        .eq("deal_id", id)
        .order("created_at"),
      supabase
        .from("deal_checklist")
        .select("*")
        .eq("deal_id", id)
        .order("sort_order"),
    ]);

  if (!deal) notFound();

  // Fetch contacts and listings for edit form
  const [{ data: contacts }, { data: listings }] = await Promise.all([
    supabase.from("contacts").select("*").order("name"),
    supabase.from("listings").select("*").order("address"),
  ]);

  return (
    <DealDetail
      deal={deal as any}
      parties={parties ?? []}
      checklist={checklist ?? []}
      contacts={contacts ?? []}
      listings={listings ?? []}
    />
  );
}
