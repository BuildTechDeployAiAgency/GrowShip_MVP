import { UserRoleName } from "@/types/auth";
import { POStatus } from "@/types/purchase-orders";

/**
 * Check if user role can approve purchase orders
 */
export function canApprovePO(userRole: UserRoleName): boolean {
  const approvalRoles: UserRoleName[] = [
    "super_admin",
    "brand_admin",
    "brand_manager",
  ];
  return approvalRoles.includes(userRole);
}

/**
 * Check if user role can override stock blocks
 */
export function canOverrideStock(userRole: UserRoleName): boolean {
  const overrideRoles: UserRoleName[] = [
    "super_admin",
    "brand_admin",
  ];
  return overrideRoles.includes(userRole);
}

/**
 * Check if user can edit PO based on role and PO status
 */
export function canEditPO(userRole: UserRoleName, poStatus: POStatus): boolean {
  // Super admins can always edit
  if (userRole === "super_admin") {
    return true;
  }

  // Brand admins and managers can edit draft and submitted POs
  if (["brand_admin", "brand_manager"].includes(userRole)) {
    return ["draft", "submitted"].includes(poStatus);
  }

  // Other roles cannot edit POs
  return false;
}

/**
 * Check if user can cancel PO based on role and PO status
 */
export function canCancelPO(userRole: UserRoleName, poStatus: POStatus): boolean {
  // Super admins can cancel at any stage
  if (userRole === "super_admin") {
    return true;
  }

  // Brand admins can cancel before ordered
  if (userRole === "brand_admin") {
    return !["ordered", "received", "cancelled"].includes(poStatus);
  }

  // Brand managers can cancel draft and submitted
  if (userRole === "brand_manager") {
    return ["draft", "submitted"].includes(poStatus);
  }

  return false;
}

/**
 * Check if user can create purchase orders
 */
export function canCreatePO(userRole: UserRoleName): boolean {
  const createRoles: UserRoleName[] = [
    "super_admin",
    "brand_admin",
    "brand_manager",
    "brand_user",
  ];
  return createRoles.includes(userRole);
}

/**
 * Check if user can view purchase orders
 */
export function canViewPO(userRole: UserRoleName): boolean {
  // Most roles can view POs (restricted at data level by RLS)
  const viewRoles: UserRoleName[] = [
    "super_admin",
    "brand_admin",
    "brand_finance",
    "brand_manager",
    "brand_user",
    "distributor_admin",
    "distributor_manager",
  ];
  return viewRoles.includes(userRole);
}

/**
 * Check if user can approve line items individually
 */
export function canApproveLineItems(userRole: UserRoleName): boolean {
  return canApprovePO(userRole);
}

/**
 * Check if user can reject line items
 */
export function canRejectLineItems(userRole: UserRoleName): boolean {
  return canApprovePO(userRole);
}

/**
 * Check if user can create orders from PO
 */
export function canCreateOrdersFromPO(userRole: UserRoleName, poStatus: POStatus): boolean {
  // Only approved or ordered POs can generate orders
  if (!["approved", "ordered"].includes(poStatus)) {
    return false;
  }

  const orderCreationRoles: UserRoleName[] = [
    "super_admin",
    "brand_admin",
    "brand_manager",
  ];
  return orderCreationRoles.includes(userRole);
}

/**
 * Get permission summary for a user role
 */
export function getPOPermissions(userRole: UserRoleName) {
  return {
    canView: canViewPO(userRole),
    canCreate: canCreatePO(userRole),
    canApprove: canApprovePO(userRole),
    canOverrideStock: canOverrideStock(userRole),
    canApproveLines: canApproveLineItems(userRole),
    canRejectLines: canRejectLineItems(userRole),
  };
}

