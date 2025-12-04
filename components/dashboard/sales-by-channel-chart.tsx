"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Globe, Store, Package, Zap, Code, HelpCircle } from "lucide-react";
import { useMemo } from "react";
import { useSalesByChannel } from "@/hooks/use-campaign-analytics";
import { useDateFilters } from "@/contexts/date-filter-context";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { formatCurrency, formatNumber } from "@/lib/formatters";

// Channel colors - vibrant palette
const CHANNEL_COLORS: Record<string, string> = {
  portal: "#3b82f6",   // Blue
  edi: "#8b5cf6",      // Purple
  shopify: "#22c55e",  // Green
  amazon: "#f97316",   // Orange
  direct: "#06b6d4",   // Cyan
  api: "#ec4899",      // Pink
  other: "#6b7280",    // Gray
  unknown: "#9ca3af",  // Light Gray
};

// Channel icons
const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  portal: <Globe className="h-4 w-4" />,
  edi: <Zap className="h-4 w-4" />,
  shopify: <Store className="h-4 w-4" />,
  amazon: <Package className="h-4 w-4" />,
  direct: <ShoppingCart className="h-4 w-4" />,
  api: <Code className="h-4 w-4" />,
  other: <HelpCircle className="h-4 w-4" />,
  unknown: <HelpCircle className="h-4 w-4" />,
};

// Format channel name for display
function formatChannelName(channel: string): string {
  const formatted = channel.toLowerCase();
  const names: Record<string, string> = {
    portal: "Brand Portal",
    edi: "EDI",
    shopify: "Shopify",
    amazon: "Amazon",
    direct: "Direct Sales",
    api: "API",
    other: "Other",
    unknown: "Unknown",
  };
  return names[formatted] || channel;
}

export function SalesByChannelChart() {
  const { filters } = useDateFilters();

  const chartFilters = useMemo(
    () => ({
      year: filters.year,
      month: filters.month,
    }),
    [filters.year, filters.month]
  );

  const { data, isLoading, error, refetch } = useSalesByChannel({
    filters: chartFilters,
  });

  // Calculate totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, channel) => ({
        orders: acc.orders + channel.total_orders,
        revenue: acc.revenue + channel.total_revenue,
      }),
      { orders: 0, revenue: 0 }
    );
  }, [data]);

  // Transform data for pie chart
  const chartData = useMemo(() => {
    return data.map((channel) => ({
      name: formatChannelName(channel.sales_channel),
      value: channel.total_revenue,
      orders: channel.total_orders,
      aov: channel.avg_order_value,
      percent: channel.order_count_percent,
      color: CHANNEL_COLORS[channel.sales_channel.toLowerCase()] || CHANNEL_COLORS.unknown,
    }));
  }, [data]);

  return (
    <Card className="bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1 w-full"></div>
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Sales by Channel
              </CardTitle>
            </div>
            <p className="text-sm text-gray-600 mt-1 ml-3">
              Revenue distribution across sales channels
            </p>
          </div>
          {totals.revenue > 0 && (
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(totals.revenue)}
              </p>
              <p className="text-xs text-gray-500">
                {formatNumber(totals.orders)} orders
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {error ? (
          <div className="py-8 text-center text-red-600">
            <p>Error loading channel sales: {error}</p>
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
              <span>Loading channel data...</span>
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-gray-400 mb-2">
              <Globe className="mx-auto h-12 w-12" />
            </div>
            <p className="text-gray-500 text-sm font-medium">Data not available yet</p>
            <p className="text-gray-400 text-xs mt-1">
              No channel sales data for the selected period
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pie Chart */}
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Channel: ${label}`}
                  />
                  <Legend
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                    formatter={(value) => (
                      <span className="text-xs text-gray-600">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Channel List */}
            <div className="space-y-3">
              {data.map((channel, index) => {
                const channelKey = channel.sales_channel.toLowerCase();
                const color = CHANNEL_COLORS[channelKey] || CHANNEL_COLORS.unknown;
                const icon = CHANNEL_ICONS[channelKey] || CHANNEL_ICONS.unknown;
                
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: color }}
                      >
                        {icon}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {formatChannelName(channel.sales_channel)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatNumber(channel.total_orders)} orders
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900">
                        {formatCurrency(channel.total_revenue)}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-xs"
                        style={{ borderColor: color, color: color }}
                      >
                        {channel.order_count_percent.toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

