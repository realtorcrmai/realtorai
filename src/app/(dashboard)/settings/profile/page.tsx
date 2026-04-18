import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { ProfileForm } from "@/components/settings/ProfileForm";
import { PageHeader } from "@/components/layout/PageHeader";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const supabase = await getAuthenticatedTenantClient();

  const { data: user } = await supabase.raw
    .from("users")
    .select("id, name, email, phone, brokerage, license_number, avatar_url, bio, timezone")
    .eq("id", supabase.realtorId)
    .single();

  if (!user) return <p className="p-6">Unable to load profile.</p>;

  return (
    <>
      <PageHeader
        title="My Profile"
        subtitle="Manage your personal and professional details"
      />
      <div className="p-6 max-w-2xl mx-auto">
        <ProfileForm user={user} />
      </div>
    </>
  );
}
