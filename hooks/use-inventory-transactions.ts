import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { 
  InventoryTransaction, 
  TransactionFilters, 
  TransactionListResponse 
} from "@/types/inventory";

/**
 * Fetch inventory transactions with filters and pagination
 */
export function useInventoryTransactions(filters?: TransactionFilters) {
  const supabase = createClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["inventory-transactions", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters?.product_id) params.append("product_id", filters.product_id);
      if (filters?.sku) params.append("sku", filters.sku);
      if (filters?.transaction_type) params.append("transaction_type", filters.transaction_type);
      if (filters?.source_type) params.append("source_type", filters.source_type);
      if (filters?.source_id) params.append("source_id", filters.source_id);
      if (filters?.date_from) params.append("date_from", filters.date_from);
      if (filters?.date_to) params.append("date_to", filters.date_to);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.page) params.append("page", filters.page.toString());
      if (filters?.limit) params.append("limit", filters.limit.toString());

      const response = await fetch(`/api/inventory/transactions?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.statusText}`);
      }

      return response.json() as Promise<TransactionListResponse>;
    },
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  });

  return {
    transactions: data?.transactions,
    pagination: data?.pagination,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Fetch transaction history for a specific product
 */
export function useProductTransactionHistory(productId: string, limit = 10) {
  const supabase = createClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["product-transaction-history", productId, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/inventory/products/${productId}/history?limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch product history: ${response.statusText}`);
      }

      const result = await response.json();
      return result.transactions as InventoryTransaction[];
    },
    enabled: !!productId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });

  return {
    transactions: data,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Create manual inventory adjustment
 */
export async function createManualAdjustment(data: {
  product_id: string;
  sku: string;
  quantity_change: number;
  reason: string;
  reference_number?: string;
  notes?: string;
  brand_id: string;
}) {
  const response = await fetch("/api/inventory/adjust", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create adjustment");
  }

  return response.json();
}

/**
 * Create bulk inventory adjustments
 */
export async function createBulkAdjustments(data: {
  adjustments: Array<{
    product_id: string;
    sku: string;
    quantity_change: number;
    reason: string;
    notes?: string;
  }>;
  brand_id: string;
  reference_number: string;
}) {
  const response = await fetch("/api/inventory/bulk-adjust", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create bulk adjustments");
  }

  return response.json();
}

