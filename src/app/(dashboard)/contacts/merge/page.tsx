import { findDuplicates } from "@/actions/contact-merge";
import { MergeClient } from "@/components/contacts/MergeClient";

export const dynamic = "force-dynamic";

export default async function MergePage() {
  const duplicates = await findDuplicates();

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold">Find & Merge Duplicates</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Contacts matched by phone number or email address. Select the primary
          contact to keep, and merge the other into it.
        </p>
      </div>

      {duplicates.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <p className="text-lg font-medium">No duplicates found</p>
          <p className="text-sm mt-1">All contacts have unique phone numbers and emails.</p>
          <a href="/contacts" className="text-sm text-primary hover:underline mt-4 inline-block">
            &larr; Back to contacts
          </a>
        </div>
      ) : (
        <MergeClient duplicates={duplicates} />
      )}
    </div>
  );
}
