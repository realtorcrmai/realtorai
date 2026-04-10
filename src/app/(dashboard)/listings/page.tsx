import { redirect } from "next/navigation";
import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { Building2, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default async function ListingsPage() {
  const supabase = await getAuthenticatedTenantClient();

  const { data: latest } = await supabase
    .from("listings")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (latest) {
    redirect(`/listings/${latest.id}`);
  }

  return (
    <div className="flex items-center justify-center h-full min-h-[60vh]">
      <Card className="max-w-sm w-full animate-float-in">
        <CardContent className="py-12 text-center">
          <div className="text-4xl mb-4">🏠</div>
          <h2 className="text-lg font-semibold text-foreground mb-1">
            Add your first listing and watch AI work
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Create a listing and our AI will generate MLS remarks, social posts, and marketing content instantly.
          </p>
          <a
            href="/listings"
            className="inline-flex items-center justify-center px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            Create Listing
          </a>
          <div className="flex items-center justify-center gap-1.5 mt-3 text-xs text-muted-foreground/60">
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Or use the form on the left</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
