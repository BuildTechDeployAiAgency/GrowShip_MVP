import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DemandForecast {
  id: string;
  brand_id: string;
  sku: string;
  forecast_period_start: string;
  forecast_period_end: string;
  forecasted_quantity: number;
  forecasted_revenue: number;
  confidence_level: number;
  algorithm_version: string;
  input_data_snapshot?: any;
  created_at: string;
  updated_at: string;
}

interface UseForecastingOptions {
  sku?: string;
  startDate?: string;
  endDate?: string;
  algorithm?: string;
  enabled?: boolean;
}

export function useForecasting(options: UseForecastingOptions = {}) {
  const queryClient = useQueryClient();

  // Fetch forecasts
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["forecasts", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.sku) params.append("sku", options.sku);
      if (options.startDate) params.append("start_date", options.startDate);
      if (options.endDate) params.append("end_date", options.endDate);
      if (options.algorithm) params.append("algorithm", options.algorithm);

      const response = await fetch(`/api/forecasting?${params}`);
      if (!response.ok) throw new Error("Failed to fetch forecasts");
      return response.json();
    },
    enabled: options.enabled !== false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Generate forecast mutation
  const generateForecastMutation = useMutation({
    mutationFn: async (params: {
      brand_id?: string;
      sku?: string;
      forecast_period_start?: string;
      forecast_period_end?: string;
      algorithm_version?: string;
      compare_algorithms?: boolean;
    }) => {
      const response = await fetch("/api/forecasting/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate forecast");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forecasts"] });
    },
  });

  return {
    forecasts: (data?.forecasts || []) as Array<DemandForecast & {
      actual_quantity?: number;
      actual_revenue?: number;
      quantity_variance?: number;
      revenue_variance?: number;
    }>,
    total: data?.total || 0,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
    generateForecast: generateForecastMutation.mutateAsync,
    isGenerating: generateForecastMutation.isPending,
  };
}


