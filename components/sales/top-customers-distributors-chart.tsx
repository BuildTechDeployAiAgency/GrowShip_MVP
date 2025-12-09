"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Store, Building2, Loader2 } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import { useAuth } from "@/contexts/auth-context";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useDateFilters } from "@/contexts/date-filter-context";
import { useTopCustomers } from "@/hooks/use-top-customers";

// Single blue color for all bars
const SINGLE_COLOR = "#3b82f6";

export function TopCustomersDistributorsChart() {
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
      limit: 10,
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

  const { customers, isLoading, error, refetch } = useTopCustomers({
    filters: chartFilters,
  });

  // Calculate total revenue from customers data
  const totalRevenue = useMemo(() => {
    return customers.reduce((sum, customer) => sum + customer.revenue, 0);
  }, [customers]);

  // Format data for chart display
  const chartData = useMemo(() => {
    return customers.slice(0, 5).map((customer) => ({
      name: customer.name,
      revenue: customer.revenue,
    }));
  }, [customers]);

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 shadow-lg border-2 border-blue-200 relative">
      <CardHeader className="pb-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                Top Customers/Distributors
              </CardTitle>
              <p className="text-sm text-blue-100 mt-1">
                Major customers and distributors by revenue and order volume
              </p>
            </div>
          </div>
          <div className="text-right bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-2xl font-bold text-white">
              {totalRevenue > 1000000
                ? `$${(totalRevenue / 1000000).toFixed(2)}M`
                : formatCurrency(totalRevenue)}
            </p>
            <p className="text-xs text-blue-100">Combined Revenue</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {error ? (
          <div className="py-8 text-center text-red-600">
            <p>Error loading customer data: {error}</p>
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
              <span>Loading customer data...</span>
            </div>
          </div>
        ) : !customers || customers.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-gray-400 mb-2">
              <Building2 className="mx-auto h-12 w-12" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Data not available yet</p>
            <p className="text-gray-400 text-xs mt-1">
              No customer data for the selected period
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={chartData}
                  margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" />
                  <XAxis
                    dataKey="name"
                    stroke="#1e40af"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                  />
                  <YAxis
                    stroke="#1e40af"
                    style={{ fontSize: "12px", fontWeight: 500 }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e40af",
                      border: "none",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Revenue",
                    ]}
                  />
                  <Bar
                    dataKey="revenue"
                    radius={[8, 8, 0, 0]}
                    fill={SINGLE_COLOR}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-3">
              {customers.slice(0, 5).map((customer, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-white border-2 border-blue-200 rounded-xl hover:shadow-md hover:border-blue-400 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold shadow-md bg-blue-500">
                        {customer.rank}
                      </div>
                      <Store className="absolute -top-1 -right-1 h-4 w-4 text-blue-600 bg-white rounded-full p-0.5" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{customer.name}</p>
                      <p className="text-sm text-blue-600 font-medium">
                        {formatNumber(customer.orders)} orders
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">
                      {formatCurrency(customer.revenue)}
                    </p>
                    <div
                      className={`flex items-center gap-1 text-sm font-bold justify-end ${
                        customer.isPositive ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {customer.isPositive ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span>
                        {customer.isPositive ? "+" : ""}
                        {customer.growth}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
