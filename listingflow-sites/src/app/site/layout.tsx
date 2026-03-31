import { createAdminClient } from "@/lib/supabase/admin";
import { generateThemeCSS } from "@/lib/theme-engine";
import { getSiteBasePath } from "@/lib/site-links";
import type { RealtorSite } from "@/types";
import { PublicNav } from "@/components/shared/PublicNav";
import { PublicFooter } from "@/components/shared/PublicFooter";

export const dynamic = "force-dynamic";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createAdminClient();
  const basePath = await getSiteBasePath();

  // For now, get the first published site (multi-tenant routing will refine this)
  const { data } = await supabase
    .from("realtor_sites")
    .select("*")
    .eq("is_published", true)
    .limit(1)
    .maybeSingle();

  const site = data as RealtorSite | null;

  if (!site) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">No published site found.</p>
      </div>
    );
  }

  const themeCSS = generateThemeCSS(site);

  return (
    <div className="rt-body min-h-screen flex flex-col" style={{ background: "var(--rt-bg, #ffffff)" }}>
      <style dangerouslySetInnerHTML={{ __html: themeCSS }} />
      <PublicNav site={site} basePath={basePath} />
      <main className="flex-1">{children}</main>
      <PublicFooter site={site} basePath={basePath} />
    </div>
  );
}
