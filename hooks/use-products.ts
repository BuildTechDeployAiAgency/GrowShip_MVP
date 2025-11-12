"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

export type ProductStatus = "active" | "inactive" | "discontinued" | "out_of_stock";

export interface Product {
  id: string;
  brand_id: string;
  sku: string;
  product_name: string;
  description?: string;
  product_category?: string;
  unit_price: number;
  cost_price?: number;
  currency?: string;
  quantity_in_stock: number;
  reorder_level?: number;
  reorder_quantity?: number;
  barcode?: string;
  product_image_url?: string;
  weight?: number;
  weight_unit?: string;
  status: ProductStatus;
  tags?: string[];
  supplier_id?: string;
  supplier_sku?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface ProductFilters {
  status: string;
  category: string;
}

interface UseProductsOptions {
  searchTerm: string;
  filters: ProductFilters;
  brandId?: string;
  debounceMs?: number;
  isSuperAdmin?: boolean;
}

interface UseProductsReturn {
  products: Product[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createProduct: (product: Partial<Product>) => Promise<Product>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  totalCount: number;
}

async function fetchProducts(
  debouncedSearchTerm: string,
  filters: ProductFilters,
  brandId?: string,
  isSuperAdmin: boolean = false
): Promise<{ products: Product[]; totalCount: number }> {
  const supabase = createClient();
  let query = supabase.from("products").select("*", { count: "exact" });

  // Only apply brand_id filter if not Super Admin
  if (brandId && !isSuperAdmin) {
    query = query.eq("brand_id", brandId);
  }

  if (debouncedSearchTerm.trim()) {
    query = query.or(
      `sku.ilike.%${debouncedSearchTerm}%,product_name.ilike.%${debouncedSearchTerm}%,product_category.ilike.%${debouncedSearchTerm}%,barcode.ilike.%${debouncedSearchTerm}%`
    );
  }

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  if (filters.category !== "all") {
    query = query.eq("product_category", filters.category);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error: fetchError, count } = await query;

  if (fetchError) {
    throw fetchError;
  }

  return {
    products: data || [],
    totalCount: count || 0,
  };
}

export function useProducts({
  searchTerm,
  filters,
  brandId,
  debounceMs = 300,
  isSuperAdmin = false,
}: UseProductsOptions): UseProductsReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceMs]);

  const {
    data,
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["products", debouncedSearchTerm, filters, brandId, isSuperAdmin],
    queryFn: () => fetchProducts(debouncedSearchTerm, filters, brandId, isSuperAdmin),
    enabled: !!brandId || isSuperAdmin,
  });

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
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

      const { error } = await supabase
        .from("products")
        .update({
          ...updates,
          updated_by: user.id,
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product deleted successfully");
    },
    onError: (error: any) => {
      console.error("Error deleting product:", error);
      toast.error(error.message || "Failed to delete product");
    },
  });

  return {
    products: data?.products || [],
    totalCount: data?.totalCount || 0,
    loading,
    error: error ? (error as Error).message : null,
    refetch,
    createProduct: (productData: Partial<Product>) =>
      createMutation.mutateAsync(productData),
    updateProduct: (productId: string, updates: Partial<Product>) =>
      updateMutation.mutateAsync({ id: productId, updates }),
    deleteProduct: (productId: string) =>
      deleteMutation.mutateAsync(productId),
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










