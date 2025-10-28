import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

// TypeScript interfaces for SKU data
export interface TopSkuProduct {
  rank: number;
  product_name: string;
  country: string;
  year: number;
  month: number | null;
  week: number | null;
  revenue: number;
  previous_period_revenue: number | null;
  growth_percentage: number | null;
  current_soh: number;
  rank_position: number;
  type: string;
  // Computed fields for display
  isPositive: boolean;
  growth_display: string;
}

export interface TopSkusFilters {
  tableSuffix?: string;
  userId?: string;
  year?: number;
  month?: number;
  limit?: number;
}

export interface UseTopSkusOptions {
  filters?: TopSkusFilters;
  enabled?: boolean;
}

export interface UseTopSkusReturn {
  skus: TopSkuProduct[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

// Fetch top SKUs function using Supabase RPC
async function fetchTopSkus(
  filters: TopSkusFilters = {},
  userRole?: string,
  organizationId?: string
): Promise<TopSkuProduct[]> {
  const supabase = createClient();

  // Prepare RPC parameters
  const rpcParams: any = {
    p_table_suffix: filters.tableSuffix || "",
    p_user_id: filters.userId || "",
    p_year: filters.year || new Date().getFullYear(),
    p_limit: filters.limit || 10,
    p_user_role: userRole || "",
    p_organization_id: organizationId || null,
  };

  // Call the RPC function
  const { data, error } = await supabase.rpc(
    "get_top_products_by_revenue1",
    rpcParams
  );

  if (error) {
    console.error("Error fetching top SKUs:", error);
    throw new Error(error.message || "Failed to fetch top SKUs");
  }

  // Transform the data to match our interface
  return (data || []).map((item: any) => {
    const growthPercentage =
      item.growth_percentage !== null ? Number(item.growth_percentage) : 0;
    const isPositive = growthPercentage >= 0;

    return {
      rank: item.rank_position || 0,
      product_name: item.product_name || "Unknown Product",
      country: item.country || "Unknown Country",
      year: item.year || new Date().getFullYear(),
      month: item.month,
      week: item.week,
      revenue: Number(item.revenue || 0),
      previous_period_revenue:
        item.previous_period_revenue !== null
          ? Number(item.previous_period_revenue)
          : null,
      growth_percentage:
        item.growth_percentage !== null ? growthPercentage : null,
      current_soh: Number(item.current_soh || 0),
      rank_position: item.rank_position || 0,
      type: item.type || "Uncategorized",
      // Computed fields for display
      isPositive,
      growth_display:
        item.growth_percentage !== null
          ? `${isPositive ? "+" : ""}${growthPercentage.toFixed(1)}%`
          : "N/A",
    };
  });
}

export function useTopSkus({
  filters = {},
  enabled = true,
}: UseTopSkusOptions = {}): UseTopSkusReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [
      "top-skus",
      filters,
      profile?.role_name,
      profile?.organization_id,
    ],
    queryFn: () =>
      fetchTopSkus(filters, profile?.role_name, profile?.organization_id),
    enabled: enabled && !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  return {
    skus: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    isRefetching,
  };
}
