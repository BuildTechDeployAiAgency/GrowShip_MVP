import { UserRole, UserRoleName, PermissionLevel, Organization } from "@/types/auth";

// Define permission levels for each role
export const ROLE_PERMISSIONS: Record<UserRoleName, PermissionLevel> = {
  super_admin: {
    level: 1,
    name: "Super Administrator",
    description: "Global access to all organizations and features",
    can_access_all_organizations: true,
    can_manage_users: true,
    can_manage_organizations: true,
    can_view_financials: true,
    can_manage_products: true,
    can_manage_orders: true,
  },
  brand_admin: {
    level: 2,
    name: "Brand Administrator",
    description: "Manage brand organization and associated distributors",
    can_access_all_organizations: false,
    can_manage_users: true,
    can_manage_organizations: false,
    can_view_financials: true,
    can_manage_products: true,
    can_manage_orders: true,
  },
  brand_finance: {
    level: 3,
    name: "Brand Finance",
    description: "Financial management for brand organization",
    can_access_all_organizations: false,
    can_manage_users: false,
    can_manage_organizations: false,
    can_view_financials: true,
    can_manage_products: false,
    can_manage_orders: true,
  },
  brand_manager: {
    level: 3,
    name: "Brand Manager",
    description: "Operational management for brand organization",
    can_access_all_organizations: false,
    can_manage_users: false,
    can_manage_organizations: false,
    can_view_financials: false,
    can_manage_products: true,
    can_manage_orders: true,
  },
  brand_user: {
    level: 4,
    name: "Brand User",
    description: "Standard brand user with limited access",
    can_access_all_organizations: false,
    can_manage_users: false,
    can_manage_organizations: false,
    can_view_financials: false,
    can_manage_products: false,
    can_manage_orders: false,
  },
  distributor_admin: {
    level: 2,
    name: "Distributor Administrator",
    description: "Manage distributor organization and users",
    can_access_all_organizations: false,
    can_manage_users: true,
    can_manage_organizations: false,
    can_view_financials: true,
    can_manage_products: false,
    can_manage_orders: true,
  },
  distributor_finance: {
    level: 3,
    name: "Distributor Finance",
    description: "Financial management for distributor organization",
    can_access_all_organizations: false,
    can_manage_users: false,
    can_manage_organizations: false,
    can_view_financials: true,
    can_manage_products: false,
    can_manage_orders: true,
  },
  distributor_manager: {
    level: 3,
    name: "Distributor Manager",
    description: "Operational management for distributor organization",
    can_access_all_organizations: false,
    can_manage_users: false,
    can_manage_organizations: false,
    can_view_financials: false,
    can_manage_products: false,
    can_manage_orders: true,
  },
  distributor_user: {
    level: 4,
    name: "Distributor User",
    description: "Standard distributor user with limited access",
    can_access_all_organizations: false,
    can_manage_users: false,
    can_manage_organizations: false,
    can_view_financials: false,
    can_manage_products: false,
    can_manage_orders: false,
  },
  manufacturer_admin: {
    level: 2,
    name: "Manufacturer Administrator",
    description: "Manage manufacturer organization and users",
    can_access_all_organizations: false,
    can_manage_users: true,
    can_manage_organizations: false,
    can_view_financials: true,
    can_manage_products: true,
    can_manage_orders: true,
  },
  manufacturer_finance: {
    level: 3,
    name: "Manufacturer Finance",
    description: "Financial management for manufacturer organization",
    can_access_all_organizations: false,
    can_manage_users: false,
    can_manage_organizations: false,
    can_view_financials: true,
    can_manage_products: false,
    can_manage_orders: true,
  },
  manufacturer_manager: {
    level: 3,
    name: "Manufacturer Manager",
    description: "Operational management for manufacturer organization",
    can_access_all_organizations: false,
    can_manage_users: false,
    can_manage_organizations: false,
    can_view_financials: false,
    can_manage_products: true,
    can_manage_orders: true,
  },
};

// Permission checking utilities
export class PermissionChecker {
  private userRole: UserRoleName;
  private userOrganizationId?: string;
  private userPermissions: PermissionLevel;

