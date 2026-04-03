import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncGoogleContacts } from "@/lib/google-contacts";

/**
 * POST /api/contacts/sync/google
 * Pull all Google Contacts for the authenticated user into CRM
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const realtorId = (session.user as any).realtorId || session.user.id;
  if (!realtorId) {
    return NextResponse.json({ error: "No realtor ID" }, { status: 400 });
  }

  try {
    const result = await syncGoogleContacts(session.user.email, realtorId);
    return NextResponse.json({
      ok: true,
      ...result,
      message: `Imported ${result.imported} contacts. ${result.duplicates} duplicates skipped.`,
    });
  } catch (err: any) {
    return NextResponse.json({
      error: err.message || "Failed to sync Google Contacts",
    }, { status: 500 });
  }
}
