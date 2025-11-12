import { useQuery } from "@tanstack/react-query";

export interface FulfillmentMetrics {
  total_orders: number;
  orders_shipped: number;
  orders_delivered: number;
  orders_pending: number;
  orders_cancelled: number;
  fulfillment_rate: number;
  delivery_rate: number;
  avg_delivery_days: number;
}

export interface DeliveryPerformance {
  total_deliveries: number;
  on_time_deliveries: number;
  late_deliveries: number;
  on_time_percentage: number;
  avg_days_late: number;
}

export function useFulfillmentMetrics(brandId?: string, startDate?: string, endDate?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["fulfillment-metrics", brandId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brandId) params.append("brand_id", brandId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const response = await fetch(`/api/reports/fulfillment?${params}`);
      if (!response.ok) throw new Error("Failed to fetch fulfillment metrics");
      return response.json();
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    metrics: data?.metrics as FulfillmentMetrics | null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

export function useDeliveryPerformance(brandId?: string, startDate?: string, endDate?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["delivery-performance", brandId, startDate, endDate],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brandId) params.append("brand_id", brandId);
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);

      const response = await fetch(`/api/reports/delivery?${params}`);
      if (!response.ok) throw new Error("Failed to fetch delivery performance");
      return response.json();
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    performance: data?.performance as DeliveryPerformance | null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}


