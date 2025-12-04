"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-toastify";

export type DistributorStatus = "active" | "inactive" | "archived";

export interface Distributor {
  id: string;
  brand_id: string;
  name: string;
  code?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  // Geographic normalization
  territory_id?: string;
  region_id?: string;
  status: DistributorStatus;
  currency?: string;
  tax_id?: string;
  payment_terms?: string;
  min_purchase_target?: number;
  overdue_amount?: number;
  orders_count?: number;
  revenue_to_date?: number;
  margin_percent?: number;
  contract_start?: string;
  contract_end?: string;
  notes?: string;
  created_by?: string;
  updated_by?: string;
  created_at: string;
  updated_at: string;
}

interface DistributorFilters {
  status: string;
}

interface UseDistributorsOptions {
  searchTerm: string;
  filters: DistributorFilters;
  brandId?: string;
  distributorId?: string; // For distributor_admin users, only return their own distributor
  debounceMs?: number;
  isSuperAdmin?: boolean;
}

interface UseDistributorsReturn {
  distributors: Distributor[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  createDistributor: (distributor: Partial<Distributor>) => Promise<Distributor>;
  updateDistributor: (distributorId: string, updates: Partial<Distributor>) => Promise<void>;
  deleteDistributor: (distributorId: string) => Promise<void>;
  totalCount: number;
}

async function fetchDistributors(
  debouncedSearchTerm: string,
  filters: DistributorFilters,
  brandId?: string,
  isSuperAdmin: boolean = false,
  distributorId?: string
): Promise<{ distributors: Distributor[]; totalCount: number }> {
  const supabase = createClient();
  let query = supabase.from("distributors").select("*", { count: "exact" });

  // For distributor_admin users, only return their own distributor
  if (distributorId) {
    query = query.eq("id", distributorId);
  } else if (brandId && !isSuperAdmin) {
    // Only apply brand_id filter if not Super Admin and not filtering by distributor_id
    query = query.eq("brand_id", brandId);
  }

  if (debouncedSearchTerm.trim()) {
    query = query.or(
      `name.ilike.%${debouncedSearchTerm}%,code.ilike.%${debouncedSearchTerm}%,contact_name.ilike.%${debouncedSearchTerm}%,contact_email.ilike.%${debouncedSearchTerm}%`
    );
  }

  if (filters.status !== "all") {
    query = query.eq("status", filters.status);
  }

  query = query.order("created_at", { ascending: false });

  const { data, error: fetchError, count } = await query;

  if (fetchError) {
    throw fetchError;
  }

  return {
    distributors: data || [],
    totalCount: count || 0,
  };
}

export function useDistributors({
  searchTerm,
  filters,
  brandId,
  distributorId,
  debounceMs = 300,
  isSuperAdmin = false,
}: UseDistributorsOptions): UseDistributorsReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["distributors", debouncedSearchTerm, filters, brandId, isSuperAdmin, distributorId],
    queryFn: () => fetchDistributors(debouncedSearchTerm, filters, brandId, isSuperAdmin, distributorId),
    staleTime: 0,
  });

  const createDistributorMutation = useMutation({
    mutationFn: async (distributor: Partial<Distributor>): Promise<Distributor> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      // Ensure brand_id is set if not provided (for non-super-admin users)
      if (!distributor.brand_id && brandId && !isSuperAdmin) {
        distributor.brand_id = brandId;
      }

      const distributorData = {
        ...distributor,
        created_by: user?.id,
        updated_by: user?.id,
      };

      const { data: newDistributor, error: createError } = await supabase
        .from("distributors")
        .insert(distributorData)
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return newDistributor;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      toast.success("Distributor created successfully!");
    },
    onError: (error: any) => {
      console.error("Error creating distributor:", error);
      toast.error(error?.message || "Failed to create distributor. Please try again.");
    },
  });

  const updateDistributorMutation = useMutation({
    mutationFn: async ({
      distributorId,
      updates,
    }: {
      distributorId: string;
      updates: Partial<Distributor>;
    }): Promise<void> => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("distributors")
        .update({
          ...updates,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", distributorId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      toast.success("Distributor updated successfully!");
    },
    onError: (error: any) => {
      console.error("Error updating distributor:", error);
      toast.error(error?.message || "Failed to update distributor. Please try again.");
    },
  });

  const deleteDistributorMutation = useMutation({
    mutationFn: async (distributorId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("distributors")
        .delete()
        .eq("id", distributorId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributors"] });
      toast.success("Distributor deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting distributor:", error);
      toast.error(error?.message || "Failed to delete distributor. Please try again.");
    },
  });

  return {
    distributors: data?.distributors || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    createDistributor: async (distributor: Partial<Distributor>) => {
      return await createDistributorMutation.mutateAsync(distributor);
    },
    updateDistributor: async (distributorId: string, updates: Partial<Distributor>) => {
      await updateDistributorMutation.mutateAsync({ distributorId, updates });
    },
    deleteDistributor: async (distributorId: string) => {
      await deleteDistributorMutation.mutateAsync(distributorId);
    },
    totalCount: data?.totalCount || 0,
  };
}

