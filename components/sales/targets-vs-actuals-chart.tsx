"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTargetVsActual } from "@/hooks/use-target-vs-actual";
import { useDateFilters } from "@/contexts/date-filter-context";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { format, parseISO } from "date-fns";

const fallbackData = [
  { month: "Jan", target: 400000, actual: 385000, achievement: 96.3 },
  { month: "Feb", target: 410000, actual: 398000, achievement: 97.1 },
  { month: "Mar", target: 420000, actual: 412000, achievement: 98.1 },
  { month: "Apr", target: 430000, actual: 425000, achievement: 98.8 },
  { month: "May", target: 440000, actual: 438000, achievement: 99.5 },
  { month: "Jun", target: 450000, actual: 455000, achievement: 101.1 },
  { month: "Jul", target: 460000, actual: 468000, achievement: 101.7 },
  { month: "Aug", target: 470000, actual: 482000, achievement: 102.6 },
  { month: "Sep", target: 480000, actual: 495000, achievement: 103.1 },
  { month: "Oct", target: 490000, actual: 510000, achievement: 104.1 },
];

export function TargetsVsActualsChart() {
  const { filters } = useDateFilters();
  const { data: targetData, isLoading, summary } = useTargetVsActual({
    periodType: "monthly",
    startDate: filters.year
      ? `${filters.year}-01-01`
      : `${new Date().getFullYear()}-01-01`,
    endDate: filters.year
      ? `${filters.year}-12-31`
      : `${new Date().getFullYear()}-12-31`,
  });

  // Transform API data to chart format
  const chartData = useMemo(() => {
    if (!targetData || targetData.length === 0) {
      return fallbackData;
    }

    // Group by month and aggregate
    const monthlyData: Record<
      string,
      { target: number; actual: number; count: number }
    > = {};

    targetData.forEach((item) => {
      const monthKey = format(parseISO(item.target_period), "MMM");
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { target: 0, actual: 0, count: 0 };
      }
      monthlyData[monthKey].target += item.target_revenue || 0;
      monthlyData[monthKey].actual += item.actual_revenue || 0;
      monthlyData[monthKey].count += 1;
    });

    // Convert to array format
    return Object.entries(monthlyData)
      .map(([month, values]) => {
        const achievement =
          values.target > 0
            ? (values.actual / values.target) * 100
            : 0;
        return {
          month,
          target: values.target,
          actual: values.actual,
          achievement: Number(achievement.toFixed(1)),
        };
      })
      .sort((a, b) => {
        const monthOrder = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
      });
  }, [targetData]);

  const overallAchievement = useMemo(() => {
    if (chartData.length === 0) return 87.2;
    const totalTarget = chartData.reduce((sum, item) => sum + item.target, 0);
    const totalActual = chartData.reduce((sum, item) => sum + item.actual, 0);
    return totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0;
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if we're using fallback data (no real data)
  const hasNoRealData = !targetData || targetData.length === 0 || chartData === fallbackData;
  
  if (hasNoRealData) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Targets vs Actuals
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Monthly Sales Performance & Achievement Rate
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <svg
              className="h-12 w-12 mb-2 text-gray-400"
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
            <p className="text-sm font-medium">Data not available yet</p>
            <p className="text-xs mt-1 text-gray-400">
              No target vs actual data for the selected period
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900">
              Targets vs Actuals
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Monthly Sales Performance & Achievement Rate
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-teal-600">
              {overallAchievement.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-600">
              {filters.year || new Date().getFullYear()} Target
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full min-w-0">
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={chartData}
              margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
            >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
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
              formatter={(value: number, name: string) => {
                if (name === "achievement")
                  return [`${value.toFixed(1)}%`, "Achievement"];
                return [
                  `$${value.toLocaleString()}`,
                  name === "target" ? "Target" : "Actual",
                ];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "12px" }}
              formatter={(value) =>
                value.charAt(0).toUpperCase() + value.slice(1)
              }
            />
            <Bar
              yAxisId="left"
              dataKey="target"
              fill="#e5e7eb"
              radius={[4, 4, 0, 0]}
            />
            <Bar
              yAxisId="left"
              dataKey="actual"
              fill="#0d9488"
              radius={[4, 4, 0, 0]}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="achievement"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ fill: "#f59e0b", r: 4 }}
            />
          </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
