"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useSalesByCategory } from "@/hooks/use-sales-by-category";
import { useDateFilters } from "@/contexts/date-filter-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

const COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"];

export function SalesByCategoryChart() {
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
      year: filters.year,
      month: filters.month,
      distributorId: filters.distributorId,
    }),
    [
      tableSuffix,
      user?.id,
      profile?.brand_id,
      profile?.role_name,
      filters.year,
      filters.month,
      filters.distributorId,
    ]
  );

  const { data, isLoading, error, refetch } = useSalesByCategory({
    filters: chartFilters,
  });

  return (
    <Card className="bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-1 w-full"></div>
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-teal-500 rounded-full"></div>
          <CardTitle className="text-xl font-bold text-gray-900">
            Sales by Category
          </CardTitle>
        </div>
        <p className="text-sm text-gray-600 mt-1 ml-3">
          Revenue distribution across product categories
        </p>
      </CardHeader>
      <CardContent className="w-full overflow-x-auto pt-6">
        {error ? (
          <div className="py-8 text-center text-red-600">
            <p>Error loading category sales: {error}</p>
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
              <span>Loading category sales...</span>
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
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <p className="text-gray-500 text-sm font-medium">Data not available yet</p>
            <p className="text-gray-400 text-xs mt-1">
              No category sales data for the selected period
            </p>
          </div>
        ) : (
          <div
            className="w-full"
            style={{ minHeight: Math.max(250, data.length * 30 + 80) }}
          >
            <ResponsiveContainer
              width="100%"
              height={Math.max(250, data.length * 30 + 80)}
            >
              <BarChart
                data={data}
                layout="horizontal"
                margin={{ top: 20, right: 20, left: 60, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  type="category"
                  dataKey="name"
                  stroke="#6b7280"
                  style={{ fontSize: "11px" }}
                  height={80}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  type="number"
                  stroke="#6b7280"
                  style={{ fontSize: "12px" }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  domain={["dataMin", "dataMax"]}
                  scale="linear"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number, name: string, props: any) => [
                    formatCurrency(value),
                    `${props.payload.percentage}%`,
                  ]}
                  labelFormatter={(label) => `Category: ${label}`}
                />
                <Bar dataKey="value" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
