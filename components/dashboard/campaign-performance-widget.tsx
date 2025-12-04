"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, 
  Megaphone, 
  TrendingUp, 
  Users, 
  ShoppingBag,
  DollarSign,
  Package
} from "lucide-react";
import { useMemo, useState } from "react";
import { useCampaignPerformance } from "@/hooks/use-campaign-analytics";
import { useDateFilters } from "@/contexts/date-filter-context";
import { formatCurrency, formatNumber } from "@/lib/formatters";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Generate a consistent color for a campaign based on its ID
function getCampaignColor(campaignId: string): string {
  const colors = [
    "#3b82f6", // Blue
    "#8b5cf6", // Purple
    "#ec4899", // Pink
    "#f97316", // Orange
    "#22c55e", // Green
    "#06b6d4", // Cyan
    "#eab308", // Yellow
    "#ef4444", // Red
  ];
  
  // Simple hash function to get consistent color for same campaign ID
  let hash = 0;
  for (let i = 0; i < campaignId.length; i++) {
    hash = ((hash << 5) - hash) + campaignId.charCodeAt(i);
    hash = hash & hash;
  }
  return colors[Math.abs(hash) % colors.length];
}

export function CampaignPerformanceWidget() {
  const { filters } = useDateFilters();
  const [sortBy, setSortBy] = useState<"revenue" | "orders" | "aov">("revenue");

  // Calculate date range based on filters
  const campaignFilters = useMemo(() => {
    const currentYear = filters.year || new Date().getFullYear();
    
    if (filters.month) {
      // Specific month selected
      const startDate = new Date(currentYear, filters.month - 1, 1);
      const endDate = new Date(currentYear, filters.month, 0); // Last day of month
      return { startDate, endDate };
    } else {
      // Full year
      const startDate = new Date(currentYear, 0, 1);
      const endDate = new Date(currentYear, 11, 31);
      return { startDate, endDate };
    }
  }, [filters.year, filters.month]);

  const { data, isLoading, error, refetch } = useCampaignPerformance({
    filters: campaignFilters,
  });

  // Sort data based on selected criteria
  const sortedData = useMemo(() => {
    if (!data) return [];
    
    return [...data].sort((a, b) => {
      switch (sortBy) {
        case "orders":
          return b.total_orders - a.total_orders;
        case "aov":
          return b.avg_order_value - a.avg_order_value;
        case "revenue":
        default:
          return b.total_revenue - a.total_revenue;
      }
    });
  }, [data, sortBy]);

  // Calculate totals
  const totals = useMemo(() => {
    return data.reduce(
      (acc, campaign) => ({
        orders: acc.orders + campaign.total_orders,
        revenue: acc.revenue + campaign.total_revenue,
        customers: acc.customers + campaign.unique_customers,
        units: acc.units + campaign.total_units,
      }),
      { orders: 0, revenue: 0, customers: 0, units: 0 }
    );
  }, [data]);

  return (
    <Card className="bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300">
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 h-1 w-full"></div>
      <CardHeader className="pb-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1 h-6 bg-gradient-to-b from-pink-500 to-rose-500 rounded-full"></div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Campaign Performance
              </CardTitle>
            </div>
            <p className="text-sm text-gray-600 mt-1 ml-3">
              Marketing campaign metrics and ROI tracking
            </p>
          </div>
          {data && data.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as "revenue" | "orders" | "aov")}
                className="text-xs border border-gray-200 rounded-md px-2 py-1 bg-white"
              >
                <option value="revenue">Sort by Revenue</option>
                <option value="orders">Sort by Orders</option>
                <option value="aov">Sort by AOV</option>
              </select>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {error ? (
          <div className="py-8 text-center text-red-600">
            <p>Error loading campaign data: {error}</p>
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
              <span>Loading campaign data...</span>
            </div>
          </div>
        ) : !data || data.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-gray-400 mb-2">
              <Megaphone className="mx-auto h-12 w-12" />
            </div>
            <p className="text-gray-500 text-sm font-medium">No campaigns found</p>
            <p className="text-gray-400 text-xs mt-1">
              Orders with campaign IDs will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-600 mb-1">
                  <Megaphone className="h-4 w-4" />
                  <span className="text-xs font-medium">Campaigns</span>
                </div>
                <p className="text-2xl font-bold text-blue-700">{data.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-600 mb-1">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Revenue</span>
                </div>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(totals.revenue)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <div className="flex items-center gap-2 text-purple-600 mb-1">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="text-xs font-medium">Total Orders</span>
                </div>
                <p className="text-2xl font-bold text-purple-700">
                  {formatNumber(totals.orders)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4">
                <div className="flex items-center gap-2 text-orange-600 mb-1">
                  <Users className="h-4 w-4" />
                  <span className="text-xs font-medium">Unique Customers</span>
                </div>
                <p className="text-2xl font-bold text-orange-700">
                  {formatNumber(totals.customers)}
                </p>
              </div>
            </div>

            {/* Campaign Table */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">AOV</TableHead>
                    <TableHead className="text-right">Customers</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedData.slice(0, 10).map((campaign, index) => {
                    const color = getCampaignColor(campaign.campaign_id);
                    const revenueShare = totals.revenue > 0 
                      ? (campaign.total_revenue / totals.revenue * 100).toFixed(1) 
                      : "0";
                    
                    return (
                      <TableRow key={campaign.campaign_id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: color }}
                            >
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 truncate max-w-[150px]">
                                {campaign.campaign_id}
                              </p>
                              <Badge
                                variant="outline"
                                className="text-xs mt-0.5"
                                style={{ borderColor: color, color: color }}
                              >
                                {revenueShare}% of total
                              </Badge>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-gray-900">
                          {formatCurrency(campaign.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {formatNumber(campaign.total_orders)}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {formatNumber(campaign.total_units)}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {formatCurrency(campaign.avg_order_value)}
                        </TableCell>
                        <TableCell className="text-right text-gray-600">
                          {formatNumber(campaign.unique_customers)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {data.length > 10 && (
              <p className="text-center text-xs text-gray-500">
                Showing top 10 of {data.length} campaigns
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

