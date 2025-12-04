import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";
import { CampaignPerformance, SalesChannelPerformance } from "@/types/orders";

// ============================================
// Sales By Channel Hook
// ============================================

export interface SalesByChannelFilters {
  year?: number;
  month?: number;
}

export interface UseSalesByChannelOptions {
  filters?: SalesByChannelFilters;
  enabled?: boolean;
}

export interface UseSalesByChannelReturn {
  data: SalesChannelPerformance[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

async function fetchSalesByChannel(
  brandId: string,
  filters: SalesByChannelFilters = {}
): Promise<SalesChannelPerformance[]> {
  const supabase = createClient();

  const rpcParams: Record<string, unknown> = {
    p_brand_id: brandId,
    p_year: filters.year || null,
    p_month: filters.month || null,
  };

  const { data, error } = await supabase.rpc("get_sales_by_channel", rpcParams);

  if (error) {
    // Check if RPC function doesn't exist
    const isFunctionNotFound =
      error.code === "P0004" ||
      error.message?.includes("Could not find the function") ||
      error.message?.includes("does not exist") ||
      error.code === "42883";

    if (isFunctionNotFound) {
      console.warn(
        "RPC function 'get_sales_by_channel' not found. Returning empty data.",
        { message: error.message, code: error.code }
      );
      return [];
    }

    console.error("Error fetching sales by channel:", error);
    throw new Error(error.message || "Failed to fetch sales by channel");
  }

  const rows: any[] = Array.isArray(data) ? data : [];

  return rows.map((row) => ({
    sales_channel: row.sales_channel || "Unknown",
    total_orders: Number(row.total_orders) || 0,
    total_revenue: Number(row.total_revenue) || 0,
    avg_order_value: Number(row.avg_order_value) || 0,
    order_count_percent: Number(row.order_count_percent) || 0,
  }));
}

export function useSalesByChannel({
  filters = {},
  enabled = true,
}: UseSalesByChannelOptions = {}): UseSalesByChannelReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["sales-by-channel", filters, profile?.brand_id],
    queryFn: () => fetchSalesByChannel(profile?.brand_id || "", filters),
    enabled: enabled && !!user && !!profile?.brand_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  return {
    data: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    isRefetching,
  };
}

// ============================================
// Campaign Performance Hook
// ============================================

export interface CampaignPerformanceFilters {
  campaignId?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface UseCampaignPerformanceOptions {
  filters?: CampaignPerformanceFilters;
  enabled?: boolean;
}

export interface UseCampaignPerformanceReturn {
  data: CampaignPerformance[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

async function fetchCampaignPerformance(
  brandId: string,
  filters: CampaignPerformanceFilters = {}
): Promise<CampaignPerformance[]> {
  const supabase = createClient();

  const rpcParams: Record<string, unknown> = {
    p_brand_id: brandId,
    p_campaign_id: filters.campaignId || null,
    p_start_date: filters.startDate
      ? filters.startDate.toISOString().split("T")[0]
      : null,
    p_end_date: filters.endDate
      ? filters.endDate.toISOString().split("T")[0]
      : null,
  };

  const { data, error } = await supabase.rpc(
    "get_campaign_performance",
    rpcParams
  );

  if (error) {
    // Check if RPC function doesn't exist
    const isFunctionNotFound =
      error.code === "P0004" ||
      error.message?.includes("Could not find the function") ||
      error.message?.includes("does not exist") ||
      error.code === "42883";

    if (isFunctionNotFound) {
      console.warn(
        "RPC function 'get_campaign_performance' not found. Returning empty data.",
        { message: error.message, code: error.code }
      );
      return [];
    }

    console.error("Error fetching campaign performance:", error);
    throw new Error(error.message || "Failed to fetch campaign performance");
  }

  const rows: any[] = Array.isArray(data) ? data : [];

  return rows.map((row) => ({
    campaign_id: row.campaign_id || "",
    total_orders: Number(row.total_orders) || 0,
    total_revenue: Number(row.total_revenue) || 0,
    total_units: Number(row.total_units) || 0,
    avg_order_value: Number(row.avg_order_value) || 0,
    unique_customers: Number(row.unique_customers) || 0,
  }));
}

export function useCampaignPerformance({
  filters = {},
  enabled = true,
}: UseCampaignPerformanceOptions = {}): UseCampaignPerformanceReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["campaign-performance", filters, profile?.brand_id],
    queryFn: () => fetchCampaignPerformance(profile?.brand_id || "", filters),
    enabled: enabled && !!user && !!profile?.brand_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  return {
    data: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    isRefetching,
  };
}

