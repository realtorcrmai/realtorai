import { createAdminClient } from '@/lib/supabase/admin';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ContactsIndexPage() {
  const supabase = createAdminClient();

  // Find the most recently worked-on contact
  const { data } = await supabase
    .from('contacts')
    .select('id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (data) {
    redirect(`/contacts/${data.id}`);
  }

  // No contacts exist — show empty state inline
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center space-y-2">
        <p className="text-lg font-semibold text-foreground">No Contacts Yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first contact using the sidebar.
        </p>
      </div>
    </div>
  );
}
