import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import type { DashboardMetrics, DashboardMetricsFilters } from "@/types/dashboard";

// Re-export types for convenience
export type { DashboardMetrics, DashboardMetricsFilters } from "@/types/dashboard";

export interface UseDashboardMetricsOptions {
  filters?: DashboardMetricsFilters;
  enabled?: boolean;
  initialData?: DashboardMetrics | null;
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
  brandId?: string
): Promise<DashboardMetrics | null> {
  const supabase = createClient();

  const rpcParams: Record<string, unknown> = {
    p_table_suffix: filters.tableSuffix || "",
    p_user_id: filters.userId || null,
    p_year: filters.year || new Date().getFullYear(),
    p_month: filters.month ?? null, // Allow null for "All Months" to get full year data
    p_user_role: userRole || "",
    p_brand_id: brandId || null,
    p_distributor_id: filters.distributorId || null,
  };

  const { data, error } = await supabase.rpc(
    "get_sales_dashboard_metrics",
    rpcParams
  );

  if (error) {
    // Check if RPC function doesn't exist (404 or function not found error)
    const isFunctionNotFound = 
      error.code === "P0004" || 
      error.message?.includes("Could not find the function") ||
      error.message?.includes("does not exist") ||
      error.code === "42883";

    if (isFunctionNotFound) {
      // eslint-disable-next-line no-console
      console.warn("RPC function 'get_sales_dashboard_metrics' not found. Returning null.", {
        message: error.message,
        code: error.code,
      });
      return null; // Return null instead of throwing
    }

    // eslint-disable-next-line no-console
    console.error("Error fetching dashboard metrics:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      error: error,
    });
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
  initialData,
}: UseDashboardMetricsOptions = {}): UseDashboardMetricsReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [
      "dashboard-metrics",
      filters,
      profile?.role_name,
      profile?.brand_id,
    ],
    queryFn: () =>
      fetchDashboardMetrics(
        filters,
        profile?.role_name,
        profile?.brand_id
      ),
    enabled: enabled && !!user && !!profile,
    // Use server-fetched data as initial data to skip loading state
    initialData: initialData ?? undefined,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Ensure data refreshes when component mounts
    retry: (failureCount, error) => {
      // Don't retry if function is not found
      if (error instanceof Error && error.message?.includes("Could not find the function")) {
        return false;
      }
      return failureCount < 2; // Retry up to 2 times for other errors
    },
  });

  return {
    data: data || null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    isRefetching,
  };
}

