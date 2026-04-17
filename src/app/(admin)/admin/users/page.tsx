import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { UserTable } from "@/components/admin/UserTable";
import { PageHeader } from "@/components/layout/PageHeader";
import { CreateUserButton } from "@/components/admin/CreateUserButton";
import { RefreshButton } from "@/components/admin/RefreshButton";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    redirect("/");
  }

  const supabase = createAdminClient();
  const { data: users } = await supabase
    .from("users")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-0">
      <PageHeader
        title="Users"
        subtitle={`${users?.length ?? 0} users across all plans`}
        actions={<div className="flex items-center gap-2"><RefreshButton /><CreateUserButton /></div>}
      />
      <div className="p-6">
        <UserTable users={users ?? []} />
      </div>
    </div>
  );
}
