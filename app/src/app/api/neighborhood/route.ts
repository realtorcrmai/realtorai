import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

// Mock data for neighborhood sold properties
// In production, this would integrate with BC Assessment or Realtor.ca API
function getMockSoldData(postalCode: string) {
  const baseData = [
    {
      address: `${Math.floor(Math.random() * 9000) + 1000} King George Blvd, Surrey, BC ${postalCode}`,
      sold_price: 850000 + Math.floor(Math.random() * 200000),
      sold_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      days_on_market: Math.floor(Math.random() * 45) + 5,
      price_per_sqft: 450 + Math.floor(Math.random() * 150),
      sqft: 1800 + Math.floor(Math.random() * 800),
    },
    {
      address: `${Math.floor(Math.random() * 9000) + 1000} 152nd St, Surrey, BC ${postalCode}`,
      sold_price: 920000 + Math.floor(Math.random() * 300000),
      sold_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      days_on_market: Math.floor(Math.random() * 45) + 5,
      price_per_sqft: 480 + Math.floor(Math.random() * 120),
      sqft: 2000 + Math.floor(Math.random() * 600),
    },
    {
      address: `${Math.floor(Math.random() * 9000) + 1000} Fraser Hwy, Langley, BC ${postalCode}`,
      sold_price: 780000 + Math.floor(Math.random() * 250000),
      sold_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      days_on_market: Math.floor(Math.random() * 45) + 5,
      price_per_sqft: 420 + Math.floor(Math.random() * 130),
      sqft: 1600 + Math.floor(Math.random() * 900),
    },
    {
      address: `${Math.floor(Math.random() * 9000) + 1000} 200th St, Langley, BC ${postalCode}`,
      sold_price: 1050000 + Math.floor(Math.random() * 400000),
      sold_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      days_on_market: Math.floor(Math.random() * 45) + 5,
      price_per_sqft: 510 + Math.floor(Math.random() * 100),
      sqft: 2200 + Math.floor(Math.random() * 500),
    },
    {
      address: `${Math.floor(Math.random() * 9000) + 1000} 64th Ave, Surrey, BC ${postalCode}`,
      sold_price: 690000 + Math.floor(Math.random() * 150000),
      sold_date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      days_on_market: Math.floor(Math.random() * 45) + 5,
      price_per_sqft: 400 + Math.floor(Math.random() * 100),
      sqft: 1500 + Math.floor(Math.random() * 700),
    },
  ];

  return baseData.sort(
    (a, b) => new Date(b.sold_date).getTime() - new Date(a.sold_date).getTime()
  );
}

export async function GET(req: NextRequest) {
  const { unauthorized } = await requireAuth();
  if (unauthorized) return unauthorized;

  const postalCode = req.nextUrl.searchParams.get("postalCode");

  if (!postalCode) {
    return NextResponse.json(
      { error: "postalCode query parameter is required" },
      { status: 400 }
    );
  }

  const data = getMockSoldData(postalCode.replace(/\s/g, "").toUpperCase());
  return NextResponse.json({ postalCode, recentSales: data });
}
