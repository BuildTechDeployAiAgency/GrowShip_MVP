import { createClient } from "@/lib/supabase/server";
import { canApprovePO, canOverrideStock, canEditPO, canCancelPO } from "@/lib/permissions/po-permissions";
import { POStatus } from "@/types/purchase-orders";
import { UserRoleName } from "@/types/auth";

interface PermissionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validate if user has permission to approve a purchase order
 */
export async function validateApprovalPermission(
  userId: string,
  poId: string
): Promise<PermissionResult> {
  const supabase = await createClient();

  // Get PO details
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("user_id, brand_id, po_status")
    .eq("id", poId)
    .single();

  if (poError || !po) {
    return { allowed: false, reason: "Purchase order not found" };
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role_name, brand_id")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    return { allowed: false, reason: "User profile not found" };
  }

  // Check if user is super admin
  const isSuperAdmin = profile.role_name === "super_admin";

  // Check brand access
  if (!isSuperAdmin && profile.brand_id !== po.brand_id) {
    return { allowed: false, reason: "You do not have access to this brand" };
  }

  // Check if user can approve POs
  if (!canApprovePO(profile.role_name)) {
    return {
      allowed: false,
      reason: "You do not have permission to approve purchase orders",
    };
  }

  // Check if user is trying to approve their own PO
  if (po.user_id === userId) {
    return {
      allowed: false,
      reason: "You cannot approve your own purchase order",
    };
  }

  // Check if PO is in a state that can be approved
  if (po.po_status !== "submitted") {
    return {
      allowed: false,
      reason: `Cannot approve purchase order with status: ${po.po_status}`,
    };
  }

  return { allowed: true };
}

/**
 * Validate if user has permission to override stock restrictions
 */
export async function validateOverridePermission(userId: string): Promise<PermissionResult> {
  const supabase = await createClient();

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role_name")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    return { allowed: false, reason: "User profile not found" };
  }

  // Check if user can override stock
  if (!canOverrideStock(profile.role_name)) {
    return {
      allowed: false,
      reason: "You do not have permission to override stock restrictions",
    };
  }

  return { allowed: true };
}

/**
 * Validate if user has permission to edit a purchase order
 */
export async function validateEditPermission(
  userId: string,
  poId: string,
  poStatus: POStatus
): Promise<PermissionResult> {
  const supabase = await createClient();

  // Get PO details
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("brand_id, user_id")
    .eq("id", poId)
    .single();

  if (poError || !po) {
    return { allowed: false, reason: "Purchase order not found" };
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role_name, brand_id")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    return { allowed: false, reason: "User profile not found" };
  }

  // Check if user is super admin
  const isSuperAdmin = profile.role_name === "super_admin";

  // Check brand access
  if (!isSuperAdmin && profile.brand_id !== po.brand_id) {
    return { allowed: false, reason: "You do not have access to this brand" };
  }

  // Check if user can edit based on role and status
  if (!canEditPO(profile.role_name, poStatus)) {
    return {
      allowed: false,
      reason: `You cannot edit purchase orders with status: ${poStatus}`,
    };
  }

  return { allowed: true };
}

/**
 * Validate if user has permission to cancel a purchase order
 */
export async function validateCancelPermission(
  userId: string,
  poId: string,
  poStatus: POStatus
): Promise<PermissionResult> {
  const supabase = await createClient();

  // Get PO details
  const { data: po, error: poError } = await supabase
    .from("purchase_orders")
    .select("brand_id, user_id")
    .eq("id", poId)
    .single();

  if (poError || !po) {
    return { allowed: false, reason: "Purchase order not found" };
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select("role_name, brand_id")
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) {
    return { allowed: false, reason: "User profile not found" };
  }

  // Check if user is super admin
  const isSuperAdmin = profile.role_name === "super_admin";

  // Check brand access
  if (!isSuperAdmin && profile.brand_id !== po.brand_id) {
    return { allowed: false, reason: "You do not have access to this brand" };
  }

  // Check if user can cancel based on role and status
  if (!canCancelPO(profile.role_name, poStatus)) {
    return {
      allowed: false,
      reason: `You cannot cancel purchase orders with status: ${poStatus}`,
    };
  }

  return { allowed: true };
}

/**
 * Get user profile with role information
 */
export async function getUserProfile(userId: string) {
  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("user_profiles")
    .select("role_name, brand_id, distributor_id")
    .eq("user_id", userId)
    .single();

  if (error || !profile) {
    return null;
  }

  return profile;
}

