export const dynamic = "force-dynamic";

import { PageHeader } from "@/components/layout/PageHeader";
import { NewEditionForm } from "@/components/editorial/NewEditionForm";

// ─── Page ────────────────────────────────────────────────────────────────────
export default function NewEditionPage() {
  return (
    <div className="flex flex-col min-h-0">
      {/* ── Header ── */}
      <PageHeader
        title="New Edition"
        breadcrumbs={[
          { label: "Newsletters", href: "/newsletters" },
          { label: "Editorial", href: "/newsletters/editorial" },
          { label: "New Edition" },
        ]}
      />

      {/* ── Form (client component owns all interactive state) ── */}
      <div className="p-6 flex justify-center">
        <div className="w-full max-w-lg">
          <NewEditionForm />
        </div>
      </div>
    </div>
  );
}
