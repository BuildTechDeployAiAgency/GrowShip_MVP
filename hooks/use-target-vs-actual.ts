import { useQuery } from "@tanstack/react-query";

export interface TargetVsActual {
  brand_id: string;
  sku: string;
  target_period: string;
  period_type: "monthly" | "quarterly" | "yearly";
  target_quantity?: number;
  target_revenue?: number;
  actual_quantity: number;
  actual_revenue: number;
  quantity_variance_percent?: number;
  revenue_variance_percent?: number;
  quantity_performance?: "over" | "under";
  revenue_performance?: "over" | "under";
}

interface UseTargetVsActualOptions {
  sku?: string;
  periodType?: string;
  startDate?: string;
  endDate?: string;
}

export function useTargetVsActual(options: UseTargetVsActualOptions = {}) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["target-vs-actual", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.sku) params.append("sku", options.sku);
      if (options.periodType) params.append("period_type", options.periodType);
      if (options.startDate) params.append("start_date", options.startDate);
      if (options.endDate) params.append("end_date", options.endDate);

      const response = await fetch(`/api/analytics/target-vs-actual?${params}`);
      if (!response.ok) throw new Error("Failed to fetch target vs actual data");
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    data: data?.data || [],
    summary: data?.summary || {
      total_targets: 0,
      over_performing_skus: 0,
      under_performing_skus: 0,
    },
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}


