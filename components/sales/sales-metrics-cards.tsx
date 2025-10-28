"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Percent,
  Package,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { useDateFilters } from "@/contexts/date-filter-context";
import { useDashboardMetrics } from "@/hooks/use-dashboard-metrics";
import { useMemo } from "react";

export function SalesMetricsCards() {
  const { user } = useAuth();
  const { profile } = useEnhancedAuth();
  const { filters } = useDateFilters();

  // Brand admins use organization-based table, others use personal table
  const tableSuffix = profile?.role_name?.startsWith("brand_admin")
    ? `sales_documents_view_${profile.organization_id?.replace(/-/g, "_")}`
    : `sales_documents_${user?.id?.replace(/-/g, "_")}`;

  const dashboardFilters = useMemo(
    () => ({
      tableSuffix,
      userId: user?.id,
      organizationId: profile?.organization_id,
      userRole: profile?.role_name,
      year: filters.year,
      month: filters.month || new Date().getMonth() + 1,
    }),
    [
      tableSuffix,
      user?.id,
      profile?.organization_id,
      profile?.role_name,
      filters.year,
      filters.month,
    ]
  );

  const { data, isLoading, error } = useDashboardMetrics({
    filters: dashboardFilters,
  });

  const metrics = useMemo(() => {
    if (!data) {
      return [
        {
          title: "Total Revenue",
          value: "$0",
          change: "0%",
          comparison: "vs last month",
          isPositive: true,
          icon: DollarSign,
          color: "bg-blue-500",
        },
        {
          title: "Profit Margin",
          value: "0%",
          change: "0%",
          comparison: "vs last month",
          isPositive: true,
          icon: Percent,
          color: "bg-green-500",
        },
        {
          title: "Target Achievement",
          value: "0%",
          change: "Current Period",
          comparison: "Current target",
          isPositive: true,
          icon: Target,
          color: "bg-purple-500",
        },
        {
          title: "Pending Orders",
          value: "0",
          change: "$0",
          comparison: "Total value",
          isPositive: false,
          icon: Package,
          color: "bg-orange-500",
        },
      ];
    }

    return [
      {
        title: "Total Revenue",
        value: data.total_revenue_display,
        change: data.revenue_growth_display,
        comparison: "vs last month",
        isPositive: data.revenue_growth_percentage >= 0,
        icon: DollarSign,
        color: "bg-blue-500",
      },
      {
        title: "Profit Margin",
        value: data.profit_margin_display,
        change: data.profit_margin_growth_display,
        comparison: "vs last month",
        isPositive: data.profit_margin_growth_percentage >= 0,
        icon: Percent,
        color: "bg-green-500",
      },
      {
        title: "Target Achievement",
        value: data.target_achievement_display,
        change: data.target_period,
        comparison: "Current target",
        isPositive: data.target_achievement >= 80,
        icon: Target,
        color: "bg-purple-500",
      },
      {
        title: "Pending Orders",
        value: data.pending_orders_count_display,
        change: data.pending_orders_value_display,
        comparison: "Total value",
        isPositive: false,
        icon: Package,
        color: "bg-orange-500",
      },
    ];
  }, [data]);

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        <p>Error loading metrics: {error}</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <Card
          key={index}
          className="bg-white rounded-xl shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all duration-300 group"
        >
          <div className={`${metric.color} h-1 w-full`}></div>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div
                className={`${metric.color} p-3 rounded-xl shadow-md group-hover:scale-110 transition-transform duration-300`}
              >
                <metric.icon className="h-6 w-6 text-white" />
              </div>
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg ${
                  metric.isPositive
                    ? "bg-green-50 text-green-600"
                    : "bg-red-50 text-red-600"
                }`}
              >
                {metric.isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                {metric.title}
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mb-3">
                {metric.value}
              </h3>
              <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <span
                  className={`text-sm font-bold ${
                    metric.isPositive ? "text-green-600" : "text-gray-600"
                  }`}
                >
                  {metric.change}
                </span>
                <span className="text-sm text-gray-500">
                  {metric.comparison}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
