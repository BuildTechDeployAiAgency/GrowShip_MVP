import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

export interface DashboardMetrics {
  total_revenue: number;
  total_revenue_display: string;
  revenue_growth_percentage: number;
  revenue_growth_display: string;

  profit_margin: number;
  profit_margin_display: string;
  profit_margin_growth_percentage: number;
  profit_margin_growth_display: string;

  target_achievement: number;
  target_achievement_display: string;
  target_period: string;

  pending_orders_count: number;
  pending_orders_count_display: string;
  pending_orders_value: number;
  pending_orders_value_display: string;
}

export interface DashboardMetricsFilters {
  tableSuffix?: string;
  userId?: string;
  organizationId?: string;
  userRole?: string;
  year?: number;
  month?: number;
}

export interface UseDashboardMetricsOptions {
  filters?: DashboardMetricsFilters;
  enabled?: boolean;
}

export interface UseDashboardMetricsReturn {
  data: DashboardMetrics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

function toNumber(value: unknown, fallback: number = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchDashboardMetrics(
  filters: DashboardMetricsFilters = {},
  userRole?: string,
  organizationId?: string
): Promise<DashboardMetrics | null> {
  const supabase = createClient();

  const rpcParams: Record<string, unknown> = {
    p_table_suffix: filters.tableSuffix || "",
    p_user_id: filters.userId || null,
    p_year: filters.year || new Date().getFullYear(),
    p_month: filters.month || new Date().getMonth() + 1,
    p_user_role: userRole || "",
    p_organization_id: organizationId || null,
  };

  const { data, error } = await supabase.rpc(
    "get_sales_dashboard_metrics",
    rpcParams
  );

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching dashboard metrics:", error);
    throw new Error(error.message || "Failed to fetch dashboard metrics");
  }

  // The RPC returns a single row, not an array
  if (!data || (Array.isArray(data) && data.length === 0)) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;

  return {
    total_revenue: toNumber(row.total_revenue, 0),
    total_revenue_display: row.total_revenue_display || "$0",
    revenue_growth_percentage: toNumber(row.revenue_growth_percentage, 0),
    revenue_growth_display: row.revenue_growth_display || "+0%",

    profit_margin: toNumber(row.profit_margin, 0),
    profit_margin_display: row.profit_margin_display || "0%",
    profit_margin_growth_percentage: toNumber(
      row.profit_margin_growth_percentage,
      0
    ),
    profit_margin_growth_display: row.profit_margin_growth_display || "+0%",

    target_achievement: toNumber(row.target_achievement, 0),
    target_achievement_display: row.target_achievement_display || "0%",
    target_period: row.target_period || "Current Period",

    pending_orders_count: toNumber(row.pending_orders_count, 0),
    pending_orders_count_display: row.pending_orders_count_display || "0",
    pending_orders_value: toNumber(row.pending_orders_value, 0),
    pending_orders_value_display: row.pending_orders_value_display || "$0",
  };
}

export function useDashboardMetrics({
  filters = {},
  enabled = true,
}: UseDashboardMetricsOptions = {}): UseDashboardMetricsReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [
      "dashboard-metrics",
      filters,
      profile?.role_name,
      profile?.organization_id,
    ],
    queryFn: () =>
      fetchDashboardMetrics(
        filters,
        profile?.role_name,
        profile?.organization_id
      ),
    enabled: enabled && !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    data: data || null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    isRefetching,
  };
}

