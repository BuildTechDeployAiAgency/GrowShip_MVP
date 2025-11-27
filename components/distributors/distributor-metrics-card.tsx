"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { DollarSign, ShoppingCart, TrendingUp, Percent } from "lucide-react";

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="h-24" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.revenue)}</div>
          <p className="text-xs text-muted-foreground">Total revenue from orders</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.totalOrders}</div>
          <p className="text-xs text-muted-foreground">Lifetime orders</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(metrics.avgOrderValue)}</div>
          <p className="text-xs text-muted-foreground">Average per order</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Margin</CardTitle>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.margin !== null ? `${metrics.margin}%` : "N/A"}
          </div>
          <p className="text-xs text-muted-foreground">Profit margin</p>
        </CardContent>
      </Card>
    </div>
  );
}

