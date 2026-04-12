import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { RealtorCard } from "@/components/admin/RealtorCard";
import type { User } from "@/types";

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
    .order("created_at", { ascending: true });

  const realtors = (users ?? []) as User[];

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="animate-float-in">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            Realtor Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage realtors and toggle features for each account.
            Changes take effect on their next page load.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 animate-float-in" style={{ animationDelay: "80ms" }}>
          <div className="bg-card border border-border rounded-lg px-4 py-3">
            <p className="text-2xl font-bold text-brand">{realtors.length}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Total Users</p>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3">
            <p className="text-2xl font-bold text-brand">
              {realtors.filter((u) => u.is_active).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Active</p>
          </div>
          <div className="bg-card border border-border rounded-lg px-4 py-3">
            <p className="text-2xl font-bold text-rose-600">
              {realtors.filter((u) => !u.is_active).length}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Inactive</p>
          </div>
        </div>

        {/* Realtor Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
          {realtors.map((user) => (
            <RealtorCard key={user.id} user={user} />
          ))}
        </div>

        {realtors.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg font-medium">No users yet</p>
            <p className="text-sm mt-1">Users will appear here after they log in.</p>
          </div>
        )}
      </div>
    </div>
  );
}
