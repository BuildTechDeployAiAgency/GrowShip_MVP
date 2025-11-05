import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

export interface CategoryPoint {
  name: string;
  value: number;
  percentage?: number;
  revenue?: number;
  revenue_display?: string;
  [key: string]: string | number | undefined; // satisfy Recharts ChartDataInput index signature
}

export interface SalesByCategoryFilters {
  tableSuffix?: string;
  userId?: string;
  year?: number;
  month?: number; // 1-12, optional
}

export interface UseSalesByCategoryOptions {
  filters?: SalesByCategoryFilters;
  enabled?: boolean;
}

export interface UseSalesByCategoryReturn {
  data: CategoryPoint[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

function toNumber(value: unknown, fallback: number = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function fetchSalesByCategory(
  filters: SalesByCategoryFilters = {},
  userRole?: string,
  brandId?: string
): Promise<CategoryPoint[]> {
  const supabase = createClient();

  const rpcParams: Record<string, unknown> = {
    p_table_suffix: filters.tableSuffix || "",
    p_user_id: filters.userId || "",
    p_year: filters.year || new Date().getFullYear(),
    p_month: filters.month ?? null,
    p_user_role: userRole || "",
    p_brand_id: brandId || null,
  };

  // RPC must accept (p_table_suffix text, p_user_id uuid, p_year int, p_month int|null)
  const { data, error } = await supabase.rpc(
    "get_sales_by_category",
    rpcParams
  );

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Error fetching sales by category:", error);
    throw new Error(error.message || "Failed to fetch sales by category");
  }

  const rows: any[] = Array.isArray(data) ? data : [];

  const total = rows.reduce(
    (sum, r) => sum + toNumber(r.revenue || r.total || r.amount, 0),
    0
  );

  return rows.map((row) => {
    const value = toNumber(row.revenue || row.total || row.amount, 0);
    return {
      name: row.category || row.name || "Uncategorized",
      value,
      percentage: total > 0 ? Number(((value / total) * 100).toFixed(1)) : 0,
      revenue: row.revenue,
      revenue_display: row.revenue_display,
    };
  });
}

export function useSalesByCategory({
  filters = {},
  enabled = true,
}: UseSalesByCategoryOptions = {}): UseSalesByCategoryReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [
      "sales-by-category",
      filters,
      profile?.role_name,
      profile?.brand_id,
    ],
    queryFn: () =>
      fetchSalesByCategory(
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
