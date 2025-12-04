"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { DollarSign, ShoppingCart, Target, TrendingUp } from "lucide-react";

interface DistributorMetricsCardProps {
  distributorId: string;
  marginPercent?: number | null;
}

interface Metrics {
  revenue: number;
  totalOrders: number;
  avgOrderValue: number;
  margin: number | null;
}

export function DistributorMetricsCard({
  distributorId,
  marginPercent,
}: DistributorMetricsCardProps) {
  const [metrics, setMetrics] = useState<Metrics>({
    revenue: 0,
    totalOrders: 0,
    avgOrderValue: 0,
    margin: marginPercent ?? null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const supabase = createClient();
        const { data: orders, error } = await supabase
          .from("orders")
          .select("total_amount")
          .eq("distributor_id", distributorId)
          .neq("order_status", "cancelled"); // Exclude cancelled orders

        if (error) throw error;

        const totalOrders = orders?.length || 0;
        const revenue = orders?.reduce((sum, order) => sum + (order.total_amount || 0), 0) || 0;
        const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

        setMetrics({
          revenue,
          totalOrders,
          avgOrderValue,
          margin: marginPercent ?? null,
        });
      } catch (error) {
        console.error("Error fetching distributor metrics:", error);
      } finally {
        setLoading(false);
      }
    }

    if (distributorId) {
      fetchMetrics();
    }
  }, [distributorId, marginPercent]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6 h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.revenue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Total revenue from orders</p>
            </div>
            <div className="p-3 bg-teal-100 rounded-full">
              <DollarSign className="h-6 w-6 text-teal-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.totalOrders}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Lifetime orders</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(metrics.avgOrderValue)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Average per order</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <Target className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Margin</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.margin !== null ? `${metrics.margin}%` : "N/A"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Profit margin</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-full">
              <TrendingUp className="h-6 w-6 text-orange-600" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

