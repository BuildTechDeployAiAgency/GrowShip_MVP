"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { useEnhancedAuth } from "@/contexts/enhanced-auth-context";

// TypeScript interfaces for Top Customers data
export interface TopCustomer {
  rank: number;
  name: string;
  revenue: number;
  orders: number;
  growth: number;
  isPositive: boolean;
  previous_period_revenue: number | null;
  customer_id?: string;
  distributor_id?: string;
}

export interface TopCustomersFilters {
  tableSuffix?: string;
  userId?: string;
  brandId?: string;
  year?: number;
  month?: number;
  limit?: number;
  distributorId?: string;
}

export interface UseTopCustomersOptions {
  filters?: TopCustomersFilters;
  enabled?: boolean;
}

export interface UseTopCustomersReturn {
  customers: TopCustomer[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  isRefetching: boolean;
}

// Fetch top customers function using Supabase RPC
async function fetchTopCustomers(
  filters: TopCustomersFilters = {},
  userRole?: string,
  brandId?: string
): Promise<TopCustomer[]> {
  const supabase = createClient();

  // Prepare RPC parameters
  const rpcParams: any = {
    p_table_suffix: filters.tableSuffix || "",
    p_user_id: filters.userId || "",
    p_year: filters.year || new Date().getFullYear(),
    p_month: filters.month || null,
    p_limit: filters.limit || 10,
    p_user_role: userRole || "",
    p_brand_id: brandId || null,
    p_distributor_id: filters.distributorId || null,
  };

  // Call the RPC function (to be created in Supabase)
  const { data, error } = await supabase.rpc(
    "get_top_customers_by_revenue",
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
      console.warn(
        "RPC function 'get_top_customers_by_revenue' not found. Returning empty data.",
        {
          message: error.message,
          code: error.code,
        }
      );
      return []; // Return empty array instead of throwing
    }

    console.error("Error fetching top customers:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      error: error,
    });
    throw new Error(error.message || "Failed to fetch top customers");
  }

  // Transform the data to match our interface
  return (data || []).map((item: any, index: number) => {
    const currentRevenue = Number(item.revenue || 0);
    const previousRevenue = item.previous_period_revenue
      ? Number(item.previous_period_revenue)
      : null;
    
    // Calculate growth percentage
    let growth = 0;
    if (previousRevenue && previousRevenue > 0) {
      growth = ((currentRevenue - previousRevenue) / previousRevenue) * 100;
    }
    
    const isPositive = growth >= 0;

    return {
      rank: index + 1,
      name: item.customer_name || item.distributor_name || "Unknown Customer",
      revenue: currentRevenue,
      orders: Number(item.order_count || 0),
      growth: Number(growth.toFixed(1)),
      isPositive,
      previous_period_revenue: previousRevenue,
      customer_id: item.customer_id,
      distributor_id: item.distributor_id,
    };
  });
}

export function useTopCustomers({
  filters = {},
  enabled = true,
}: UseTopCustomersOptions = {}): UseTopCustomersReturn {
  const { user, profile } = useEnhancedAuth();

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: [
      "top-customers",
      filters,
      profile?.role_name,
      profile?.brand_id,
    ],
    queryFn: () =>
      fetchTopCustomers(filters, profile?.role_name, profile?.brand_id),
    enabled: enabled && !!user && !!profile,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Ensure data refreshes when component mounts
  });

  return {
    customers: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    isRefetching,
  };
}

