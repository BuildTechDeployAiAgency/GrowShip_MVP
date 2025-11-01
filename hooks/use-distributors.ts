"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Distributor, DistributorStats, DistributorFilters } from "@/types/distributor";
import { toast } from "react-toastify";

interface UseDistributorsOptions {
  searchTerm: string;
  filters: DistributorFilters;
  parentOrganizationId?: string;
  page?: number;
  pageSize?: number;
  debounceMs?: number;
}

interface UseDistributorsReturn {
  distributors: Distributor[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  totalCount: number;
  stats: DistributorStats;
  currentPage: number;
  totalPages: number;
  updateDistributorStatus: (distributorId: string, isActive: boolean) => Promise<void>;
  deleteDistributor: (distributorId: string) => Promise<void>;
}

// Fetch distributors function with pagination
async function fetchDistributors(
  debouncedSearchTerm: string,
  filters: DistributorFilters,
  parentOrganizationId?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ distributors: Distributor[]; totalCount: number; stats: DistributorStats }> {
  const supabase = createClient();
  
  // Calculate offset for pagination
  const offset = (page - 1) * pageSize;

  let query = supabase
    .from("organizations")
    .select(`
      *,
      user_memberships(count),
      sales_documents_storage(count)
    `, { count: "exact" })
    .eq("organization_type", "distributor");

  // Apply parent organization filter if provided
  if (parentOrganizationId) {
    query = query.eq("parent_organization_id", parentOrganizationId);
  }

  // Apply search filter
  if (debouncedSearchTerm.trim()) {
    query = query.or(
      `name.ilike.%${debouncedSearchTerm}%,slug.ilike.%${debouncedSearchTerm}%,contact_email.ilike.%${debouncedSearchTerm}%`
    );
  }

  // Apply status filter
  if (filters.status === "active") {
    query = query.eq("is_active", true);
  } else if (filters.status === "inactive") {
    query = query.eq("is_active", false);
  }

  // Order by created_at desc
  query = query.order("created_at", { ascending: false });

  // Apply pagination
  query = query.range(offset, offset + pageSize - 1);

  const { data, error: fetchError, count } = await query;

  if (fetchError) {
    throw fetchError;
  }

  // Transform data to include counts
  const distributors: Distributor[] = (data || []).map((org: any) => ({
    ...org,
    user_count: org.user_memberships?.[0]?.count || 0,
    sales_report_count: org.sales_documents_storage?.[0]?.count || 0,
  }));

  // Calculate stats
  const stats: DistributorStats = {
    active: distributors.filter(d => d.is_active).length,
    inactive: distributors.filter(d => !d.is_active).length,
    totalUsers: distributors.reduce((sum, d) => sum + (d.user_count || 0), 0),
    totalSalesReports: distributors.reduce((sum, d) => sum + (d.sales_report_count || 0), 0),
  };

  return {
    distributors,
    totalCount: count || 0,
    stats,
  };
}

export function useDistributors({
  searchTerm,
  filters,
  parentOrganizationId,
  page = 1,
  pageSize = 50,
  debounceMs = 300,
}: UseDistributorsOptions): UseDistributorsReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [currentPage, setCurrentPage] = useState(page);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["distributors", debouncedSearchTerm, filters, parentOrganizationId, currentPage, pageSize],
    queryFn: () => fetchDistributors(debouncedSearchTerm, filters, parentOrganizationId, currentPage, pageSize),
    staleTime: 30000, // Cache for 30 seconds
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      distributorId,
      isActive,
    }: {
      distributorId: string;
      isActive: boolean;
    }): Promise<boolean> => {
      const supabase = createClient();

      const { error } = await supabase
        .from("organizations")
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", distributorId);

      if (error) {
        throw error;
      }

      return isActive;
    },
    onSuccess: (isActive) => {
      queryClient.invalidateQueries({ queryKey: ["distributors"] });

      toast.success(
        isActive
          ? "Distributor has been activated successfully!"
          : "Distributor has been deactivated successfully!"
      );
    },
    onError: (error: any) => {
      console.error("Error updating distributor status:", error);
      toast.error(
        error?.message || "Failed to update distributor status. Please try again."
      );
    },
  });

  const deleteDistributorMutation = useMutation({
    mutationFn: async (distributorId: string) => {
      const supabase = createClient();

      // First check if distributor has users or sales reports
      const { data: membershipData } = await supabase
        .from("user_memberships")
        .select("id")
        .eq("organization_id", distributorId)
        .limit(1);

      const { data: salesData } = await supabase
        .from("sales_documents_storage")
        .select("document_id")
        .eq("organization_id", distributorId)
        .limit(1);

      if (membershipData && membershipData.length > 0) {
        throw new Error("Cannot delete distributor with existing users. Please remove all users first.");
      }

      if (salesData && salesData.length > 0) {
        throw new Error("Cannot delete distributor with existing sales reports. Please remove all sales reports first.");
      }

      const { error } = await supabase
        .from("organizations")
        .delete()
        .eq("id", distributorId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["distributors"] });

      toast.success("Distributor has been deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting distributor:", error);
      toast.error(error?.message || "Failed to delete distributor. Please try again.");
    },
  });

  const totalPages = Math.ceil((data?.totalCount || 0) / pageSize);

  return {
    distributors: data?.distributors || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    totalCount: data?.totalCount || 0,
    stats: data?.stats || {
      active: 0,
      inactive: 0,
      totalUsers: 0,
      totalSalesReports: 0,
    },
    currentPage,
    totalPages,
    updateDistributorStatus: async (distributorId: string, isActive: boolean) => {
      await updateStatusMutation.mutateAsync({ distributorId, isActive });
    },
    deleteDistributor: async (distributorId: string) => {
      await deleteDistributorMutation.mutateAsync(distributorId);
    },
  };
}
