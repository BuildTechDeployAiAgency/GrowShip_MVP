"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useRevenueComparison } from "@/hooks/use-revenue-comparison";
import { useDateFilters } from "@/contexts/date-filter-context";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";
import { createDashboardFilters } from "@/lib/utils/table-suffix";

export function RevenueComparisonChart() {
  const { user } = useAuth();
  const { profile } = useEnhancedAuth();
  const { filters } = useDateFilters();

  const chartFilters = useMemo(
    () => createDashboardFilters(profile, user, {
      year: filters.year,
      distributorId: filters.distributorId || undefined,
    }),
    [profile, user, filters.year, filters.distributorId]
  );

  const { data, isLoading, error, refetch } = useRevenueComparison({
    filters: chartFilters,
  });

  return (
    <Card className="bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-1 w-full"></div>
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Revenue Comparison
              </CardTitle>
            </div>
            <p className="text-sm text-gray-600 mt-1 ml-3">
              Monthly revenue trends and year-over-year growth
            </p>
          </div>
          <div className="text-right flex-shrink-0 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl px-4 py-3 border border-purple-100">
            <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              {data && data.length > 0
                ? formatCurrency(Math.max(...data.map((d) => d.current || 0)))
                : formatCurrency(0)}
            </p>
            <p className="text-xs font-medium text-gray-600">Peak Revenue</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="w-full overflow-x-auto pt-6">
        {/* Custom tooltip for clearer YoY explanation */}
        {null}
        {error ? (
          <div className="py-8 text-center text-red-600">
            <p>Error loading revenue comparison: {error}</p>
            <button
              onClick={() => refetch()}
              className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <div className="py-8 text-center">
            <div className="flex items-center justify-center gap-2 text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading revenue comparison...</span>
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-gray-400 mb-2">
              <svg
                className="mx-auto h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1}
                  d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">Data not available yet</p>
            <p className="text-gray-400 text-xs mt-1">
              No revenue data for the selected period
            </p>
          </div>
        ) : (
          <div className="w-full" style={{ minHeight: 300 }}>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart
                data={data}
                margin={{ top: 20, right: 20, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                />
                <YAxis
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `${value}%`}
                  domain={["dataMin", "dataMax"]}
                  allowDecimals
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || payload.length === 0)
                      return null;
                    const row = payload[0]?.payload || {};
                    const prevVal = Number(row.previous || 0);
                    const currVal = Number(row.current || 0);
                    const growthIndex = Number(row.growth || 0); // already 100 + pct
                    const pctChange = growthIndex - 100;
                    const delta = currVal - prevVal;
                    const deltaSign = delta >= 0 ? "+" : "";
                    const pctSign = pctChange >= 0 ? "+" : "";

                    return (
                      <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-sm">
                        <div className="mb-1 font-medium text-gray-900">
                          {label}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-gray-600">
                              {filters.year - 1}:
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(prevVal)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-gray-600">
                              {filters.year}:
                            </span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency(currVal)}
                            </span>
                          </div>
                          <div className="h-px bg-gray-100" />
                          <div className="flex items-center justify-between gap-4">
                            <span className="text-gray-600">Change:</span>
                            <span
                              className={
                                delta >= 0
                                  ? "text-green-600 font-medium"
                                  : "text-red-600 font-medium"
                              }
                            >
                              {deltaSign}{formatCurrency(Math.abs(delta))} (
                              {pctSign}
                              {Math.abs(pctChange).toFixed(1)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />
                <Legend />
                <Bar
                  dataKey="previous"
                  fill="#d1d5db"
                  radius={[4, 4, 0, 0]}
                  name={`${filters.year - 1}`}
                />
                <Bar
                  dataKey="current"
                  fill="#0d9488"
                  radius={[4, 4, 0, 0]}
                  name={`${filters.year}`}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="growth"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                  name="Growth %"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
