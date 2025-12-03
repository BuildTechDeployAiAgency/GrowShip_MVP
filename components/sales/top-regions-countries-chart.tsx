"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useSalesByTerritory } from "@/hooks/use-sales-by-territory";
import { useDateFilters } from "@/contexts/date-filter-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, MapPin } from "lucide-react";
import { formatCurrency, formatNumber } from "@/lib/formatters";

// Single orange color for all bars
const SINGLE_COLOR = "#f97316";

export function TopRegionsCountriesChart() {
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
    }),
    [
      tableSuffix,
      user?.id,
      profile?.brand_id,
      profile?.role_name,
      filters.year,
      filters.month,
    ]
  );

  const { data, isLoading, error, refetch } = useSalesByTerritory({
    filters: chartFilters,
  });

  // Transform data for chart (always show 5 regions in axis)
  const chartData = useMemo(() => {
    const defaultRegions = [
      {
        name: "North America",
        revenue: 0,
        orders: 0,
        growth: 0,
        isPositive: true,
        country: "No countries",
        countryCount: 0,
      },
      {
        name: "Europe",
        revenue: 0,
        orders: 0,
        growth: 0,
        isPositive: true,
        country: "No countries",
        countryCount: 0,
      },
      {
        name: "Asia Pacific",
        revenue: 0,
        orders: 0,
        growth: 0,
        isPositive: true,
        country: "No countries",
        countryCount: 0,
      },
      {
        name: "Latin America",
        revenue: 0,
        orders: 0,
        growth: 0,
        isPositive: true,
        country: "No countries",
        countryCount: 0,
      },
      {
        name: "Middle East",
        revenue: 0,
        orders: 0,
        growth: 0,
        isPositive: true,
        country: "No countries",
        countryCount: 0,
      },
    ];

    if (!data || data.length === 0) {
      return defaultRegions;
    }

    // Take up to 5 regions from the data
    const topRegions = data.slice(0, 5).map((item, index) => ({
      name: item.territory,
      revenue: item.revenue,
      orders: Math.floor(item.revenue / 1000), // Mock orders calculation
      growth: item.revenue_growth_percentage || 0, // Use revenue_growth_percentage from API
      isPositive: (item.revenue_growth_percentage || 0) >= 0,
      country: item.countries || `${item.country_count || 0} countries`, // Use actual countries value
      countryCount: item.country_count || 0,
    }));

    // Fill remaining slots with default regions if we have less than 5
    const result = [...topRegions];
    for (let i = topRegions.length; i < 5; i++) {
      result.push(defaultRegions[i]);
    }

    return result;
  }, [data]);

  // Transform data for cards (only show actual data, no defaults)
  const cardData = useMemo(() => {
    if (!data || data.length === 0) {
      return [];
    }

    return data.map((item, index) => ({
      name: item.territory,
      revenue: item.revenue,
      orders: Math.floor(item.revenue / 1000), // Mock orders calculation
      growth: item.revenue_growth_percentage || 0, // Use revenue_growth_percentage from API
      isPositive: (item.revenue_growth_percentage || 0) >= 0,
      country: item.countries || `${item.country_count || 0} countries`, // Use actual countries value
      countryCount: item.country_count || 0,
    }));
  }, [data]);

  const totalRevenue = chartData.reduce((sum, item) => sum + item.revenue, 0);

  return (
    <Card className="bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 shadow-lg border-2 border-orange-200">
      <CardHeader className="pb-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
              <MapPin className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                Top Region / Countries
              </CardTitle>
              <p className="text-sm text-orange-100 mt-1">
                Revenue distribution by geographical regions
              </p>
            </div>
          </div>
          <div className="text-right bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-2xl font-bold text-white">
              ${(totalRevenue / 1000000).toFixed(2)}M
            </p>
            <p className="text-xs text-orange-100">Total Revenue</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {error ? (
          <div className="py-8 text-center text-red-600">
            <p>Error loading regions data: {error}</p>
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
              <span>Loading regions data...</span>
            </div>
          </div>
        ) : !data || data.length === 0 || cardData.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-gray-400 mb-2">
              <MapPin className="mx-auto h-12 w-12" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Data not available yet</p>
            <p className="text-gray-400 text-xs mt-1">
              No regional sales data for the selected period
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {/* Full width chart */}
            <div className="bg-white rounded-xl p-4 border-2 border-orange-200">
              <div className="w-full min-w-0">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={chartData}
                    margin={{ top: 10, right: 30, left: 20, bottom: 20 }}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#fed7aa"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      stroke="#c2410c"
                      style={{ fontSize: "12px", fontWeight: 500 }}
                      tickFormatter={(value) =>
                        `$${(value / 1000).toFixed(0)}k`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#c2410c"
                      style={{ fontSize: "12px", fontWeight: 600 }}
                      width={120}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#c2410c",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                      formatter={(value: number, name: string, props: any) => {
                        const growth = props.payload.growth || 0;
                        return [
                          [
                            `$${value.toLocaleString()}`,
                            `${growth >= 0 ? "+" : ""}${growth.toFixed(
                              1
                            )}% growth`,
                          ],
                          "Revenue & Growth",
                        ];
                      }}
                      labelFormatter={(label) => `Region: ${label}`}
                    />
                    <Bar
                      dataKey="revenue"
                      radius={[0, 8, 8, 0]}
                      fill={SINGLE_COLOR}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Grid of region cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cardData.map((region, index) => (
                <div
                  key={index}
                  className="bg-white border-2 border-orange-200 rounded-xl p-4 hover:shadow-lg hover:border-orange-400 transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg bg-orange-500">
                        {index + 1}
                      </div>
                      <MapPin className="h-5 w-5 text-orange-600" />
                    </div>
                    <div
                      className={`flex items-center gap-1 text-sm font-bold px-2 py-1 rounded-full ${
                        region.isPositive
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {region.isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span>
                        {region.isPositive ? "+" : ""}
                        {region.growth}%
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-bold text-lg text-gray-900">
                      {region.name}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-1">
                      🌍 {region.country}
                    </p>
                    <div className="pt-2 border-t border-orange-100">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Revenue</span>
                        <span className="font-bold text-lg text-orange-600">
                          {formatCurrency(region.revenue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-gray-600">Orders</span>
                        <span className="font-semibold text-sm text-gray-900">
                          {formatNumber(region.orders)}
                        </span>
                      </div>
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
