import { redirect } from "next/navigation";

export default function AdminPage() {
  // Redirect to users page — the Overview dashboard will be built in Phase 2
  redirect("/admin/users");
}
