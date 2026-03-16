import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { ContentDetail } from "./content-detail";

export const dynamic = "force-dynamic";

interface ContentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ContentDetailPage({
  params,
}: ContentDetailPageProps) {
  const { id } = await params;
  const supabase = createAdminClient();

  const [
    { data: listing, error: listingError },
    { data: prompt },
    { data: assets },
  ] = await Promise.all([
    supabase
      .from("listings")
      .select("*, contacts(name)")
      .eq("id", id)
      .single(),
    supabase.from("prompts").select("*").eq("listing_id", id).maybeSingle(),
    supabase
      .from("media_assets")
      .select("*")
      .eq("listing_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (listingError || !listing) {
    notFound();
  }

  const sellerName =
    listing.contacts &&
    typeof listing.contacts === "object" &&
    "name" in listing.contacts
      ? (listing.contacts as { name: string }).name
      : null;

  return (
    <ContentDetail
      listing={listing}
      sellerName={sellerName}
      initialPrompt={prompt}
      initialAssets={assets ?? []}
    />
  );
}
