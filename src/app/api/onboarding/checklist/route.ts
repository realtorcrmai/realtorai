import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getChecklistItems, markChecklistItem, dismissChecklist } from "@/actions/checklist";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const result = await getChecklistItems(session.user.id);
  return NextResponse.json({ ...result, name: session.user.name ?? "" });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();

  if (body.dismiss_all) {
    await dismissChecklist();
    return NextResponse.json({ success: true });
  }

  if (body.item_key) {
    await markChecklistItem(body.item_key);
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid request" }, { status: 400 });
}
