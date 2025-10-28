import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

export interface TerritoryPoint {
  territory: string;
  revenue: number;
  previous_revenue?: number;
  growth_percentage?: number;
  revenue_growth_percentage?: number;
  growth_display?: string;
  revenue_growth_display?: string;
  revenue_display?: string;
  country_count?: number;
  countries?: string;
  [key: string]: string | number | undefined; // satisfy Recharts ChartDataInput index signature
}

export interface SalesByTerritoryFilters {
  tableSuffix?: string;
  userId?: string;
  year?: number;
  month?: number; // 1-12, optional
}

export interface UseSalesByTerritoryOptions {
  filters?: SalesByTerritoryFilters;
  enabled?: boolean;
}

export interface UseSalesByTerritoryReturn {
  data: TerritoryPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

function toNumber(value: unknown, fallback: number = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchSalesByTerritory(
  filters: SalesByTerritoryFilters = {},
  userRole?: string,
  organizationId?: string
): Promise<TerritoryPoint[]> {
  const supabase = createClient();

  const rpcParams: Record<string, unknown> = {
    p_table_suffix: filters.tableSuffix || "",
    p_user_id: filters.userId || "",
    p_year: filters.year || new Date().getFullYear(),
    p_month: filters.month ?? null,
    p_user_role: userRole || "",
    p_organization_id: organizationId || null,
  };

  // RPC must accept (p_table_suffix text, p_user_id uuid, p_year int, p_month int|null)
  const { data, error } = await supabase.rpc(
    "get_sales_by_territory",
    rpcParams
  );

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching sales by territory:", error);
    throw new Error(error.message || "Failed to fetch sales by territory");
  }

  const rows: any[] = Array.isArray(data) ? data : [];

  return rows.map((row) => {
    const revenue = toNumber(row.revenue, 0);
    const previousRevenue = toNumber(row.previous_revenue, 0);
    const growthPercentage = toNumber(row.growth_percentage, 0);
    const revenueGrowthPercentage = toNumber(row.revenue_growth_percentage, 0);

    return {
      territory: row.territory || "Unknown Territory",
      revenue,
      previous_revenue: previousRevenue,
      growth_percentage: growthPercentage,
      revenue_growth_percentage: revenueGrowthPercentage,
      growth_display:
        row.growth_display ||
        `${growthPercentage >= 0 ? "+" : ""}${growthPercentage.toFixed(1)}%`,
      revenue_growth_display:
        row.revenue_growth_display ||
        `${
          revenueGrowthPercentage >= 0 ? "+" : ""
        }${revenueGrowthPercentage.toFixed(1)}%`,
      revenue_display:
        row.revenue_display || `$${(revenue / 1000).toFixed(0)}k`,
      country_count: toNumber(row.country_count, 0),
      countries: row.countries || "",
    };
  });
}

export function useSalesByTerritory({
  filters = {},
  enabled = true,
}: UseSalesByTerritoryOptions = {}): UseSalesByTerritoryReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [
      "sales-by-territory",
      filters,
      profile?.role_name,
      profile?.organization_id,
    ],
    queryFn: () =>
      fetchSalesByTerritory(
        filters,
        profile?.role_name,
        profile?.organization_id
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
