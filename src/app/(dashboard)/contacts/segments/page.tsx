
import { getSegments } from "@/actions/segments";
import { SegmentBuilderClient } from "@/components/contacts/SegmentBuilderClient";
import Link from "next/link";

export default async function SegmentsPage() {
  const segments = await getSegments();

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 lg:p-8 pb-20 md:pb-6">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/contacts" className="text-sm text-primary hover:text-primary/80">{"\u2190"} Contacts</Link>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Contact Segments</h1>
            <p className="text-sm text-muted-foreground mt-1">Create dynamic segments to target specific groups of contacts</p>
          </div>
        </div>

        <SegmentBuilderClient initialSegments={segments as any} />
      </div>
    </div>
  );
}
