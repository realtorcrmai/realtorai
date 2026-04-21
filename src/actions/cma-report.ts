"use server";

import { getAuthenticatedTenantClient } from "@/lib/supabase/tenant";
import { revalidatePath } from "next/cache";

export type CMAReportData = {
  listing_id: string;
  address: string;
  list_price: number | null;
  comparables: {
    address: string;
    sold_price: number;
    sold_date: string;
    sqft?: number;
    bedrooms?: number;
    bathrooms?: number;
    notes?: string;
  }[];
  avg_days_on_market?: number;
  price_range_low?: number;
  price_range_high?: number;
  suggested_price?: number;
  market_notes?: string;
};

export async function saveCMAReport(data: CMAReportData) {
  const tc = await getAuthenticatedTenantClient();

  const reportData = {
    comparables: data.comparables,
    avg_days_on_market: data.avg_days_on_market,
    price_range_low: data.price_range_low,
    price_range_high: data.price_range_high,
    suggested_price: data.suggested_price,
    market_notes: data.market_notes,
    generated_at: new Date().toISOString(),
  };

  // Save to form_submissions
  const { error } = await tc
    .from("form_submissions")
    .upsert(
      {
        listing_id: data.listing_id,
        form_key: "cma_report",
        form_data: reportData,
        status: "completed",
      },
      { onConflict: "listing_id,form_key" }
    );

  if (error) return { error: "Failed to save CMA report" };

  // Update listing with CMA fields
  const updates: Record<string, unknown> = {};
  if (data.suggested_price) updates.suggested_price = data.suggested_price;
  if (data.price_range_low) updates.cma_low = data.price_range_low;
  if (data.price_range_high) updates.cma_high = data.price_range_high;
  if (data.market_notes) updates.cma_notes = data.market_notes;

  if (Object.keys(updates).length > 0) {
    await tc.from("listings").update(updates).eq("id", data.listing_id);
  }

  revalidatePath(`/listings/${data.listing_id}`);
  return { success: true };
}

export async function getCMAReport(listingId: string) {
  const tc = await getAuthenticatedTenantClient();

  const { data } = await tc
    .from("form_submissions")
    .select("form_data, status, updated_at")
    .eq("listing_id", listingId)
    .eq("form_key", "cma_report")
    .single();

  if (!data) return null;
  return { ...(data.form_data as Record<string, unknown>), status: data.status, updated_at: data.updated_at };
}

export function generateCMAHTML(data: CMAReportData): string {
  const formatPrice = (p: number) =>
    p.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  const compsRows = data.comparables
    .map(
      (c) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${c.address}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;text-align:right">${formatPrice(c.sold_price)}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${c.sold_date}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${c.bedrooms ?? "—"}bd / ${c.bathrooms ?? "—"}ba</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb">${c.sqft ? c.sqft.toLocaleString() + " sqft" : "—"}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>CMA Report — ${data.address}</title></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,sans-serif;max-width:800px;margin:0 auto;padding:40px 20px;color:#2D3E50">
  <div style="border-bottom:3px solid #FF7A59;padding-bottom:16px;margin-bottom:24px">
    <h1 style="margin:0;font-size:24px">Comparative Market Analysis</h1>
    <p style="margin:4px 0 0;color:#6b7280">${data.address}</p>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px">
    <div style="background:#f5f8fa;padding:16px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase">Suggested Price</div>
      <div style="font-size:24px;font-weight:700;color:#2D3E50">${data.suggested_price ? formatPrice(data.suggested_price) : "—"}</div>
    </div>
    <div style="background:#f5f8fa;padding:16px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase">Price Range</div>
      <div style="font-size:18px;font-weight:600">${data.price_range_low ? formatPrice(data.price_range_low) : "—"} – ${data.price_range_high ? formatPrice(data.price_range_high) : "—"}</div>
    </div>
    <div style="background:#f5f8fa;padding:16px;border-radius:8px;text-align:center">
      <div style="font-size:12px;color:#6b7280;text-transform:uppercase">Avg Days on Market</div>
      <div style="font-size:24px;font-weight:700">${data.avg_days_on_market ?? "—"}</div>
    </div>
  </div>

  <h2 style="font-size:18px;margin-bottom:12px">Comparable Sales</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="background:#2D3E50;color:white">
        <th style="padding:10px;text-align:left">Address</th>
        <th style="padding:10px;text-align:right">Sold Price</th>
        <th style="padding:10px;text-align:left">Date</th>
        <th style="padding:10px;text-align:left">Bed/Bath</th>
        <th style="padding:10px;text-align:left">Size</th>
      </tr>
    </thead>
    <tbody>${compsRows}</tbody>
  </table>

  ${data.market_notes ? `<div style="margin-top:24px;padding:16px;background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0"><h3 style="margin:0 0 8px;font-size:14px">Market Notes</h3><p style="margin:0;font-size:14px;color:#374151">${data.market_notes}</p></div>` : ""}

  <div style="margin-top:40px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:12px;color:#9ca3af">
    Generated ${new Date().toLocaleDateString("en-CA")} · Realtors360 CMA Engine · For informational purposes only
  </div>
</body>
</html>`;
}
