"use client";

/**
 * User Management Hook with Brand Context
 * 
 * This hook manages user data with brand associations. It includes:
 * - Brand-aware queries that join user_profiles with brands table
 * - User status management (pending, approved, suspended)
 * - Brand-scoped filtering for brand admins vs all-brands for super admins
 * 
 * IMPORTANT FOR FUTURE ExcelJS BULK IMPORT:
 * When implementing bulk user imports, ensure:
 * 1. brand_id is validated against existing brands table
 * 2. user_memberships records are created alongside user_profiles
 * 3. Imported users default to 'pending' status for admin approval
 * 4. Brand associations are preserved and not overwritten during imports
 * 5. Consider adding a 'bulk_import_id' field for tracking import batches
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { UserProfile, UserStatus } from "@/types/auth";
import { toast } from "react-toastify";

interface UserFilters {
  role: string;
  status: string;
  company: string;
  organization?: string;
  roleType?: string;
}

interface UseUsersOptions {
  searchTerm: string;
  filters: UserFilters;
  brandId?: string;
  isSuperAdmin?: boolean;
  enabled?: boolean;
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
  brandId?: string,
  isSuperAdmin?: boolean
): Promise<{ users: UserProfile[]; totalCount: number }> {
  const supabase = createClient();
  
  // Debug logging
  console.log("[useUsers] Fetching users with params:", {
    debouncedSearchTerm,
    filters,
    brandId,
    isSuperAdmin,
  });
  
  // Build base query for user_profiles with brand join
  let query = supabase
    .from("user_profiles")
    .select(`
      *,
      brands:brand_id (
        id,
        name,
        slug,
        organization_type
      )
    `, { count: "exact" });

  // Apply brand filter - only show users from the same brand (unless super admin)
  if (brandId && !isSuperAdmin) {
    query = query.eq("brand_id", brandId);
    console.log("[useUsers] Applying brand filter:", brandId);
  } else if (isSuperAdmin) {
    console.log("[useUsers] Super admin detected - skipping brand filter");
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

  // Apply organization filter (for super admins)
  if (filters.organization && filters.organization !== "all") {
    query = query.eq("brand_id", filters.organization);
  }

  // Apply role type filter (brand/distributor/manufacturer)
  if (filters.roleType && filters.roleType !== "all") {
    query = query.eq("role_type", filters.roleType);
  }

  // Order by status (pending first) then created_at desc
  query = query.order("user_status", { ascending: true }).order("created_at", { ascending: false });

  const { data: usersData, error: fetchError, count } = await query;

  if (fetchError) {
    console.error("[useUsers] Query error:", fetchError);
    throw fetchError;
  }

  console.log("[useUsers] Query result:", {
    usersCount: usersData?.length || 0,
    totalCount: count || 0,
    isSuperAdmin,
  });

  if (!usersData || usersData.length === 0) {
    return {
      users: [],
      totalCount: count || 0,
    };
  }

  // Fetch memberships separately for all users
  const userIds = usersData.map((u: any) => u.user_id);
  let membershipsData: any[] = [];
  
  if (userIds.length > 0) {
    const { data, error: membershipsError } = await supabase
      .from("user_memberships")
      .select(`
        id,
        user_id,
        brand_id,
        role_name,
        is_active,
        created_at,
        updated_at,
        brands:brand_id (
          id,
          name,
          slug,
          organization_type
        )
      `)
      .in("user_id", userIds)
      .eq("is_active", true);

    if (membershipsError) {
      console.warn("Error fetching memberships:", membershipsError);
      // Continue without memberships data
    } else {
      membershipsData = data || [];
    }
  }

  // Create a map of user_id -> memberships
  const membershipsMap = new Map<string, any[]>();
  (membershipsData || []).forEach((membership: any) => {
    const userId = membership.user_id;
    if (!membershipsMap.has(userId)) {
      membershipsMap.set(userId, []);
    }
    membershipsMap.get(userId)!.push({
      id: membership.id,
      user_id: membership.user_id,
      brand_id: membership.brand_id,
      role_name: membership.role_name,
      is_active: membership.is_active,
      created_at: membership.created_at,
      updated_at: membership.updated_at,
      brand: membership.brands || null,
    });
  });

  // Transform data to flatten brand info and add memberships
  const users: UserProfile[] = usersData.map((user: any) => {
    const { brands, ...rest } = user;
    const memberships = membershipsMap.get(user.user_id) || [];

    const primaryOrganization =
      brands ||
      memberships.find((m: any) => m.is_active)?.brand ||
      memberships[0]?.brand ||
      null;

    const resolvedBrandId =
      rest.brand_id ?? memberships[0]?.brand_id ?? undefined;

    return {
      ...rest,
      brand_id: resolvedBrandId,
      brand_name: primaryOrganization?.name || rest.brand_name || null,
      brand_slug: primaryOrganization?.slug || rest.brand_slug || null,
      organization_type:
        primaryOrganization?.organization_type || rest.organization_type || null,
      memberships,
    } as UserProfile;
  });

  return {
    users,
    totalCount: count || 0,
  };
}

export function useUsers({
  searchTerm,
  filters,
  brandId,
  isSuperAdmin = false,
  enabled = true,
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

  // Use explicit isSuperAdmin parameter instead of inferring from brandId
  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ["users", debouncedSearchTerm, filters, brandId, isSuperAdmin],
    queryFn: () => fetchUsers(debouncedSearchTerm, filters, brandId, isSuperAdmin),
    enabled: enabled, // Wait for profile to load before querying
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
