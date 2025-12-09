import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

export interface SeasonalPoint {
  quarter: string;
  quarter_num: number;
  revenue: number;
  revenue_display: string;
  previous_year_revenue: number;
  growth_percentage: number;
  growth_display: string;
  season: string;
  [key: string]: string | number | undefined; // satisfy Recharts ChartDataInput index signature
}

export interface SeasonalAnalysisFilters {
  tableSuffix?: string;
  userId?: string;
  year?: number;
  distributorId?: string;
}

export interface UseSeasonalAnalysisOptions {
  filters?: SeasonalAnalysisFilters;
  enabled?: boolean;
}

export interface UseSeasonalAnalysisReturn {
  data: SeasonalPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

function toNumber(value: unknown, fallback: number = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchSeasonalAnalysis(
  filters: SeasonalAnalysisFilters = {},
  userRole?: string,
  brandId?: string
): Promise<SeasonalPoint[]> {
  const supabase = createClient();

  const rpcParams: Record<string, unknown> = {
    p_table_suffix: filters.tableSuffix || "",
    p_user_id: filters.userId || "",
    p_year: filters.year || new Date().getFullYear(),
    p_user_role: userRole || "",
    p_brand_id: brandId || null,
    p_distributor_id: filters.distributorId || null,
  };

  // RPC must accept (p_table_suffix text, p_user_id uuid, p_year int)
  const { data, error } = await supabase.rpc(
    "get_seasonal_analysis",
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
      console.warn("RPC function 'get_seasonal_analysis' not found. Returning empty data.", {
        message: error.message,
        code: error.code,
      });
      return []; // Return empty array instead of throwing
    }

    // eslint-disable-next-line no-console
    console.error("Error fetching seasonal analysis:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      error: error,
    });
    throw new Error(error.message || "Failed to fetch seasonal analysis");
  }

  const rows: any[] = Array.isArray(data) ? data : [];

  return rows.map((row) => ({
    quarter: row.quarter || "Unknown Quarter",
    quarter_num: toNumber(row.quarter_num, 0),
    revenue: toNumber(row.revenue, 0),
    revenue_display:
      row.revenue_display ||
      `$${(toNumber(row.revenue, 0) / 1000).toFixed(0)}k`,
    previous_year_revenue: toNumber(row.previous_year_revenue, 0),
    growth_percentage: toNumber(row.growth_percentage, 0),
    growth_display:
      row.growth_display ||
      `${toNumber(row.growth_percentage, 0) >= 0 ? "+" : ""}${toNumber(
        row.growth_percentage,
        0
      ).toFixed(1)}%`,
    season: row.season || "Unknown Season",
  }));
}

export function useSeasonalAnalysis({
  filters = {},
  enabled = true,
}: UseSeasonalAnalysisOptions = {}): UseSeasonalAnalysisReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [
      "seasonal-analysis",
      filters,
      profile?.role_name,
      profile?.brand_id,
    ],
    queryFn: () =>
      fetchSeasonalAnalysis(
        filters,
        profile?.role_name,
        profile?.brand_id
      ),
    enabled: enabled && !!user && !!profile,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Ensure data refreshes when component mounts
  });

  return {
    data: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    isRefetching,
  };
}
