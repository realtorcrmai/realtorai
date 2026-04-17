import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getPinnedSmartListCounts } from "@/actions/smart-lists";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ counts: [] }, { status: 401 });
  }

  const counts = await getPinnedSmartListCounts();
  return NextResponse.json({ counts });
}
