"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Package, Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useDateFilters } from "@/contexts/date-filter-context";
import { useTopSkus, TopSkusFilters } from "@/hooks/use-top-skus";

interface TopSkusTableProps {
  filters?: TopSkusFilters;
}

export function TopSkusTable({ filters }: TopSkusTableProps = {}) {
  const { user } = useAuth();
  const { profile } = useEnhancedAuth();
  const { filters: dateFilters } = useDateFilters();

  // Brand admins use organization-based table, others use personal table
  const tableSuffix = profile?.role_name?.startsWith("brand_admin")
    ? `sales_documents_view_${profile.brand_id?.replace(/-/g, "_")}`
    : `sales_documents_${user?.id?.replace(/-/g, "_")}`;

  // Merge component filters with auth-based filters and global date filters
  const mergedFilters = useMemo(
    () => ({
      ...filters,
      tableSuffix: filters?.tableSuffix || tableSuffix,
      userId: filters?.userId || user?.id,
      brandId: profile?.brand_id,
      userRole: profile?.role_name,
      year: filters?.year || dateFilters.year,
      month: filters?.month || dateFilters.month,
    }),
    [
      filters,
      tableSuffix,
      user?.id,
      profile?.brand_id,
      profile?.role_name,
      dateFilters.year,
      dateFilters.month,
    ]
  );

  const { skus, isLoading, error, refetch } = useTopSkus({
    filters: mergedFilters,
  });

  if (error) {
    return (
      <Card className="bg-white shadow-sm border border-gray-200">
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <p>Error loading top SKUs: {error}</p>
            <button
              onClick={() => refetch()}
              className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 h-1 w-full"></div>
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 bg-gradient-to-b from-amber-500 to-orange-500 rounded-full"></div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Top 10 SKUs
              </CardTitle>
            </div>
            <p className="text-sm text-gray-600 mt-1 ml-3">
              Best performing products by revenue
            </p>
          </div>
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl px-3 py-2 border border-amber-100">
            <Package className="h-5 w-5 text-amber-600 flex-shrink-0" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto w-full pt-6">
        <div className="overflow-x-auto min-w-full">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600">
                  #
                </th>
                <th className="text-left py-3 px-2 text-xs font-semibold text-gray-600">
                  Product
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">
                  Revenue
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">
                  Previous Period
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">
                  Growth
                </th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-gray-600">
                  Stock On Hand
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600">
                  Type
                </th>
                <th className="text-center py-3 px-2 text-xs font-semibold text-gray-600">
                  Year
                </th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading top SKUs...</span>
                    </div>
                  </td>
                </tr>
              ) : skus.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
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
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      <p className="text-sm font-medium">Data not available yet</p>
                      <p className="text-xs mt-1 text-gray-400">
                        No SKU data for the selected period
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                skus.map((item) => (
                  <tr
                    key={item.rank}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-teal-100 text-teal-700 text-xs font-bold">
                        {item.rank}
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {item.product_name}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            {item.country}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        ${item.revenue.toLocaleString()}
                      </p>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <p className="text-sm text-gray-600">
                        {item.previous_period_revenue !== null
                          ? `$${item.previous_period_revenue.toLocaleString()}`
                          : "N/A"}
                      </p>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <div
                        className={`flex items-center justify-end gap-1 text-sm font-medium ${
                          item.isPositive ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {item.isPositive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        <span>{item.growth_display}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <p className="text-sm text-gray-600">
                        {item.current_soh.toLocaleString()}
                      </p>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          item.type === "Master"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : item.type === "Double"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : item.type === "Single"
                            ? "bg-orange-50 text-orange-700 border-orange-200"
                            : "bg-gray-50 text-gray-700 border-gray-200"
                        }`}
                      >
                        {item.type}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <p className="text-sm text-gray-600">{item.year}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
