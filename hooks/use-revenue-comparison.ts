import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

export interface RevenueMonthPoint {
  month: string; // Jan, Feb, ...
  current: number;
  previous: number;
}

export interface RevenueComparisonFilters {
  tableSuffix?: string;
  userId?: string;
  year?: number; // year for current vs previous will be year-1
}

export interface UseRevenueComparisonOptions {
  filters?: RevenueComparisonFilters;
  enabled?: boolean;
}

export interface UseRevenueComparisonReturn {
  data: RevenueMonthPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

// Normalize numeric and ensure defaults
function toNumber(value: unknown, fallback: number = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

// Format month number 1-12 to short label
function monthNumberToShortLabel(monthNumber: number): string {
  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const index = Math.max(1, Math.min(12, monthNumber)) - 1;
  return labels[index];
}

async function fetchRevenueComparison(
  filters: RevenueComparisonFilters = {},
  userRole?: string,
  brandId?: string
): Promise<RevenueMonthPoint[]> {
  const supabase = createClient();

  const rpcParams: Record<string, unknown> = {
    p_table_suffix: filters.tableSuffix || "",
    p_user_id: filters.userId || "",
    p_year: filters.year || new Date().getFullYear(),
    p_user_role: userRole || "",
    p_brand_id: brandId || null,
  };

  // Expecting an RPC that returns monthly rows with month_number/current/previous totals
  // Create this RPC in DB: get_monthly_revenue_comparison(p_table_suffix text, p_user_id uuid, p_year int)
  const { data, error } = await supabase.rpc(
    "get_monthly_yoy_revenue",
    rpcParams
  );

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching revenue comparison:", error);
    throw new Error(error.message || "Failed to fetch revenue comparison");
  }

  const rows: any[] = Array.isArray(data) ? data : [];

  return rows.map((row) => {
    // Convert month to name if it's a number
    let monthName = row.month;
    if (typeof row.month === "number" || typeof row.month_number === "number") {
      monthName = monthNumberToShortLabel(
        toNumber(row.month || row.month_number, 1)
      );
    } else if (!monthName) {
      monthName = monthNumberToShortLabel(toNumber(row.month_number, 1));
    }

    return {
      month: monthName,
      current: toNumber(
        row.current_year_revenue || row.current_total || row.current_revenue,
        0
      ),
      previous: toNumber(
        row.previous_year_revenue || row.previous_total || row.previous_revenue,
        0
      ),
      growth: toNumber(row.growth_percentage, 0) + 100,
    };
  });
}

export function useRevenueComparison({
  filters = {},
  enabled = true,
}: UseRevenueComparisonOptions = {}): UseRevenueComparisonReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [
      "revenue-comparison",
      filters,
      profile?.role_name,
      profile?.brand_id,
    ],
    queryFn: () =>
      fetchRevenueComparison(
        filters,
        profile?.role_name,
        profile?.brand_id
      ),
    enabled: enabled && !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    data: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    isRefetching,
  };
}
