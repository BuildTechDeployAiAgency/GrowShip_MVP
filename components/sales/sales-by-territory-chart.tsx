"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
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
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

const COLORS = ["#0d9488", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"];

export function SalesByTerritoryChart() {
  const { user } = useAuth();
  const { filters } = useDateFilters();
  const tableSuffix = user?.id?.replace(/-/g, "_");

  const chartFilters = useMemo(
    () => ({
      tableSuffix,
      userId: user?.id,
      year: filters.year,
      month: filters.month,
    }),
    [tableSuffix, user?.id, filters.year, filters.month]
  );

  const { data, isLoading, error, refetch } = useSalesByTerritory({ filters: chartFilters });

  // Ensure we always have exactly 5 territories, fill with default data if needed
  const chartData = useMemo(() => {
    const defaultTerritories = [
      { 
        territory: "North America", 
        revenue: 0, 
        growth_percentage: 0, 
        revenue_growth_percentage: 0,
        country_count: 0,
        countries: "",
        revenue_display: "$0k",
        growth_display: "+0.0%",
        revenue_growth_display: "+0.0%"
      },
      { 
        territory: "Europe", 
        revenue: 0, 
        growth_percentage: 0, 
        revenue_growth_percentage: 0,
        country_count: 0,
        countries: "",
        revenue_display: "$0k",
        growth_display: "+0.0%",
        revenue_growth_display: "+0.0%"
      },
      { 
        territory: "Asia Pacific", 
        revenue: 0, 
        growth_percentage: 0, 
        revenue_growth_percentage: 0,
        country_count: 0,
        countries: "",
        revenue_display: "$0k",
        growth_display: "+0.0%",
        revenue_growth_display: "+0.0%"
      },
      { 
        territory: "Latin America", 
        revenue: 0, 
        growth_percentage: 0, 
        revenue_growth_percentage: 0,
        country_count: 0,
        countries: "",
        revenue_display: "$0k",
        growth_display: "+0.0%",
        revenue_growth_display: "+0.0%"
      },
      { 
        territory: "Middle East", 
        revenue: 0, 
        growth_percentage: 0, 
        revenue_growth_percentage: 0,
        country_count: 0,
        countries: "",
        revenue_display: "$0k",
        growth_display: "+0.0%",
        revenue_growth_display: "+0.0%"
      },
    ];

    if (!data || data.length === 0) {
      return defaultTerritories;
    }

    // Take up to 5 territories from the data
    const topTerritories = data.slice(0, 5);
    
    // Fill remaining slots with default territories if we have less than 5
    const result = [...topTerritories];
    for (let i = topTerritories.length; i < 5; i++) {
      result.push(defaultTerritories[i]);
    }

    return result;
  }, [data]);


  return (
    <Card className="bg-white shadow-sm border border-gray-200">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-semibold text-gray-900">
          Sales by Territory
        </CardTitle>
        <p className="text-sm text-gray-600 mt-1">
          Regional performance and growth rates
        </p>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="py-8 text-center text-red-600">
            <p>Error loading territory sales: {error}</p>
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
              <span>Loading territory sales...</span>
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-500 text-sm">No data available</p>
            <p className="text-gray-400 text-xs mt-1">Try adjusting your date filters</p>
          </div>
        ) : (
          <>
            <div className="w-full min-w-0">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 100, bottom: 20 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#f0f0f0"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    type="number"
                    stroke="#6b7280"
                    style={{ fontSize: "12px" }}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="territory"
                    stroke="#6b7280"
                    style={{ fontSize: "12px" }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string, props: any) => {
                      if (name === "revenue") {
                        const growth = props.payload.revenue_growth_percentage || 0;
                        return [
                          [
                            formatCurrency(value),
                            `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% growth`
                          ],
                          "Revenue & Growth"
                        ];
                      }
                      return [value, name];
                    }}
                    labelFormatter={(label) => `Territory: ${label}`}
                  />
                  <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 mt-4">
              {chartData.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div 
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-gray-900 block truncate">{item.territory}</span>
                      <div className="text-xs text-gray-500">
                        {item.countries || ((item.country_count || 0) > 0 ? `${item.country_count} countries` : '')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className="text-sm font-semibold text-gray-900">
                      {formatCurrency(item.revenue)}
                    </div>
                    <div className={`text-xs font-medium ${
                      (item.revenue_growth_percentage || 0) >= 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {item.revenue_growth_display || `${(item.revenue_growth_percentage || 0) >= 0 ? '+' : ''}${(item.revenue_growth_percentage || 0).toFixed(1)}%`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
