import { useQuery } from "@tanstack/react-query";
import { ProductWithInventory, StockStatusType } from "@/types/products";

export interface InventoryProductsFilters {
  search?: string;
  stockStatus?: "all" | "in_stock" | "low_stock" | "critical" | "out_of_stock";
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface InventoryProductsSummary {
  total_products: number;
  total_value: number;
  out_of_stock_count: number;
  critical_count: number;
  low_stock_count: number;
  in_stock_count: number;
}

export interface InventoryProductsResponse {
  products: ProductWithInventory[];
  summary: InventoryProductsSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

async function fetchInventoryProducts(
  brandId: string | undefined,
  filters: InventoryProductsFilters
): Promise<InventoryProductsResponse> {
  if (!brandId) {
    return {
      products: [],
      summary: {
        total_products: 0,
        total_value: 0,
        out_of_stock_count: 0,
        critical_count: 0,
        low_stock_count: 0,
        in_stock_count: 0,
      },
      pagination: {
        page: 1,
        limit: 50,
        total: 0,
        total_pages: 0,
      },
    };
  }

  const params = new URLSearchParams();
  params.append("brand_id", brandId);
  
  if (filters.search) {
    params.append("search", filters.search);
  }
  if (filters.stockStatus && filters.stockStatus !== "all") {
    params.append("stock_status", filters.stockStatus);
  }
  if (filters.page) {
    params.append("page", String(filters.page));
  }
  if (filters.limit) {
    params.append("limit", String(filters.limit));
  }
  if (filters.sortBy) {
    params.append("sort_by", filters.sortBy);
  }
  if (filters.sortOrder) {
    params.append("sort_order", filters.sortOrder);
  }

  const response = await fetch(`/api/inventory/products?${params}`);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to fetch inventory products");
  }

  return response.json();
}

export function useInventoryProducts(
  brandId: string | undefined,
  filters: InventoryProductsFilters = {}
) {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: [
      "inventory-products",
      brandId,
      filters.search,
      filters.stockStatus,
      filters.page,
      filters.limit,
      filters.sortBy,
      filters.sortOrder,
    ],
    queryFn: () => fetchInventoryProducts(brandId, filters),
    enabled: !!brandId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: false,
  });

  return {
    products: data?.products || [],
    summary: data?.summary || {
      total_products: 0,
      total_value: 0,
      out_of_stock_count: 0,
      critical_count: 0,
      low_stock_count: 0,
      in_stock_count: 0,
    },
    pagination: data?.pagination || {
      page: 1,
      limit: 50,
      total: 0,
      total_pages: 0,
    },
    isLoading,
    error: error ? (error as Error).message : null,
    refetch,
  };
}

// Hook to get just product list for dropdown
export function useProductsDropdown(brandId: string | undefined) {
  const {
    data,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["products-dropdown", brandId],
    queryFn: async () => {
      if (!brandId) return [];
      
      const params = new URLSearchParams();
      params.append("brand_id", brandId);
      params.append("limit", "500"); // Get all products for dropdown
      
      const response = await fetch(`/api/inventory/products?${params}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      
      const result = await response.json();
      return result.products.map((p: ProductWithInventory) => ({
        id: p.id,
        sku: p.sku,
        product_name: p.product_name,
      }));
    },
    enabled: !!brandId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    products: data || [],
    isLoading,
    error: error ? (error as Error).message : null,
  };
}

