import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    version: process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0",
    build: process.env.NEXT_PUBLIC_BUILD_ID || "local",
    environment: process.env.NODE_ENV,
  });
}
