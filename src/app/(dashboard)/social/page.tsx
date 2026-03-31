import { createAdminClient } from "@/lib/supabase/admin";
import { SocialDashboardClient } from "@/components/social/SocialDashboardClient";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const supabase = createAdminClient();

  // Fetch brand kit
  const { data: brandKit } = await supabase
    .from("social_brand_kits")
    .select("*")
    .limit(1)
    .single();

  // Fetch connected accounts
  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("*")
    .order("connected_at", { ascending: false });

  // Fetch recent posts (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: recentPosts } = await supabase
    .from("social_posts")
    .select("*")
    .gte("created_at", thirtyDaysAgo)
    .order("created_at", { ascending: false })
    .limit(50);

  // Fetch pending drafts
  const { data: pendingDrafts } = await supabase
    .from("social_posts")
    .select("*")
    .in("status", ["draft", "approved"])
    .order("created_at", { ascending: false })
    .limit(20);

  // Fetch scheduled posts
  const { data: scheduledPosts } = await supabase
    .from("social_posts")
    .select("*")
    .eq("status", "scheduled")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(20);

  // Fetch templates
  const { data: templates } = await supabase
    .from("social_templates")
    .select("*")
    .eq("is_active", true)
    .order("usage_count", { ascending: false })
    .limit(50);

  // Compute stats
  const published = recentPosts?.filter(p => p.status === "published") || [];
  const stats = {
    totalPosts30d: published.length,
    totalImpressions: published.reduce((sum, p) => sum + (p.total_impressions || 0), 0),
    totalEngagement: published.reduce((sum, p) => sum + (p.total_engagement || 0), 0),
    totalClicks: published.reduce((sum, p) => sum + (p.total_clicks || 0), 0),
    totalLeads: published.reduce((sum, p) => sum + (p.total_leads || 0), 0),
    pendingCount: pendingDrafts?.length || 0,
    scheduledCount: scheduledPosts?.length || 0,
    connectedPlatforms: accounts?.filter(a => a.connection_status === "connected").length || 0,
  };

  return (
    <SocialDashboardClient
      brandKit={brandKit}
      accounts={accounts || []}
      recentPosts={recentPosts || []}
      pendingDrafts={pendingDrafts || []}
      scheduledPosts={scheduledPosts || []}
      templates={templates || []}
      stats={stats}
    />
  );
}
