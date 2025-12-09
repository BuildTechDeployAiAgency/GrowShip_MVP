"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";
import { usePaginatedResource } from "./use-paginated-resource";
import type { Product, ProductFilters } from "@/types/products";
import { updatePaginatedCaches } from "@/lib/react-query/paginated-cache";
import { postJson } from "@/lib/api/json-client";

interface UseProductsOptions {
  searchTerm: string;
  filters: ProductFilters;
  brandId?: string;
  debounceMs?: number;
  isSuperAdmin?: boolean;
  pageSize?: number;
}

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createProduct: (product: Partial<Product>) => Promise<Product>;
  updateProduct: (
    productId: string,
    updates: Partial<Product>
  ) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  totalCount: number;
  page: number;
  pageSize: number;
  pageCount: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
}

interface ProductsRequestPayload {
  page: number;
  pageSize: number;
  filters: ProductFilters;
  searchTerm?: string;
  brandId?: string;
  isSuperAdmin?: boolean;
}

async function requestProductsPage(
  payload: ProductsRequestPayload
): Promise<{ data: Product[]; totalCount: number }> {
  const json = await postJson<
    ProductsRequestPayload,
    { data: Product[]; totalCount: number }
  >("/api/products/list", payload);
  return {
    data: json.data ?? [],
    totalCount: json.totalCount ?? 0,
  };
}

function productMatchesFilters(
  product: Product,
  filters: ProductFilters | null,
  searchTerm: string
) {
  if (searchTerm) {
    return false;
  }

  if (!filters) {
    return true;
  }

  if (filters.status && filters.status !== "all" && product.status !== filters.status) {
    return false;
  }

  if (
    filters.category &&
    filters.category !== "all" &&
    product.product_category !== filters.category
  ) {
    return false;
  }

  return true;
}

function prependProductToCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  product: Product
) {
  updatePaginatedCaches<Product, ProductFilters>(
    queryClient,
    "products",
    (cache, meta) => {
      if (meta.page !== 0 || !productMatchesFilters(product, meta.filters, meta.searchTerm)) {
        return null;
      }

      const deduped = cache.data.filter((existing) => existing.id !== product.id);

      return {
        data: [product, ...deduped].slice(0, meta.pageSize),
        totalCount: (cache.totalCount ?? 0) + 1,
      };
    }
  );
}

function updateProductInCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  product: Product
) {
  updatePaginatedCaches<Product, ProductFilters>(
    queryClient,
    "products",
    (cache) => {
      if (!cache.data.some((existing) => existing.id === product.id)) {
        return null;
      }

      return {
        data: cache.data.map((existing) =>
          existing.id === product.id ? { ...existing, ...product } : existing
        ),
        totalCount: cache.totalCount,
      };
    }
  );
}

function removeProductFromCaches(
  queryClient: ReturnType<typeof useQueryClient>,
  productId: string
) {
  updatePaginatedCaches<Product, ProductFilters>(
    queryClient,
    "products",
    (cache) => {
      if (!cache.data.some((existing) => existing.id === productId)) {
        return null;
      }

      return {
        data: cache.data.filter((existing) => existing.id !== productId),
        totalCount: Math.max(0, (cache.totalCount ?? 0) - 1),
      };
    }
  );
}

export function useProducts({
  searchTerm,
  filters,
  brandId,
  debounceMs = 300,
  isSuperAdmin = false,
  pageSize = 25,
}: UseProductsOptions): UseProductsReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();
  const enabled = Boolean(brandId || isSuperAdmin);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceMs]);

  const paginated = usePaginatedResource({
    queryKey: "products",
    filters,
    searchTerm: debouncedSearchTerm,
    enabled,
    initialPageSize: pageSize,
    identityKey: [brandId ?? "brand:none", isSuperAdmin ? "role:super" : "role:standard"],
    fetcher: ({ page, pageSize: size, filters: currentFilters, searchTerm }) =>
      requestProductsPage({
        page,
        pageSize: size,
        filters: currentFilters,
        searchTerm,
        brandId,
        isSuperAdmin,
      }),
  });

  useEffect(() => {
    paginated.setPage(0);
  }, [enabled, brandId, isSuperAdmin, paginated.setPage]);

  const { isLoading: loading, error, refetch } = paginated.query;

  const createMutation = useMutation({
    mutationFn: async (productData: Partial<Product>) => {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase
        .from("products")
        .insert([
          {
            ...productData,
            created_by: user.id,
            updated_by: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newProduct) => {
      prependProductToCaches(queryClient, newProduct);
      // Only invalidate product queries for this brand to prevent unnecessary refetches
      queryClient.invalidateQueries({
        queryKey: ["products"],
        predicate: (query) => {
          const [, , , , brandId] = query.queryKey;
          return brandId === newProduct.brand_id;
        }
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] }); // Products affect inventory
      toast.success("Product created successfully");
    },
    onError: (error: any) => {
      console.error("Error creating product:", error);
      toast.error(error.message || "Failed to create product");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const supabase = createClient();
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      const { data: updatedProduct, error } = await supabase
        .from("products")
        .update({
          ...updates,
          updated_by: user.id,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return updatedProduct;
    },
    onSuccess: (updatedProduct) => {
      if (updatedProduct) {
        updateProductInCaches(queryClient, updatedProduct);
      }
      // Only invalidate product queries for this brand to prevent unnecessary refetches
      queryClient.invalidateQueries({
        queryKey: ["products"],
        predicate: (query) => {
          const [, , , , brandId] = query.queryKey;
          return brandId === updatedProduct?.brand_id;
        }
      });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] }); // Products affect inventory
      toast.success("Product updated successfully");
    },
    onError: (error: any) => {
      console.error("Error updating product:", error);
      toast.error(error.message || "Failed to update product");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (productId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);

      if (error) throw error;
    },
    onSuccess: (_data, productId) => {
      removeProductFromCaches(queryClient, productId);
      // Invalidate all product queries since we don't have brand context for deleted item
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-metrics"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] }); // Products affect inventory
      toast.success("Product deleted successfully");
    },
    onError: (error: any) => {
      console.error("Error deleting product:", error);
      toast.error(error.message || "Failed to delete product");
    },
  });

  return {
    products: paginated.data,
    totalCount: paginated.totalCount,
    loading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    createProduct: (productData: Partial<Product>) =>
      createMutation.mutateAsync(productData),
    updateProduct: (productId: string, updates: Partial<Product>) =>
      updateMutation.mutateAsync({ id: productId, updates }),
    deleteProduct: (productId: string) =>
      deleteMutation.mutateAsync(productId),
    page: paginated.page,
    pageSize: paginated.pageSize,
    pageCount: paginated.pageCount,
    setPage: paginated.setPage,
    setPageSize: paginated.setPageSize,
  };
}

// Helper function to get unique categories from products
export async function getProductCategories(brandId?: string): Promise<string[]> {
  const supabase = createClient();
  let query = supabase
    .from("products")
    .select("product_category")
    .not("product_category", "is", null);

  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Error fetching categories:", error);
    return [];
  }

  const categories = data
    .map((item) => item.product_category)
    .filter((category, index, self) => category && self.indexOf(category) === index)
    .sort();

  return categories as string[];
}

