  constructor(userRole: UserRoleName, userOrganizationId?: string) {
    this.userRole = userRole;
    this.userOrganizationId = userOrganizationId;
    this.userPermissions = ROLE_PERMISSIONS[userRole];
  }

  // Check if user can access all organizations (Super Admin only)
  canAccessAllOrganizations(): boolean {
    return this.userPermissions.can_access_all_organizations;
  }

  // Check if user can manage users in their organization
  canManageUsers(): boolean {
    return this.userPermissions.can_manage_users;
  }

  // Check if user can manage organizations
  canManageOrganizations(): boolean {
    return this.userPermissions.can_manage_organizations;
  }

  // Check if user can view financial data
  canViewFinancials(): boolean {
    return this.userPermissions.can_view_financials;
  }

  // Check if user can manage products
  canManageProducts(): boolean {
    return this.userPermissions.can_manage_products;
  }

  // Check if user can manage orders
  canManageOrders(): boolean {
    return this.userPermissions.can_manage_orders;
  }

  // Check if user can access a specific organization
  canAccessOrganization(organizationId: string, organizationType: string): boolean {
    // Super admin can access all organizations
    if (this.canAccessAllOrganizations()) {
      return true;
    }

    // Users can only access their own organization
    if (this.userOrganizationId === organizationId) {
      return true;
    }

    // Brand admins can access their associated distributors
    if (this.userRole === "brand_admin" && organizationType === "distributor") {
      // This would need to be checked against the organization relationships
      // For now, we'll assume they can access distributors
      return true;
    }

    return false;
  }

  // Check if user has higher or equal permission level than another role
  hasPermissionLevel(requiredRole: UserRoleName): boolean {
    const requiredPermissions = ROLE_PERMISSIONS[requiredRole];
    return this.userPermissions.level <= requiredPermissions.level;
  }

  // Check if user can manage another user
  canManageUser(targetUserRole: UserRoleName, targetUserOrganizationId?: string): boolean {
    // Super admin can manage all users
    if (this.canAccessAllOrganizations()) {
      return true;
    }

    // Users can only manage users in their own organization
    if (this.userOrganizationId !== targetUserOrganizationId) {
      return false;
    }

    // Check if user has higher permission level
    return this.hasPermissionLevel(targetUserRole);
  }

  // Get accessible organization types for this user
  getAccessibleOrganizationTypes(): string[] {
    if (this.canAccessAllOrganizations()) {
      return ["super_admin", "brand", "distributor", "manufacturer"];
    }

    switch (this.userRole) {
      case "brand_admin":
        return ["brand", "distributor"];
      case "distributor_admin":
        return ["distributor"];
      case "manufacturer_admin":
        return ["manufacturer"];
      default:
        return [this.userRole.split("_")[0]];
    }
  }

  // Check if user can perform a specific action
  canPerformAction(action: string, targetOrganizationId?: string): boolean {
    switch (action) {
      case "view_all_users":
        return this.canAccessAllOrganizations();
      case "manage_users":
        return this.canManageUsers();
      case "view_financials":
        return this.canViewFinancials();
      case "manage_products":
        return this.canManageProducts();
      case "manage_orders":
        return this.canManageOrders();
      case "access_organization":
        return targetOrganizationId ? this.canAccessOrganization(targetOrganizationId, "") : false;
      default:
        return false;
    }
  }
}

// Helper function to create permission checker
export function createPermissionChecker(userRole: UserRoleName, userOrganizationId?: string): PermissionChecker {
  return new PermissionChecker(userRole, userOrganizationId);
}

// Helper function to check if user is super admin
export function isSuperAdmin(userRole: UserRoleName): boolean {
  return userRole === "super_admin";
}

// Helper function to check if user is admin level
export function isAdminLevel(userRole: UserRoleName): boolean {
  return userRole.endsWith("_admin");
}

// Helper function to get role display name
export function getRoleDisplayName(roleName: UserRoleName): string {
  return ROLE_PERMISSIONS[roleName]?.name || roleName;
}

// Helper function to get role description
export function getRoleDescription(roleName: UserRoleName): string {
  return ROLE_PERMISSIONS[roleName]?.description || "";
}


