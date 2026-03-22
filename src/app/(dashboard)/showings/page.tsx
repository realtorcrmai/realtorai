import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ShowingsIndexPage() {
  const supabase = createAdminClient();

  // Find the most recent showing (by start_time)
  const { data } = await supabase
    .from("appointments")
    .select("id")
    .order("start_time", { ascending: false })
    .limit(1)
    .single();

  if (data) {
    redirect(`/showings/${data.id}`);
  }

  // No showings exist — show empty state
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">No Showings Yet</p>
        <p className="text-sm text-muted-foreground">
          Schedule your first showing to get started.
        </p>
      </div>
    </div>
  );
}
