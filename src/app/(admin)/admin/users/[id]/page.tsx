import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserDetail } from "@/actions/admin";
import { getUserEmailDetail } from "@/actions/analytics";
import { UserDetailClient } from "./UserDetailClient";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") redirect("/");

  const { id } = await params;
  const [result, emailResult] = await Promise.all([
    getUserDetail(id),
    getUserEmailDetail(id),
  ]);
  if (result.error || !result.data) redirect("/admin/users");

  return (
    <UserDetailClient
      user={result.data.user}
      counts={result.data.counts}
      recentEvents={result.data.recentEvents}
      emailDetail={emailResult.data ?? []}
    />
  );
}
