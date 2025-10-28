"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchMenuPermissions,
  fetchUserMenuPermissions,
  menuPermissionKeys,
} from "@/lib/api/menu-permissions";
import { getStoredMenuData } from "@/lib/localStorage";

// Re-export for convenience
export { menuPermissionKeys };

export function useMenuPermissions(roleId: string | null) {
  return useQuery({
    queryKey: menuPermissionKeys.byRole(roleId || ""),
    queryFn: () => fetchMenuPermissions(roleId!),
    enabled: !!roleId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: true,
  });
}

/**
 * Hook to get user's menu permissions with localStorage caching
 * This ensures menu is shown immediately on page refresh/load
 */
export function useUserMenuPermissions(userId: string | null) {
  // Get cached menu data from localStorage for instant display
  const cachedMenuData = userId ? getStoredMenuData(userId) : null;

  return useQuery({
    queryKey: menuPermissionKeys.byUser(userId || ""),
    queryFn: () => fetchUserMenuPermissions(userId!),
    enabled: !!userId,
    // Use cached data as initial data to show menu immediately
    initialData: cachedMenuData
      ? { menuItems: cachedMenuData, error: null }
      : undefined,
    staleTime: 5 * 60 * 1000, // 5 minutes - will refetch in background after this
    gcTime: 60 * 60 * 1000, // 1 hour
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Refetch on mount to ensure fresh data
    refetchOnReconnect: true,
  });
}

export function useInvalidateMenuPermissions() {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => {
      queryClient.invalidateQueries({ queryKey: menuPermissionKeys.all });
    },
    invalidateByRole: (roleId: string) => {
      queryClient.invalidateQueries({
        queryKey: menuPermissionKeys.byRole(roleId),
      });
    },
    invalidateByUser: (userId: string) => {
      queryClient.invalidateQueries({
        queryKey: menuPermissionKeys.byUser(userId),
      });
    },
  };
}

/**
 * Hook to clear all menu data (used on logout)
 */
export function useClearMenuCache() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.removeQueries({ queryKey: menuPermissionKeys.all });
  };
}
