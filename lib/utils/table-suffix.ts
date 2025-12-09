import type { UserProfile, AuthUser } from "@/types/auth";

/**
 * Generates table suffix for database queries based on user role and context
 * 
 * @param profile - User profile containing role and brand information
 * @param user - Auth user containing user ID
 * @returns Table suffix string for use in database queries
 */
export function getTableSuffix(profile: UserProfile | null, user: AuthUser | null): string {
  if (!profile || !user) {
    return "";
  }

  // Brand admins use organization-based table view
  if (profile.role_name?.startsWith("brand_admin") && profile.brand_id) {
    return `sales_documents_view_${profile.brand_id.replace(/-/g, "_")}`;
  }

  // Other users use personal sales documents table
  return `sales_documents_${user.id.replace(/-/g, "_")}`;
}

/**
 * Generates standardized filter object for dashboard queries
 * 
 * @param profile - User profile
 * @param user - Auth user
 * @param additionalFilters - Additional filters like year, month, distributorId
 * @returns Complete filter object for use in hooks
 */
export function createDashboardFilters(
  profile: UserProfile | null,
  user: AuthUser | null,
  additionalFilters: {
    year?: number;
    month?: number;
    distributorId?: string | null;
    [key: string]: any;
  } = {}
) {
  const tableSuffix = getTableSuffix(profile, user);

  return {
    tableSuffix,
    userId: user?.id,
    brandId: profile?.brand_id,
    userRole: profile?.role_name,
    ...additionalFilters,
  };
}