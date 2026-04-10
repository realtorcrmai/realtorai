"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Users,
  Building2,
  DollarSign,
  TrendingUp,
  Calendar,
  ListTodo,
  MessageSquare,
  Target,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  Legend,
} from "recharts";

const COLORS = [
  "#6366f1",
  "#8b5cf6",
  "#a78bfa",
  "#c4b5fd",
  "#e0d4ff",
  "#f59e0b",
  "#10b981",
  "#ef4444",
];

interface ReportData {
  summary: {
    totalContacts: number;
    totalListings: number;
    totalDeals: number;
    activeDeals: number;
    wonDeals: number;
    lostDeals: number;
    totalPipelineValue: number;
    totalCommission: number;
    earnedCommission: number;
    pipelineCommission: number;
    wonValue: number;
    pipelineValue: number;
    totalShowings: number;
    totalTasks: number;
    totalCommunications: number;
  };
  contactsByType: Record<string, number>;
  listingsByStatus: Record<string, number>;
  dealsByStage: Record<string, number>;
  dealValueByStage: Record<string, number>;
  showingsByStatus: Record<string, number>;
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
  commsByChannel: Record<string, number>;
  commsByDirection: Record<string, number>;
  monthlyDeals: { month: string; count: number; value: number }[];
}

function toChartData(obj: Record<string, number>) {
  return Object.entries(obj).map(([name, value]) => ({ name, value }));
}

export function ReportsDashboard() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/reports")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-3">
            Loading analytics...
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;

  return (
    <div className="overflow-y-auto h-full">
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <h1 className="text-xl font-bold tracking-tight">
          Reports & Analytics
        </h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={Users}
            label="Contacts"
            value={summary.totalContacts}
            color="text-brand"
            bg="bg-brand-muted"
          />
          <StatCard
            icon={Building2}
            label="Listings"
            value={summary.totalListings}
            color="text-brand"
            bg="bg-brand-muted"
          />
          <StatCard
            icon={Target}
            label="Active Deals"
            value={summary.activeDeals}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <StatCard
            icon={DollarSign}
            label="Sales Volume"
            value={`$${summary.wonValue.toLocaleString("en-CA")}`}
            color="text-brand"
            bg="bg-brand-muted"
          />
          <StatCard
            icon={TrendingUp}
            label="Earned GCI"
            value={`$${summary.earnedCommission.toLocaleString("en-CA")}`}
            color="text-brand"
            bg="bg-brand-muted"
          />
          <StatCard
            icon={DollarSign}
            label="Pipeline Value"
            value={`$${summary.pipelineValue.toLocaleString("en-CA")}`}
            color="text-amber-600"
            bg="bg-amber-50"
          />
          <StatCard
            icon={TrendingUp}
            label="Pipeline GCI"
            value={`$${summary.pipelineCommission.toLocaleString("en-CA")}`}
            color="text-brand-dark"
            bg="bg-brand-muted"
          />
          <StatCard
            icon={Calendar}
            label="Showings"
            value={summary.totalShowings}
            color="text-brand"
            bg="bg-brand-muted"
          />
          <StatCard
            icon={ListTodo}
            label="Tasks"
            value={summary.totalTasks}
            color="text-rose-600"
            bg="bg-rose-50"
          />
          <StatCard
            icon={MessageSquare}
            label="Communications"
            value={summary.totalCommunications}
            color="text-brand"
            bg="bg-brand-muted"
          />
        </div>

        {/* Charts Row 1 */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Deal Pipeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Deal Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.dealsByStage).length === 0 ? (
                <EmptyChart label="No deals yet" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={toChartData(data.dealsByStage)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) =>
                        v.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
                      }
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip
                      formatter={(val) => [String(val), "Deals"]}
                      labelFormatter={(v) =>
                        v.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
                      }
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Monthly Trends */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Monthly Deal Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={data.monthlyDeals}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 10 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(val, name) => [
                      name === "value"
                        ? `$${Number(val).toLocaleString("en-CA")}`
                        : String(val),
                      name === "value" ? "Value" : "Deals",
                    ]}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    strokeWidth={2}
                    name="Deals"
                    dot={{ r: 4 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Value"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid md:grid-cols-3 gap-4">
          {/* Contact Types */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Contact Types
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {Object.keys(data.contactsByType).length === 0 ? (
                <EmptyChart label="No contacts" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={toChartData(data.contactsByType)}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {toChartData(data.contactsByType).map((_, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Listing Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Listing Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {Object.keys(data.listingsByStatus).length === 0 ? (
                <EmptyChart label="No listings" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={toChartData(data.listingsByStatus)}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {toChartData(data.listingsByStatus).map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            ["#10b981", "#f59e0b", "#6366f1"][i] ||
                            COLORS[i % COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Showing Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Showing Status
              </CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center">
              {Object.keys(data.showingsByStatus).length === 0 ? (
                <EmptyChart label="No showings" />
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={toChartData(data.showingsByStatus)}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {toChartData(data.showingsByStatus).map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            ["#10b981", "#f59e0b", "#ef4444", "#94a3b8"][i] ||
                            COLORS[i % COLORS.length]
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 3 */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Tasks by Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Tasks Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.tasksByStatus).length === 0 ? (
                <EmptyChart label="No tasks" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart
                    data={toChartData(data.tasksByStatus)}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      width={80}
                      tickFormatter={(v) =>
                        v.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())
                      }
                    />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Communications by Channel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Communications
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.commsByChannel).length === 0 ? (
                <EmptyChart label="No communications" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={toChartData(data.commsByChannel)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) =>
                        v.replace(/\b\w/g, (l: string) => l.toUpperCase())
                      }
                    />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      fill="#06b6d4"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Deal Win/Loss Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Deal Conversion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-xl bg-brand-muted">
                <p className="text-3xl font-bold text-brand-dark">
                  {summary.wonDeals}
                </p>
                <p className="text-xs text-brand mt-1">Won</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-50">
                <p className="text-3xl font-bold text-amber-700">
                  {summary.activeDeals}
                </p>
                <p className="text-xs text-amber-600 mt-1">Active</p>
              </div>
              <div className="p-4 rounded-xl bg-red-50">
                <p className="text-3xl font-bold text-red-700">
                  {summary.lostDeals}
                </p>
                <p className="text-xs text-red-600 mt-1">Lost</p>
              </div>
            </div>
            {summary.totalDeals > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Win Rate</span>
                  <span>
                    {(
                      (summary.wonDeals /
                        Math.max(summary.wonDeals + summary.lostDeals, 1)) *
                      100
                    ).toFixed(0)}
                    %
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand/50 rounded-full"
                    style={{
                      width: `${(summary.wonDeals / Math.max(summary.totalDeals, 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bg,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
          <div>
            <p className="text-lg font-bold leading-tight">{value}</p>
            <p className="text-[11px] text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
      {label}
    </div>
  );
}
