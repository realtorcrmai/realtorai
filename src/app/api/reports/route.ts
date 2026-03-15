import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = createAdminClient();

  const [
    { data: contacts },
    { data: listings },
    { data: deals },
    { data: appointments },
    { data: tasks },
    { data: communications },
  ] = await Promise.all([
    supabase.from("contacts").select("*"),
    supabase.from("listings").select("*"),
    supabase.from("deals").select("*"),
    supabase.from("appointments").select("*"),
    supabase.from("tasks").select("*"),
    supabase.from("communications").select("*"),
  ]);

  const allContacts = contacts ?? [];
  const allListings = listings ?? [];
  const allDeals = deals ?? [];
  const allAppointments = appointments ?? [];
  const allTasks = tasks ?? [];
  const allComms = communications ?? [];

  // --- Contact type distribution ---
  const contactsByType: Record<string, number> = {};
  for (const c of allContacts) {
    contactsByType[c.type] = (contactsByType[c.type] || 0) + 1;
  }

  // --- Listing status distribution ---
  const listingsByStatus: Record<string, number> = {};
  for (const l of allListings) {
    listingsByStatus[l.status] = (listingsByStatus[l.status] || 0) + 1;
  }

  // --- Deal pipeline metrics ---
  const dealsByStage: Record<string, number> = {};
  const dealValueByStage: Record<string, number> = {};
  let totalPipelineValue = 0;
  let totalCommission = 0;
  let wonDeals = 0;
  let lostDeals = 0;
  let activeDeals = 0;

  for (const d of allDeals) {
    dealsByStage[d.stage] = (dealsByStage[d.stage] || 0) + 1;
    const val = Number(d.value) || 0;
    dealValueByStage[d.stage] = (dealValueByStage[d.stage] || 0) + val;
    totalPipelineValue += val;
    totalCommission += Number(d.commission_amount) || 0;
    if (d.status === "won") wonDeals++;
    else if (d.status === "lost") lostDeals++;
    else activeDeals++;
  }

  // --- Showing metrics ---
  const showingsByStatus: Record<string, number> = {};
  for (const a of allAppointments) {
    showingsByStatus[a.status] = (showingsByStatus[a.status] || 0) + 1;
  }

  // --- Task metrics ---
  const tasksByStatus: Record<string, number> = {};
  const tasksByPriority: Record<string, number> = {};
  for (const t of allTasks) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] || 0) + 1;
    tasksByPriority[t.priority] = (tasksByPriority[t.priority] || 0) + 1;
  }

  // --- Communication metrics ---
  const commsByChannel: Record<string, number> = {};
  const commsByDirection: Record<string, number> = {};
  for (const c of allComms) {
    commsByChannel[c.channel] = (commsByChannel[c.channel] || 0) + 1;
    commsByDirection[c.direction] = (commsByDirection[c.direction] || 0) + 1;
  }

  // --- Monthly deal trends (last 6 months) ---
  const now = new Date();
  const monthlyDeals: { month: string; count: number; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthKey = d.toISOString().slice(0, 7);
    const monthLabel = d.toLocaleDateString("en-CA", {
      month: "short",
      year: "numeric",
    });
    const monthDeals = allDeals.filter(
      (deal) => deal.created_at.slice(0, 7) === monthKey
    );
    monthlyDeals.push({
      month: monthLabel,
      count: monthDeals.length,
      value: monthDeals.reduce((s, deal) => s + (Number(deal.value) || 0), 0),
    });
  }

  return NextResponse.json({
    summary: {
      totalContacts: allContacts.length,
      totalListings: allListings.length,
      totalDeals: allDeals.length,
      activeDeals,
      wonDeals,
      lostDeals,
      totalPipelineValue,
      totalCommission,
      totalShowings: allAppointments.length,
      totalTasks: allTasks.length,
      totalCommunications: allComms.length,
    },
    contactsByType,
    listingsByStatus,
    dealsByStage,
    dealValueByStage,
    showingsByStatus,
    tasksByStatus,
    tasksByPriority,
    commsByChannel,
    commsByDirection,
    monthlyDeals,
  });
}
