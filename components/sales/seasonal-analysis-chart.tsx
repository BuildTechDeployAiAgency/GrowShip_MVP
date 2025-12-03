"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useDateFilters } from "@/contexts/date-filter-context";
import { useSeasonalAnalysis } from "@/hooks/use-seasonal-analysis";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Calendar, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";

export function SeasonalAnalysisChart() {
  const { user } = useAuth();
  const { profile } = useEnhancedAuth();
  const { filters } = useDateFilters();

  // Brand admins use organization-based table, others use personal table
  const tableSuffix = profile?.role_name?.startsWith("brand_admin")
    ? `sales_documents_view_${profile.brand_id?.replace(/-/g, "_")}`
    : `sales_documents_${user?.id?.replace(/-/g, "_")}`;

  const chartFilters = useMemo(
    () => ({
      tableSuffix,
      userId: user?.id,
      brandId: profile?.brand_id,
      userRole: profile?.role_name,
      year: filters.year, // Only year, no month needed
    }),
    [
      tableSuffix,
      user?.id,
      profile?.brand_id,
      profile?.role_name,
      filters.year,
    ]
  );

  const { data, isLoading, error, refetch } = useSeasonalAnalysis({
    filters: chartFilters,
  });

  // Ensure we always have exactly 4 quarters, fill with default data if needed
  const chartData = useMemo(() => {
    const defaultQuarters = [
      {
        quarter: "Q1",
        quarter_num: 1,
        revenue: 0,
        revenue_display: "$0k",
        previous_year_revenue: 0,
        growth_percentage: 0,
        growth_display: "+0.0%",
        season: "Winter",
        orders: 0, // Mock orders for chart
      },
      {
        quarter: "Q2",
        quarter_num: 2,
        revenue: 0,
        revenue_display: "$0k",
        previous_year_revenue: 0,
        growth_percentage: 0,
        growth_display: "+0.0%",
        season: "Spring",
        orders: 0,
      },
      {
        quarter: "Q3",
        quarter_num: 3,
        revenue: 0,
        revenue_display: "$0k",
        previous_year_revenue: 0,
        growth_percentage: 0,
        growth_display: "+0.0%",
        season: "Summer",
        orders: 0,
      },
      {
        quarter: "Q4",
        quarter_num: 4,
        revenue: 0,
        revenue_display: "$0k",
        previous_year_revenue: 0,
        growth_percentage: 0,
        growth_display: "+0.0%",
        season: "Fall",
        orders: 0,
      },
    ];

    if (!data || data.length === 0) {
      return defaultQuarters;
    }

    // Create a map of existing quarters
    const dataMap = new Map();
    data.forEach((item) => {
      dataMap.set(item.quarter_num, {
        ...item,
        orders: Math.floor(item.revenue / 1000), // Mock orders calculation
      });
    });

    // Fill all 4 quarters, using data if available or defaults
    const result = [];
    for (let i = 1; i <= 4; i++) {
      if (dataMap.has(i)) {
        result.push(dataMap.get(i));
      } else {
        result.push(defaultQuarters[i - 1]);
      }
    }

    return result;
  }, [data]);

  const bestQuarter = useMemo(() => {
    return chartData.reduce((best, current) =>
      current.revenue > best.revenue ? current : best
    );
  }, [chartData]);

  const worstQuarter = useMemo(() => {
    return chartData.reduce((worst, current) =>
      current.revenue < worst.revenue ? current : worst
    );
  }, [chartData]);

  return (
    <Card className="bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 h-1 w-full"></div>
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Seasonal Analysis
              </CardTitle>
            </div>
            <p className="text-sm text-gray-600 mt-1 ml-3">
              Quarterly performance and seasonal trends
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="bg-green-50 border border-green-200 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <p className="text-sm font-bold text-green-700">
                  {bestQuarter.quarter}
                </p>
              </div>
              <p className="text-xs text-gray-600">Peak</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <p className="text-sm font-bold text-red-700">
                  {worstQuarter.quarter}
                </p>
              </div>
              <p className="text-xs text-gray-600">Lowest</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="w-full overflow-x-auto pt-6">
        {error ? (
          <div className="py-8 text-center text-red-600">
            <p>Error loading seasonal data: {error}</p>
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
              <span>Loading seasonal data...</span>
            </div>
          </div>
        ) : !data || data.length === 0 || chartData.every(q => q.revenue === 0) ? (
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">Data not available yet</p>
            <p className="text-gray-400 text-xs mt-1">
              No seasonal data for the selected period
            </p>
          </div>
        ) : (
          <>
            <div className="w-full" style={{ minHeight: 300 }}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="quarter"
                    stroke="#6b7280"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis
                    yAxisId="left"
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
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      if (name === "revenue")
                        return [`$${value.toLocaleString()}`, "Revenue"];
                      if (name === "orders")
                        return [value.toLocaleString(), "Orders"];
                      if (name === "growth_percentage")
                        return [`${value}%`, "Growth"];
                      return [value, name];
                    }}
                    labelFormatter={(label, payload) => {
                      const season = payload?.[0]?.payload?.season || "";
                      return `${label}${season ? ` (${season})` : ""}`;
                    }}
                  />
                  <Legend />
                  <Bar
                    yAxisId="left"
                    dataKey="revenue"
                    fill="#0d9488"
                    radius={[4, 4, 0, 0]}
                    name="Revenue"
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="orders"
                    fill="#e5e7eb"
                    radius={[4, 4, 0, 0]}
                    name="Orders"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="growth_percentage"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: "#ef4444", r: 4 }}
                    name="Growth %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Seasonal insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
              {chartData.map((quarter, index) => {
                const isPositive = quarter.growth_percentage >= 0;
                return (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">
                        {quarter.quarter}
                      </h3>
                      <div
                        className={`flex items-center gap-1 ${
                          isPositive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {isPositive ? (
                          <TrendingUp className="h-4 w-4" />
                        ) : (
                          <TrendingDown className="h-4 w-4" />
                        )}
                        <span className="text-sm font-medium">
                          {quarter.growth_display ||
                            `${isPositive ? "+" : ""}${
                              quarter.growth_percentage
                            }%`}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Revenue:</span>
                        <span className="font-semibold">
                          {formatCurrency(quarter.revenue)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Orders:</span>
                        <span className="font-semibold">
                          {formatNumber(quarter.orders)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Season:</span>
                        <span className="font-semibold">{quarter.season}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
