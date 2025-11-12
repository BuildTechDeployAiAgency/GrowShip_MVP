import { useQuery } from "@tanstack/react-query";

export interface InventorySummary {
  total_products: number;
  total_value: number;
  low_stock_count: number;
  out_of_stock_count: number;
  products_at_reorder_level: number;
}

export interface LowStockProduct {
  id: string;
  sku: string;
  product_name: string;
  quantity_in_stock: number;
  reorder_level: number;
  reorder_quantity: number;
  unit_price: number;
  status: string;
  days_until_out_of_stock?: number;
}

export interface UpcomingShipment {
  po_id: string;
  po_number: string;
  supplier_name: string;
  expected_delivery_date: string;
  total_amount: number;
  po_status: string;
  items_count: number;
}

export function useInventorySummary(brandId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["inventory-summary", brandId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brandId) params.append("brand_id", brandId);

      const response = await fetch(`/api/inventory/summary?${params}`);
      if (!response.ok) throw new Error("Failed to fetch inventory summary");
      return response.json();
    },
    enabled: !!brandId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    summary: data?.summary as InventorySummary | null,
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

export function useLowStockProducts(brandId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["low-stock-products", brandId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brandId) params.append("brand_id", brandId);

      const response = await fetch(`/api/inventory/alerts?${params}`);
      if (!response.ok) throw new Error("Failed to fetch low stock products");
      return response.json();
    },
    enabled: !!brandId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return {
    products: (data?.products || []) as LowStockProduct[],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

export function useUpcomingShipments(brandId?: string, daysAhead: number = 30) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["upcoming-shipments", brandId, daysAhead],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (brandId) params.append("brand_id", brandId);
      params.append("days_ahead", String(daysAhead));

      const response = await fetch(`/api/inventory/upcoming-shipments?${params}`);
      if (!response.ok) throw new Error("Failed to fetch upcoming shipments");
      return response.json();
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    shipments: (data?.shipments || []) as UpcomingShipment[],
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}


