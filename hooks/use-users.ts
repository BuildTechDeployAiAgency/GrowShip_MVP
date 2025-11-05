"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { UserProfile, UserStatus } from "@/types/auth";
import { toast } from "react-toastify";

interface UserFilters {
  role: string;
  status: string;
  company: string;
}

interface UseUsersOptions {
  searchTerm: string;
  filters: UserFilters;
  brandId?: string;
  debounceMs?: number;
}

interface UseUsersReturn {
  users: UserProfile[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateUserStatus: (userId: string, status: UserStatus) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  totalCount: number;
  isRefetching: boolean;
}

// Fetch users function
async function fetchUsers(
  debouncedSearchTerm: string,
  filters: UserFilters,
  brandId?: string
): Promise<{ users: UserProfile[]; totalCount: number }> {
  const supabase = createClient();
  let query = supabase.from("user_profiles").select("*", { count: "exact" });

  // Apply brand filter - only show users from the same brand
  if (brandId) {
    query = query.eq("brand_id", brandId);
  }

  // Apply search filter
  if (debouncedSearchTerm.trim()) {
    query = query.or(
      `contact_name.ilike.%${debouncedSearchTerm}%,email.ilike.%${debouncedSearchTerm}%,company_name.ilike.%${debouncedSearchTerm}%`
    );
  }

  // Apply role filter
  if (filters.role !== "all") {
    query = query.eq("role_name", filters.role);
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
    users: data || [],
    totalCount: count || 0,
  };
}

export function useUsers({
  searchTerm,
  filters,
  brandId,
  debounceMs = 300,
}: UseUsersOptions): UseUsersReturn {
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [searchTerm, debounceMs]);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["users", debouncedSearchTerm, filters, brandId],
    queryFn: () => fetchUsers(debouncedSearchTerm, filters, brandId),
    staleTime: 0,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      userId,
      status,
    }: {
      userId: string;
      status: UserStatus;
    }): Promise<UserStatus> => {
      const supabase = createClient();

      const { error } = await supabase
        .from("user_profiles")
        .update({
          user_status: status,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      if (error) {
        throw error;
      }

      return status;
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });

      const statusMessages = {
        approved: "User has been approved successfully!",
        suspended: "User has been suspended successfully!",
        pending: "User status has been updated to pending!",
      };

      toast.success(
        statusMessages[status] || "User status updated successfully!"
      );
    },
    onError: (error: any) => {
      console.error("Error updating user status:", error);
      toast.error(
        error?.message || "Failed to update user status. Please try again."
      );
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("user_profiles")
        .delete()
        .eq("user_id", userId);

      if (error) {
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });

      toast.success("User has been deleted successfully!");
    },
    onError: (error: any) => {
      console.error("Error deleting user:", error);
      toast.error(error?.message || "Failed to delete user. Please try again.");
    },
  });

  return {
    users: data?.users || [],
    loading: isLoading,
    error: error ? (error as Error).message : null,
    refetch: () => {
      refetch();
    },
    updateUserStatus: async (userId: string, status: UserStatus) => {
      await updateStatusMutation.mutateAsync({ userId, status });
    },
    deleteUser: async (userId: string) => {
      await deleteUserMutation.mutateAsync(userId);
    },
    totalCount: data?.totalCount || 0,
    isRefetching,
  };
}
