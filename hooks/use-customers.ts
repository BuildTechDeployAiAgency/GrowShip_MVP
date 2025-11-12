"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { UserProfile, UserStatus } from "@/types/auth";
import { toast } from "react-toastify";

interface CustomerFilters {
  status: string;
  company: string;
}

interface UseCustomersOptions {
  searchTerm: string;
  filters: CustomerFilters;
  brandId?: string;
  isSuperAdmin?: boolean;
  enabled?: boolean;
  debounceMs?: number;
}

interface UseCustomersReturn {
  customers: UserProfile[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateCustomerStatus: (
    customerId: string,
    status: UserStatus
  ) => Promise<void>;
  deleteCustomer: (customerId: string) => Promise<void>;
  totalCount: number;
  isRefetching: boolean;
}

// Fetch customers function
async function fetchCustomers(
  debouncedSearchTerm: string,
  filters: CustomerFilters,
  brandId?: string,
  isSuperAdmin?: boolean
): Promise<{ customers: UserProfile[]; totalCount: number }> {
  const supabase = createClient();
  let query = supabase.from("user_profiles").select("*", { count: "exact" });

  // Filter for customer roles only
  query = query.ilike("role_name", "%customer%");

  // Apply organization filter - only show customers from the same organization (unless super admin)
  if (brandId && !isSuperAdmin) {
    query = query.eq("brand_id", brandId);
  }

  // Apply search filter
  if (debouncedSearchTerm.trim()) {
    query = query.or(
      `contact_name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,company_name.ilike.%${debouncedSearchTerm}%`
    );
  }

  // Apply status filter
  if (filters.status !== "all") {
    query = query.eq("user_status", filters.status);
  }

  // Apply company filter
  if (filters.company !== "all") {
    query = query.ilike("company_name", `%${filters.company}%`);
  }

  // Order by created_at desc
  query = query.order("created_at", { ascending: false });

  const { data, error: fetchError, count } = await query;

  if (fetchError) {
    throw fetchError;
  }

  return {
    customers: data || [],
    totalCount: count || 0,
  };
}

export function useCustomers({
  searchTerm,
  filters,
  brandId,
  isSuperAdmin = false,
  enabled = true,
  debounceMs = 300,
}: UseCustomersOptions): UseCustomersReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  // Use React Query for fetching customers
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["customers", debouncedSearchTerm, filters, brandId, isSuperAdmin],
    queryFn: () => fetchCustomers(debouncedSearchTerm, filters, brandId, isSuperAdmin),
    enabled: enabled, // Wait for profile to load before querying
    staleTime: 0, // Always refetch to ensure fresh data
  });

  // Mutation for updating customer status
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      customerId,
      status,
    }: {
      customerId: string;
      status: UserStatus;
    }): Promise<UserStatus> => {
      const supabase = createClient();

      const { error } = await supabase
        .from("user_profiles")
        .update({
          user_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", customerId);

      if (error) {
        throw error;
      }

      return status;
    },
    onSuccess: (status) => {
      // Invalidate and refetch customers query
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      // Show success notification
      const statusMessages = {
        approved: "Customer has been approved successfully!",
        suspended: "Customer has been suspended successfully!",
        pending: "Customer status has been updated to pending!",
      };

      toast.success(
        statusMessages[status] || "Customer status updated successfully!"
      );
    },
    onError: (error: any) => {
      console.error("Error updating customer status:", error);
      toast.error(
        error?.message || "Failed to update customer status. Please try again."
      );
    },
  });

  // Mutation for deleting customer
  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("user_id", customerId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch customers query
      queryClient.invalidateQueries({ queryKey: ["customers"] });

      // Show success notification
      toast.success("Customer has been deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting customer:", error);
      toast.error(
        error?.message || "Failed to delete customer. Please try again."
      );
    },
  });

  return {
    customers: data?.customers || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    updateCustomerStatus: async (customerId: string, status: UserStatus) => {
      await updateStatusMutation.mutateAsync({ customerId, status });
    },
    deleteCustomer: async (customerId: string) => {
      await deleteCustomerMutation.mutateAsync(customerId);
    },
    totalCount: data?.totalCount || 0,
    isRefetching,
  };
}
