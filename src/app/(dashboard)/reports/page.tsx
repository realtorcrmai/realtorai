"use client";

import dynamic from "next/dynamic";

const ReportsDashboard = dynamic(
  () => import("@/components/reports/ReportsDashboard").then((m) => m.ReportsDashboard),
  { ssr: false }
);

export default function ReportsPage() {
  return <ReportsDashboard />;
}
