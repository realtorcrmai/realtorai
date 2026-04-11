import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File;
  if (!file || !file.size) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (file.size > maxSize) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, and WebP accepted" }, { status: 400 });
  }

  const ext = file.type.split("/")[1];
  const filePath = `${session.user.id}/headshot.${ext}`;
  const supabase = createAdminClient();

  // Convert File to ArrayBuffer for reliable upload
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(filePath, buffer, {
      upsert: true,
      contentType: file.type,
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("[headshot] Upload error:", uploadError.message);
    return NextResponse.json({ error: "Failed to upload image. Please try again." }, { status: 500 });
  }

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
  await supabase.from("users").update({ avatar_url: urlData.publicUrl }).eq("id", session.user.id);

  return NextResponse.json({ url: urlData.publicUrl });
}
